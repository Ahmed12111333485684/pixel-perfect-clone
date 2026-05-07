import { BadgeDollarSign, Building2, ContactRound, CreditCard, Inbox, LayoutDashboard, MessageSquare, ScrollText, ShieldCheck, ShoppingBag, Sparkles, Users } from "lucide-react";
import type { ComponentType } from "react";

import type { Role } from "./api";

export interface AppNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  staffOnly?: boolean;
  ownerOnly?: boolean;
  adminOnly?: boolean;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { to: "/app", label: "nav.dashboard", icon: LayoutDashboard },
  { to: "/app/owners", label: "nav.owners", icon: Users, staffOnly: true },
  { to: "/app/properties", label: "nav.properties", icon: Building2 },
  { to: "/app/amenities", label: "nav.amenities", icon: Sparkles, staffOnly: true },
  { to: "/app/tenants", label: "nav.tenants", icon: ContactRound, staffOnly: true },
  { to: "/app/contracts", label: "nav.contracts", icon: ScrollText },
  { to: "/app/payments", label: "nav.payments", icon: CreditCard },
  { to: "/app/buyers", label: "nav.buyers", icon: ShoppingBag, staffOnly: true },
  { to: "/app/sales", label: "nav.sales", icon: BadgeDollarSign },
  { to: "/app/leads", label: "nav.leads", icon: Inbox, staffOnly: true },
  { to: "/app/requests", label: "nav.requests", icon: MessageSquare },
  { to: "/app/users", label: "nav.users", icon: ShieldCheck, adminOnly: true },
];

function normalizePath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function getNavItemForPathname(pathname: string): AppNavItem | undefined {
  const normalized = normalizePath(pathname);
  return [...APP_NAV_ITEMS]
    .sort((left, right) => right.to.length - left.to.length)
    .find((item) => normalized === item.to || normalized.startsWith(`${item.to}/`));
}

export function isNavItemVisible(item: AppNavItem, role?: Role | null, screenPermissions: string[] = []): boolean {
  if (role === "Admin") return true;

  if (role === "Employee") {
    return !item.adminOnly && screenPermissions.includes(item.to);
  }

  if (item.adminOnly) return false;
  if (item.staffOnly) return false;
  if (item.ownerOnly) return role === "OwnerClient";

  return true;
}

export function getVisibleNavItems(role?: Role | null, screenPermissions: string[] = []): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => isNavItemVisible(item, role, screenPermissions));
}

export function isCurrentPathAccessible(pathname: string, role?: Role | null, screenPermissions: string[] = []): boolean {
  const item = getNavItemForPathname(pathname);
  return !item || isNavItemVisible(item, role, screenPermissions);
}