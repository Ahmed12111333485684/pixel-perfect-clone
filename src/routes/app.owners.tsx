import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { api, type Owner, type OwnerStats } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { Plus, KeyRound, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/owners")({
  component: OwnersPage,
});

function OwnersPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ["owners"], queryFn: () => api<Owner[]>("/api/owners") });

  const [editing, setEditing] = useState<Owner | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Owner | null>(null);
  const [accountFor, setAccountFor] = useState<Owner | null>(null);
  const [statsFor, setStatsFor] = useState<Owner | null>(null);
  const [search, setSearch] = useState("");

  const upsert = useMutation({
    mutationFn: async (vals: Partial<Owner> & { id?: number }) => {
      if (vals.id) {
        await api(`/api/owners/${vals.id}`, { method: "PUT", body: vals });
      } else {
        await api("/api/owners", { method: "POST", body: vals });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] });
      toast.success(t("common.success"));
      setEditing(null); setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/api/owners/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] });
      toast.success(t("common.deleted"));
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createAccount = useMutation({
    mutationFn: (input: { id: number; username: string; password: string }) =>
      api(`/api/owners/${input.id}/account`, {
        method: "POST",
        body: { username: input.username, password: input.password },
      }),
    onSuccess: () => {
      toast.success(t("common.success"));
      setAccountFor(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: Column<Owner>[] = [
    { key: "name", header: t("common.fullName"), cell: (r) => <span className="font-medium">{r.fullName}</span> },
    { key: "phone", header: t("common.phone"), cell: (r) => r.phone },
    { key: "email", header: t("common.email"), cell: (r) => r.email },
    { key: "nid", header: t("common.nationalId"), cell: (r) => <span className="font-mono text-xs">{r.nationalId}</span> },
    { key: "created", header: t("common.createdAt"), cell: (r) => formatDate(r.createdAt) },
  ];

  const filteredOwners = useMemo(() => {
    if (!search.trim()) return list.data ?? [];
    const lowerSearch = search.toLowerCase();
    return (list.data ?? []).filter((owner) => {
      const nameMatch = owner.fullName.toLowerCase().includes(lowerSearch);
      const phoneMatch = owner.phone.toLowerCase().includes(lowerSearch);
      const emailMatch = owner.email.toLowerCase().includes(lowerSearch);
      const nidMatch = owner.nationalId.toLowerCase().includes(lowerSearch);
      return nameMatch || phoneMatch || emailMatch || nidMatch;
    });
  }, [list.data, search]);

  return (
    <div>
      <PageHeader
        title={t("nav.owners")}
        actions={
          auth.isStaff && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="me-1 h-4 w-4" /> {t("common.add")}
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={[
          ...cols,
          ...(auth.isStaff
            ? [{
                key: "actions2", header: "", className: "w-24",
                cell: (r: Owner) => (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setStatsFor(r); }} title="Stats">
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setAccountFor(r); }} title="Account">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              }]
            : []),
        ]}
        rows={filteredOwners}
        loading={list.isLoading}
        error={list.error}
        rowKey={(r) => r.id}
        onEdit={(r) => setEditing(r)}
        onDelete={auth.isStaff ? (r) => setDeleting(r) : undefined}
      />

      <OwnerDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        owner={editing}
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

      <AccountDialog
        owner={accountFor}
        onOpenChange={(v) => !v && setAccountFor(null)}
        submitting={createAccount.isPending}
        onSubmit={(vals) => accountFor && createAccount.mutate({ id: accountFor.id, ...vals })}
      />

      <StatsDialog owner={statsFor} onOpenChange={(v) => !v && setStatsFor(null)} />
    </div>
  );
}

function OwnerDialog({ open, onOpenChange, owner, onSubmit, submitting }: {
  open: boolean; onOpenChange: (v: boolean) => void; owner: Owner | null;
  onSubmit: (vals: { fullName: string; phone: string; email: string; nationalId: string }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const key = `${owner?.id ?? "new"}-${open}`;
  return (
    <FormDialog
      key={key}
      open={open}
      onOpenChange={onOpenChange}
      title={owner ? t("common.edit") : t("common.add")}
      submitting={submitting}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          fullName: String(fd.get("fullName") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          email: String(fd.get("email") ?? ""),
          nationalId: String(fd.get("nationalId") ?? ""),
        });
      }}
    >
      <FormField id="fullName" label={t("common.fullName")} defaultValue={owner?.fullName} />
      <FormField id="phone" label={t("common.phone")} defaultValue={owner?.phone} />
      <FormField id="email" label={t("common.email")} type="email" defaultValue={owner?.email} />
      <FormField id="nationalId" label={t("common.nationalId")} defaultValue={owner?.nationalId} />
    </FormDialog>
  );
}

function AccountDialog({ owner, onOpenChange, onSubmit, submitting }: {
  owner: Owner | null; onOpenChange: (v: boolean) => void;
  onSubmit: (v: { username: string; password: string }) => void; submitting?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <FormDialog
      open={!!owner}
      onOpenChange={onOpenChange}
      title={`${t("common.add")} — ${owner?.fullName ?? ""}`}
      description="Create a portal account for this owner."
      submitting={submitting}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          username: String(fd.get("username") ?? ""),
          password: String(fd.get("password") ?? ""),
        });
      }}
    >
      <FormField id="username" label={t("common.username")} />
      <FormField id="password" label={t("common.password")} type="password" />
    </FormDialog>
  );
}

function StatsDialog({ owner, onOpenChange }: { owner: Owner | null; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const stats = useQuery({
    queryKey: ["owner-stats", owner?.id],
    queryFn: () => api<OwnerStats>(`/api/owners/${owner!.id}/stats`),
    enabled: !!owner,
  });
  const entries = stats.data
    ? Object.entries(stats.data).filter(([k, v]) => k !== "ownerId" && typeof v === "number")
    : [];
  return (
    <FormDialog
      open={!!owner}
      onOpenChange={onOpenChange}
      title={`${t("common.statistics")} — ${owner?.fullName ?? ""}`}
      submitLabel={t("common.close")}
      onSubmit={(e) => { e.preventDefault(); onOpenChange(false); }}
    >
      {stats.isLoading ? (
        <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t("common.empty")}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {entries.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{k.replace(/([A-Z])/g, " $1").trim()}</div>
              <div className="mt-1 text-2xl font-semibold">{v as number}</div>
            </div>
          ))}
        </div>
      )}
    </FormDialog>
  );
}

export function FormField({ id, label, type = "text", defaultValue, required = true }: {
  id: string; label: string; type?: string; defaultValue?: string | number; required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} defaultValue={defaultValue ?? ""} required={required} />
    </div>
  );
}
