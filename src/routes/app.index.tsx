import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, type PropertyDto, type Owner, type Lead, type Contract } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Building2, Users, Inbox, ScrollText, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();
  const auth = useAuth();

  const properties = useQuery({ queryKey: ["properties"], queryFn: () => api<PropertyDto[]>("/api/properties") });
  const owners = useQuery({
    queryKey: ["owners"],
    queryFn: () => api<Owner[]>("/api/owners"),
    enabled: auth.isStaff,
  });
  const leads = useQuery({
    queryKey: ["leads", "open"],
    queryFn: () => api<Lead[]>("/api/leads"),
    enabled: auth.isStaff,
  });
  const contracts = useQuery({
    queryKey: ["contracts"],
    queryFn: () => api<Contract[]>("/api/contracts"),
  });

  const openLeads = leads.data?.filter((l) => l.status !== "ClosedLost" && l.status !== "ClosedWon").length ?? 0;
  const activeContracts = contracts.data?.filter((c) => c.status === "Active").length ?? 0;

  return (
    <div>
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          label={t("dashboard.properties")}
          value={properties.data?.length}
          loading={properties.isLoading}
          to="/app/properties"
        />
        {auth.isStaff && (
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label={t("dashboard.owners")}
            value={owners.data?.length}
            loading={owners.isLoading}
            to="/app/owners"
          />
        )}
        {auth.isStaff && (
          <StatCard
            icon={<Inbox className="h-5 w-5" />}
            label={t("dashboard.leads")}
            value={openLeads}
            loading={leads.isLoading}
            to="/app/leads"
            accent
          />
        )}
        <StatCard
          icon={<ScrollText className="h-5 w-5" />}
          label={t("dashboard.contracts")}
          value={activeContracts}
          loading={contracts.isLoading}
          to="/app/contracts"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-xl font-semibold">{t("common.welcome")}, {auth.user?.username}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {auth.user?.role === "OwnerClient"
            ? "View and manage your own properties, contracts and payments."
            : "Manage your portfolio across owners, properties, leads and contracts."}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, loading, to, accent,
}: {
  icon: React.ReactNode; label: string; value?: number; loading?: boolean; to: string; accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-elegant ${
        accent ? "ring-1 ring-gold/30" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${accent ? "bg-gold-gradient text-gold-foreground" : "bg-accent text-accent-foreground"}`}>
          {icon}
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight">
        {loading ? "—" : (value ?? 0)}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </Link>
  );
}
