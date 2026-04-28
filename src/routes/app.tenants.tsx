import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/app/tenants")({
  component: () => <PeopleResource resource="tenants" queryKey="tenants" titleKey="nav.tenants" />,
});
