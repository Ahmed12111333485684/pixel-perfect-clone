import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  resolveApiAssetUrl,
  createPartner,
  createPartnerAccount,
  deletePartner,
  fetchPartners,
  type Partner,
  updatePartner,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { MediaPreview } from "@/components/MediaPreview";
import { PartnerDialog, FormField } from "@/components/partners/PartnerDialog";
import { ImagePlus, KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/partners")({
  component: PartnersPage,
});

function PartnersPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["partners"],
    queryFn: fetchPartners,
    enabled: auth.hasRole("Admin"),
  });

  const [editing, setEditing] = useState<Partner | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Partner | null>(null);
  const [accountFor, setAccountFor] = useState<Partner | null>(null);
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
    mutationFn: async (vals: {
      id?: string;
      fullName: string;
      phone?: string;
      email?: string;
      nationalId?: string;
      falLicenseNumber?: string;
      commercialRegistrationNumber?: string;
      location?: string;
      notes?: string;
      partnerType?: string;
      companyName?: string;
      photo?: File | null;
    }) => {
      const formData = new FormData();
      formData.append("fullName", vals.fullName);
      if (vals.phone) formData.append("phone", vals.phone);
      if (vals.email) formData.append("email", vals.email);
      if (vals.nationalId) formData.append("nationalId", vals.nationalId);
      if (vals.falLicenseNumber) formData.append("falLicenseNumber", vals.falLicenseNumber);
      if (vals.commercialRegistrationNumber)
        formData.append("commercialRegistrationNumber", vals.commercialRegistrationNumber);
      if (vals.location) formData.append("location", vals.location);
      if (vals.notes) formData.append("notes", vals.notes);
      if (vals.partnerType) formData.append("partnerType", vals.partnerType);
      if (vals.companyName) formData.append("companyName", vals.companyName);
      if (vals.photo) formData.append("photo", vals.photo);
      if (vals.id) {
        await updatePartner(vals.id, formData);
      } else {
        await createPartner(formData);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success(t("common.success"));
      setEditing(null);
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deletePartner(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success(t("common.deleted"));
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createAccount = useMutation({
    mutationFn: (input: { id: string; username: string; password: string }) =>
      createPartnerAccount(input.id, {
        username: input.username,
        password: input.password,
      }),
    onSuccess: () => {
      toast.success(t("common.success"));
      setAccountFor(null);
      qc.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: Column<Partner>[] = [
    {
      key: "photo",
      header: t("common.photo"),
      className: "w-20",
      cell: (r) =>
        r.photoUrl ? (
          <div className="h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted">
            <MediaPreview
              src={resolveApiAssetUrl(r.photoUrl)}
              alt={r.fullName}
              className="h-full w-full object-cover"
              zoomable
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <ImagePlus className="h-4 w-4" />
          </div>
        ),
    },
    {
      key: "name",
      header: t("common.fullName"),
      cell: (r) => <span className="font-medium">{r.fullName}</span>,
      sortable: true,
    },
    { key: "phone", header: t("common.phone"), cell: (r) => r.phone ?? "—", sortable: true },
    {
      key: "falLicenseNumber",
      header: t("common.falLicenseNumber"),
      cell: (r) => r.falLicenseNumber ?? "—",
      sortable: true,
    },
    {
      key: "commercialRegistrationNumber",
      header: t("common.commercialRegistrationNumber"),
      cell: (r) => r.commercialRegistrationNumber ?? "—",
      sortable: true,
    },
    { key: "location", header: t("common.partnerLocation"), cell: (r) => r.location ?? "—", sortable: true },
    { key: "email", header: t("common.email"), cell: (r) => r.email ?? "—", sortable: true },
    {
      key: "nid",
      header: t("common.nationalId"),
      cell: (r) => <span className="font-mono text-xs">{r.nationalId ?? "—"}</span>,
      sortable: true,
    },
    { key: "created", header: t("common.createdAt"), cell: (r) => formatDate(r.createdAt), sortable: true },
    {
      key: "account",
      header: "",
      className: "w-12",
      cell: (r) => (
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
      ),
    },
  ];

  const filtered = useMemo(() => {
    let result = list.data ?? [];
    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter((p) => {
        return (
          p.fullName.toLowerCase().includes(lower) ||
          (p.phone ?? "").toLowerCase().includes(lower) ||
          (p.falLicenseNumber ?? "").toLowerCase().includes(lower) ||
          (p.commercialRegistrationNumber ?? "").toLowerCase().includes(lower) ||
          (p.location ?? "").toLowerCase().includes(lower) ||
          (p.email ?? "").toLowerCase().includes(lower) ||
          (p.nationalId ?? "").toLowerCase().includes(lower)
        );
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
      } else if (sortBy === "falLicenseNumber") {
        cmp = (a.falLicenseNumber || "").localeCompare(b.falLicenseNumber || "");
      } else if (sortBy === "commercialRegistrationNumber") {
        cmp = (a.commercialRegistrationNumber || "").localeCompare(b.commercialRegistrationNumber || "");
      } else if (sortBy === "location") {
        cmp = (a.location || "").localeCompare(b.location || "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [list.data, search, sortBy, sortDir]);

  if (!auth.hasRole("Admin")) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.adminOnly")}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("nav.partners")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="me-1 h-4 w-4" /> {t("common.add")}
          </Button>
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
        columns={cols}
        rows={filtered}
        loading={list.isLoading}
        error={list.error}
        rowKey={(r) => r.id}
        onRowClick={(r) => setEditing(r)}
        onEdit={(r) => setEditing(r)}
        onDelete={(r) => setDeleting(r)}
        sortKey={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
      />

      <PartnerDialog
        open={creating || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
        partner={editing}
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

      <PartnerAccountDialog
        partner={accountFor}
        onOpenChange={(v) => !v && setAccountFor(null)}
        submitting={createAccount.isPending}
        onSubmit={(vals) => accountFor && createAccount.mutate({ id: accountFor.id, ...vals })}
      />
    </div>
  );
}

function PartnerAccountDialog({
  partner,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  partner: Partner | null;
  onOpenChange: (v: boolean) => void;
  onSubmit: (v: { username: string; password: string }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <FormDialog
      open={!!partner}
      onOpenChange={onOpenChange}
      title={`${t("common.add")} — ${partner?.fullName ?? ""}`}
      description={t("common.createPartnerAccountDescription")}
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
      <FormField id="username" label={t("common.username")} required />
      <FormField id="password" label={t("common.password")} type="password" required />
    </FormDialog>
  );
}


