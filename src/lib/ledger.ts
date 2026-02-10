import prisma from "@/lib/prisma";
import type { PrismaClient, Prisma } from "@prisma/client";

export const LEDGER_ACCOUNTS = {
  earningsPayable: "earnings_payable",
  cashOut: "cash_out",
  feeRevenue: "fee_revenue",
  freightExpense: "freight_expense",
} as const;

type LedgerEntryInput = {
  refType: "EARNING" | "PAYOUT";
  refId: string;
  debitAccount: string;
  creditAccount: string;
  amountCents: number;
};

type DbClient = Prisma.TransactionClient | PrismaClient;

export async function recordLedgerEntry(db: DbClient, input: LedgerEntryInput) {
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) return;
  try {
    await db.ledgerEntry.create({
      data: {
        refType: input.refType,
        refId: input.refId,
        debitAccount: input.debitAccount,
        creditAccount: input.creditAccount,
        amountCents: Math.round(input.amountCents),
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002") return;
    throw err;
  }
}
