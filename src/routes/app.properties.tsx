import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, resolveApiAssetUrl, type PropertyDto, type PropertyImage, type Owner, type Amenity, type PropertyStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { propertyStatusTone, formatDate } from "@/lib/format";

const PROPERTY_TYPES = ["Apartment", "Villa", "Office", "Land", "Shop", "Warehouse"];
const STATUSES: PropertyStatus[] = ["Pending", "Approved", "Rejected", "Sold"];

export const Route = createFileRoute("/app/properties")({
  component: PropertiesPage,
});

function PropertiesPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ["properties"], queryFn: () => api<PropertyDto[]>("/api/properties") });
  const owners = useQuery({
    queryKey: ["owners"],
    queryFn: () => api<Owner[]>("/api/owners"),
    enabled: auth.isStaff,
  });
  const amenities = useQuery({ queryKey: ["amenities"], queryFn: () => api<Amenity[]>("/api/amenities") });

  const propertyImageQueries = useQueries({
    queries: (list.data ?? []).map((property) => ({
      queryKey: ["property-images-preview", property.id],
      queryFn: () => api<PropertyImage[]>(`/api/properties/${property.id}/images`),
      staleTime: 60_000,
      enabled: !list.isLoading,
    })),
  });

  const propertyThumbnailById = useMemo(() => {
    const map = new Map<number, string>();
    (list.data ?? []).forEach((property, index) => {
      const images = propertyImageQueries[index]?.data ?? [];
      const primary = images.find((img) => img.isPrimary) ?? images[0];
      if (primary?.url) {
        map.set(property.id, resolveApiAssetUrl(primary.url));
      }
    });
    return map;
  }, [list.data, propertyImageQueries]);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PropertyDto | null>(null);
  const [deleting, setDeleting] = useState<PropertyDto | null>(null);
  const [statusOf, setStatusOf] = useState<PropertyDto | null>(null);
  const [search, setSearch] = useState("");

  const upsert = useMutation({
    mutationFn: async (vals: { id?: number; ownerId: number; name: string; address: string; type: string; salePrice?: number | null; rentPrice?: number | null; amenityIds: number[]; files?: File[] }) => {
      let propertyId: number;
      if (vals.id) {
        propertyId = vals.id;
        await api(`/api/properties/${vals.id}`, { method: "PUT", body: { ownerId: vals.ownerId, name: vals.name, address: vals.address, type: vals.type, salePrice: vals.salePrice, rentPrice: vals.rentPrice, amenityIds: vals.amenityIds } });
      } else {
        const response = await api<{ id: number }>("/api/properties", { method: "POST", body: { ownerId: vals.ownerId, name: vals.name, address: vals.address, type: vals.type, salePrice: vals.salePrice, rentPrice: vals.rentPrice, amenityIds: vals.amenityIds } });
        propertyId = response.id;
      }
      // Upload files if any
      if (vals.files && vals.files.length > 0) {
        for (const file of vals.files) {
          const fd = new FormData();
          fd.append("file", file);
          await api(`/api/properties/${propertyId}/images`, { method: "POST", formData: fd });
        }
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property-images-preview"] });
      
      if (!auth.isStaff && !vars.id) {
        toast.success(t("property.submittedForReview"));
      } else {
        toast.success(t("common.success"));
      }
      
      setCreating(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/api/properties/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["properties"] }); toast.success(t("common.deleted")); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: PropertyStatus }) =>
      api(`/api/properties/${id}/status`, { method: "PUT", body: { status } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["properties"] }); toast.success(t("common.updated")); setStatusOf(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: Column<PropertyDto>[] = [
    {
      key: "image", header: t("common.images"), className: "w-20",
      cell: (r) => {
        const src = propertyThumbnailById.get(r.id);
        if (!src) {
          return <div className="h-10 w-14 rounded-md border border-border bg-muted" />;
        }
        return (
          <img
            src={src}
            alt={r.name}
            className="h-10 w-14 rounded-md border border-border object-cover"
            loading="lazy"
          />
        );
      },
    },
    { key: "name", header: t("common.name"), cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "address", header: t("common.address"), cell: (r) => <span className="text-muted-foreground">{r.address}</span> },
    { key: "type", header: t("common.type"), cell: (r) => r.type },
    {
      key: "status", header: t("common.status"),
      cell: (r) => (
        <StatusBadge tone={propertyStatusTone(r.status)}>{t(`propertyStatus.${r.status}`)}</StatusBadge>
      ),
    },
    { key: "owner", header: t("nav.owners"), cell: (r) => `#${r.ownerId}` },
    {
      key: "open", header: "", className: "w-20",
      cell: (r) => (
        <Link
          to="/app/properties/$id"
          params={{ id: String(r.id) }}
          onClick={(e) => e.stopPropagation()}
          title={t("common.details")}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t("common.open")}
        </Link>
      ),
    },
    { key: "created", header: t("common.createdAt"), cell: (r) => formatDate(r.createdAt) },
  ];

  const filteredProperties = useMemo(() => {
    if (!search.trim()) return list.data ?? [];
    const lowerSearch = search.toLowerCase();
    return (list.data ?? []).filter((property) => {
      const nameMatch = property.name.toLowerCase().includes(lowerSearch);
      const addressMatch = property.address.toLowerCase().includes(lowerSearch);
      const typeMatch = property.type.toLowerCase().includes(lowerSearch);
      return nameMatch || addressMatch || typeMatch;
    });
  }, [list.data, search]);

  return (
    <div>
      <PageHeader
        title={t("nav.properties")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="me-1 h-4 w-4" />{t("common.add")}
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
        rows={filteredProperties}
        loading={list.isLoading}
        error={list.error}
        rowKey={(r) => r.id}
        onEdit={(r) => setEditing(r)}
        onDelete={(r) => setDeleting(r)}
      />

      <PropertyDialog
        key={`${editing?.id ?? "new"}-${(creating || !!editing) ? "open" : "closed"}`}
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        property={editing}
        owners={owners.data ?? []}
        amenities={amenities.data ?? []}
        defaultOwnerId={!auth.isStaff ? auth.user?.ownerId : undefined}
        canPickOwner={auth.isStaff}
        submitting={upsert.isPending}
        onSubmit={(vals) => upsert.mutate({ ...vals, id: editing?.id })}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`${t("common.delete")}: ${deleting?.name ?? ""}`}
        destructive
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />

      {auth.isStaff && (
        <StatusDialog
          property={statusOf}
          onOpenChange={(v) => !v && setStatusOf(null)}
          submitting={updateStatus.isPending}
          onSubmit={(s) => statusOf && updateStatus.mutate({ id: statusOf.id, status: s })}
        />
      )}
      <Outlet />
    </div>
  );
}

function PropertyDialog({
  open, onOpenChange, property, owners, amenities, defaultOwnerId, canPickOwner, onSubmit, submitting,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; property: PropertyDto | null;
  owners: Owner[]; amenities: Amenity[]; defaultOwnerId?: number; canPickOwner: boolean;
  onSubmit: (v: { ownerId: number; name: string; address: string; type: string; salePrice?: number | null; rentPrice?: number | null; amenityIds: number[]; files?: File[] }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [ownerId, setOwnerId] = useState<string>(String(property?.ownerId ?? defaultOwnerId ?? ""));
  const [type, setType] = useState<string>(property?.type ?? "Apartment");
  const [picked, setPicked] = useState<Set<number>>(new Set(property?.amenities?.map((a) => a.id) ?? []));
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;

    setOwnerId(String(property?.ownerId ?? defaultOwnerId ?? ""));
    setType(property?.type ?? "Apartment");
    setPicked(new Set(property?.amenities?.map((amenity) => amenity.id) ?? []));
    setSelectedFiles([]);
  }, [open, property?.id, property?.ownerId, property?.type, property?.amenities, defaultOwnerId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setSelectedFiles([]);
      }}
      title={property ? t("common.edit") : t("common.add")}
      submitting={submitting}
      size="lg"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const oid = canPickOwner ? Number(ownerId) : (defaultOwnerId ?? Number(ownerId));
        onSubmit({
          ownerId: oid,
          name: String(fd.get("name") ?? ""),
          address: String(fd.get("address") ?? ""),
          type,
          salePrice: fd.get("salePrice") === "" ? null : Number(fd.get("salePrice") ?? 0),
          rentPrice: fd.get("rentPrice") === "" ? null : Number(fd.get("rentPrice") ?? 0),
          amenityIds: Array.from(picked),
          files: selectedFiles.length > 0 ? selectedFiles : undefined,
        });
      }}
    >
      {canPickOwner && (
        <div className="space-y-2">
          <Label>{t("nav.owners")}</Label>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {owners.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{t("common.name")}</Label>
          <Input id="name" name="name" defaultValue={property?.name ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label>{t("common.type")}</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="salePrice">{t("common.salePrice")}</Label>
          <Input id="salePrice" name="salePrice" type="number" step="0.01" min="0" defaultValue={property?.salePrice ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rentPrice">{t("common.monthlyRent")}</Label>
          <Input id="rentPrice" name="rentPrice" type="number" step="0.01" min="0" defaultValue={property?.rentPrice ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">{t("common.address")}</Label>
        <Input id="address" name="address" defaultValue={property?.address ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label>{t("nav.amenities")}</Label>
        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-3">
          {amenities.length === 0 ? (
            <span className="text-xs text-muted-foreground">{t("common.empty")}</span>
          ) : amenities.map((a) => {
            const checked = picked.has(a.id);
            return (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    const next = new Set(picked);
                    if (v) next.add(a.id); else next.delete(a.id);
                    setPicked(next);
                  }}
                />
                {a.name}
              </label>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="images">{t("common.images")}</Label>
        <Input
          id="images"
          name="images"
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
        />
        {selectedFiles.length > 0 && (
          <div className="mt-2 text-sm text-muted-foreground">
            {selectedFiles.length} {t("common.selected")}
          </div>
        )}
      </div>
    </FormDialog>
  );
}

function StatusDialog({ property, onOpenChange, onSubmit, submitting }: {
  property: PropertyDto | null; onOpenChange: (v: boolean) => void;
  onSubmit: (s: PropertyStatus) => void; submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [val, setVal] = useState<PropertyStatus>(property?.status ?? "Pending");

  useEffect(() => {
    setVal(property?.status ?? "Pending");
  }, [property?.id, property?.status]);

  return (
    <FormDialog
      key={`${property?.id ?? "none"}-${!!property}`}
      open={!!property}
      onOpenChange={onOpenChange}
      title={t("common.status")}
      submitting={submitting}
      onSubmit={(e) => { e.preventDefault(); onSubmit(val); }}
    >
      <Select value={val} onValueChange={(v) => setVal(v as PropertyStatus)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`propertyStatus.${s}`)}</SelectItem>)}
        </SelectContent>
      </Select>
    </FormDialog>
  );
}
