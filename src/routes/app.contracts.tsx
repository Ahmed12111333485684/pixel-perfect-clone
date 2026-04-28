import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
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
import { FormField } from "./app.owners";

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
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState<Contract | null>(null);
  const [search, setSearch] = useState("");

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

  const createTenant = useMutation({
    mutationFn: (vals: { fullName: string; phone: string; email: string; nationalId: string }) =>
      api("/api/tenants", { method: "POST", body: vals }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(t("common.success"));
      setCreatingTenant(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const propertyLabelById = useMemo(
    () => new Map((properties.data ?? []).map((p) => [p.id, p.name])),
    [properties.data],
  );

  const tenantLabelById = useMemo(
    () => new Map((tenants.data ?? []).map((t) => [t.id, t.fullName])),
    [tenants.data],
  );

  const cols: Column<Contract>[] = [
    { key: "deed", header: t("common.deedNumber"), cell: (r) => <span className="font-mono text-xs">{r.deedNumber}</span> },
    { key: "prop", header: t("nav.properties"), cell: (r) => propertyLabelById.get(r.propertyId) ?? `#${r.propertyId}` },
    { key: "tenant", header: t("nav.tenants"), cell: (r) => tenantLabelById.get(r.tenantId) ?? `#${r.tenantId}` },
    { key: "rent", header: t("common.monthlyRent"), cell: (r) => formatMoney(r.monthlyRent) },
    { key: "start", header: t("common.startDate"), cell: (r) => formatDate(r.startDate) },
    { key: "end", header: t("common.endDate"), cell: (r) => formatDate(r.endDate) },
    { key: "status", header: t("common.status"), cell: (r) => <StatusBadge tone={contractStatusTone(r.status)}>{t(`contractStatus.${r.status}`)}</StatusBadge> },
  ];

  const filteredContracts = useMemo(() => {
    if (!search.trim()) return list.data ?? [];
    const lowerSearch = search.toLowerCase();
    return (list.data ?? []).filter((contract) => {
      const deedMatch = contract.deedNumber.toLowerCase().includes(lowerSearch);
      const propMatch = (propertyLabelById.get(contract.propertyId) ?? "").toLowerCase().includes(lowerSearch);
      const tenantMatch = (tenantLabelById.get(contract.tenantId) ?? "").toLowerCase().includes(lowerSearch);
      return deedMatch || propMatch || tenantMatch;
    });
  }, [list.data, search, propertyLabelById, tenantLabelById]);

  return (
    <div>
      <PageHeader
        title={t("nav.contracts")}
        actions={auth.isStaff && <Button onClick={() => setCreating(true)}><Plus className="me-1 h-4 w-4" />{t("common.add")}</Button>}
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
        rows={filteredContracts}
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
        onAddTenant={() => setCreatingTenant(true)}
        submitting={upsert.isPending}
        onSubmit={(v) => upsert.mutate({ ...v, id: editing?.id })}
      />

      <FormDialog
        open={creatingTenant}
        onOpenChange={(v) => !v && setCreatingTenant(false)}
        title={t("nav.tenants")}
        description={t("common.add")}
        submitting={createTenant.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          createTenant.mutate({
            fullName: String(fd.get("fullName") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            email: String(fd.get("email") ?? ""),
            nationalId: String(fd.get("nationalId") ?? ""),
          });
        }}
      >
        <FormField id="fullName" label={t("common.fullName")} />
        <FormField id="phone" label={t("common.phone")} />
        <FormField id="email" label={t("common.email")} type="email" />
        <FormField id="nationalId" label={t("common.nationalId")} />
      </FormDialog>
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

function ContractDialog({ open, onOpenChange, contract, properties, tenants, onAddTenant, onSubmit, submitting }: {
  open: boolean; onOpenChange: (v: boolean) => void; contract: Contract | null;
  properties: PropertyDto[]; tenants: Tenant[];
  onAddTenant: () => void;
  onSubmit: (v: { propertyId: number; tenantId: number; deedNumber: string; startDate: string; endDate: string; monthlyRent: number; status: ContractStatus }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [propertyId, setPropertyId] = useState(String(contract?.propertyId ?? ""));
  const [tenantId, setTenantId] = useState(String(contract?.tenantId ?? ""));
  const [status, setStatus] = useState<ContractStatus>(contract?.status ?? "Pending");
  const key = `${contract?.id ?? "new"}-${open}`;

  const parseDateParts = (value?: string) => {
    const safe = value?.slice(0, 10) ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(safe)) {
      return { year: "", month: "", day: "" };
    }
    return {
      year: safe.slice(0, 4),
      month: safe.slice(5, 7),
      day: safe.slice(8, 10),
    };
  };

  const initialStart = parseDateParts(contract?.startDate);
  const initialEnd = parseDateParts(contract?.endDate);

  const [startYear, setStartYear] = useState(initialStart.year);
  const [startMonth, setStartMonth] = useState(initialStart.month);
  const [startDay, setStartDay] = useState(initialStart.day);
  const [endYear, setEndYear] = useState(initialEnd.year);
  const [endMonth, setEndMonth] = useState(initialEnd.month);
  const [endDay, setEndDay] = useState(initialEnd.day);

  const startYearRef = useRef<HTMLInputElement>(null);
  const startMonthRef = useRef<HTMLInputElement>(null);
  const startDayRef = useRef<HTMLInputElement>(null);
  const endYearRef = useRef<HTMLInputElement>(null);
  const endMonthRef = useRef<HTMLInputElement>(null);
  const endDayRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const start = parseDateParts(contract?.startDate);
    const end = parseDateParts(contract?.endDate);
    setPropertyId(String(contract?.propertyId ?? ""));
    setTenantId(String(contract?.tenantId ?? ""));
    setStatus(contract?.status ?? "Pending");
    setStartYear(start.year);
    setStartMonth(start.month);
    setStartDay(start.day);
    setEndYear(end.year);
    setEndMonth(end.month);
    setEndDay(end.day);
  }, [contract?.id, contract?.propertyId, contract?.tenantId, contract?.status, contract?.startDate, contract?.endDate, open]);

  const sanitizeDigits = (value: string, maxLength: number) => value.replace(/\D/g, "").slice(0, maxLength);

  const clampMonth = (value: string) => {
    if (!value) return value;
    const n = Number(value);
    if (Number.isNaN(n)) return "";
    return String(Math.min(12, Math.max(1, n))).padStart(2, "0");
  };

  const clampDay = (value: string) => {
    if (!value) return value;
    const n = Number(value);
    if (Number.isNaN(n)) return "";
    return String(Math.min(31, Math.max(1, n))).padStart(2, "0");
  };

  const onSegmentKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    value: string,
    previousRef?: RefObject<HTMLInputElement | null>,
  ) => {
    if (e.key === "Backspace" && value.length === 0 && previousRef?.current) {
      previousRef.current.focus();
    }
  };

  const padded = (s: string) => (s ? s.padStart(2, "0") : "");
  const startDate = `${startYear}-${padded(startMonth)}-${padded(startDay)}`;
  const endDate = `${endYear}-${padded(endMonth)}-${padded(endDay)}`;

  const isValidDateInput = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00`);
    return !Number.isNaN(parsed.getTime());
  };

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
        const startDate = String(fd.get("startDate") ?? "").trim();
        const endDate = String(fd.get("endDate") ?? "").trim();

        if (!propertyId || Number(propertyId) <= 0) {
          toast.error(t("common.requiredField"));
          return;
        }
        if (!tenantId || Number(tenantId) <= 0) {
          toast.error(t("common.requiredField"));
          return;
        }
        if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
          toast.error("Date must be in YYYY-MM-DD format");
          return;
        }
        if (startDate > endDate) {
          toast.error("Start date must be on or before end date");
          return;
        }

        onSubmit({
          propertyId: Number(propertyId),
          tenantId: Number(tenantId),
          deedNumber: String(fd.get("deedNumber") ?? ""),
          startDate,
          endDate,
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
              {properties.map((property) => (
                <SelectItem key={property.id} value={String(property.id)}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>{t("nav.tenants")}</Label>
            <Button type="button" variant="ghost" size="sm" onClick={onAddTenant} className="h-7 px-2 text-xs">
              <Plus className="me-1 h-3 w-3" />{t("common.add")}
            </Button>
          </div>
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={String(tenant.id)}>
                  {tenant.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="deedNumber">{t("common.deedNumber")}</Label><Input id="deedNumber" name="deedNumber" defaultValue={contract?.deedNumber ?? ""} required /></div>
        <div className="space-y-2"><Label htmlFor="monthlyRent">{t("common.monthlyRent")}</Label><Input id="monthlyRent" name="monthlyRent" type="number" step="0.01" defaultValue={contract?.monthlyRent ?? ""} required /></div>
        <div className="space-y-2">
          <Label htmlFor="startDate">{t("common.startDate")}</Label>
          <input type="hidden" id="startDate" name="startDate" value={startDate} />
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
            <Input
              ref={startYearRef}
              id="startYear"
              aria-label="Start year"
              inputMode="numeric"
              placeholder="YYYY"
              value={startYear}
              onChange={(e) => {
                const next = sanitizeDigits(e.target.value, 4);
                setStartYear(next);
                if (next.length === 4) startMonthRef.current?.focus();
              }}
              maxLength={4}
              required
            />
            <span className="text-muted-foreground">/</span>
            <Input
              ref={startMonthRef}
              id="startMonth"
              aria-label="Start month"
              inputMode="numeric"
              placeholder="MM"
              value={startMonth}
              onChange={(e) => {
                const next = sanitizeDigits(e.target.value, 2);
                setStartMonth(next);
                if (next.length === 2) startDayRef.current?.focus();
              }}
              onBlur={() => setStartMonth((m) => clampMonth(m))}
              onKeyDown={(e) => onSegmentKeyDown(e, startMonth, startYearRef)}
              maxLength={2}
              required
            />
            <span className="text-muted-foreground">/</span>
            <Input
              ref={startDayRef}
              id="startDay"
              aria-label="Start day"
              inputMode="numeric"
              placeholder="DD"
              value={startDay}
              onChange={(e) => {
                const next = sanitizeDigits(e.target.value, 2);
                setStartDay(next);
                if (next.length === 2) endYearRef.current?.focus();
              }}
              onBlur={() => setStartDay((d) => clampDay(d))}
              onKeyDown={(e) => onSegmentKeyDown(e, startDay, startMonthRef)}
              maxLength={2}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">{t("common.endDate")}</Label>
          <input type="hidden" id="endDate" name="endDate" value={endDate} />
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
            <Input
              ref={endYearRef}
              id="endYear"
              aria-label="End year"
              inputMode="numeric"
              placeholder="YYYY"
              value={endYear}
              onChange={(e) => {
                const next = sanitizeDigits(e.target.value, 4);
                setEndYear(next);
                if (next.length === 4) endMonthRef.current?.focus();
              }}
              maxLength={4}
              required
            />
            <span className="text-muted-foreground">/</span>
            <Input
              ref={endMonthRef}
              id="endMonth"
              aria-label="End month"
              inputMode="numeric"
              placeholder="MM"
              value={endMonth}
              onChange={(e) => {
                const next = sanitizeDigits(e.target.value, 2);
                setEndMonth(next);
                if (next.length === 2) endDayRef.current?.focus();
              }}
              onBlur={() => setEndMonth((m) => clampMonth(m))}
              onKeyDown={(e) => onSegmentKeyDown(e, endMonth, endYearRef)}
              maxLength={2}
              required
            />
            <span className="text-muted-foreground">/</span>
            <Input
              ref={endDayRef}
              id="endDay"
              aria-label="End day"
              inputMode="numeric"
              placeholder="DD"
              value={endDay}
              onChange={(e) => {
                const next = sanitizeDigits(e.target.value, 2);
                setEndDay(next);
              }}
              onBlur={() => setEndDay((d) => clampDay(d))}
              onKeyDown={(e) => onSegmentKeyDown(e, endDay, endMonthRef)}
              maxLength={2}
              required
            />
          </div>
        </div>
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
