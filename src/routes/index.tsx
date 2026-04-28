import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Building2, ImagePlus, ScrollText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import heroImg from "@/assets/hero-property.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estatly — Property Management for Owners & Agencies" },
      { name: "description", content: "Manage owners, properties, leads, contracts, and payments — all in one elegant platform." },
      { property: "og:title", content: "Estatly — Property Management" },
      { property: "og:description", content: "Manage owners, properties, leads, contracts, and payments — all in one place." },
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
          <div className="text-white">
            <BrandLogo />
          </div>
          <div className="flex items-center gap-2 text-white">
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
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/80 via-primary/60 to-background" aria-hidden />
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 pb-24 pt-40 text-white md:pt-56">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            {t("brand.tagline")}
          </span>
          <h1 className="max-w-3xl text-balance font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="max-w-2xl text-balance text-lg text-white/85 md:text-xl">
            {t("landing.heroSubtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-gold-gradient text-gold-foreground shadow-gold hover:opacity-95">
              <Link to="/list-property">{t("landing.listProperty")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white">
              <Link to="/available-properties">{t("publicProperties.browse")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
            >
              <Link to="/login">{t("landing.backofficeSignIn")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: ImagePlus, title: t("landing.feature1Title"), body: t("landing.feature1Body") },
            { icon: Building2, title: t("landing.feature2Title"), body: t("landing.feature2Body") },
            { icon: ScrollText, title: t("landing.feature3Title"), body: t("landing.feature3Body") },
          ].map((f, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-card transition hover:shadow-elegant"
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

      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <BrandLogo />
          <p>© {new Date().getFullYear()} {t("brand.name")}.</p>
        </div>
      </footer>
    </div>
  );
}
