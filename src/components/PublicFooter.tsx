import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export function PublicFooter() {
  const { t } = useTranslation();
  const email = "hello@estatly.com";
  const phone = "+966 50 000 0000";
  const address = t("footer.address");

  return (
    <footer id="contact" className="border-t border-border bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <BrandLogo />
          <p className="text-sm text-muted-foreground max-w-xs">{t("footer.tagline")}</p>
        </div>

        <div className="space-y-3">
          <h3 className="font-display text-base font-semibold">{t("footer.contact")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-gold" />
              <a href={`mailto:${email}`} className="hover:text-foreground transition">{email}</a>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-gold" />
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-foreground transition" dir="ltr">{phone}</a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-gold" />
              <span>{address}</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="font-display text-base font-semibold">{t("footer.explore")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground transition">{t("publicProperties.home")}</Link></li>
            <li><Link to="/available-properties" className="hover:text-foreground transition">{t("publicProperties.browse")}</Link></li>
            <li><Link to="/list-property" className="hover:text-foreground transition">{t("publicProperties.listYourProperty")}</Link></li>
            <li><Link to="/login" className="hover:text-foreground transition">{t("nav.signIn")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}</p>
          <p>{t("footer.madeWith")}</p>
        </div>
      </div>
    </footer>
  );
}
