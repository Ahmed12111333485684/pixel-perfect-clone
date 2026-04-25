import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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

  const cols: Column<Payment>[] = [
    { key: "contract", header: t("nav.contracts"), cell: (r) => `#${r.contractId}` },
    { key: "amount", header: t("common.amount"), cell: (r) => <span className="font-medium">{formatMoney(r.amount)}</span> },
    { key: "due", header: t("common.dueDate"), cell: (r) => formatDate(r.dueDate) },
    { key: "paid", header: t("common.paidDate"), cell: (r) => formatDate(r.paidDate) },
    { key: "status", header: t("common.status"), cell: (r) => <StatusBadge tone={paymentStatusTone(r.status)}>{t(`paymentStatus.${r.status}`)}</StatusBadge> },
  ];

  return (
    <div>
      <PageHeader
        title={t("nav.payments")}
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
  const key = `${payment?.id ?? "new"}-${open}`;
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
        <Select value={contractId} onValueChange={setContractId}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {contracts.map((c) => <SelectItem key={c.id} value={String(c.id)}>#{c.id} — {c.deedNumber}</SelectItem>)}
          </SelectContent>
        </Select>
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
        <div className="space-y-2"><Label htmlFor="dueDate">{t("common.dueDate")}</Label><Input id="dueDate" name="dueDate" type="date" defaultValue={payment?.dueDate?.slice(0, 10) ?? ""} required /></div>
        <div className="space-y-2"><Label htmlFor="paidDate">{t("common.paidDate")}</Label><Input id="paidDate" name="paidDate" type="date" defaultValue={payment?.paidDate?.slice(0, 10) ?? ""} /></div>
      </div>
    </FormDialog>
  );
}
