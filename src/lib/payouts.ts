import crypto from "crypto";
import prisma from "@/lib/prisma";
import { LEDGER_ACCOUNTS, recordLedgerEntry } from "@/lib/ledger";
import type { PrismaClient, Prisma } from "@prisma/client";

const INSTANT_PAYOUT_FEE_CENTS = Number(process.env.INSTANT_PAYOUT_FEE_CENTS ?? 125);
const INSTANT_TARGET_MS = Number(process.env.INSTANT_PAYOUT_TARGET_MS ?? 5 * 60 * 1000);

type PayoutDestinationType = "BANK_ACH" | "DEBIT_CARD";
type PayoutRail = "FEDNOW" | "RTP" | "INSTANT_DEBIT" | "ACH_SAME_DAY" | "ACH_STANDARD";

type DbClient = Prisma.TransactionClient | PrismaClient;

async function getDefaultDestination(
  db: DbClient,
  driverId: string,
  type: PayoutDestinationType
) {
  const existing = await db.payoutDestination.findFirst({
    where: { driverId, type, isDefault: true },
  });
  if (existing) return existing;
  const mask = type === "DEBIT_CARD" ? "4242" : "1234";
  return db.payoutDestination.create({
    data: {
      driverId,
      type,
      tokenReference: `dev_${type.toLowerCase()}_${driverId}`,
      mask,
      isDefault: true,
    },
  });
}

function envEnabled(name: string, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function isInstantRail(rail: PayoutRail) {
  return rail === "FEDNOW" || rail === "RTP" || rail === "INSTANT_DEBIT";
}

function pickRail(opts: { hasBank: boolean; hasDebit: boolean }) {
  if (opts.hasBank && envEnabled("FEDNOW_AVAILABLE")) return "FEDNOW" as const;
  if (opts.hasBank && envEnabled("RTP_AVAILABLE")) return "RTP" as const;
  if (opts.hasDebit) return "INSTANT_DEBIT" as const;
  if (opts.hasBank && envEnabled("SAME_DAY_ACH_AVAILABLE")) return "ACH_SAME_DAY" as const;
  if (opts.hasBank) return "ACH_STANDARD" as const;
  return null;
}

export async function createWeeklyPayoutForDriver(driverId: string) {
  return prisma.$transaction(
    async (tx) => {
      const earnings = await tx.earning.findMany({
        where: { driverId, status: "APPROVED", payoutId: null },
      });
      if (!earnings.length) return null;
      const gross = earnings.reduce((sum, e) => sum + e.amountCents, 0);
      const destination = await getDefaultDestination(tx, driverId, "BANK_ACH");
      const now = new Date();

      const payout = await tx.payout.create({
        data: {
          driverId,
          amountGrossCents: gross,
          feeAmountCents: 0,
          amountNetCents: gross,
          method: "WEEKLY_ACH",
          railUsed: "ACH_STANDARD",
          status: "SUCCEEDED",
          destinationMask: destination.mask,
          providerReferenceId: `ach_${crypto.randomUUID()}`,
          initiatedAt: now,
          processedAt: now,
        },
      });

      const updated = await tx.earning.updateMany({
        where: { id: { in: earnings.map((e) => e.id) }, payoutId: null },
        data: { status: "PAID", paidAt: now, payoutId: payout.id },
      });

      if (updated.count !== earnings.length) {
        throw new Error("Earning payout race detected");
      }

      await recordLedgerEntry(tx, {
        refType: "PAYOUT",
        refId: payout.id,
        debitAccount: LEDGER_ACCOUNTS.earningsPayable,
        creditAccount: LEDGER_ACCOUNTS.cashOut,
        amountCents: gross,
      });

      return payout;
    },
    { isolationLevel: "Serializable" }
  );
}

export async function createInstantPayoutForDriver(
  driverId: string,
  opts: { idempotencyKey?: string } = {}
) {
  return prisma.$transaction(
    async (tx) => {
      if (opts.idempotencyKey) {
        const existing = await tx.payout.findUnique({
          where: {
            driverId_idempotencyKey: {
              driverId,
              idempotencyKey: opts.idempotencyKey,
            },
          },
        });
        if (existing) {
          return {
            payout: existing,
            feeCents: existing.feeAmountCents,
            destinationMask: existing.destinationMask ?? undefined,
            railUsed: existing.railUsed as PayoutRail | null,
          };
        }
      }

      const earnings = await tx.earning.findMany({
        where: { driverId, status: "APPROVED", payoutId: null },
      });
      if (!earnings.length) return null;
      const gross = earnings.reduce((sum, e) => sum + e.amountCents, 0);
      const bankDest = await getDefaultDestination(tx, driverId, "BANK_ACH");
      const debitEnabled = envEnabled("DEBIT_PUSH_AVAILABLE", true);
      const debitDest = debitEnabled ? await getDefaultDestination(tx, driverId, "DEBIT_CARD") : null;
      const rail = pickRail({ hasBank: Boolean(bankDest), hasDebit: Boolean(debitDest) });
      if (!rail) {
        throw new Error("No payout destination available");
      }
      const destination = rail === "INSTANT_DEBIT" ? debitDest : bankDest;
      if (!destination) {
        throw new Error("No payout destination available");
      }
      const now = new Date();
      const initiatedAt = now;
      const processedAt = isInstantRail(rail) ? now : null;
      const completedUnderTarget =
        Boolean(processedAt) && processedAt.getTime() - initiatedAt.getTime() <= INSTANT_TARGET_MS;
      const fee = completedUnderTarget
        ? Number.isFinite(INSTANT_PAYOUT_FEE_CENTS)
          ? INSTANT_PAYOUT_FEE_CENTS
          : 125
        : 0;
      const net = Math.max(0, gross - fee);
      if (net <= 0) {
        throw new Error("Approved earnings are below the instant payout fee");
      }

      let payout;
      try {
        payout = await tx.payout.create({
          data: {
            driverId,
            amountGrossCents: gross,
            feeAmountCents: fee,
            amountNetCents: net,
            method: "INSTANT_DEBIT",
            railUsed: rail,
            status: isInstantRail(rail) ? "SUCCEEDED" : "PROCESSING",
            destinationMask: destination.mask,
            providerReferenceId: `${rail.toLowerCase()}_${crypto.randomUUID()}`,
            idempotencyKey: opts.idempotencyKey ?? null,
            initiatedAt,
            processedAt,
          },
        });
      } catch (err: any) {
        if (err?.code === "P2002" && opts.idempotencyKey) {
          const existing = await tx.payout.findUnique({
            where: {
              driverId_idempotencyKey: {
                driverId,
                idempotencyKey: opts.idempotencyKey,
              },
            },
          });
          if (existing) {
            return {
              payout: existing,
              feeCents: existing.feeAmountCents,
              destinationMask: existing.destinationMask ?? undefined,
              railUsed: existing.railUsed as PayoutRail | null,
            };
          }
        }
        throw err;
      }

      const updated = await tx.earning.updateMany({
        where: { id: { in: earnings.map((e) => e.id) }, payoutId: null },
        data: { status: "PAID", paidAt: now, payoutId: payout.id },
      });

      if (updated.count !== earnings.length) {
        throw new Error("Earning payout race detected");
      }

      await recordLedgerEntry(tx, {
        refType: "PAYOUT",
        refId: payout.id,
        debitAccount: LEDGER_ACCOUNTS.earningsPayable,
        creditAccount: LEDGER_ACCOUNTS.cashOut,
        amountCents: net,
      });
      if (fee > 0) {
        await recordLedgerEntry(tx, {
          refType: "PAYOUT",
          refId: payout.id,
          debitAccount: LEDGER_ACCOUNTS.earningsPayable,
          creditAccount: LEDGER_ACCOUNTS.feeRevenue,
          amountCents: fee,
        });
      }

      return { payout, feeCents: fee, destinationMask: destination.mask, railUsed: rail };
    },
    { isolationLevel: "Serializable" }
  );
}

export async function runWeeklyPayouts() {
  const drivers = await prisma.earning.groupBy({
    by: ["driverId"],
    where: { status: "APPROVED", payoutId: null },
  });

  const results: { driverId: string; payoutId?: string }[] = [];
  for (const driver of drivers) {
    const payout = await createWeeklyPayoutForDriver(driver.driverId);
    if (payout) results.push({ driverId: driver.driverId, payoutId: payout.id });
  }
  return results;
}

export function getInstantFeeCents() {
  return Number.isFinite(INSTANT_PAYOUT_FEE_CENTS) ? INSTANT_PAYOUT_FEE_CENTS : 125;
}
