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
  const footerRef = useRef<HTMLElement | null>(null);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const section = cardsSectionRef.current;
    if (!section) return;

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

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFooterVisible(true);
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(footer);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-22">
        <div className="relative h-[6.5rem] w-full">
          <div className="absolute -right-6 top-5 inline-flex items-center justify-center motion-safe:animate-rise-in" style={{ animationDelay: "80ms" }}>
            <div
              aria-hidden
              className="absolute inset-x-[-32px] inset-y-[-24px] -z-10 rounded-full bg-white/30 blur-[48px] motion-safe:animate-pulse"
            />
            <BrandLogo />
          </div>
          <div className="absolute left-4 top-5 flex items-center gap-2 text-white motion-safe:animate-rise-in sm:left-6 md:left-8" style={{ animationDelay: "180ms" }}>
            <LanguageToggle />
            <Link
              to="/login"
              className="hidden rounded-md border border-white/20 px-4 py-2 text-sm font-medium backdrop-blur-md transition-all hover:bg-white/10 hover:scale-105 sm:inline-flex"
            >
              {t("nav.signIn")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center motion-safe:animate-ken-burns"
          style={{ backgroundImage: `url(${heroImg})` }}
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/85 via-primary/70 to-primary/40"
          aria-hidden
        />
        {/* Floating ambient orbs */}
        <div
          aria-hidden
          className="absolute -left-24 top-1/4 h-64 w-64 rounded-full bg-white/10 blur-[80px] motion-safe:animate-float-slow"
          style={{ animationDelay: "0s" }}
        />
        <div
          aria-hidden
          className="absolute -right-16 bottom-1/3 h-48 w-48 rounded-full bg-gold/20 blur-[64px] motion-safe:animate-float-slow"
          style={{ animationDelay: "2s" }}
        />
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 pb-24 pt-40 text-white md:pt-56">
          <div
            aria-hidden
            className="absolute left-0 top-24 -z-10 h-[22rem] w-[44rem] max-w-[92vw] rounded-full bg-black/18 blur-3xl"
          />
          <span
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] bg-[length:200%_100%] px-3 py-1 text-xs font-medium backdrop-blur shadow-[0_8px_24px_rgba(0,0,0,0.22)] motion-safe:animate-shimmer"
            style={{ animationDelay: "0.1s" }}
          >
            <Sparkles className="h-3.5 w-3.5 text-gold motion-safe:animate-spin-slow" />
            {t("brand.tagline")}
          </span>
          <h1
            className="max-w-3xl text-balance font-display text-5xl font-bold leading-tight tracking-tight drop-shadow-[0_10px_26px_rgba(0,0,0,0.55)] md:text-7xl motion-safe:animate-rise-in"
            style={{ animationDelay: "0.2s" }}
          >
            {t("landing.heroTitle")}
          </h1>
          <p
            className="max-w-2xl text-balance text-lg text-white/90 drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)] md:text-xl motion-safe:animate-rise-in"
            style={{ animationDelay: "0.35s" }}
          >
            {t("landing.heroSubtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="motion-safe:animate-rise-in" style={{ animationDelay: "0.5s" }}>
              <Button
                asChild
                size="lg"
                className="bg-gold-gradient text-gold-foreground shadow-gold transition-all hover:opacity-95 hover:-translate-y-0.5 hover:scale-105"
              >
                <Link to="/list-property">{t("landing.listProperty")}</Link>
              </Button>
            </div>
            <div className="motion-safe:animate-rise-in" style={{ animationDelay: "0.62s" }}>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur transition-all hover:bg-white/25 hover:text-white hover:-translate-y-0.5 hover:scale-105"
              >
                <Link to="/available-properties">{t("publicProperties.browse")}</Link>
              </Button>
            </div>
            <div className="motion-safe:animate-rise-in" style={{ animationDelay: "0.74s" }}>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur transition-all hover:bg-white/25 hover:text-white hover:-translate-y-0.5 hover:scale-105"
              >
                <Link to="/property-request">
                  {t("landing.findProperty") || "Find Your Property"}
                </Link>
              </Button>
            </div>
            <div className="motion-safe:animate-rise-in" style={{ animationDelay: "0.86s" }}>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur transition-all hover:bg-white/25 hover:text-white hover:-translate-y-0.5 hover:scale-105"
              >
                <a href="#contact">
                  <Mail className="h-4 w-4" />
                  {t("footer.contactCta")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={cardsSectionRef} className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Search, title: t("landing.feature1Title"), body: t("landing.feature1Body") },
            { icon: Handshake, title: t("landing.feature2Title"), body: t("landing.feature2Body") },
            { icon: ShieldCheck, title: t("landing.feature3Title"), body: t("landing.feature3Body") },
          ].map((f, i) => (
            <div
              key={i}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-card transition-all duration-700 hover:-translate-y-2 hover:shadow-elegant motion-reduce:transition-none ${
                cardsVisible
                  ? "opacity-100 motion-safe:animate-rise-in"
                  : "translate-y-6 opacity-0"
              }`}
              style={{ animationDelay: cardsVisible ? `${i * 150 + 200}ms` : "0ms" }}
            >
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <f.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </section>

      <div
        ref={footerRef as React.RefObject<HTMLDivElement>}
        className={`transition-all duration-700 ease-out motion-reduce:transition-none motion-safe:animate-rise-in ${
          footerVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        }`}
        style={{ animationDelay: "120ms" }}
      >
        <PublicFooter />
      </div>
    </div>
  );
}
