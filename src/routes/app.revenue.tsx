import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type RevenueEntry,
  type UserDto,
  type CommercialListing,
} from "@/lib/api";
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
import { PhoneField } from "@/components/form/PhoneField";
import { ComboboxField } from "@/components/form/ComboboxField";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/revenue")({
  component: RevenuePage,
});

const PAYMENT_METHODS = ["كاش", "حوالة", "سداد", "مدي"] as const;
const CATEGORY_OPTIONS = [
  { value: "ايجار", label: "ايجار" },
  { value: "بيع", label: "بيع" },
  { value: "عمولة", label: "عمولة" },
  { value: "اخرى", label: "اخرى" },
];

function readFieldValue(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function buildPayload(fd: FormData) {
  return {
    date: readFieldValue(fd, "date"),
    employeeId: Number(readFieldValue(fd, "employeeId")) || undefined,
    offerCode: readFieldValue(fd, "offerCode"),
    category: readFieldValue(fd, "category"),
    owner: readFieldValue(fd, "owner"),
    tenantBuyer: readFieldValue(fd, "tenantBuyer"),
    tenantPhone: readFieldValue(fd, "tenantPhone"),
    ownerBroker: readFieldValue(fd, "ownerBroker"),
    tenantBroker: readFieldValue(fd, "tenantBroker"),
    amount: Number(readFieldValue(fd, "amount")) || 0,
    officeNet: Number(readFieldValue(fd, "officeNet")) || 0,
    paymentMethod: readFieldValue(fd, "paymentMethod"),
  };
}

function RevenuePage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();

  const currentDate = new Date();
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);

  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<RevenueEntry | null>(null);
  const [deleting, setDeleting] = useState<RevenueEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const [sortKey, setSortKey] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const hasAccess =
    auth.hasRole("Admin") ||
    auth.user?.screenPermissions.includes("/app/revenue");
  const canManage = auth.hasRole("Admin") || auth.isStaff;

  const entries = useQuery<RevenueEntry[]>({
    queryKey: ["revenue", year, month],
    queryFn: () =>
      api<RevenueEntry[]>("/api/RevenueEntries", {
        query: { year, month },
      }),
    enabled: hasAccess,
  });

  const users = useQuery({
    queryKey: ["users", "lookup"],
    queryFn: () => api<UserDto[]>("/api/users"),
    enabled: hasAccess,
  });

  const listings = useQuery<{ items: CommercialListing[]; total: number }>({
    queryKey: ["listings", "lookup"],
    queryFn: () => api("/api/listings"),
    enabled: hasAccess,
  });

  const offerCodeOptions = useMemo(() => {
    if (!listings.data?.items) return [];
    const codes = listings.data.items
      .map((l) => l.offerCode)
      .filter((c): c is string => !!c && c.trim().length > 0);
    const unique = [...new Set(codes)];
    return unique.map((c) => ({ value: c, label: c }));
  }, [listings.data?.items]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = buildPayload(fd);
      await api<RevenueEntry>("/api/RevenueEntries", {
        method: "POST",
        body: payload,
      });
      toast.success(t("common.created"));
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["revenue"] });
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
      const payload = buildPayload(fd);
      await api<RevenueEntry>(`/api/RevenueEntries/${selected.id}`, {
        method: "PUT",
        body: payload,
      });
      toast.success(t("common.updated"));
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["revenue"] });
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
      await api(`/api/RevenueEntries/${deleting.id}`, { method: "DELETE" });
      toast.success(t("common.deleted"));
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["revenue"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setDeletingRecord(false);
    }
  };

  const columns: Column<RevenueEntry>[] = [
    {
      key: "date",
      header: t("revenue.date"),
      cell: (row) => formatDate(row.date),
      sortable: true,
    },
    {
      key: "employeeName",
      header: t("revenue.employee"),
      cell: (row) => row.employeeName || "-",
      sortable: true,
    },
    {
      key: "offerCode",
      header: t("revenue.offerCode"),
      cell: (row) => row.offerCode || "-",
      sortable: true,
    },
    {
      key: "category",
      header: t("revenue.category"),
      cell: (row) => row.category,
      sortable: true,
    },
    {
      key: "owner",
      header: t("revenue.owner"),
      cell: (row) => row.owner || "-",
      sortable: true,
    },
    {
      key: "tenantBuyer",
      header: t("revenue.tenantBuyer"),
      cell: (row) => row.tenantBuyer || "-",
      sortable: true,
    },
    {
      key: "tenantPhone",
      header: t("revenue.tenantPhone"),
      cell: (row) => row.tenantPhone || "-",
      sortable: true,
    },
    {
      key: "ownerBroker",
      header: t("revenue.ownerBroker"),
      cell: (row) => row.ownerBroker || "-",
      sortable: true,
    },
    {
      key: "tenantBroker",
      header: t("revenue.tenantBroker"),
      cell: (row) => row.tenantBroker || "-",
      sortable: true,
    },
    {
      key: "amount",
      header: t("revenue.amount"),
      cell: (row) => row.amount.toLocaleString(),
      sortable: true,
    },
    {
      key: "officeNet",
      header: t("revenue.officeNet"),
      cell: (row) => row.officeNet.toLocaleString(),
      sortable: true,
    },
    {
      key: "paymentMethod",
      header: t("revenue.paymentMethod"),
      cell: (row) => row.paymentMethod,
      sortable: true,
    },
  ];

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.noScreenAccess")}
      </div>
    );
  }

  const sorted = useMemo(() => {
    if (!entries.data) return [];
    return [...entries.data].sort((a, b) => {
      let aVal = a[sortKey as keyof RevenueEntry] ?? "";
      let bVal = b[sortKey as keyof RevenueEntry] ?? "";
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [entries.data, sortKey, sortDir]);

  const revenueStats = useMemo(() => {
    const data = entries.data ?? [];
    return {
      totalAmount: data.reduce((sum, e) => sum + e.amount, 0),
      totalOfficeNet: data.reduce((sum, e) => sum + e.officeNet, 0),
      count: data.length,
    };
  }, [entries.data]);

  const years = Array.from(
    { length: 5 },
    (_, i) => currentDate.getFullYear() - i,
  );
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div>
      <PageHeader
        title={t("revenue.title")}
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="me-1 h-4 w-4" />
              {t("revenue.add")}
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

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("revenue.totalAmount")}</p>
          <p className="text-2xl font-bold">{revenueStats.totalAmount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("revenue.totalOfficeNet")}</p>
          <p className="text-2xl font-bold">{revenueStats.totalOfficeNet.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("revenue.recordCount")}</p>
          <p className="text-2xl font-bold">{revenueStats.count}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={sorted}
        loading={entries.isLoading}
        error={entries.error}
        rowKey={(row) => row.id}
        onEdit={canManage ? (row) => setSelected(row) : undefined}
        onDelete={canManage ? (row) => setDeleting(row) : undefined}
        onRowClick={(row) => setSelected(row)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />

      <RevenueDialog
        open={creating}
        onOpenChange={setCreating}
        entry={null}
        users={users.data ?? []}
        offerCodeOptions={offerCodeOptions}
        readOnly={!canManage}
        submitting={submitting}
        title={t("revenue.add")}
        submitLabel={t("common.create")}
        onSubmit={handleCreate}
      />

      <RevenueDialog
        open={!!selected}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
        entry={selected}
        users={users.data ?? []}
        offerCodeOptions={offerCodeOptions}
        readOnly={!canManage}
        submitting={submitting}
        title={canManage ? t("revenue.edit") : t("common.details")}
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
        description={deleting?.offerCode ?? t("revenue.title")}
        confirmLabel={t("common.delete")}
        destructive
        loading={deletingRecord}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function RevenueDialog({
  open,
  onOpenChange,
  entry,
  users,
  offerCodeOptions,
  readOnly,
  submitting,
  title,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  entry: RevenueEntry | null;
  users: UserDto[];
  offerCodeOptions: { value: string; label: string }[];
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
          <Label htmlFor="date">{t("revenue.date")}</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={
              entry?.date ? String(entry.date).slice(0, 10) : ""
            }
            required
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employeeId">{t("revenue.employee")}</Label>
          <Select
            name="employeeId"
            defaultValue={
              entry?.employeeId ? String(entry.employeeId) : undefined
            }
            disabled={readOnly}
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
          <Label>{t("revenue.offerCode")}</Label>
          <ComboboxField
            id="offerCode"
            label=""
            options={offerCodeOptions}
            defaultValue={entry?.offerCode ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">{t("revenue.category")}</Label>
          <Select
            name="category"
            defaultValue={entry?.category ?? CATEGORY_OPTIONS[0].value}
            disabled={readOnly}
            required
          >
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner">{t("revenue.owner")}</Label>
          <Input
            id="owner"
            name="owner"
            defaultValue={entry?.owner ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenantBuyer">{t("revenue.tenantBuyer")}</Label>
          <Input
            id="tenantBuyer"
            name="tenantBuyer"
            defaultValue={entry?.tenantBuyer ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <PhoneField
            id="tenantPhone"
            label={t("revenue.tenantPhone")}
            defaultValue={entry?.tenantPhone ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerBroker">{t("revenue.ownerBroker")}</Label>
          <Input
            id="ownerBroker"
            name="ownerBroker"
            defaultValue={entry?.ownerBroker ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenantBroker">{t("revenue.tenantBroker")}</Label>
          <Input
            id="tenantBroker"
            name="tenantBroker"
            defaultValue={entry?.tenantBroker ?? ""}
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">{t("revenue.amount")}</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min={0}
            defaultValue={entry?.amount ?? ""}
            required
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="officeNet">{t("revenue.officeNet")}</Label>
          <Input
            id="officeNet"
            name="officeNet"
            type="number"
            step="0.01"
            min={0}
            defaultValue={entry?.officeNet ?? ""}
            required
            readOnly={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">{t("revenue.paymentMethod")}</Label>
          <Select
            name="paymentMethod"
            defaultValue={entry?.paymentMethod ?? PAYMENT_METHODS[0]}
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
      </div>
    </FormDialog>
  );
}
