import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "./app";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type CommercialListing } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/partner/my-properties")({
  component: () => <AppLayout><PartnerMyPropertiesPage /></AppLayout>,
});

function PartnerMyPropertiesPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [search, setSearch] = useState("");

  const list = useQuery({
    queryKey: ["partner", "commercial-listings"],
    queryFn: async () => {
      const result = await api<{ items: CommercialListing[] }>("/api/commercial-listings", {
        query: {
          page: 1,
          pageSize: 200,
          sortBy: "createdAt",
          sortDir: "desc",
        },
      });

      return result.items ?? [];
    },
    enabled: auth.isPartner,
  });

  if (!auth.isPartner) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.noScreenAccess")}
      </div>
    );
  }

  const cols: Column<CommercialListing>[] = [
    { key: "serialNumber", header: t("commercialListings.serialNumber"), cell: (r) => <span className="font-medium">{r.serialNumber ?? "-"}</span> },
    { key: "ownerName", header: t("commercialListings.ownerName"), cell: (r) => r.ownerName ?? "-" },
    { key: "deedNumber", header: t("commercialListings.deedNumber"), cell: (r) => r.deedNumber ? <span className="font-mono text-sm">{r.deedNumber}</span> : "-" },
    { key: "propertyType", header: t("commercialListings.propertyType"), cell: (r) => r.propertyType ?? "-" },
    { key: "location", header: t("commercialListings.location"), cell: (r) => r.location ?? "-" },
    {
      key: "status",
      header: t("common.status"),
      cell: (r) => <StatusBadge tone="neutral">{r.propertyStatus ?? "-"}</StatusBadge>,
    },
    { key: "rentAmount", header: t("commercialListings.rentAmount"), cell: (r) => r.rentAmount ?? "-" },
    { key: "updatedAt", header: t("common.updatedAt"), cell: (r) => formatDateTime(r.updatedAt ?? r.createdAt) },
  ];

  const filtered = useMemo(() => {
    if (!search.trim()) return list.data ?? [];
    const lower = search.toLowerCase();
    return (list.data ?? []).filter((record) => {
      return (
        (record.serialNumber ?? "").toLowerCase().includes(lower)
        || (record.ownerName ?? "").toLowerCase().includes(lower)
          || (record.deedNumber ?? "").toLowerCase().includes(lower)
        || (record.location ?? "").toLowerCase().includes(lower)
        || (record.propertyType ?? "").toLowerCase().includes(lower)
        || (record.propertyStatus ?? "").toLowerCase().includes(lower)
      );
    });
  }, [list.data, search]);

  return (
    <div>
      <PageHeader title={t("nav.myProperties")} subtitle={t("partner.myPropertiesSubtitle")} />
      <div className="mb-4">
        <Input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <DataTable columns={cols} rows={filtered} loading={list.isLoading} error={list.error} rowKey={(r) => r.id} />
    </div>
  );
}
