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
import { Textarea } from "@/components/ui/textarea";
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

  const list = useQuery({ queryKey: ["owners"], queryFn: () => api<Owner[]>("/owners") });

  const [editing, setEditing] = useState<Owner | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Owner | null>(null);
  const [accountFor, setAccountFor] = useState<Owner | null>(null);
  const [statsFor, setStatsFor] = useState<Owner | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const upsert = useMutation({
    mutationFn: async (vals: Partial<Owner> & { id?: number }) => {
      if (vals.id) {
        await api(`/api/owners/${vals.id}`, { method: "PUT", body: vals });
      } else {
        await api("/owners", { method: "POST", body: vals });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] });
      toast.success(t("common.success"));
      setEditing(null);
      setCreating(false);
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
    {
      key: "name",
      header: t("common.fullName"),
      cell: (r) => <span className="font-medium">{r.fullName}</span>,
      sortable: true,
    },
    { key: "phone", header: t("common.phone"), cell: (r) => r.phone, sortable: true },
    { key: "email", header: t("common.email"), cell: (r) => r.email, sortable: true },
    {
      key: "nid",
      header: t("common.nationalId"),
      cell: (r) => <span className="font-mono text-xs">{r.nationalId}</span>,
      sortable: true,
    },
    { key: "created", header: t("common.createdAt"), cell: (r) => formatDate(r.createdAt), sortable: true },
  ];

  const filteredOwners = useMemo(() => {
    let result = list.data ?? [];
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      result = result.filter((owner) => {
        const nameMatch = (owner.fullName || "").toLowerCase().includes(lowerSearch);
        const phoneMatch = (owner.phone || "").toLowerCase().includes(lowerSearch);
        const emailMatch = (owner.email || "").toLowerCase().includes(lowerSearch);
        const nidMatch = (owner.nationalId || "").toLowerCase().includes(lowerSearch);
        return nameMatch || phoneMatch || emailMatch || nidMatch;
      });
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "created") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "name") {
        cmp = (a.fullName || "").localeCompare(b.fullName || "");
      } else if (sortBy === "phone") {
        cmp = (a.phone || "").localeCompare(b.phone || "");
      } else if (sortBy === "email") {
        cmp = (a.email || "").localeCompare(b.email || "");
      } else if (sortBy === "nid") {
        cmp = (a.nationalId || "").localeCompare(b.nationalId || "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [list.data, search, sortBy, sortDir]);

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
            ? [
              {
                key: "actions2",
                header: "",
                className: "w-24",
                cell: (r: Owner) => (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatsFor(r);
                      }}
                      title={t("common.stats")}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAccountFor(r);
                      }}
                      title={t("common.account")}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              },
            ]
            : []),
        ]}
        rows={filteredOwners}
        loading={list.isLoading}
        error={list.error}
        rowKey={(r) => r.id}
        onEdit={(r) => setEditing(r)}
        onDelete={auth.isStaff ? (r) => setDeleting(r) : undefined}
        sortKey={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
      />

      <OwnerDialog
        open={creating || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
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

function OwnerDialog({
  open,
  onOpenChange,
  owner,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  owner: Owner | null;
  onSubmit: (vals: { fullName: string; phone: string; email?: string; nationalId?: string; notes?: string }) => void;
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
      size="lg"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const fullName = String(fd.get("fullName") ?? "").trim();
        const phone = String(fd.get("phone") ?? "").trim();

        const missing = [];
        if (!fullName) missing.push(t("common.fullName"));
        if (!phone) missing.push(t("common.phone"));

        if (missing.length > 0) {
          toast.error(`الرجاء تعبئة الحقول المطلوبة: ${missing.join("، ")}`);
          return;
        }

        onSubmit({
          fullName,
          phone,
          email: String(fd.get("email") ?? "").trim() || undefined,
          nationalId: String(fd.get("nationalId") ?? "").trim() || undefined,
          notes: String(fd.get("notes") ?? "").trim() || undefined,
        });
      }}
    >
      <FormField id="fullName" label={t("common.fullName")} defaultValue={owner?.fullName} />
      <FormField id="phone" label={t("common.phone")} defaultValue={owner?.phone} />
      <FormField id="email" label={t("common.email")} type="email" defaultValue={owner?.email} required={false} />
      <FormField id="nationalId" label={t("common.nationalId")} defaultValue={owner?.nationalId} required={false} />
      <TextareaField id="notes" label={t("common.notes")} defaultValue={owner?.notes ?? ""} />
    </FormDialog>
  );
}

function AccountDialog({
  owner,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  owner: Owner | null;
  onOpenChange: (v: boolean) => void;
  onSubmit: (v: { username: string; password: string }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <FormDialog
      open={!!owner}
      onOpenChange={onOpenChange}
      title={`${t("common.add")} — ${owner?.fullName ?? ""}`}
      description={t("common.createOwnerAccountDescription")}
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

function StatsDialog({
  owner,
  onOpenChange,
}: {
  owner: Owner | null;
  onOpenChange: (v: boolean) => void;
}) {
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
      onSubmit={(e) => {
        e.preventDefault();
        onOpenChange(false);
      }}
    >
      {stats.isLoading ? (
        <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t("common.empty")}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {entries.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {k.replace(/([A-Z])/g, " $1").trim()}
              </div>
              <div className="mt-1 text-2xl font-semibold">{v as number}</div>
            </div>
          ))}
        </div>
      )}
    </FormDialog>
  );
}

export function FormField({
  id,
  label,
  type = "text",
  defaultValue,
  required = true,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} defaultValue={defaultValue ?? ""} required={required} />
    </div>
  );
}

function TextareaField({
  id,
  label,
  defaultValue,
}: {
  id: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} name={id} defaultValue={defaultValue ?? ""} rows={5} />
    </div>
  );
}
