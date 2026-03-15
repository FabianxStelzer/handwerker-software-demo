import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getCustomerDisplayName(customer: {
  type: string;
  company?: string | null;
  firstName: string;
  lastName: string;
}): string {
  if (customer.type === "GESCHAEFT" && customer.company) {
    return customer.company;
  }
  return `${customer.firstName} ${customer.lastName}`;
}

export function calculateTotals(
  items: { quantity: number; pricePerUnit: number }[],
  taxRate: number = 19
) {
  const netTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit,
    0
  );
  const taxAmount = netTotal * (taxRate / 100);
  const grossTotal = netTotal + taxAmount;
  return { netTotal, taxAmount, grossTotal };
}
