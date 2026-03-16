import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getCustomerDisplayName } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LEXWARE_API = "https://api.lexware.io";

async function getApiKey() {
  const settings = await prisma.companySettings.findFirst();
  return settings?.lexofficeApiKey ?? null;
}

const unitMap: Record<string, string> = {
  STUECK: "Stück",
  METER: "m",
  QUADRATMETER: "m²",
  KUBIKMETER: "m³",
  KILOGRAMM: "kg",
  LITER: "l",
  PALETTE: "Palette",
  PAUSCHAL: "Pauschal",
  STUNDE: "Stunde",
};

/** POST: Rechnung aus Handwerker-Software nach Lexoffice übertragen */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Lexoffice nicht verbunden" }, { status: 400 });
  }

  const { invoiceId } = await req.json();
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId erforderlich" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: { include: { customer: true } },
      items: { orderBy: { position: "asc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });
  }

  const customer = invoice.order.customer;
  const customerName = getCustomerDisplayName(customer);

  const lineItems = invoice.items.map((item) => ({
    type: "custom" as const,
    name: item.description,
    quantity: item.quantity,
    unitName: unitMap[item.unit] ?? item.unit,
    unitPrice: {
      currency: "EUR",
      netAmount: item.pricePerUnit,
      taxRatePercentage: Math.round(invoice.taxRate),
    },
    discountPercentage: 0,
  }));

  const voucherDate = invoice.issueDate.toISOString().slice(0, 19).replace("T", "T");
  const dueDate = invoice.dueDate?.toISOString().slice(0, 19).replace("T", "T") ?? voucherDate;

  const payload = {
    archived: false,
    voucherDate,
    address: {
      name: customerName,
      supplement: customer.company ?? undefined,
      street: customer.street ?? "–",
      zip: customer.zip ?? "–",
      city: customer.city ?? "–",
      countryCode: "DE",
    },
    lineItems,
    totalPrice: { currency: "EUR" },
    taxConditions: { taxType: "net" as const },
    shippingConditions: {
      shippingType: "service" as const,
      shippingDate: voucherDate,
      shippingEndDate: voucherDate,
    },
    paymentConditions: {
      paymentTermDuration: 14,
    },
    title: "Rechnung",
    introduction: `Rechnung ${invoice.invoiceNumber} – Auftrag ${invoice.order.orderNumber}`,
  };

  try {
    const res = await fetch(`${LEXWARE_API}/v1/invoices?finalize=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.message ?? data.error ?? `Lexware API: ${res.status}`;
      return NextResponse.json({ error: msg }, { status: res.status >= 500 ? 502 : res.status });
    }

    return NextResponse.json({
      success: true,
      lexofficeId: data.id,
      voucherNumber: data.voucherNumber,
      resourceUri: data.resourceUri,
    });
  } catch (e) {
    console.error("Lexoffice sync:", e);
    return NextResponse.json({ error: "Verbindung fehlgeschlagen" }, { status: 502 });
  }
}
