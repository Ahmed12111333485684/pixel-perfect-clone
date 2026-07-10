import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

function SocialLink({ href, title, color, children }: { href: string; title: string; color: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition ${color}`}
    >
      {children}
    </a>
  );
}

export function PublicFooter() {
  const { t } = useTranslation();
  const email = "hh0hashim@gmail.com";
  const phone = "+966 0597948787";
  const addressLine1 = t("footer.addressLine1");
  const addressLine2 = t("footer.addressLine2")

  return (
    <footer id="contact" className="border-t border-border bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="flex flex-col items-center">
            <BrandLogo className="justify-center" />
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed text-center">{t("footer.tagline")}</p>
          </div>
          
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
                <div>
                <div>{addressLine1}</div>
                <div>{addressLine2}</div>
                </div>
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
              {/* <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Globe className="h-3.5 w-3.5" />
              </span> */}
              {/* الصفحة الرسمية */}
            </h3>
            {/* <a href="https://linkfaal.com/hashim" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
              <span className="text-base">🔗</span>
              <span>linkfaal.com/hashim</span>
            </a> */}
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
        <div className="mx-auto max-w-7xl px-6 py-8">
          <h3 className="mb-6 text-center font-display text-base font-semibold">{t("footer.followUs")}</h3>
          <div className="flex flex-wrap justify-center gap-3">
            <SocialLink href={`mailto:${email}`} title="Email" color="hover:text-foreground">
              <Mail className="h-5 w-5" />
            </SocialLink>
            <SocialLink href="https://instagram.com/servic_rmed" title="Instagram" color="hover:text-pink-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="5"/>
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://t.me/+_pPZHofhPyI2ZWU0" title="Telegram" color="hover:text-sky-500">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://x.com/Servic_RMED" title="X.com" color="hover:text-foreground">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://linkedin.com/in/%D9%85%D9%83%D8%AA%D8%A8-%D9%86%D9%88%D8%B1-%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D8%B4%D8%A7%D8%B1%D8%A9-901a182a5/" title="LinkedIn" color="hover:text-blue-600">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://youtube.com/@%D9%86%D9%88%D8%B1%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D8%B4%D8%A7%D8%B1%D8%A9" title="YouTube" color="hover:text-red-600">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://snapchat.com/add/light.n0r?sender_web_id=afabca07-76bf-4b9d-a228-f723130c75d3&device_type=desktop&is_copy_url=true" title="Snapchat" color="hover:text-yellow-400">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://tiktok.com/@light.n0r?_t=ZS-8t5ezbXR3TT&_r=1" title="TikTok" color="hover:text-foreground">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://facebook.com/profile.php?id=61555036924306" title="Facebook" color="hover:text-blue-600">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://wa.me/966597948787" title="WhatsApp" color="hover:text-green-500">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
            </SocialLink>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
