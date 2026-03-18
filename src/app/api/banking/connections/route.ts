import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as gc from "@/lib/gocardless";

// DELETE a bank connection
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || role !== "ADMIN") return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const { id } = await req.json();
  const conn = await prisma.bankConnection.findUnique({ where: { id } });
  if (!conn) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Try to delete the requisition at GoCardless
  try {
    const cs = await prisma.companySettings.findFirst();
    if (cs?.gocardlessSecretId && cs?.gocardlessSecretKey) {
      const token = await gc.getAccessToken(cs.gocardlessSecretId, cs.gocardlessSecretKey);
      await gc.deleteRequisition(token, conn.requisitionId);
    }
  } catch {}

  await prisma.bankConnection.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
