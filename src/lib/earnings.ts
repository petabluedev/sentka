import prisma from "@/lib/prisma";
import { LEDGER_ACCOUNTS, recordLedgerEntry } from "@/lib/ledger";

export async function approveEarningForJob(opts: {
  jobId: string;
  driverId: string;
  amountCents: number;
}) {
  return prisma.$transaction(async (tx) => {
    const amountCents = Math.round(opts.amountCents);
    const now = new Date();
    let earning = await tx.earning.findUnique({ where: { jobId: opts.jobId } });

    if (!earning) {
      try {
        earning = await tx.earning.create({
          data: {
            jobId: opts.jobId,
            driverId: opts.driverId,
            amountCents,
            status: "APPROVED",
            approvedAt: now,
          },
        });
      } catch (err: any) {
        if (err?.code !== "P2002") throw err;
        earning = await tx.earning.findUnique({ where: { jobId: opts.jobId } });
        if (!earning) throw err;
      }
    }
    if (!earning) {
      throw new Error("Failed to resolve earning for job");
    }

    if (earning.status !== "PAID") {
      const needsUpdate =
        earning.status !== "APPROVED" ||
        earning.driverId !== opts.driverId ||
        earning.amountCents !== amountCents ||
        !earning.approvedAt;

      if (needsUpdate) {
        earning = await tx.earning.update({
          where: { id: earning.id },
          data: {
            driverId: opts.driverId,
            amountCents,
            status: "APPROVED",
            approvedAt: earning.approvedAt ?? now,
          },
        });
      }
    }

    await recordLedgerEntry(tx, {
      refType: "EARNING",
      refId: earning.id,
      debitAccount: LEDGER_ACCOUNTS.freightExpense,
      creditAccount: LEDGER_ACCOUNTS.earningsPayable,
      amountCents: earning.amountCents,
    });

    return earning;
  });
}

export async function openDisputeForJob(jobId: string) {
  return prisma.$transaction(async (tx) => {
    const earning = await tx.earning.findUnique({ where: { jobId } });
    if (!earning) return null;
    if (earning.status === "PAID") return earning;
    return tx.earning.update({
      where: { id: earning.id },
      data: {
        status: "PENDING",
        approvedAt: null,
        payoutId: null,
        paidAt: null,
      },
    });
  });
}
