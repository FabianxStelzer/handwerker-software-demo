import { prisma } from "./prisma";

export async function generateProjectNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;
  const last = await prisma.project.findFirst({
    where: { projectNumber: { startsWith: prefix } },
    orderBy: { projectNumber: "desc" },
  });
  const nextNum = last
    ? parseInt(last.projectNumber.split("-").pop()!) + 1
    : 1;
  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const last = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
  });
  const nextNum = last
    ? parseInt(last.orderNumber.split("-").pop()!) + 1
    : 1;
  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
  });
  const nextNum = last
    ? parseInt(last.invoiceNumber.split("-").pop()!) + 1
    : 1;
  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}
