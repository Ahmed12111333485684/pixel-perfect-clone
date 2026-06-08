import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, CheckCircle2, ClipboardList, Send, Users } from "lucide-react";
import { toast } from "sonner";
import {
  api,
  type EmployeeProductivityRecord,
  type EmployeeProductivityUpsertDto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

type MetricKey = keyof EmployeeProductivityUpsertDto;

const METRICS: Array<{ key: MetricKey; labelKey: string }> = [
  { key: "callIntakeCount", labelKey: "productivity.metrics.callIntakeCount" },
  { key: "servedClientsCount", labelKey: "productivity.metrics.servedClientsCount" },
  { key: "officeVisitorsCount", labelKey: "productivity.metrics.officeVisitorsCount" },
  { key: "whatsappClientsCount", labelKey: "productivity.metrics.whatsappClientsCount" },
  { key: "googleMapsReviewsCount", labelKey: "productivity.metrics.googleMapsReviewsCount" },
  { key: "brokerageContractsCount", labelKey: "productivity.metrics.brokerageContractsCount" },
  { key: "leaseContractsCount", labelKey: "productivity.metrics.leaseContractsCount" },
  { key: "propertyPhotographyCount", labelKey: "productivity.metrics.propertyPhotographyCount" },
  {
    key: "hashemPropertyPhotographyCount",
    labelKey: "productivity.metrics.hashemPropertyPhotographyCount",
  },
  { key: "inspectionCount", labelKey: "productivity.metrics.inspectionCount" },
  { key: "contentWritingCount", labelKey: "productivity.metrics.contentWritingCount" },
];

export const Route = createFileRoute("/app/employee-productivity")({
  component: EmployeeProductivityPage,
});

function EmployeeProductivityPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();
  const isAdmin = auth.hasRole("Admin");

  const productivity = useQuery({
    queryKey: ["employee-productivity", isAdmin ? "all" : "mine"],
    queryFn: () =>
      api<EmployeeProductivityRecord[]>(
        isAdmin ? "/employee-productivity" : "/employee-productivity/mine",
      ),
    enabled: auth.isStaff,
  });

  const submit = useMutation({
    mutationFn: (body: EmployeeProductivityUpsertDto) =>
      api("/employee-productivity", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-productivity"] });
      toast.success(t("common.success"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = productivity.data ?? [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayReport = rows.find((row) => row.workDate.slice(0, 10) === todayKey);

  const summary = useMemo(() => {
    const empty = {
      reports: 0,
      total: 0,
      employees: 0,
      todayReports: 0,
      byEmployee: new Map<string, number>(),
      recentEntries: [] as EmployeeProductivityRecord[],
      metricTotals: METRICS.reduce(
        (acc, metric) => ({ ...acc, [metric.key]: 0 }),
        {} as Record<MetricKey, number>,
      ),
    };

    if (rows.length === 0) return empty;

    const metricTotals = METRICS.reduce(
      (acc, metric) => ({ ...acc, [metric.key]: 0 }),
      {} as Record<MetricKey, number>,
    );
    const byEmployee = new Map<string, number>();
    let total = 0;

    for (const row of rows) {
      const rowTotal = METRICS.reduce((sum, metric) => sum + Number(row[metric.key] ?? 0), 0);
      total += rowTotal;
      byEmployee.set(row.employeeUsername, (byEmployee.get(row.employeeUsername) ?? 0) + rowTotal);
      for (const metric of METRICS) metricTotals[metric.key] += Number(row[metric.key] ?? 0);
    }

    const recentEntries = [...rows]
      .sort((left, right) => new Date(right.workDate).getTime() - new Date(left.workDate).getTime())
      .slice(0, 5);
    const todayReports = rows.filter((row) => row.workDate.slice(0, 10) === todayKey).length;

    return {
      reports: rows.length,
      total,
      employees: byEmployee.size,
      todayReports,
      byEmployee,
      recentEntries,
      metricTotals,
    };
  }, [rows, todayKey]);

  const employeeBreakdown = useMemo(() => {
    const grouped = new Map<string, { reports: number; total: number; latestWorkDate: string }>();

    for (const row of rows) {
      const rowTotal = METRICS.reduce((sum, metric) => sum + Number(row[metric.key] ?? 0), 0);
      const current = grouped.get(row.employeeUsername);
      if (!current) {
        grouped.set(row.employeeUsername, {
          reports: 1,
          total: rowTotal,
          latestWorkDate: row.workDate,
        });
        continue;
      }

      current.reports += 1;
      current.total += rowTotal;
      if (new Date(row.workDate).getTime() > new Date(current.latestWorkDate).getTime()) {
        current.latestWorkDate = row.workDate;
      }
    }

    return Array.from(grouped.entries())
      .map(([employeeUsername, stats]) => ({
        employeeUsername,
        ...stats,
        averagePerReport: stats.reports > 0 ? stats.total / stats.reports : 0,
      }))
      .sort((left, right) => right.total - left.total);
  }, [rows]);

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openEmployeeDetail = (username: string) => {
    setSelectedEmployee(username);
    setDetailOpen(true);
  };

  const detailRows = useMemo(() => {
    if (!selectedEmployee) return [] as EmployeeProductivityRecord[];
    return rows
      .filter((r) => r.employeeUsername === selectedEmployee)
      .sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());
  }, [rows, selectedEmployee]);

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("productivity.adminTitle")}
          subtitle={t("productivity.adminSubtitle")}
          actions={
            <Button asChild variant="outline">
              <Link to="/app">{t("nav.dashboard")}</Link>
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AnalyticsCard
            icon={<ClipboardList className="h-5 w-5" />}
            label={t("productivity.totalReports")}
            value={String(summary.reports)}
          />
          <AnalyticsCard
            icon={<Users className="h-5 w-5" />}
            label={t("productivity.byEmployee")}
            value={String(summary.employees)}
          />
          <AnalyticsCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label={t("productivity.todayReport")}
            value={String(summary.todayReports)}
          />
          <AnalyticsCard
            icon={<Activity className="h-5 w-5" />}
            label={t("productivity.totalActions")}
            value={String(summary.total)}
            accent
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-4 font-display text-lg font-semibold">
              {t("productivity.analytics")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {METRICS.map((metric) => (
                <div key={metric.key} className="rounded-xl border border-border bg-background p-3">
                  <div className="text-xs text-muted-foreground">{t(metric.labelKey)}</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">
                    {summary.metricTotals[metric.key]}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
            <h3 className="mb-4 font-display text-lg font-semibold">
              {t("productivity.employeeBreakdown")}
            </h3>
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground">
                <div>{t("common.username")}</div>
                <div className="text-end">{t("productivity.totalActions")}</div>
                <div className="text-end">{t("productivity.totalReports")}</div>
                <div className="text-end">{t("productivity.latestReport")}</div>
              </div>
              <div className="divide-y divide-border">
                {employeeBreakdown.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {t("common.empty")}
                  </div>
                ) : (
                  employeeBreakdown.map((employee) => (
                    <div
                      key={employee.employeeUsername}
                      onClick={() => openEmployeeDetail(employee.employeeUsername)}
                      className="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-3 text-sm cursor-pointer hover:bg-muted/5"
                    >
                      <div className="min-w-0 font-medium truncate">
                        {employee.employeeUsername}
                      </div>
                      <div className="text-end tabular-nums">{employee.total}</div>
                      <div className="text-end tabular-nums">{employee.reports}</div>
                      <div className="text-end text-muted-foreground">
                        {formatDate(employee.latestWorkDate)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {t("productivity.employeeReportsFor", { name: selectedEmployee ?? "" })}
                </DialogTitle>
                <DialogDescription>{t("productivity.employeeBreakdown")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {detailRows.length === 0 ? (
                  <div className="rounded-xl border border-border bg-background px-3 py-6 text-center text-sm text-muted-foreground">
                    {t("common.empty")}
                  </div>
                ) : (
                  detailRows.map((entry) => {
                    const entryTotal = METRICS.reduce(
                      (sum, metric) => sum + Number(entry[metric.key] ?? 0),
                      0,
                    );
                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-border bg-background p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{formatDate(entry.workDate)}</div>
                            <div className="text-xs text-muted-foreground">
                              {entry.employeeUsername}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold tabular-nums">{entryTotal}</div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          {METRICS.map((metric) => (
                            <div key={metric.key} className="flex items-center justify-between">
                              <div>{t(metric.labelKey)}</div>
                              <div className="tabular-nums">{entry[metric.key] ?? 0}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </DialogContent>
          </Dialog>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-4 font-display text-lg font-semibold">
              {t("productivity.recentEntries")}
            </h3>
            <div className="space-y-2">
              {summary.recentEntries.length === 0 ? (
                <div className="rounded-xl border border-border bg-background px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("common.empty")}
                </div>
              ) : (
                summary.recentEntries.map((entry) => {
                  const entryTotal = METRICS.reduce(
                    (sum, metric) => sum + Number(entry[metric.key] ?? 0),
                    0,
                  );
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{entry.employeeUsername}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(entry.workDate)}
                        </div>
                      </div>
                      <Badge variant="outline" className="tabular-nums">
                        {entryTotal}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("productivity.pageTitle")} subtitle={t("productivity.pageSubtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard
          icon={<ClipboardList className="h-5 w-5" />}
          label={t("productivity.totalReports")}
          value={String(summary.reports)}
        />
        <AnalyticsCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label={t("productivity.todayReport")}
          value={String(summary.todayReports)}
        />
        <AnalyticsCard
          icon={<Activity className="h-5 w-5" />}
          label={t("productivity.totalActions")}
          value={String(summary.total)}
          accent
        />
        <AnalyticsCard
          icon={<Users className="h-5 w-5" />}
          label={t("productivity.byEmployee")}
          value={auth.user?.username ?? "—"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">
                {t("productivity.todayReport")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {todayReport ? t("common.updated") : t("productivity.submitReport")}
              </p>
            </div>
            {todayReport && <Badge variant="outline">{formatDate(todayReport.workDate)}</Badge>}
          </div>

          <form
            key={todayReport?.id ?? "new"}
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const body = METRICS.reduce((acc, metric) => {
                const raw = String(formData.get(metric.key) ?? "0").trim();
                const value = Number(raw || 0);
                acc[metric.key] = Number.isFinite(value) && value >= 0 ? value : 0;
                return acc;
              }, {} as EmployeeProductivityUpsertDto);
              submit.mutate(body);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {METRICS.map((metric) => (
                <div key={metric.key} className="space-y-2">
                  <Label htmlFor={metric.key} className="text-xs font-medium">
                    {t(metric.labelKey)}
                  </Label>
                  <Input
                    id={metric.key}
                    name={metric.key}
                    type="number"
                    min={0}
                    defaultValue={todayReport?.[metric.key] ?? 0}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submit.isPending}>
                <Send className="me-2 h-4 w-4" />
                {t("productivity.submitReport")}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 font-display text-lg font-semibold">{t("productivity.history")}</h3>
          <div className="space-y-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-border bg-background px-3 py-6 text-center text-sm text-muted-foreground">
                {t("common.empty")}
              </div>
            ) : (
              rows.map((entry) => {
                const entryTotal = METRICS.reduce((sum, metric) => sum + entry[metric.key], 0);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{formatDate(entry.workDate)}</div>
                      <div className="text-xs text-muted-foreground">{entry.employeeUsername}</div>
                    </div>
                    <Badge variant="outline" className="tabular-nums">
                      {entryTotal}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AnalyticsCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-4 shadow-card ${accent ? "ring-1 ring-gold/20" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${accent ? "bg-gold-gradient text-gold-foreground" : "bg-muted text-foreground/70"}`}
        >
          {icon}
        </span>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-xl font-semibold tracking-tight">{value}</div>
        </div>
      </div>
    </div>
  );
}
