import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("accountId");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const unassigned = req.nextUrl.searchParams.get("unassigned") === "true";

  const where: any = {};
  if (accountId) where.accountId = accountId;
  if (unassigned) { where.invoiceId = null; where.expenseId = null; }

  const transactions = await prisma.bankTransaction.findMany({
    where,
    include: { account: { select: { name: true, iban: true } } },
    orderBy: { bookingDate: "desc" },
    take: limit,
  });

  return NextResponse.json(transactions);
}

// PUT: assign a transaction to an invoice or expense
export async function PUT(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "ADMIN" && role !== "BAULEITER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "ID fehlt" }, { status: 400 });

  const data: any = {};
  if (body.invoiceId !== undefined) data.invoiceId = body.invoiceId || null;
  if (body.expenseId !== undefined) data.expenseId = body.expenseId || null;

  const updated = await prisma.bankTransaction.update({ where: { id: body.id }, data });
  return NextResponse.json(updated);
}
