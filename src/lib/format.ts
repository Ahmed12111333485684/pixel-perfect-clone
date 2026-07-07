import type { PropertyStatus, ContractStatus, PaymentStatusT, LeadStatus } from "@/lib/api";

export function propertyStatusTone(s: PropertyStatus) {
  return s === "Approved"
    ? "success"
    : s === "Pending"
      ? "warning"
      : s === "Rejected"
        ? "destructive"
        : "info";
}
export function contractStatusTone(s: ContractStatus) {
  return s === "Active"
    ? "success"
    : s === "Pending"
      ? "warning"
      : s === "Expired"
        ? "neutral"
        : "destructive";
}
export function paymentStatusTone(s: PaymentStatusT) {
  return s === "Paid" ? "success" : s === "Pending" ? "warning" : "destructive";
}
export function leadStatusTone(s: LeadStatus) {
  return s === "ClosedWon"
    ? "success"
    : s === "ClosedLost"
      ? "destructive"
      : s === "Qualified"
        ? "info"
        : "warning";
}

export function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}
export function formatDateTime(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}
export function formatMoney(n: number | undefined | null) {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n));
}

export function todayLocal(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
