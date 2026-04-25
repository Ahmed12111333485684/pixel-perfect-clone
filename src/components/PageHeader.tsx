import { useTranslation } from "react-i18next";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ message, icon }: { message?: string; icon?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center text-muted-foreground">
      {icon}
      <p>{message ?? t("common.empty")}</p>
    </div>
  );
}

export function LoadingBlock() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-12 text-sm text-muted-foreground">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
      {t("common.loading")}
    </div>
  );
}

export function ErrorBlock({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message ?? t("common.error")}
    </div>
  );
}

export function StatusBadge({ children, tone = "neutral" }: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "destructive" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    info: "bg-accent text-accent-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
