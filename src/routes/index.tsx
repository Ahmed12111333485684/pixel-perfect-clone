import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Handshake, Mail, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PublicFooter } from "@/components/PublicFooter";
import heroImg from "@/assets/hero-property.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نور الاستشارة — متميزون في طرح العروض العقارية" },
      {
        name: "description",
        content:
          "مكتب نور الاستشارة: متميزون في طرح العروض العقارية ونتجاوب مع عروضكم وطلباتكم العقارية",
      },
      { property: "og:title", content: "نور الاستشارة" },
      {
        property: "og:description",
        content: "مكتب نور الاستشارة: متميزون في طرح العروض العقارية ونتجاوب مع عروضكم وطلباتكم العقارية",
      },
      { property: "og:image", content: heroImg },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
  const cardsSectionRef = useRef<HTMLElement | null>(null);
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    const section = cardsSectionRef.current;

    if (!section) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCardsVisible(true);
        }
      },
      {
        threshold: 0.35,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="relative inline-flex translate-x-2 items-center justify-center sm:translate-x-3">
            <div
              aria-hidden
              className="absolute inset-x-[-32px] inset-y-[-24px] -z-10 rounded-full bg-white/30 blur-[48px] motion-safe:animate-pulse"
            />
            <BrandLogo />
          </div>
          <div className="flex items-center gap-2 text-white motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 duration-500 delay-150">
            <LanguageToggle />
            <Link
              to="/login"
              className="hidden rounded-md border border-white/20 px-4 py-2 text-sm font-medium backdrop-blur-md transition hover:bg-white/10 sm:inline-flex"
            >
              {t("nav.signIn")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImg})` }}
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/85 via-primary/70 to-primary/40"
          aria-hidden
        />
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 pb-24 pt-40 text-white md:pt-56">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 duration-700">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            {t("brand.tagline")}
          </span>
          <h1 className="max-w-3xl text-balance font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 duration-700 delay-100">
            {t("landing.heroTitle")}
          </h1>
          <p className="max-w-2xl text-balance text-lg text-white/85 md:text-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 duration-700 delay-200">
            {t("landing.heroSubtitle")}
          </p>
          <div className="flex flex-wrap gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 duration-700 delay-300">
            <Button
              asChild
              size="lg"
              className="bg-gold-gradient text-gold-foreground shadow-gold hover:opacity-95"
            >
              <Link to="/list-property">{t("landing.listProperty")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur hover:bg-white/25 hover:text-white"
            >
              <Link to="/available-properties">{t("publicProperties.browse")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur hover:bg-white/25 hover:text-white"
            >
              <Link to="/property-request">
                {t("landing.findProperty") || "Find Your Property"}
              </Link>
            </Button>
            {/* <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur hover:bg-white/25 hover:text-white"
            >
              <Link to="/login">{t("landing.backofficeSignIn")}</Link>
            </Button> */}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur hover:bg-white/25 hover:text-white"
            >
              <a href="#contact">
                <Mail className="h-4 w-4" />
                {t("footer.contactCta")}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={cardsSectionRef} className="mx-auto max-w-7xl px-6 py-20">
        <div
          className={`grid gap-6 transition-all duration-700 ease-out motion-reduce:transition-none md:grid-cols-3 ${
            cardsVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-10 scale-[0.98] opacity-0"
          }`}
        >
          {[
            { icon: Search, title: t("landing.feature1Title"), body: t("landing.feature1Body") },
            { icon: Handshake, title: t("landing.feature2Title"), body: t("landing.feature2Body") },
            { icon: ShieldCheck, title: t("landing.feature3Title"), body: t("landing.feature3Body") },
          ].map((f, i) => (
            <div
              key={i}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-card transition-all duration-700 hover:-translate-y-1 hover:shadow-elegant motion-reduce:transition-none ${
                cardsVisible
                  ? "translate-y-0 opacity-100 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
                  : "translate-y-6 opacity-0"
              }`}
              style={{ animationDelay: cardsVisible ? `${i * 120}ms` : "0ms" }}
            >
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-0 transition group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
