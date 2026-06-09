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
import { Label } from "@/components/ui/label";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { MediaPreview } from "@/components/MediaPreview";
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

  const upsert = useMutation({
    mutationFn: async (vals: {
      id?: string;
      fullName: string;
      phone: string;
      email?: string;
      nationalId?: string;
      falLicenseNumber?: string;
      commercialRegistrationNumber?: string;
      location?: string;
      notes?: string;
      photo?: File | null;
    }) => {
      const formData = new FormData();
      formData.append("fullName", vals.fullName);
      formData.append("phone", vals.phone);
      if (vals.email) formData.append("email", vals.email);
      if (vals.nationalId) formData.append("nationalId", vals.nationalId);
      if (vals.falLicenseNumber) formData.append("falLicenseNumber", vals.falLicenseNumber);
      if (vals.commercialRegistrationNumber)
        formData.append("commercialRegistrationNumber", vals.commercialRegistrationNumber);
      if (vals.location) formData.append("location", vals.location);
      if (vals.notes) formData.append("notes", vals.notes);
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
    },
    { key: "phone", header: t("common.phone"), cell: (r) => r.phone ?? "—" },
    {
      key: "falLicenseNumber",
      header: t("common.falLicenseNumber"),
      cell: (r) => r.falLicenseNumber ?? "—",
    },
    {
      key: "commercialRegistrationNumber",
      header: t("common.commercialRegistrationNumber"),
      cell: (r) => r.commercialRegistrationNumber ?? "—",
    },
    { key: "location", header: t("common.partnerLocation"), cell: (r) => r.location ?? "—" },
    { key: "email", header: t("common.email"), cell: (r) => r.email ?? "—" },
    {
      key: "nid",
      header: t("common.nationalId"),
      cell: (r) => <span className="font-mono text-xs">{r.nationalId ?? "—"}</span>,
    },
    { key: "created", header: t("common.createdAt"), cell: (r) => formatDate(r.createdAt) },
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
    if (!search.trim()) return list.data ?? [];
    const lower = search.toLowerCase();
    return (list.data ?? []).filter((p) => {
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
  }, [list.data, search]);

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
        onEdit={(r) => setEditing(r)}
        onDelete={(r) => setDeleting(r)}
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

function PartnerDialog({
  open,
  onOpenChange,
  partner,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partner: Partner | null;
  onSubmit: (vals: {
    fullName: string;
    phone: string;
    email?: string;
    nationalId?: string;
    falLicenseNumber?: string;
    commercialRegistrationNumber?: string;
    location?: string;
    notes?: string;
    photo?: File | null;
  }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const key = `${partner?.id ?? "new"}-${open}`;
  return (
    <FormDialog
      key={key}
      open={open}
      onOpenChange={onOpenChange}
      title={partner ? t("common.edit") : t("common.add")}
      submitting={submitting}
      size="lg"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const photoInput = e.currentTarget.elements.namedItem("photo") as HTMLInputElement | null;
        onSubmit({
          fullName: String(fd.get("fullName") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          email: String(fd.get("email") ?? "") || undefined,
          nationalId: String(fd.get("nationalId") ?? "") || undefined,
          falLicenseNumber: String(fd.get("falLicenseNumber") ?? "") || undefined,
          commercialRegistrationNumber:
            String(fd.get("commercialRegistrationNumber") ?? "") || undefined,
          location: String(fd.get("location") ?? "") || undefined,
          notes: String(fd.get("notes") ?? "") || undefined,
          photo: photoInput?.files?.[0] ?? null,
        });
      }}
    >
      <FormField
        id="fullName"
        label={t("common.fullName")}
        defaultValue={partner?.fullName}
        required
      />
      <FormField
        id="phone"
        label={t("common.phone")}
        defaultValue={partner?.phone ?? ""}
        required
      />
      <FormField
        id="email"
        label={t("common.email")}
        type="email"
        defaultValue={partner?.email ?? ""}
      />
      <FormField
        id="nationalId"
        label={t("common.nationalId")}
        defaultValue={partner?.nationalId ?? ""}
      />
      <FormField
        id="falLicenseNumber"
        label={t("common.falLicenseNumber")}
        defaultValue={partner?.falLicenseNumber ?? ""}
      />
      <FormField
        id="commercialRegistrationNumber"
        label={t("common.commercialRegistrationNumber")}
        defaultValue={partner?.commercialRegistrationNumber ?? ""}
      />
      <FormField
        id="location"
        label={t("common.partnerLocation")}
        defaultValue={partner?.location ?? ""}
      />
      <div className="space-y-2">
        <Label htmlFor="photo">{t("common.photo")}</Label>
        <Input id="photo" name="photo" type="file" accept="image/*" />
        {partner?.photoUrl && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div className="h-16 w-16 overflow-hidden rounded-md border border-border bg-background">
              <MediaPreview
                src={resolveApiAssetUrl(partner.photoUrl)}
                alt={partner.fullName}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-sm text-muted-foreground">{t("common.photo")}</div>
          </div>
        )}
      </div>
      <FormField id="notes" label={t("common.notes")} defaultValue={partner?.notes ?? ""} />
    </FormDialog>
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

function FormField({
  id,
  label,
  defaultValue,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}
