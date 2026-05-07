import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api, type PropertyDto, type Tenant } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { FormField } from "./app.owners";

interface Person {
  id: number; fullName: string; phone: string; email: string; nationalId: string; createdAt: string;
}

export interface PeopleResourceConfig {
  resource: string;        // path segment, e.g. "tenants"
  queryKey: string;
  titleKey: string;        // i18n key for nav label
}

export function PeopleResource({ resource, queryKey, titleKey }: PeopleResourceConfig) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: [queryKey], queryFn: () => api<Person[]>(`/api/${resource}`) });
  const [editing, setEditing] = useState<Person | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Person | null>(null);
  const [search, setSearch] = useState("");

  const upsert = useMutation({
    mutationFn: async (vals: Partial<Person> & { id?: number }) => {
      if (vals.id) await api(`/api/${resource}/${vals.id}`, { method: "PUT", body: vals });
      else await api(`/api/${resource}`, { method: "POST", body: vals });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); toast.success(t("common.success")); setEditing(null); setCreating(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: number) => api(`/api/${resource}/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); toast.success(t("common.deleted")); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: Column<Person>[] = [
    { key: "name", header: t("common.fullName"), cell: (r) => <span className="font-medium">{r.fullName}</span> },
    { key: "phone", header: t("common.phone"), cell: (r) => r.phone },
    { key: "email", header: t("common.email"), cell: (r) => r.email },
    { key: "nid", header: t("common.nationalId"), cell: (r) => <span className="font-mono text-xs">{r.nationalId}</span> },
    { key: "created", header: t("common.createdAt"), cell: (r) => formatDate(r.createdAt) },
  ];

  const filteredPeople = useMemo(() => {
    if (!search.trim()) return list.data ?? [];
    const lowerSearch = search.toLowerCase();
    return (list.data ?? []).filter((person) => {
      const nameMatch = person.fullName.toLowerCase().includes(lowerSearch);
      const phoneMatch = person.phone.toLowerCase().includes(lowerSearch);
      const emailMatch = person.email.toLowerCase().includes(lowerSearch);
      const nidMatch = person.nationalId.toLowerCase().includes(lowerSearch);
      return nameMatch || phoneMatch || emailMatch || nidMatch;
    });
  }, [list.data, search]);

  return (
    <div>
      <PageHeader
        title={t(titleKey)}
        actions={<Button onClick={() => setCreating(true)}><Plus className="me-1 h-4 w-4" />{t("common.add")}</Button>}
      />
      <div className="mb-4">
        <Input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <DataTable columns={cols} rows={filteredPeople} loading={list.isLoading} error={list.error} rowKey={(r) => r.id} onEdit={setEditing} onDelete={setDeleting} />
      <FormDialog
        key={`${editing?.id ?? "new"}-${creating ? "create" : "edit"}`}
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        title={editing ? t("common.edit") : t("common.add")}
        submitting={upsert.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          upsert.mutate({
            id: editing?.id,
            fullName: String(fd.get("fullName") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            email: String(fd.get("email") ?? ""),
            nationalId: String(fd.get("nationalId") ?? ""),
          });
        }}
      >
        <FormField id="fullName" label={t("common.fullName")} defaultValue={editing?.fullName} />
        <FormField id="phone" label={t("common.phone")} defaultValue={editing?.phone} />
        <FormField id="email" label={t("common.email")} type="email" defaultValue={editing?.email} />
        <FormField id="nationalId" label={t("common.nationalId")} defaultValue={editing?.nationalId} />
      </FormDialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`${t("common.delete")}: ${deleting?.fullName ?? ""}`}
        destructive
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
    </div>
  );
}

function TenantsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const tenants = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api<Tenant[]>("/api/tenants"),
    enabled: auth.isStaff,
  });

  const properties = useQuery({
    queryKey: ["properties", "tenant-picker"],
    queryFn: () => api<PropertyDto[]>("/api/properties"),
    enabled: auth.isStaff,
  });

  const propertyById = useMemo(() => {
    return new Map((properties.data ?? []).map((property) => [property.id, property]));
  }, [properties.data]);

  const [editing, setEditing] = useState<Tenant | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Tenant | null>(null);
  const [search, setSearch] = useState("");

  const upsert = useMutation({
    mutationFn: async (vals: { id?: number; propertyId: number; fullName: string; phone: string; email: string; nationalId: string }) => {
      const body = {
        propertyId: vals.propertyId,
        fullName: vals.fullName,
        phone: vals.phone,
        email: vals.email,
        nationalId: vals.nationalId,
      };

      if (vals.id) await api(`/api/tenants/${vals.id}`, { method: "PUT", body });
      else await api("/api/tenants", { method: "POST", body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(t("common.success"));
      setEditing(null);
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/api/tenants/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(t("common.deleted"));
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredTenants = useMemo(() => {
    if (!search.trim()) return tenants.data ?? [];
    const lowerSearch = search.toLowerCase();
    return (tenants.data ?? []).filter((tenant) => {
      const property = tenant.propertyName ?? "";
      return [tenant.fullName, tenant.phone, tenant.email, tenant.nationalId, property]
        .some((value) => value.toLowerCase().includes(lowerSearch));
    });
  }, [tenants.data, search]);

  const columns: Column<Tenant>[] = [
    { key: "name", header: t("common.fullName"), cell: (r) => <span className="font-medium">{r.fullName}</span> },
    {
      key: "property",
      header: t("common.property"),
      cell: (r) => {
        const property = r.propertyId ? propertyById.get(r.propertyId) : undefined;
        const label = property ? `${property.name} — ${property.address}` : r.propertyName ?? t("common.notProvided");
        return <span>{label}</span>;
      },
    },
    { key: "phone", header: t("common.phone"), cell: (r) => r.phone },
    { key: "email", header: t("common.email"), cell: (r) => r.email },
    { key: "nid", header: t("common.nationalId"), cell: (r) => <span className="font-mono text-xs">{r.nationalId}</span> },
    { key: "created", header: t("common.createdAt"), cell: (r) => formatDate(r.createdAt) },
  ];

  if (!auth.isStaff) {
    return <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">{t("common.adminOnly")}</div>;
  }

  return (
    <div>
      <PageHeader
        title={t("nav.tenants")}
        actions={<Button onClick={() => setCreating(true)}><Plus className="me-1 h-4 w-4" />{t("common.add")}</Button>}
      />
      <div className="mb-4">
        <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>
      <DataTable
        columns={columns}
        rows={filteredTenants}
        loading={tenants.isLoading}
        error={tenants.error}
        rowKey={(r) => r.id}
        onEdit={setEditing}
        onDelete={setDeleting}
      />

      <TenantDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        tenant={editing}
        properties={properties.data ?? []}
        submitting={upsert.isPending}
        onSubmit={(vals) => upsert.mutate({ ...vals, id: editing?.id })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`${t("common.delete")}: ${deleting?.fullName ?? ""}`}
        destructive
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
    </div>
  );
}

function TenantDialog({ open, onOpenChange, tenant, properties, onSubmit, submitting }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenant: Tenant | null;
  properties: PropertyDto[];
  onSubmit: (vals: { propertyId: number; fullName: string; phone: string; email: string; nationalId: string }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [propertyId, setPropertyId] = useState<string>(tenant?.propertyId?.toString() ?? "");
  const key = `${tenant?.id ?? "new"}-${open}`;

  useEffect(() => {
    if (!open) return;
    setPropertyId(tenant?.propertyId?.toString() ?? "");
  }, [open, tenant]);

  return (
    <FormDialog
      key={key}
      open={open}
      onOpenChange={(v) => { if (!v) onOpenChange(false); }}
      title={tenant ? t("common.edit") : t("common.add")}
      submitting={submitting}
      size="lg"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const selectedPropertyId = Number(propertyId);
        if (!selectedPropertyId) {
          toast.error(t("common.selectProperty"));
          return;
        }

        onSubmit({
          propertyId: selectedPropertyId,
          fullName: String(fd.get("fullName") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          email: String(fd.get("email") ?? ""),
          nationalId: String(fd.get("nationalId") ?? ""),
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="propertyId">{t("common.property")}</Label>
        <Select value={propertyId} onValueChange={setPropertyId}>
          <SelectTrigger id="propertyId">
            <SelectValue placeholder={t("common.selectProperty")} />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={String(property.id)}>
                {property.name} — {property.address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <FormField id="fullName" label={t("common.fullName")} defaultValue={tenant?.fullName} />
      <FormField id="phone" label={t("common.phone")} defaultValue={tenant?.phone} />
      <FormField id="email" label={t("common.email")} type="email" defaultValue={tenant?.email} />
      <FormField id="nationalId" label={t("common.nationalId")} defaultValue={tenant?.nationalId} />
    </FormDialog>
  );
}

export const Route = createFileRoute("/app/tenants")({
  component: TenantsPage,
});
