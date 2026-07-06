import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Globe } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export function PublicFooter() {
  const { t } = useTranslation();
  const email = "Light0consultation@gmail.com";
  const phone = "+966 0597948787";
  const address = t("footer.address");

  return (
    <footer id="contact" className="border-t border-border bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <BrandLogo />
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{t("footer.tagline")}</p>
          
          <div className="pt-2 space-y-3">
            <h3 className="font-display text-base font-semibold">{t("footer.contact")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-gold" />
                <a href={`mailto:${email}`} className="hover:text-foreground transition">
                  {email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-gold" />
                <a
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="hover:text-foreground transition"
                  dir="ltr"
                >
                  {phone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-gold" />
                <span>{address}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
            </span>
            قنوات الواتساب
          </h3>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li>
              <a href="https://whatsapp.com/channel/0029VapGV8z77qVMurN92y1T" target="_blank" rel="noreferrer" className="flex items-center gap-2 group hover:text-foreground transition">
                <span className="text-base">☀️</span>
                <span>عروض الإيجارات العقارية</span>
              </a>
            </li>
            {/* <li>
              <a href="https://wa.me/966597948787" target="_blank" rel="noreferrer" className="flex items-center gap-2 group hover:text-foreground transition">
                <span className="text-base">📞</span>
                <span>خدمة العملاء</span>
              </a>
            </li> */}
            <li>
              <a href="https://whatsapp.com/channel/0029VbBAa2yL7UVPVVQosX2i" target="_blank" rel="noreferrer" className="flex items-center gap-2 group hover:text-foreground transition">
                <span className="text-base">☀️</span>
                <span>عروض التمليك العقارية</span>
              </a>
            </li>
            <li>
              <a href="https://whatsapp.com/channel/0029VarsTrD9mrGikrkbnz2J" target="_blank" rel="noreferrer" className="flex items-center gap-2 group hover:text-foreground transition">
                <span className="text-base">☀️</span>
                <span>عروض البيع العقارية</span>
              </a>
            </li>
            <li>
              <a href="https://whatsapp.com/channel/0029VbAhwvQG3R3dfqS7eG3V" target="_blank" rel="noreferrer" className="flex items-center gap-2 group hover:text-foreground transition">
                <span className="text-base">☀️</span>
                <span>عروض الفرص الاستثمارية</span>
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-display text-base font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </span>
              قنوات التليجرام
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href="https://t.me/nor_2030a" target="_blank" rel="noreferrer" className="flex items-center gap-2 group hover:text-foreground transition">
                  <span className="text-base">🔹</span>
                  <span>عروض البيع العقارية</span>
                </a>
              </li>
              <li>
                <a href="https://t.me/light0consultation" target="_blank" rel="noreferrer" className="flex items-center gap-2 group hover:text-foreground transition">
                  <span className="text-base">🔹</span>
                  <span>عروض الإيجارات العقارية</span>
                </a>
              </li>
              <li>
                <a href="https://t.me/+uaBQAtZjdHI0ZDY0" target="_blank" rel="noreferrer" className="flex items-center gap-2 group hover:text-foreground transition">
                  <span className="text-base">🔹</span>
                  <span>عروض الفرص الاستثمارية</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4 pt-2 border-t border-border/50">
            <h3 className="font-display text-base font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Globe className="h-3.5 w-3.5" />
              </span>
              الصفحة الرسمية
            </h3>
            <a href="https://linkfaal.com/hashim" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
              <span className="text-base">🔗</span>
              <span>linkfaal.com/hashim</span>
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-display text-base font-semibold">{t("footer.explore")}</h3>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground transition">
                {t("publicProperties.home")}
              </Link>
            </li>
            <li>
              <Link to="/available-properties" className="hover:text-foreground transition">
                {t("publicProperties.browse")}
              </Link>
            </li>
            <li>
              <Link to="/list-property" className="hover:text-foreground transition">
                {t("publicProperties.listYourProperty")}
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-foreground transition">
                {t("nav.signIn")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}
          </p>
          <p>{t("footer.madeWith")}</p>
        </div>
      </div>
    </footer>
  );
}
