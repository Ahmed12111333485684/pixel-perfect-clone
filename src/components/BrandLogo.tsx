import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

export function BrandLogo({ to = "/", className }: { to?: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <Link to={to} className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold-gradient text-gold-foreground shadow-gold">
        <Building2 className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">{t("brand.name")}</span>
    </Link>
  );
}
