import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { getStoredToken } from "@/lib/api";
import {
  LayoutDashboard, Users, Building2, Sparkles, ContactRound,
  ScrollText, CreditCard, ShoppingBag, BadgeDollarSign, Inbox,
  LogOut, ChevronRight, ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    // Auth token lives in localStorage (client-only). Skip the guard during
    // SSR so opening backoffice URLs in a new tab doesn't bounce to /login.
    if (typeof window === "undefined") return;
    if (!getStoredToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  staffOnly?: boolean;
  ownerOnly?: boolean;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
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
  { to: "/app/users", label: "nav.users", icon: ShieldCheck, adminOnly: true },
];

function AppLayout() {
  const auth = useAuth();
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const cleanup = () => {
      const hasOpenDialog = document.querySelector('[role="dialog"][data-state="open"]');
      if (hasOpenDialog) return;

      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
      document.body.removeAttribute("data-scroll-locked");

      document.querySelectorAll<HTMLElement>('[data-state="open"]').forEach((node) => {
        const className = typeof node.className === "string" ? node.className : "";
        if (className.includes("fixed") && className.includes("inset-0") && className.includes("z-50")) {
          node.remove();
        }
      });
    };

    cleanup();
    const id = window.requestAnimationFrame(cleanup);
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  const visible = NAV.filter((n) => {
    if (n.staffOnly && !auth.isStaff) return false;
    if (n.ownerOnly && auth.user?.role !== "OwnerClient") return false;
    if (n.adminOnly && !auth.hasRole("Admin")) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Link to="/app" className="flex items-center gap-2 text-sidebar-foreground">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-gradient text-gold-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold">{t("brand.name")}</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {visible.map((item) => {
            const isActive =
              item.to === "/app"
                ? pathname === "/app"
                : pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 opacity-80" />
                <span className="flex-1">{t(item.label)}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3 text-xs text-sidebar-foreground/60">
          <span className="rounded-md bg-sidebar-accent/50 px-2 py-1 font-medium">
            {auth.user?.role}
          </span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-6 backdrop-blur">
          <div className="md:hidden">
            <BrandLogo to="/app" />
          </div>
          <div className="flex-1" />
          <LanguageToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  {auth.user?.username.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden text-sm font-medium sm:inline">{auth.user?.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">{auth.user?.role}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { auth.logout(); window.location.href = "/login"; }}>
                <LogOut className="me-2 h-4 w-4" />
                {t("nav.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Mobile bottom nav */}
        <nav className="sticky top-16 z-[5] flex gap-1 overflow-x-auto border-b border-border bg-background px-3 py-2 md:hidden">
          {visible.map((item) => {
            const isActive =
              item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
