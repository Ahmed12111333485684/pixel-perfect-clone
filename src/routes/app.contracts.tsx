import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Contract, type ContractStatus, type PropertyDto, type Tenant } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, StatusBadge } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { contractStatusTone, formatDate, formatMoney } from "@/lib/format";

const STATUSES: ContractStatus[] = ["Active", "Expired", "Terminated", "Pending"];

export const Route = createFileRoute("/app/contracts")({ component: ContractsPage });

function ContractsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ["contracts"], queryFn: () => api<Contract[]>("/api/contracts") });
  const properties = useQuery({ queryKey: ["properties"], queryFn: () => api<PropertyDto[]>("/api/properties") });
  const tenants = useQuery({ queryKey: ["tenants"], queryFn: () => api<Tenant[]>("/api/tenants"), enabled: auth.isStaff });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState<Contract | null>(null);

  const upsert = useMutation({
    mutationFn: async (vals: Partial<Contract> & { id?: number }) => {
      if (vals.id) await api(`/api/contracts/${vals.id}`, { method: "PUT", body: vals });
      else await api("/api/contracts", { method: "POST", body: vals });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast.success(t("common.success")); setCreating(false); setEditing(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: number) => api(`/api/contracts/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast.success(t("common.deleted")); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: Column<Contract>[] = [
    { key: "deed", header: t("common.deedNumber"), cell: (r) => <span className="font-mono text-xs">{r.deedNumber}</span> },
    { key: "prop", header: t("nav.properties"), cell: (r) => `#${r.propertyId}` },
    { key: "tenant", header: t("nav.tenants"), cell: (r) => `#${r.tenantId}` },
    { key: "rent", header: t("common.monthlyRent"), cell: (r) => formatMoney(r.monthlyRent) },
    { key: "start", header: t("common.startDate"), cell: (r) => formatDate(r.startDate) },
    { key: "end", header: t("common.endDate"), cell: (r) => formatDate(r.endDate) },
    { key: "status", header: t("common.status"), cell: (r) => <StatusBadge tone={contractStatusTone(r.status)}>{t(`contractStatus.${r.status}`)}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader
        title={t("nav.contracts")}
        actions={auth.isStaff && <Button onClick={() => setCreating(true)}><Plus className="me-1 h-4 w-4" />{t("common.add")}</Button>}
      />
      <DataTable
        columns={cols}
        rows={list.data}
        loading={list.isLoading}
        error={list.error}
        rowKey={(r) => r.id}
        onEdit={auth.isStaff ? setEditing : undefined}
        onDelete={auth.isStaff ? setDeleting : undefined}
      />
      <ContractDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        contract={editing}
        properties={properties.data ?? []}
        tenants={tenants.data ?? []}
        submitting={upsert.isPending}
        onSubmit={(v) => upsert.mutate({ ...v, id: editing?.id })}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`${t("common.delete")}: ${deleting?.deedNumber ?? ""}`}
        destructive
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
    </div>
  );
}

function ContractDialog({ open, onOpenChange, contract, properties, tenants, onSubmit, submitting }: {
  open: boolean; onOpenChange: (v: boolean) => void; contract: Contract | null;
  properties: PropertyDto[]; tenants: Tenant[];
  onSubmit: (v: { propertyId: number; tenantId: number; deedNumber: string; startDate: string; endDate: string; monthlyRent: number; status: ContractStatus }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [propertyId, setPropertyId] = useState(String(contract?.propertyId ?? ""));
  const [tenantId, setTenantId] = useState(String(contract?.tenantId ?? ""));
  const [status, setStatus] = useState<ContractStatus>(contract?.status ?? "Pending");
  const key = `${contract?.id ?? "new"}-${open}`;

  return (
    <FormDialog
      key={key}
      open={open}
      onOpenChange={onOpenChange}
      title={contract ? t("common.edit") : t("common.add")}
      submitting={submitting}
      size="lg"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          propertyId: Number(propertyId),
          tenantId: Number(tenantId),
          deedNumber: String(fd.get("deedNumber") ?? ""),
          startDate: String(fd.get("startDate") ?? ""),
          endDate: String(fd.get("endDate") ?? ""),
          monthlyRent: Number(fd.get("monthlyRent") ?? 0),
          status,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("nav.properties")}</Label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {properties.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("nav.tenants")}</Label>
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {tenants.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="deedNumber">{t("common.deedNumber")}</Label><Input id="deedNumber" name="deedNumber" defaultValue={contract?.deedNumber ?? ""} required /></div>
        <div className="space-y-2"><Label htmlFor="monthlyRent">{t("common.monthlyRent")}</Label><Input id="monthlyRent" name="monthlyRent" type="number" step="0.01" defaultValue={contract?.monthlyRent ?? ""} required /></div>
        <div className="space-y-2"><Label htmlFor="startDate">{t("common.startDate")}</Label><Input id="startDate" name="startDate" type="date" defaultValue={contract?.startDate?.slice(0, 10) ?? ""} required /></div>
        <div className="space-y-2"><Label htmlFor="endDate">{t("common.endDate")}</Label><Input id="endDate" name="endDate" type="date" defaultValue={contract?.endDate?.slice(0, 10) ?? ""} required /></div>
      </div>
      <div className="space-y-2">
        <Label>{t("common.status")}</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as ContractStatus)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`contractStatus.${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </FormDialog>
  );
}
