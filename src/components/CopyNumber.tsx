import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { formatPhone } from "@/lib/clients";

interface CopyNumberProps {
  phone: string;
  className?: string;
}

export function CopyNumber({ phone, className }: CopyNumberProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const display = formatPhone(phone);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      dir="ltr"
      onClick={copy}
      title={t("clients.copyPhone")}
      aria-label={t("clients.copyPhone")}
      className={`inline-flex cursor-pointer items-center gap-1 rounded-md -mx-1 px-1 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none ${className ?? ""}`}
    >
      {display}
      {copied && <Check className="h-3.5 w-3.5 text-green-600" />}
    </button>
  );
}
