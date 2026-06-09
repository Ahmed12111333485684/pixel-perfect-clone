import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { getStoredToken } from "@/lib/api";
import { Building2, ChevronRight, ChevronDown, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getVisibleNavItems, isCurrentPathAccessible } from "@/lib/navigation";
import type { AppNavItem } from "@/lib/navigation";

import { AppLayout } from "@/components/AppLayout";

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
