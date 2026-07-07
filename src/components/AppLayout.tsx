import { Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { Building2, ChevronRight, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { NotificationsProvider } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { getVisibleNavItems, isCurrentPathAccessible } from "@/lib/navigation";
import type { AppNavItem } from "@/lib/navigation";

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const auth = useAuth();
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const cleanup = () => {
      const hasOpenDialog = document.querySelector('[role="dialog"][data-state="open"]');
      if (hasOpenDialog) return;

      document.body.style.pointerEvents = "";
      document.body.style.overflow = "";
      document.body.removeAttribute("data-scroll-locked");

      document.querySelectorAll<HTMLElement>('[data-state="open"]').forEach((node) => {
        const className = typeof node.className === "string" ? node.className : "";
        if (
          className.includes("fixed") &&
          className.includes("inset-0") &&
          className.includes("z-50")
        ) {
          node.remove();
        }
      });
    };

    cleanup();
    const id = window.requestAnimationFrame(cleanup);
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  const visible = getVisibleNavItems(auth.user?.role, auth.user?.screenPermissions ?? []);
  const canViewCurrentScreen = isCurrentPathAccessible(
    pathname,
    auth.user?.role,
    auth.user?.screenPermissions ?? [],
  );

  const toggleParent = (parentTo: string) => {
    const newExpanded = new Set(expandedParents);
    if (newExpanded.has(parentTo)) {
      newExpanded.delete(parentTo);
    } else {
      newExpanded.add(parentTo);
    }
    setExpandedParents(newExpanded);
  };

  const renderNavItem = (item: AppNavItem, depth = 0, closeOnSelect = false) => {
    const isParentExpanded = expandedParents.has(item.to);
    const isActive =
      item.to === "/app"
        ? pathname === "/app"
        : pathname === item.to || pathname.startsWith(item.to + "/");

    if (item.isParent && item.children) {
      return (
        <div key={item.to}>
          <button
            onClick={() => toggleParent(item.to)}
            className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 opacity-80" />
            <span className="flex-1 text-left">{t(item.label)}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 opacity-50 transition-transform ${
                isParentExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
          {isParentExpanded && (
            <div className="ml-2 space-y-0.5 border-l border-sidebar-border/50 py-1">
              {item.children.map((child) => renderNavItem(child, depth + 1, closeOnSelect))}
            </div>
          )}
        </div>
      );
    }

    const link = (
      <Link
        key={item.to}
        to={item.to}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
          depth > 0 ? "pl-5" : ""
        } ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        }`}
      >
        {depth === 0 && <item.icon className="h-4 w-4 opacity-80" />}
        <span className="flex-1">{t(item.label)}</span>
        {isActive && depth === 0 && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
      </Link>
    );

    return closeOnSelect ? <SheetClose asChild key={item.to}>{link}</SheetClose> : link;
  };

  return (
    <NotificationsProvider>
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
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
          {visible.map((item) => renderNavItem(item))}
        </nav>
        <div className="border-t border-sidebar-border p-3 text-xs text-sidebar-foreground/60">
          <span className="rounded-md bg-sidebar-accent/50 px-2 py-1 font-medium">
            {auth.user?.role ? t(`role.${auth.user.role}`) : ""}
          </span>
        </div>
      </aside>

      {/* Mobile Sheet Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="fixed bottom-4 left-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" hideClose className="flex w-72 flex-col border-e border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
            <SheetClose asChild>
              <Link to="/app" className="flex items-center gap-2 text-sidebar-foreground">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-gradient text-gold-foreground">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="font-display text-lg font-semibold">{t("brand.name")}</span>
              </Link>
            </SheetClose>
            <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
            {visible.map((item) => renderNavItem(item, 0, true))}
          </nav>
          <div className="border-t border-sidebar-border p-3 text-xs text-sidebar-foreground/60">
            <span className="rounded-md bg-sidebar-accent/50 px-2 py-1 font-medium">
              {auth.user?.role ? t(`role.${auth.user.role}`) : ""}
            </span>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <div className="md:hidden">
            <BrandLogo to="/app" />
          </div>
          <div className="hidden md:block">
            <span className="font-display text-lg font-semibold">{t("brand.name")}</span>
          </div>
          <div className="flex-1" />
          {auth.isStaff && <NotificationBell />}
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
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {auth.user?.role ? t(`role.${auth.user.role}`) : ""}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  auth.logout();
                  window.location.href = "/login";
                }}
              >
                <LogOut className="me-2 h-4 w-4" />
                {t("nav.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {canViewCurrentScreen ? (
            children ?? <Outlet />
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              {t("common.noScreenAccess")}
            </div>
          )}
        </main>
      </div>
    </div>
    </NotificationsProvider>
  );
}
