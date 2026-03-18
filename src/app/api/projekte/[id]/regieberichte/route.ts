import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const berichte = await prisma.regiebericht.findMany({
    where: { projectId: id },
    include: {
      mitarbeiter: true,
      materialien: true,
    },
    orderBy: { berichtNummer: "desc" },
  });

  return NextResponse.json(berichte);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  try {
    const body = await req.json();

    const lastBericht = await prisma.regiebericht.findFirst({
      orderBy: { berichtNummer: "desc" },
    });
    const nextNr = (lastBericht?.berichtNummer ?? 0) + 1;

    const bericht = await prisma.regiebericht.create({
      data: {
        berichtNummer: nextNr,
        projectId: id,
        datum: body.datum ? new Date(body.datum) : new Date(),
        durchgefuehrteArbeiten: body.durchgefuehrteArbeiten || "",
        createdById: userId,
        mitarbeiter: {
          create: (body.mitarbeiter || []).map((m: any) => ({
            userId: m.userId,
            name: m.name,
            stunden: parseFloat(m.stunden) || 0,
          })),
        },
        materialien: {
          create: (body.materialien || []).map((m: any) => ({
            name: m.name,
            einheit: m.einheit || "Stk",
            menge: parseFloat(m.menge) || 1,
            einzelpreis: parseFloat(m.einzelpreis) || 0,
          })),
        },
      },
      include: { mitarbeiter: true, materialien: true },
    });

    return NextResponse.json(bericht, { status: 201 });
  } catch (err) {
    console.error("Regiebericht POST error:", err);
    return NextResponse.json({ error: "Fehler beim Erstellen" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  try {
    const body = await req.json();
    const { berichtId, action, unterschriftUrl } = body;

    if (action === "abschliessen") {
      const bericht = await prisma.regiebericht.update({
        where: { id: berichtId },
        data: { status: "ABGESCHLOSSEN" },
        include: { mitarbeiter: true, materialien: true, project: { include: { customer: true } } },
      });
      return NextResponse.json(bericht);
    }

    if (action === "unterschreiben") {
      const bericht = await prisma.regiebericht.update({
        where: { id: berichtId },
        data: { status: "UNTERSCHRIEBEN", unterschriftUrl },
        include: { mitarbeiter: true, materialien: true, project: { include: { customer: true } } },
      });

      // Auto-create invoice from Regiebericht
      const settings = await prisma.companySettings.findFirst();
      const hourlyRate = settings?.hourlyRate ?? 55;

      const lastOrder = await prisma.order.findFirst({ orderBy: { orderNumber: "desc" } });
      const lastOrderNum = lastOrder?.orderNumber ? parseInt(lastOrder.orderNumber.replace(/\D/g, "")) : 0;
      const orderNumber = `A-${String(lastOrderNum + 1).padStart(5, "0")}`;

      const lastInvoice = await prisma.invoice.findFirst({ orderBy: { invoiceNumber: "desc" } });
      const lastInvNum = lastInvoice?.invoiceNumber ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, "")) : 0;
      const invoiceNumber = `R-${String(lastInvNum + 1).padStart(5, "0")}`;

      const arbeitsItems = bericht.mitarbeiter.map((m, i) => ({
        description: `Arbeitszeit ${m.name} (${m.stunden} Std.)`,
        unit: "STUNDE" as const,
        quantity: m.stunden,
        pricePerUnit: hourlyRate,
        total: m.stunden * hourlyRate,
        position: i,
      }));

      const materialItems = bericht.materialien.map((m, i) => ({
        description: `${m.name}`,
        unit: "STUECK" as const,
        quantity: m.menge,
        pricePerUnit: m.einzelpreis,
        total: m.menge * m.einzelpreis,
        position: arbeitsItems.length + i,
      }));

      const allItems = [...arbeitsItems, ...materialItems];
      const netTotal = allItems.reduce((sum, it) => sum + it.total, 0);
      const taxRate = 19;
      const taxAmount = netTotal * (taxRate / 100);
      const grossTotal = netTotal + taxAmount;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: bericht.project.customerId,
          projectId: bericht.projectId,
          status: "ENTWURF",
          notes: `Regiebericht Nr. ${bericht.berichtNummer}`,
          netTotal, taxRate, taxAmount, grossTotal,
          items: { create: allItems },
        },
      });

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          status: "ENTWURF",
          dueDate: new Date(Date.now() + 14 * 86400000),
          netTotal, taxRate, taxAmount, grossTotal,
          notes: `Regiebericht Nr. ${bericht.berichtNummer}`,
          items: {
            create: allItems.map((it) => ({
              description: it.description,
              unit: it.unit,
              quantity: it.quantity,
              pricePerUnit: it.pricePerUnit,
              total: it.total,
              position: it.position,
            })),
          },
        },
      });

      await prisma.regiebericht.update({
        where: { id: berichtId },
        data: { status: "RECHNUNG_ERSTELLT", invoiceId: invoice.id },
      });

      // Notify admins
      const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "BAULEITER"] } } });
      const customerName = bericht.project.customer.company
        || `${bericht.project.customer.firstName} ${bericht.project.customer.lastName}`;
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: "Neuer Regiebericht",
            message: `Regiebericht Nr. ${bericht.berichtNummer} für ${customerName} wurde erstellt. Rechnung ${invoiceNumber} steht zur Prüfung bereit.`,
            link: `/rechnungen/${invoice.id}`,
          },
        });
      }

      return NextResponse.json({ ...bericht, invoiceId: invoice.id, invoiceNumber });
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch (err) {
    console.error("Regiebericht PUT error:", err);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
