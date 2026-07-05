import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Building2, ImagePlus, ScrollText, Sparkles, Mail, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PublicFooter } from "@/components/PublicFooter";
import { Card } from "@/components/ui/card";
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
  return (
    <div className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="relative inline-flex items-center justify-center">
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
          className="pointer-events-none absolute -top-24 -left-24 -z-10 h-72 w-72 rounded-full bg-gold/20 blur-3xl motion-safe:animate-float-slow"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-10 right-0 -z-10 h-80 w-80 rounded-full bg-primary/40 blur-3xl motion-safe:animate-float-slow"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 pb-40 pt-40 text-white md:pt-56">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 duration-700">
            <Sparkles className="h-3.5 w-3.5 text-gold motion-safe:animate-spin-slow" />
            <span className="motion-safe:animate-shimmer bg-gradient-to-r from-white/70 via-white to-white/70 bg-clip-text text-transparent">
              {t("brand.tagline")}
            </span>
          </span>
          <h1 className="max-w-3xl text-balance font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 duration-1000 delay-100">
            {t("landing.heroTitle")}
          </h1>
          <p className="max-w-2xl text-balance text-lg text-white/85 md:text-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 duration-1000 delay-300">
            {t("landing.heroSubtitle")}
          </p>
          <div className="flex flex-wrap gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 duration-1000 delay-500">
            <Button
              asChild
              size="lg"
              className="group bg-gold-gradient text-gold-foreground shadow-gold transition-all duration-300 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-elegant"
            >
              <Link to="/list-property">{t("landing.listProperty")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/25 hover:text-white"
            >
              <Link to="/available-properties">{t("publicProperties.browse")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/25 hover:text-white"
            >
              <Link to="/property-request">
                {t("landing.findProperty") || "Find Your Property"}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="group/btn border-white/40 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/25 hover:text-white"
            >
              <a href="#contact">
                <Mail className="h-4 w-4 transition-transform duration-300 group-hover/btn:-rotate-12" />
                {t("footer.contactCta")}
              </a>
            </Button>
          </div>
        </div>
        {/* Soft transition into the card section */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-background via-background/80 to-transparent"
          aria-hidden
        />
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto -mt-24 max-w-7xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: ImagePlus, title: t("landing.feature1Title"), body: t("landing.feature1Body") },
            { icon: Building2, title: t("landing.feature2Title"), body: t("landing.feature2Body") },
            {
              icon: ScrollText,
              title: t("landing.feature3Title"),
              body: t("landing.feature3Body"),
            },
          ].map((f, i) => (
            <Card
              key={i}
              className="group relative overflow-hidden p-7 shadow-card transition-all duration-500 hover:-translate-y-2 hover:shadow-elegant motion-safe:animate-rise-in"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gold/0 via-gold/0 to-gold/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-0 transition group-hover:opacity-100" />
            </Card>
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
