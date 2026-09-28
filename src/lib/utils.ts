import { clsx, type ClassValue } from "clsx";

/** Merge conditional class names. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Coerce Prisma Decimal / string / number into a plain number. */
function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Full INR currency string, e.g. "₹1,25,00,000". */
export function formatCurrency(value: number | string | null | undefined): string {
  return inrFormatter.format(toNumber(value));
}

/**
 * Compact INR for KPI cards using Indian units:
 *   >= 1 crore  -> "₹1.25 Cr"
 *   >= 1 lakh   -> "₹3.40 L"
 *   otherwise   -> full currency
 */
export function formatCompactINR(value: number | string | null | undefined): string {
  const n = toNumber(value);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs >= 1_00_00_000) {
    return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
  }
  if (abs >= 1_00_000) {
    return `${sign}₹${(abs / 1_00_000).toFixed(2)} L`;
  }
  return formatCurrency(n);
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Human date, e.g. "05 Jan 2025". Accepts Date | ISO string | null. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}
