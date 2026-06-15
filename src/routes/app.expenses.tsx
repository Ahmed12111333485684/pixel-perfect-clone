import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Expense, type UserDto } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/expenses")({
  component: ExpensesPage,
});

const PAYMENT_METHODS = ["كاش", "حوالة", "سداد", "مدي"] as const;

function readFieldValue(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function buildExpensePayload(fd: FormData) {
  const payload: Record<string, unknown> = {};

  payload.date = readFieldValue(fd, "date");
  payload.reference = readFieldValue(fd, "reference");
  payload.employeeId = Number(readFieldValue(fd, "employeeId"));
  payload.category = readFieldValue(fd, "category");
  payload.amount = Number(readFieldValue(fd, "amount"));
  payload.paymentMethod = readFieldValue(fd, "paymentMethod");
  payload.notes = readFieldValue(fd, "notes");

  return payload;
}

function ExpensesPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const currentDate = new Date();
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);

  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const hasAccess =
    auth.hasRole("Admin") ||
    auth.user?.screenPermissions.includes("/app/expenses");
  const canManage = auth.hasRole("Admin") || auth.isStaff;

  const expenses = useQuery<Expense[]>({
    queryKey: ["expenses", year, month],
    queryFn: () =>
      api<Expense[]>("/api/expenses", {
        query: { year, month },
      }),
    enabled: hasAccess,
  });

  const users = useQuery({
    queryKey: ["users", "lookup"],
    queryFn: () => api<UserDto[]>("/api/users"),
    enabled: hasAccess,
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = buildExpensePayload(fd);
      await api<Expense>("/api/expenses", { method: "POST", body: payload });
      toast.success(t("common.created"));
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["expenses"] });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = buildExpensePayload(fd);
      await api<Expense>(`/api/expenses/${selected.id}`, {
        method: "PUT",
        body: payload,
      });
      toast.success(t("common.updated"));
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["expenses"] });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingRecord(true);
    try {
      await api(`/api/expenses/${deleting.id}`, { method: "DELETE" });
      toast.success(t("common.deleted"));
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["expenses"] });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDeletingRecord(false);
    }
  };

  const columns: Column<Expense>[] = [
    {
      key: "date",
      header: t("expenses.date"),
      cell: (row) => formatDate(row.date),
    },
    {
      key: "category",
      header: t("expenses.category"),
      cell: (row) => <span className="font-medium">{row.category}</span>,
    },
    {
      key: "amount",
      header: t("expenses.amount"),
      cell: (row) => row.amount.toLocaleString(),
    },
    {
      key: "employeeName",
      header: t("expenses.employee"),
      cell: (row) => row.employeeName || "-",
    },
    {
      key: "paymentMethod",
      header: t("expenses.paymentMethod"),
      cell: (row) => row.paymentMethod,
    },
    {
      key: "reference",
      header: t("expenses.reference"),
      cell: (row) => row.reference || "-",
    },
  ];

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.noScreenAccess")}
      </div>
    );
  }

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div>
      <PageHeader
        title={t("expenses.title")}
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="me-1 h-4 w-4" />
              {t("expenses.add")}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="year" className="text-xs font-medium">
              {t("expenses.year")}
            </Label>
            <Select
              value={String(year)}
              onValueChange={(value) => setYear(Number(value))}
            >
              <SelectTrigger id="year" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="month" className="text-xs font-medium">
              {t("expenses.month")}
            </Label>
            <Select
              value={String(month)}
              onValueChange={(value) => setMonth(Number(value))}
            >
              <SelectTrigger id="month" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={expenses.data ?? []}
        loading={expenses.isLoading}
        error={expenses.error}
        rowKey={(row) => row.id}
        onEdit={canManage ? (row) => setSelected(row) : undefined}
        onDelete={canManage ? (row) => setDeleting(row) : undefined}
        onRowClick={(row) => setSelected(row)}
      />

      <ExpenseDialog
        open={creating}
        onOpenChange={setCreating}
        expense={null}
        users={users.data ?? []}
        readOnly={!canManage}
        submitting={submitting}
        title={t("expenses.add")}
        submitLabel={t("common.create")}
        onSubmit={handleCreate}
      />

      <ExpenseDialog
        open={!!selected}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
        expense={selected}
        users={users.data ?? []}
        readOnly={!canManage}
        submitting={submitting}
        title={canManage ? t("expenses.edit") : t("common.details")}
        submitLabel={canManage ? t("common.save") : t("common.close")}
        onSubmit={
          canManage
            ? handleUpdate
            : (e) => {
                e.preventDefault();
                setSelected(null);
              }
        }
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(value) => {
          if (!value) setDeleting(null);
        }}
        title={t("common.delete")}
        description={deleting?.category ?? t("expenses.title")}
        confirmLabel={t("common.delete")}
        destructive
        loading={deletingRecord}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  users,
  readOnly,
  submitting,
  title,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  expense: Expense | null;
  users: UserDto[];
  readOnly: boolean;
  submitting: boolean;
  title: string;
  submitLabel: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      submitLabel={submitLabel}
      submitting={submitting}
      size="lg"
      onSubmit={onSubmit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">{t("expenses.date")}</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={expense?.date ? String(expense.date).slice(0, 10) : ""}
            required
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employeeId">{t("expenses.employee")}</Label>
          <Select
            name="employeeId"
            defaultValue={expense?.employeeId ? String(expense.employeeId) : undefined}
            disabled={readOnly}
            required
          >
            <SelectTrigger id="employeeId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {user.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">{t("expenses.category")}</Label>
          <Input
            id="category"
            name="category"
            defaultValue={expense?.category ?? ""}
            required
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">{t("expenses.amount")}</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min={0}
            defaultValue={expense?.amount ?? ""}
            required
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">{t("expenses.paymentMethod")}</Label>
          <Select
            name="paymentMethod"
            defaultValue={expense?.paymentMethod ?? PAYMENT_METHODS[0]}
            disabled={readOnly}
            required
          >
            <SelectTrigger id="paymentMethod">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">{t("expenses.reference")}</Label>
          <Input
            id="reference"
            name="reference"
            defaultValue={expense?.reference ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">{t("expenses.notes")}</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={expense?.notes ?? ""}
            readOnly={readOnly}
          />
        </div>
      </div>
    </FormDialog>
  );
}
