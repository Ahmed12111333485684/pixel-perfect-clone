import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Estatly" },
      { name: "description", content: "Sign in to the Estatly backoffice." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await auth.login(username, password);
      navigate({ to: "/app" });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message || t("auth.invalid"));
      else setError(t("auth.invalid"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-hero p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandLogo />
        <div className="space-y-4">
          <h2 className="font-display text-4xl leading-tight">{t("brand.tagline")}</h2>
          <p className="max-w-md text-white/80">{t("auth.subtitle")}</p>
        </div>
        <div className="text-xs text-white/60">© {new Date().getFullYear()} Estatly</div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← {t("brand.name")}
          </Link>
          <LanguageToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-semibold">{t("auth.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t("common.username")}</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("common.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("nav.signIn")}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              <Link to="/list-property" className="hover:text-foreground">
                {t("nav.submitLead")} →
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
