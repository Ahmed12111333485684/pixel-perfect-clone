import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  api,
  type PropertyDto,
  type Owner,
  type Lead,
  type Contract,
  type Payment,
  type Sale,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Building2, Users, Inbox, ScrollText, ArrowRight, ArrowUpRight, ArrowDownRight,
  TrendingUp, DollarSign, AlertTriangle, CheckCircle2, Clock, Plus, BadgeDollarSign,
  Percent, Wallet, Activity,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, formatDate } from "@/lib/format";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

type Period = "7d" | "30d" | "90d" | "12m";

function periodToDays(p: Period): number {
  return p === "7d" ? 7 : p === "30d" ? 30 : p === "90d" ? 90 : 365;
}

function Dashboard() {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const isRtl = i18n.language === "ar";
  const [period, setPeriod] = useState<Period>("30d");

  const properties = useQuery({ queryKey: ["properties"], queryFn: () => api<PropertyDto[]>("/api/properties") });
  const owners = useQuery({
    queryKey: ["owners"],
    queryFn: () => api<Owner[]>("/api/owners"),
    enabled: auth.isStaff,
  });
  const leads = useQuery({
    queryKey: ["leads"],
    queryFn: () => api<Lead[]>("/api/leads"),
    enabled: auth.isStaff,
  });
  const contracts = useQuery({
    queryKey: ["contracts"],
    queryFn: () => api<Contract[]>("/api/contracts"),
  });
  const payments = useQuery({
    queryKey: ["payments"],
    queryFn: () => api<Payment[]>("/api/payments"),
  });
  const sales = useQuery({
    queryKey: ["sales"],
    queryFn: () => api<Sale[]>("/api/sales"),
  });

  const loading =
    properties.isLoading || contracts.isLoading || payments.isLoading || sales.isLoading;

  // ---------- Derived KPIs ----------
  const stats = useMemo(() => {
    const props = properties.data ?? [];
    const conts = contracts.data ?? [];
    const pays = payments.data ?? [];
    const sls = sales.data ?? [];
    const lds = leads.data ?? [];

    const now = Date.now();
    const periodMs = periodToDays(period) * 24 * 60 * 60 * 1000;
    const since = now - periodMs;
    const prevSince = since - periodMs;

    const within = <T extends { createdAt: string }>(arr: T[], from: number, to: number) =>
      arr.filter((x) => {
        const d = new Date(x.createdAt).getTime();
        return d >= from && d < to;
      });

    const paidPays = pays.filter((p) => p.status === "Paid");
    const periodRevenue = paidPays
      .filter((p) => {
        const d = new Date(p.paidDate ?? p.createdAt).getTime();
        return d >= since && d < now;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const prevRevenue = paidPays
      .filter((p) => {
        const d = new Date(p.paidDate ?? p.createdAt).getTime();
        return d >= prevSince && d < since;
      })
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const revenueDelta = prevRevenue === 0 ? (periodRevenue > 0 ? 100 : 0)
      : ((periodRevenue - prevRevenue) / prevRevenue) * 100;

    const periodSales = sls
      .filter((s) => new Date(s.soldAt).getTime() >= since)
      .reduce((sum, s) => sum + Number(s.salePrice || 0), 0);
    const prevSales = sls
      .filter((s) => {
        const d = new Date(s.soldAt).getTime();
        return d >= prevSince && d < since;
      })
      .reduce((sum, s) => sum + Number(s.salePrice || 0), 0);
    const salesDelta = prevSales === 0 ? (periodSales > 0 ? 100 : 0)
      : ((periodSales - prevSales) / prevSales) * 100;

    const approved = props.filter((p) => p.status === "Approved").length;
    const sold = props.filter((p) => p.status === "Sold").length;
    const pending = props.filter((p) => p.status === "Pending").length;
    const rejected = props.filter((p) => p.status === "Rejected").length;
    const rentable = approved;
    const activeContracts = conts.filter((c) => c.status === "Active").length;
    const occupancy = rentable > 0 ? (activeContracts / rentable) * 100 : 0;

    const overdue = pays.filter((p) => p.status === "Overdue").length;
    const overdueAmount = pays
      .filter((p) => p.status === "Overdue")
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const closedWon = lds.filter((l) => l.status === "ClosedWon").length;
    const closedLost = lds.filter((l) => l.status === "ClosedLost").length;
    const totalClosed = closedWon + closedLost;
    const conversion = totalClosed > 0 ? (closedWon / totalClosed) * 100 : 0;

    const openLeads = lds.filter((l) => l.status !== "ClosedLost" && l.status !== "ClosedWon").length;

    const avgRent = activeContracts > 0
      ? conts.filter((c) => c.status === "Active").reduce((s, c) => s + Number(c.monthlyRent || 0), 0) / activeContracts
      : 0;

    const avgSalePrice = sls.length > 0
      ? sls.reduce((s, x) => s + Number(x.salePrice || 0), 0) / sls.length
      : 0;

    const portfolioValue = sls.reduce((s, x) => s + Number(x.salePrice || 0), 0)
      + conts.filter((c) => c.status === "Active").reduce((s, c) => s + Number(c.monthlyRent || 0) * 12, 0);

    return {
      periodRevenue, revenueDelta,
      periodSales, salesDelta,
      approved, sold, pending, rejected,
      activeContracts, occupancy,
      overdue, overdueAmount,
      conversion, openLeads,
      avgRent, avgSalePrice, portfolioValue,
      counts: {
        properties: props.length,
        owners: owners.data?.length ?? 0,
        contracts: conts.length,
        leads: lds.length,
      },
      _within: within,
    };
  }, [properties.data, contracts.data, payments.data, sales.data, leads.data, owners.data, period]);

  // ---------- Chart data ----------
  const revenueSeries = useMemo(() => {
    const pays = payments.data ?? [];
    const sls = sales.data ?? [];
    const months: { key: string; label: string; rent: number; sales: number; total: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: d.toLocaleDateString(i18n.language, { month: "short" }),
        rent: 0, sales: 0, total: 0,
      });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const p of pays) {
      if (p.status !== "Paid") continue;
      const d = new Date(p.paidDate ?? p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const i = idx.get(key);
      if (i !== undefined) months[i].rent += Number(p.amount || 0);
    }
    for (const s of sls) {
      const d = new Date(s.soldAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const i = idx.get(key);
      if (i !== undefined) months[i].sales += Number(s.salePrice || 0);
    }
    months.forEach((m) => (m.total = m.rent + m.sales));
    return months;
  }, [payments.data, sales.data, i18n.language]);

  const propertyStatusData = useMemo(() => {
    const props = properties.data ?? [];
    return [
      { name: t("propertyStatus.Approved"), value: props.filter((p) => p.status === "Approved").length, color: "var(--success)" },
      { name: t("propertyStatus.Pending"), value: props.filter((p) => p.status === "Pending").length, color: "var(--warning)" },
      { name: t("propertyStatus.Sold"), value: props.filter((p) => p.status === "Sold").length, color: "var(--gold)" },
      { name: t("propertyStatus.Rejected"), value: props.filter((p) => p.status === "Rejected").length, color: "var(--destructive)" },
    ].filter((d) => d.value > 0);
  }, [properties.data, t]);

  const propertyTypeData = useMemo(() => {
    const props = properties.data ?? [];
    const map = new Map<string, number>();
    for (const p of props) map.set(p.type || "—", (map.get(p.type || "—") ?? 0) + 1);
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [properties.data]);

  const leadsFunnelData = useMemo(() => {
    const lds = leads.data ?? [];
    return [
      { name: t("leadStatus.New"), value: lds.filter((l) => l.status === "New").length },
      { name: t("leadStatus.Contacted"), value: lds.filter((l) => l.status === "Contacted").length },
      { name: t("leadStatus.Qualified"), value: lds.filter((l) => l.status === "Qualified").length },
      { name: t("leadStatus.ClosedWon"), value: lds.filter((l) => l.status === "ClosedWon").length },
    ];
  }, [leads.data, t]);

  const leadsByIntentData = useMemo(() => {
    const lds = leads.data ?? [];
    return (["Buy", "Rent", "Sell", "LetOut"] as const).map((k) => ({
      name: t(`intent.${k}`),
      value: lds.filter((l) => l.intent === k).length,
    })).filter((d) => d.value > 0);
  }, [leads.data, t]);

  const paymentsBreakdownData = useMemo(() => {
    const pays = payments.data ?? [];
    return [
      { name: t("paymentStatus.Paid"), value: pays.filter((p) => p.status === "Paid").length, color: "var(--success)" },
      { name: t("paymentStatus.Pending"), value: pays.filter((p) => p.status === "Pending").length, color: "var(--warning)" },
      { name: t("paymentStatus.Overdue"), value: pays.filter((p) => p.status === "Overdue").length, color: "var(--destructive)" },
    ].filter((d) => d.value > 0);
  }, [payments.data, t]);

  const recentLeads = useMemo(
    () => [...(leads.data ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [leads.data]
  );
  const recentSales = useMemo(
    () => [...(sales.data ?? [])].sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime()).slice(0, 5),
    [sales.data]
  );
  const upcomingPayments = useMemo(() => {
    const now = Date.now();
    return [...(payments.data ?? [])]
      .filter((p) => p.status !== "Paid" && new Date(p.dueDate).getTime() >= now - 7 * 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 6);
  }, [payments.data]);

  const topOwners = useMemo(() => {
    const props = properties.data ?? [];
    const map = new Map<number, number>();
    for (const p of props) map.set(p.ownerId, (map.get(p.ownerId) ?? 0) + 1);
    const ownerById = new Map((owners.data ?? []).map((o) => [o.id, o]));
    return Array.from(map.entries())
      .map(([id, count]) => ({ id, count, owner: ownerById.get(id) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [properties.data, owners.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="7d">{t("dashboard.last7Days")}</TabsTrigger>
            <TabsTrigger value="30d">{t("dashboard.last30Days")}</TabsTrigger>
            <TabsTrigger value="90d">{t("dashboard.last90Days")}</TabsTrigger>
            <TabsTrigger value="12m">{t("dashboard.last12Months")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Hero KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("dashboard.totalRevenue")}
          value={formatMoney(stats.periodRevenue)}
          delta={stats.revenueDelta}
          icon={<DollarSign className="h-5 w-5" />}
          accent="gold"
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.salesVolume")}
          value={formatMoney(stats.periodSales)}
          delta={stats.salesDelta}
          icon={<BadgeDollarSign className="h-5 w-5" />}
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.occupancyRate")}
          value={`${stats.occupancy.toFixed(1)}%`}
          subtitle={`${stats.activeContracts} / ${stats.approved}`}
          icon={<Percent className="h-5 w-5" />}
          tone="success"
          loading={loading}
        />
        <KpiCard
          label={t("dashboard.conversionRate")}
          value={`${stats.conversion.toFixed(1)}%`}
          subtitle={`${stats.openLeads} ${t("dashboard.leads").toLowerCase()}`}
          icon={<Activity className="h-5 w-5" />}
          tone="info"
          loading={loading}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          icon={<Building2 className="h-4 w-4" />}
          label={t("dashboard.properties")} value={stats.counts.properties}
          to="/app/properties" loading={properties.isLoading}
        />
        {auth.isStaff && (
          <MiniStat
            icon={<Users className="h-4 w-4" />}
            label={t("dashboard.owners")} value={stats.counts.owners}
            to="/app/owners" loading={owners.isLoading}
          />
        )}
        <MiniStat
          icon={<ScrollText className="h-4 w-4" />}
          label={t("dashboard.contracts")} value={stats.activeContracts}
          to="/app/contracts" loading={contracts.isLoading}
        />
        <MiniStat
          icon={<AlertTriangle className="h-4 w-4" />}
          label={t("dashboard.overduePayments")} value={stats.overdue}
          subtitle={formatMoney(stats.overdueAmount)}
          to="/app/payments" loading={payments.isLoading} tone="destructive"
        />
      </div>

      {/* Charts row 1: revenue trend + property mix */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t("dashboard.revenueTrend")} className="lg:col-span-2">
          {loading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueSeries} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-rent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--gold)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} reversed={isRtl} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  orientation={isRtl ? "right" : "left"} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="rent" name={t("common.monthlyRent")} stroke="var(--primary)" fill="url(#grad-rent)" strokeWidth={2} />
                <Area type="monotone" dataKey="sales" name={t("nav.sales")} stroke="var(--gold)" fill="url(#grad-sales)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={t("dashboard.propertyMix")}>
          {loading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : propertyStatusData.length === 0 ? (
            <EmptyChart label={t("dashboard.noData")} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={propertyStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {propertyStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2: leads funnel, payments, property types */}
      <div className="grid gap-4 lg:grid-cols-3">
        {auth.isStaff && (
          <ChartCard title={t("dashboard.leadsFunnel")}>
            {leads.isLoading ? <Skeleton className="h-[240px] w-full" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={leadsFunnelData} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} reversed={isRtl} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} orientation={isRtl ? "right" : "left"} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        )}

        <ChartCard title={t("dashboard.paymentsBreakdown")}>
          {payments.isLoading ? <Skeleton className="h-[240px] w-full" /> :
            paymentsBreakdownData.length === 0 ? <EmptyChart label={t("dashboard.noData")} /> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={paymentsBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                    {paymentsBreakdownData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </ChartCard>

        <ChartCard title={t("dashboard.propertyTypes")}>
          {properties.isLoading ? <Skeleton className="h-[240px] w-full" /> :
            propertyTypeData.length === 0 ? <EmptyChart label={t("dashboard.noData")} /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={propertyTypeData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={80} orientation={isRtl ? "right" : "left"} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" fill="var(--gold)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </ChartCard>
      </div>

      {/* Detail strip: avg rent / sale / portfolio */}
      <div className="grid gap-4 sm:grid-cols-3">
        <DetailStat icon={<Wallet className="h-5 w-5" />} label={t("dashboard.avgRent")} value={formatMoney(stats.avgRent)} />
        <DetailStat icon={<BadgeDollarSign className="h-5 w-5" />} label={t("dashboard.avgSalePrice")} value={formatMoney(stats.avgSalePrice)} />
        <DetailStat icon={<TrendingUp className="h-5 w-5" />} label={t("dashboard.portfolioValue")} value={formatMoney(stats.portfolioValue)} accent />
      </div>

      {/* Lists row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {auth.isStaff && (
          <ListCard
            title={t("dashboard.recentLeads")}
            to="/app/leads"
            empty={t("common.empty")}
            loading={leads.isLoading}
            items={recentLeads.map((l) => ({
              key: l.id,
              primary: l.fullName,
              secondary: `${l.propertyName} · ${t(`intent.${l.intent}`)}`,
              meta: <Badge variant="outline" className="text-[10px]">{t(`leadStatus.${l.status}`)}</Badge>,
              tail: formatDate(l.createdAt),
            }))}
          />
        )}

        <ListCard
          title={t("dashboard.upcomingPayments")}
          to="/app/payments"
          empty={t("common.empty")}
          loading={payments.isLoading}
          items={upcomingPayments.map((p) => ({
            key: p.id,
            primary: formatMoney(p.amount),
            secondary: `#${p.contractId} · ${t("common.dueDate")}: ${formatDate(p.dueDate)}`,
            meta: (
              <Badge
                variant={p.status === "Overdue" ? "destructive" : "outline"}
                className="text-[10px]"
              >
                {t(`paymentStatus.${p.status}`)}
              </Badge>
            ),
            tail: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
          }))}
        />

        <ListCard
          title={t("dashboard.recentSales")}
          to="/app/sales"
          empty={t("common.empty")}
          loading={sales.isLoading}
          items={recentSales.map((s) => ({
            key: s.id,
            primary: formatMoney(s.salePrice),
            secondary: `#${s.deedNumber}`,
            meta: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
            tail: formatDate(s.soldAt),
          }))}
        />
      </div>

      {/* Top owners + Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {auth.isStaff && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{t("dashboard.topOwners")}</h3>
              <Link to="/app/owners" className="text-xs text-muted-foreground hover:text-foreground">
                {t("dashboard.viewAll")} →
              </Link>
            </div>
            {owners.isLoading || properties.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : topOwners.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
            ) : (
              <ul className="space-y-3">
                {topOwners.map(({ id, count, owner }) => {
                  const max = topOwners[0].count || 1;
                  const pct = (count / max) * 100;
                  return (
                    <li key={id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{owner?.fullName ?? `Owner #${id}`}</span>
                        <span className="text-muted-foreground tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 font-display text-lg font-semibold">{t("dashboard.quickActions")}</h3>
          <div className="space-y-2">
            {auth.isStaff && (
              <QuickAction to="/app/owners" icon={<Plus className="h-4 w-4" />} label={t("dashboard.addOwner")} />
            )}
            <QuickAction to="/app/properties" icon={<Building2 className="h-4 w-4" />} label={t("dashboard.addProperty")} />
            {auth.isStaff && (
              <QuickAction
                to="/app/leads"
                icon={<Inbox className="h-4 w-4" />}
                label={t("dashboard.reviewLeads")}
                badge={stats.openLeads > 0 ? String(stats.openLeads) : undefined}
              />
            )}
            <QuickAction
              to="/app/payments"
              icon={<DollarSign className="h-4 w-4" />}
              label={t("dashboard.collectPayment")}
              badge={stats.overdue > 0 ? String(stats.overdue) : undefined}
              destructive={stats.overdue > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== Sub-components ==============

function KpiCard({
  label, value, delta, subtitle, icon, accent, tone, loading,
}: {
  label: string; value: string; delta?: number; subtitle?: string;
  icon: React.ReactNode; accent?: "gold"; tone?: "success" | "info" | "destructive"; loading?: boolean;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card ${accent === "gold" ? "ring-1 ring-gold/30" : ""}`}>
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${
          accent === "gold" ? "bg-gold-gradient text-gold-foreground" :
          tone === "success" ? "bg-success/15 text-success" :
          tone === "info" ? "bg-primary/10 text-primary" :
          tone === "destructive" ? "bg-destructive/10 text-destructive" :
          "bg-accent text-accent-foreground"
        }`}>
          {icon}
        </span>
        {delta !== undefined && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          }`}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <div className="font-display text-2xl font-semibold tracking-tight">{value}</div>
        )}
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        {subtitle && <div className="mt-0.5 text-[11px] text-muted-foreground/80">{subtitle}</div>}
      </div>
    </div>
  );
}

function MiniStat({
  icon, label, value, subtitle, to, loading, tone,
}: {
  icon: React.ReactNode; label: string; value: number | string; subtitle?: string;
  to: string; loading?: boolean; tone?: "destructive";
}) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition hover:shadow-elegant">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${
        tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground/70"
      }`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        {loading ? <Skeleton className="mt-1 h-5 w-12" /> : (
          <div className="font-semibold tabular-nums">{value}</div>
        )}
        {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 rtl:rotate-180" />
    </Link>
  );
}

function DetailStat({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border p-5 shadow-card ${
      accent ? "bg-gradient-to-br from-card to-accent/40 ring-1 ring-gold/20" : "bg-card"
    }`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${
          accent ? "bg-gold-gradient text-gold-foreground" : "bg-accent text-accent-foreground"
        }`}>{icon}</span>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="font-display text-xl font-semibold tracking-tight">{value}</div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title, children, className,
}: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-card ${className ?? ""}`}>
      <h3 className="mb-3 font-display text-base font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

interface ListItem {
  key: string | number;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  meta?: React.ReactNode;
  tail?: React.ReactNode;
}

function ListCard({
  title, to, items, empty, loading,
}: { title: string; to: string; items: ListItem[]; empty: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <Link to={to} className="text-xs text-muted-foreground hover:text-foreground">→</Link>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{it.primary}</div>
                {it.secondary && (
                  <div className="truncate text-xs text-muted-foreground">{it.secondary}</div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-muted-foreground">
                {it.meta}
                {it.tail && <span>{it.tail}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuickAction({
  to, icon, label, badge, destructive,
}: { to: string; icon: React.ReactNode; label: string; badge?: string; destructive?: boolean }) {
  return (
    <Button asChild variant="outline" className="w-full justify-between">
      <Link to={to}>
        <span className="flex items-center gap-2">
          <span className={destructive ? "text-destructive" : ""}>{icon}</span>
          {label}
        </span>
        {badge && (
          <Badge variant={destructive ? "destructive" : "secondary"} className="text-[10px]">
            {badge}
          </Badge>
        )}
      </Link>
    </Button>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-2.5 text-xs shadow-elegant">
      {label && <div className="mb-1 font-medium">{label}</div>}
      <div className="space-y-0.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium tabular-nums">
              {typeof p.value === "number" && p.value >= 1000
                ? p.value.toLocaleString()
                : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
