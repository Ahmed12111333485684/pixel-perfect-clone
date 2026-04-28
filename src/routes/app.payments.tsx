import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { api, type Payment, type PaymentStatusT, type Contract } from "@/lib/api";
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
import { paymentStatusTone, formatDate, formatMoney } from "@/lib/format";

const STATUSES: PaymentStatusT[] = ["Pending", "Paid", "Overdue"];

export const Route = createFileRoute("/app/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["payments"], queryFn: () => api<Payment[]>("/api/payments") });
  const contracts = useQuery({ queryKey: ["contracts"], queryFn: () => api<Contract[]>("/api/contracts"), enabled: auth.isStaff });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<Payment | null>(null);
  const [search, setSearch] = useState("");

  const upsert = useMutation({
    mutationFn: async (vals: Partial<Payment> & { id?: number }) => {
      if (vals.id) await api(`/api/payments/${vals.id}`, { method: "PUT", body: vals });
      else await api("/api/payments", { method: "POST", body: vals });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments"] }); toast.success(t("common.success")); setCreating(false); setEditing(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: number) => api(`/api/payments/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments"] }); toast.success(t("common.deleted")); setDeleting(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const contractLabelById = useMemo(
    () => new Map((contracts.data ?? []).map((c) => [c.id, `${c.deedNumber}`])),
    [contracts.data],
  );

  const cols: Column<Payment>[] = [
    { key: "contract", header: t("nav.contracts"), cell: (r) => contractLabelById.get(r.contractId) ?? `#${r.contractId}` },
    { key: "amount", header: t("common.amount"), cell: (r) => <span className="font-medium">{formatMoney(r.amount)}</span> },
    { key: "due", header: t("common.dueDate"), cell: (r) => formatDate(r.dueDate) },
    { key: "paid", header: t("common.paidDate"), cell: (r) => formatDate(r.paidDate) },
    { key: "status", header: t("common.status"), cell: (r) => <StatusBadge tone={paymentStatusTone(r.status)}>{t(`paymentStatus.${r.status}`)}</StatusBadge> },
  ];

  const filteredPayments = useMemo(() => {
    if (!search.trim()) return list.data ?? [];
    const lowerSearch = search.toLowerCase();
    return (list.data ?? []).filter((payment) => {
      const contractMatch = (contractLabelById.get(payment.contractId) ?? "").toLowerCase().includes(lowerSearch);
      const dueDateMatch = formatDate(payment.dueDate).toLowerCase().includes(lowerSearch);
      const statusMatch = t(`paymentStatus.${payment.status}`).toLowerCase().includes(lowerSearch);
      return contractMatch || dueDateMatch || statusMatch;
    });
  }, [list.data, search, contractLabelById, t]);

  return (
    <div>
      <PageHeader
        title={t("nav.payments")}
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
        rows={filteredPayments}
        loading={list.isLoading}
        error={list.error}
        rowKey={(r) => r.id}
        onEdit={auth.isStaff ? setEditing : undefined}
        onDelete={auth.isStaff ? setDeleting : undefined}
      />
      <PaymentDialog
        open={creating || !!editing}
        onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
        payment={editing}
        contracts={contracts.data ?? []}
        submitting={upsert.isPending}
        onSubmit={(v) => upsert.mutate({ ...v, id: editing?.id })}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={t("common.delete")}
        destructive
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
    </div>
  );
}

function PaymentDialog({ open, onOpenChange, payment, contracts, onSubmit, submitting }: {
  open: boolean; onOpenChange: (v: boolean) => void; payment: Payment | null; contracts: Contract[];
  onSubmit: (v: { contractId: number; dueDate: string; paidDate?: string; amount: number; status: PaymentStatusT }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [contractId, setContractId] = useState(String(payment?.contractId ?? ""));
  const [status, setStatus] = useState<PaymentStatusT>(payment?.status ?? "Pending");
  const isEditing = !!payment;
  const key = `${payment?.id ?? "new"}-${open}`;
  const parseDateParts = (value?: string) => {
    const safe = value?.slice(0, 10) ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(safe)) return { year: "", month: "", day: "" };
    return { year: safe.slice(0, 4), month: safe.slice(5, 7), day: safe.slice(8, 10) };
  };

  const startDue = parseDateParts(payment?.dueDate);
  const startPaid = parseDateParts(payment?.paidDate ?? undefined);

  const [dueYear, setDueYear] = useState(startDue.year);
  const [dueMonth, setDueMonth] = useState(startDue.month);
  const [dueDay, setDueDay] = useState(startDue.day);
  const [paidYear, setPaidYear] = useState(startPaid.year);
  const [paidMonth, setPaidMonth] = useState(startPaid.month);
  const [paidDay, setPaidDay] = useState(startPaid.day);

  const dueYearRef = useRef<HTMLInputElement>(null);
  const dueMonthRef = useRef<HTMLInputElement>(null);
  const dueDayRef = useRef<HTMLInputElement>(null);
  const paidYearRef = useRef<HTMLInputElement>(null);
  const paidMonthRef = useRef<HTMLInputElement>(null);
  const paidDayRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const d = parseDateParts(payment?.dueDate);
    const p = parseDateParts(payment?.paidDate ?? undefined);
    setContractId(String(payment?.contractId ?? ""));
    setStatus(payment?.status ?? "Pending");
    setDueYear(d.year); setDueMonth(d.month); setDueDay(d.day);
    setPaidYear(p.year); setPaidMonth(p.month); setPaidDay(p.day);
  }, [payment?.id, payment?.contractId, payment?.status, payment?.dueDate, payment?.paidDate, open]);

  const sanitizeDigits = (v: string, len: number) => v.replace(/\D/g, "").slice(0, len);
  const clampMonth = (v: string) => {
    if (!v) return v;
    const n = Number(v);
    if (Number.isNaN(n)) return "";
    return String(Math.min(12, Math.max(1, n))).padStart(2, "0");
  };
  const clampDay = (v: string) => {
    if (!v) return v;
    const n = Number(v);
    if (Number.isNaN(n)) return "";
    return String(Math.min(31, Math.max(1, n))).padStart(2, "0");
  };
  const onSegKey = (e: KeyboardEvent<HTMLInputElement>, val: string, prev?: RefObject<HTMLInputElement | null>) => { if (e.key === "Backspace" && val.length === 0 && prev?.current) prev.current.focus(); };

  const pad2 = (s: string) => (s ? s.padStart(2, "0") : "");
  const dueDate = `${dueYear}-${pad2(dueMonth)}-${pad2(dueDay)}`;
  const paidDate = paidYear || paidMonth || paidDay ? `${paidYear}-${pad2(paidMonth)}-${pad2(paidDay)}` : "";
  return (
    <FormDialog
      key={key}
      open={open}
      onOpenChange={onOpenChange}
      title={payment ? t("common.edit") : t("common.add")}
      submitting={submitting}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit({
          contractId: Number(contractId),
          dueDate: String(fd.get("dueDate") ?? ""),
          paidDate: String(fd.get("paidDate") ?? "") || undefined,
          amount: Number(fd.get("amount") ?? 0),
          status,
        });
      }}
    >
      <div className="space-y-2">
        <Label>{t("nav.contracts")}</Label>
        {isEditing ? (
          <Input
            value={`#${payment.contractId} — ${contracts.find((c) => c.id === payment.contractId)?.deedNumber ?? ""}`}
            readOnly
            disabled
          />
        ) : (
          <Select value={contractId} onValueChange={setContractId}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {contracts.map((c) => <SelectItem key={c.id} value={String(c.id)}>#{c.id} — {c.deedNumber}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="amount">{t("common.amount")}</Label><Input id="amount" name="amount" type="number" step="0.01" defaultValue={payment?.amount ?? ""} required /></div>
        <div className="space-y-2">
          <Label>{t("common.status")}</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as PaymentStatusT)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`paymentStatus.${s}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">{t("common.dueDate")}</Label>
          <input type="hidden" id="dueDate" name="dueDate" value={dueDate} />
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
            <Input ref={dueYearRef} aria-label="Due year" inputMode="numeric" placeholder="YYYY" value={dueYear} onChange={(e) => { const next = sanitizeDigits(e.target.value, 4); setDueYear(next); if (next.length === 4) dueMonthRef.current?.focus(); }} maxLength={4} required />
            <span className="text-muted-foreground">/</span>
            <Input ref={dueMonthRef} aria-label="Due month" inputMode="numeric" placeholder="MM" value={dueMonth} onChange={(e) => { const next = sanitizeDigits(e.target.value, 2); setDueMonth(next); if (next.length === 2) dueDayRef.current?.focus(); }} onBlur={() => setDueMonth((m) => clampMonth(m))} onKeyDown={(e) => onSegKey(e, dueMonth, dueYearRef)} maxLength={2} required />
            <span className="text-muted-foreground">/</span>
            <Input ref={dueDayRef} aria-label="Due day" inputMode="numeric" placeholder="DD" value={dueDay} onChange={(e) => { const next = sanitizeDigits(e.target.value, 2); setDueDay(next); }} onBlur={() => setDueDay((d) => clampDay(d))} onKeyDown={(e) => onSegKey(e, dueDay, dueMonthRef)} maxLength={2} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paidDate">{t("common.paidDate")}</Label>
          <input type="hidden" id="paidDate" name="paidDate" value={paidDate} />
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
            <Input ref={paidYearRef} aria-label="Paid year" inputMode="numeric" placeholder="YYYY" value={paidYear} onChange={(e) => { const next = sanitizeDigits(e.target.value, 4); setPaidYear(next); if (next.length === 4) paidMonthRef.current?.focus(); }} maxLength={4} />
            <span className="text-muted-foreground">/</span>
            <Input ref={paidMonthRef} aria-label="Paid month" inputMode="numeric" placeholder="MM" value={paidMonth} onChange={(e) => { const next = sanitizeDigits(e.target.value, 2); setPaidMonth(next); if (next.length === 2) paidDayRef.current?.focus(); }} onBlur={() => setPaidMonth((m) => clampMonth(m))} onKeyDown={(e) => onSegKey(e, paidMonth, paidYearRef)} maxLength={2} />
            <span className="text-muted-foreground">/</span>
            <Input ref={paidDayRef} aria-label="Paid day" inputMode="numeric" placeholder="DD" value={paidDay} onChange={(e) => { const next = sanitizeDigits(e.target.value, 2); setPaidDay(next); }} onBlur={() => setPaidDay((d) => clampDay(d))} onKeyDown={(e) => onSegKey(e, paidDay, paidMonthRef)} maxLength={2} />
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
