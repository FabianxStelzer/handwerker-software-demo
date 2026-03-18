import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as gc from "@/lib/gocardless";

async function getCredentials() {
  const cs = await prisma.companySettings.findFirst();
  if (!cs?.gocardlessSecretId || !cs?.gocardlessSecretKey) return null;
  return { secretId: cs.gocardlessSecretId, secretKey: cs.gocardlessSecretKey };
}

// GET: list all bank accounts with balances
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const accounts = await prisma.bankAccount.findMany({
    include: { connection: { select: { institutionName: true, institutionLogo: true, status: true } } },
    orderBy: { name: "asc" },
  });

  const connections = await prisma.bankConnection.findMany({
    include: { accounts: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ accounts, connections });
}

// POST: start a new bank connection or sync existing ones
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = await req.json();
  const creds = await getCredentials();
  if (!creds) return NextResponse.json({ error: "GoCardless-Zugangsdaten nicht konfiguriert. Bitte in Einstellungen > Banking hinterlegen." }, { status: 400 });

  // Action: connect a new bank
  if (body.action === "connect") {
    const token = await gc.getAccessToken(creds.secretId, creds.secretKey);
    const redirectUrl = body.redirectUrl || `${req.nextUrl.origin}/api/banking/callback`;
    const reference = `hw-${Date.now()}`;

    const requisition = await gc.createRequisition(token, body.institutionId, redirectUrl, reference);

    await prisma.bankConnection.create({
      data: {
        institutionId: body.institutionId,
        institutionName: body.institutionName || body.institutionId,
        institutionLogo: body.institutionLogo || null,
        requisitionId: requisition.id,
        status: requisition.status,
      },
    });

    return NextResponse.json({ link: requisition.link, requisitionId: requisition.id });
  }

  // Action: sync all accounts (balances + transactions)
  if (body.action === "sync") {
    const token = await gc.getAccessToken(creds.secretId, creds.secretKey);
    const connections = await prisma.bankConnection.findMany({ include: { accounts: true } });
    let synced = 0;

    for (const conn of connections) {
      // Check/update requisition status
      try {
        const req = await gc.getRequisition(token, conn.requisitionId);
        if (req.status !== conn.status) {
          await prisma.bankConnection.update({ where: { id: conn.id }, data: { status: req.status } });
        }

        // If linked, discover new accounts
        if (req.status === "LN" && req.accounts.length > 0) {
          const existingIds = conn.accounts.map((a) => a.externalId);
          for (const accId of req.accounts) {
            if (!existingIds.includes(accId)) {
              const details = await gc.getAccountDetails(token, accId);
              await prisma.bankAccount.create({
                data: {
                  connectionId: conn.id,
                  externalId: accId,
                  iban: details.iban || null,
                  name: details.ownerName || details.name || details.product || `Konto ${accId.slice(0, 8)}`,
                },
              });
            }
          }
        }
      } catch (e) {
        console.error(`Sync connection ${conn.id} error:`, e);
      }
    }

    // Sync balances and transactions for all accounts
    const allAccounts = await prisma.bankAccount.findMany();
    for (const acc of allAccounts) {
      try {
        const balances = await gc.getAccountBalances(token, acc.externalId);
        const main = balances.find((b) => b.balanceType === "closingBooked" || b.balanceType === "expected") || balances[0];
        if (main) {
          await prisma.bankAccount.update({
            where: { id: acc.id },
            data: {
              balanceAmount: parseFloat(main.balanceAmount.amount),
              balanceCurrency: main.balanceAmount.currency,
              balanceUpdatedAt: new Date(),
            },
          });
        }

        // Fetch last 90 days of transactions
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 90);
        const txns = await gc.getAccountTransactions(token, acc.externalId, dateFrom.toISOString().slice(0, 10));

        for (const tx of txns.booked) {
          const extId = tx.transactionId || `${tx.bookingDate}_${tx.transactionAmount.amount}_${tx.debtorName || tx.creditorName || ""}`;
          const exists = await prisma.bankTransaction.findFirst({ where: { accountId: acc.id, externalId: extId } });
          if (!exists) {
            await prisma.bankTransaction.create({
              data: {
                accountId: acc.id,
                externalId: extId,
                amount: parseFloat(tx.transactionAmount.amount),
                currency: tx.transactionAmount.currency,
                bookingDate: new Date(tx.bookingDate),
                valueDate: tx.valueDate ? new Date(tx.valueDate) : null,
                debtorName: tx.debtorName || null,
                creditorName: tx.creditorName || null,
                description: tx.remittanceInformationUnstructured || null,
              },
            });
          }
        }
        synced++;
      } catch (e) {
        console.error(`Sync account ${acc.id} error:`, e);
      }
    }

    return NextResponse.json({ success: true, synced });
  }

  // Action: get institutions list
  if (body.action === "institutions") {
    const token = await gc.getAccessToken(creds.secretId, creds.secretKey);
    const institutions = await gc.getInstitutions(token, body.country || "DE");
    return NextResponse.json(institutions);
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
