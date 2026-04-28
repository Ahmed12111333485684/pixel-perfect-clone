import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Amenity } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/amenities")({
  component: AmenitiesPage,
});

function AmenitiesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["amenities"], queryFn: () => api<Amenity[]>("/api/amenities") });
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Amenity | null>(null);

  const upsert = useMutation({
    mutationFn: async (vals: { id?: number; name: string; description?: string }) => {
      if (vals.id) {
        await api(`/api/amenities/${vals.id}`, { method: "PUT", body: vals });
      } else {
        await api("/api/amenities", { method: "POST", body: vals });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["amenities"] });
      toast.success(t("common.success"));
      setEditing(null); setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/api/amenities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["amenities"] });
      toast.success(t("common.deleted"));
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: Column<Amenity>[] = [
    { key: "name", header: t("common.name"), cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "desc", header: t("common.description"), cell: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span> },
    { key: "created", header: t("common.createdAt"), cell: (r) => formatDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title={t("nav.amenities")}
        actions={<Button onClick={() => setCreating(true)}><Plus className="me-1 h-4 w-4" />{t("common.add")}</Button>}
      />
      <DataTable
        columns={cols}
        rows={list.data}
        loading={list.isLoading}
        error={list.error}
        rowKey={(r) => r.id}
        onEdit={setEditing}
        onDelete={setDeleting}
      />
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
            name: String(fd.get("name") ?? ""),
            description: String(fd.get("description") ?? "") || undefined,
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">{t("common.name")}</Label>
          <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">{t("common.description")}</Label>
          <Textarea id="description" name="description" defaultValue={editing?.description ?? ""} rows={3} />
        </div>
      </FormDialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`${t("common.delete")}: ${deleting?.name ?? ""}`}
        destructive
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
    </div>
  );
}
