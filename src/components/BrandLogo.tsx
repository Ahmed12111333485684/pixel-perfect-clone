import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import logoImg from "@/assets/logo.png";

export function BrandLogo({ to = "/", className }: { to?: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <Link to={to} className={`flex items-center ${className ?? ""}`}>
      <img src={logoImg} alt={t("brand.name")} className="h-34 w-auto object-contain" />
    </Link>
  );
}
