import { BadgeDollarSign, Building2, ContactRound, CreditCard, Inbox, LayoutDashboard, MessageSquare, ScrollText, ShieldCheck, ShoppingBag, Sparkles, Users, Users2 } from "lucide-react";
import type { ComponentType } from "react";

import type { Role } from "./api";

export interface AppNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  staffOnly?: boolean;
  adminOnly?: boolean;
  partnerOnly?: boolean;
  children?: AppNavItem[];
  isParent?: boolean;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { to: "/app", label: "nav.dashboard", icon: LayoutDashboard },
  { to: "/app/owners", label: "nav.owners", icon: Users, staffOnly: true },
  { to: "/app/partners", label: "nav.partners", icon: Users2, adminOnly: true },
  { to: "/app/properties", label: "nav.properties", icon: Building2 },
  { to: "/app/amenities", label: "nav.amenities", icon: Sparkles, staffOnly: true },
  { to: "/app/tenants", label: "nav.tenants", icon: ContactRound, staffOnly: true },
  { to: "/app/contracts", label: "nav.contracts", icon: ScrollText },
  { to: "/app/payments", label: "nav.payments", icon: CreditCard },
  { to: "/app/buyers", label: "nav.buyers", icon: ShoppingBag, staffOnly: true },
  { to: "/app/sales", label: "nav.sales", icon: BadgeDollarSign },
  { to: "/app/leads", label: "nav.leads", icon: Inbox, staffOnly: true },
  {
    to: "/app/listings",
    label: "nav.listings",
    icon: Building2,
    isParent: true,
    children: [
      { to: "/app/commercial-listings", label: "nav.commercialListings", icon: Building2 },
      { to: "/app/residential-seekers", label: "nav.residentialSeekers", icon: Users2 },
      { to: "/app/requests/buysell", label: "nav.buysellRequests", icon: MessageSquare },
      { to: "/app/requests/rental", label: "nav.rentalRequests", icon: MessageSquare },
    ],
  },
  { to: "/app/users", label: "nav.users", icon: ShieldCheck, adminOnly: true },
  { to: "/partner/my-properties", label: "nav.myProperties", icon: Building2, partnerOnly: true },
  { to: "/partner/submit-property", label: "nav.submitProperty", icon: Inbox, partnerOnly: true },
];

function normalizePath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function getNavItemForPathname(pathname: string): AppNavItem | undefined {
  const normalized = normalizePath(pathname);
  const flatItems: AppNavItem[] = [];
  
  function flatten(items: AppNavItem[]) {
    for (const item of items) {
      flatItems.push(item);
      if (item.children) flatten(item.children);
    }
  }
  
  flatten(APP_NAV_ITEMS);
  return [...flatItems]
    .sort((left, right) => right.to.length - left.to.length)
    .find((item) => normalized === item.to || normalized.startsWith(`${item.to}/`));
}

export function isNavItemVisible(item: AppNavItem, role?: Role | null, screenPermissions: string[] = []): boolean {
  if (item.partnerOnly) return role === "Partner";
  if (role === "Admin") return true;

  if (role === "Employee") {
    if (item.isParent) {
      // Parent is visible if any child is visible
      return item.children?.some((child) => isNavItemVisible(child, role, screenPermissions)) ?? false;
    }
    return !item.adminOnly && screenPermissions.includes(item.to);
  }

  if (role === "Partner") return !item.adminOnly && !item.staffOnly;

  if (item.adminOnly) return false;
  if (item.staffOnly) return false;

  return true;
}

export function getVisibleNavItems(role?: Role | null, screenPermissions: string[] = []): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => isNavItemVisible(item, role, screenPermissions));
}

export function isCurrentPathAccessible(pathname: string, role?: Role | null, screenPermissions: string[] = []): boolean {
  const item = getNavItemForPathname(pathname);
  return !item || isNavItemVisible(item, role, screenPermissions);
}