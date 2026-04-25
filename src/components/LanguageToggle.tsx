import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { applyLangToDocument, persistLang } from "@/lib/i18n";
import { useEffect } from "react";

export function LanguageToggle({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const { i18n } = useTranslation();
  const current = i18n.language === "ar" ? "ar" : "en";

  useEffect(() => {
    applyLangToDocument(current);
  }, [current]);

  const toggle = () => {
    const next = current === "en" ? "ar" : "en";
    i18n.changeLanguage(next);
    persistLang(next);
    applyLangToDocument(next);
  };

  return (
    <Button variant={variant} size="sm" onClick={toggle} className="gap-2">
      <Languages className="h-4 w-4" />
      <span className="font-medium">{current === "en" ? "العربية" : "English"}</span>
    </Button>
  );
}
