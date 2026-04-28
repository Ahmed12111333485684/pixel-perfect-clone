import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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

      <DataTable
        columns={[
          ...cols,
          ...(auth.isStaff
            ? [{
                key: "acct", header: "", className: "w-12",
                cell: (r: Owner) => (
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setAccountFor(r); }}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                ),
              }]
            : []),
        ]}
        rows={list.data}
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
    </div>
  );
}

function OwnerDialog({ open, onOpenChange, owner, onSubmit, submitting }: {
  open: boolean; onOpenChange: (v: boolean) => void; owner: Owner | null;
  onSubmit: (vals: { fullName: string; phone: string; email: string; nationalId: string }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <FormDialog
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
