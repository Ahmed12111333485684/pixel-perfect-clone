import {
  Building2,
  ClipboardList,
  ContactRound,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Receipt,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Users2,
} from "lucide-react";
import { RiyalIcon } from "@/components/icons/RiyalIcon";
import type { ComponentType } from "react";

import type { Role } from "./api";

export interface AppNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  staffOnly?: boolean;
  adminOnly?: boolean;
  partnerOnly?: boolean;
  employeeOnly?: boolean;
  children?: AppNavItem[];
  isParent?: boolean;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { to: "/app", label: "nav.dashboard", icon: LayoutDashboard },
  { to: "/app/residential-seekers", label: "nav.residentialSeekers", icon: Users2 },
  { to: "/app/listings", label: "nav.listings", icon: Building2 },
  { to: "/app/amenities", label: "nav.amenities", icon: Sparkles, staffOnly: true },
  { to: "/app/advertisements", label: "nav.advertisements", icon: Megaphone },
  { to: "/app/partners", label: "nav.partners", icon: Users2, adminOnly: true },
  { to: "/app/properties", label: "nav.properties", icon: Building2 },
  { to: "/app/owners", label: "nav.owners", icon: Users, staffOnly: true },
  {
    to: "/app/employee-productivity",
    label: "nav.productivity",
    icon: ClipboardList,
    employeeOnly: true,
  },
  { to: "/app/leads", label: "nav.leads", icon: Inbox, staffOnly: true },
  { to: "/app/tenants", label: "nav.tenants", icon: ContactRound, staffOnly: true },
  { to: "/app/contracts", label: "nav.contracts", icon: ScrollText },
  { to: "/app/payments", label: "nav.payments", icon: CreditCard },
  { to: "/app/expenses", label: "nav.expenses", icon: Receipt },
  { to: "/app/buyers", label: "nav.buyers", icon: ShoppingBag, staffOnly: true },
  { to: "/app/sales", label: "nav.sales", icon: RiyalIcon },

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

export function isNavItemVisible(
  item: AppNavItem,
  role?: Role | null,
  screenPermissions: string[] = [],
): boolean {
  if (item.partnerOnly) return role === "Partner";
  if (item.employeeOnly) return role === "Employee";
  if (role === "Admin") return true;

  if (role === "Employee") {
    if (item.isParent) {
      // Parent is visible if any child is visible
      return (
        item.children?.some((child) => isNavItemVisible(child, role, screenPermissions)) ?? false
      );
    }
    return !item.adminOnly && screenPermissions.includes(item.to);
  }

  if (role === "Partner") return !item.adminOnly && !item.staffOnly;

  if (item.adminOnly) return false;
  if (item.staffOnly) return false;

  return true;
}

export function getVisibleNavItems(
  role?: Role | null,
  screenPermissions: string[] = [],
): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => isNavItemVisible(item, role, screenPermissions));
}

export function isCurrentPathAccessible(
  pathname: string,
  role?: Role | null,
  screenPermissions: string[] = [],
): boolean {
  if (role === "Admin") return true;
  const item = getNavItemForPathname(pathname);
  return !item || isNavItemVisible(item, role, screenPermissions);
}
