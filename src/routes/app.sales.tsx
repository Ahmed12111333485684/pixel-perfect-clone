import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { api, type Sale, type PropertyDto, type Buyer } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog } from "@/components/FormDialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/app/sales")({ component: SalesPage });

function SalesPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["sales"], queryFn: () => api<Sale[]>("/api/sales") });
  const properties = useQuery({ queryKey: ["properties"], queryFn: () => api<PropertyDto[]>("/api/properties"), enabled: auth.isStaff });
  const buyers = useQuery({ queryKey: ["buyers"], queryFn: () => api<Buyer[]>("/api/buyers"), enabled: auth.isStaff });

  const propertyLabelById = useMemo(
    () => new Map((properties.data ?? []).map((property) => [property.id, property.name])),
    [properties.data],
  );

  const buyerLabelById = useMemo(
    () => new Map((buyers.data ?? []).map((buyer) => [buyer.id, buyer.fullName])),
    [buyers.data],
  );

  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const create = useMutation({
    mutationFn: (vals: { propertyId: number; buyerClientId: number; salePrice: number; deedNumber: string; soldAt: string }) =>
      api("/api/sales", { method: "POST", body: vals }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales"] }); toast.success(t("common.success")); setCreating(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: Column<Sale>[] = [
    { key: "deed", header: t("common.deedNumber"), cell: (r) => <span className="font-mono text-xs">{r.deedNumber}</span> },
    { key: "prop", header: t("nav.properties"), cell: (r) => propertyLabelById.get(r.propertyId) ?? `#${r.propertyId}` },
    { key: "buyer", header: t("nav.buyers"), cell: (r) => buyerLabelById.get(r.buyerClientId) ?? `#${r.buyerClientId}` },
    { key: "price", header: t("common.salePrice"), cell: (r) => <span className="font-medium">{formatMoney(r.salePrice)}</span> },
    { key: "sold", header: t("common.soldAt"), cell: (r) => formatDate(r.soldAt) },
  ];

  const filteredSales = useMemo(() => {
    if (!search.trim()) return list.data ?? [];
    const lowerSearch = search.toLowerCase();
    return (list.data ?? []).filter((sale) => {
      const deedMatch = sale.deedNumber.toLowerCase().includes(lowerSearch);
      const propMatch = (propertyLabelById.get(sale.propertyId) ?? "").toLowerCase().includes(lowerSearch);
      const buyerMatch = (buyerLabelById.get(sale.buyerClientId) ?? "").toLowerCase().includes(lowerSearch);
      return deedMatch || propMatch || buyerMatch;
    });
  }, [list.data, search, propertyLabelById, buyerLabelById]);

  const [pid, setPid] = useState("");
  const [bid, setBid] = useState("");
  const parseDateParts = (value?: string) => {
    const safe = value?.slice(0, 10) ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(safe)) return { year: "", month: "", day: "" };
    return { year: safe.slice(0, 4), month: safe.slice(5, 7), day: safe.slice(8, 10) };
  };
  const initialSold = parseDateParts(undefined);
  const [soldYear, setSoldYear] = useState(initialSold.year);
  const [soldMonth, setSoldMonth] = useState(initialSold.month);
  const [soldDay, setSoldDay] = useState(initialSold.day);
  const soldYearRef = useRef<HTMLInputElement>(null);
  const soldMonthRef = useRef<HTMLInputElement>(null);
  const soldDayRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const p = parseDateParts(undefined); setSoldYear(p.year); setSoldMonth(p.month); setSoldDay(p.day); }, [creating]);
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
  const soldAt = `${soldYear}-${pad2(soldMonth)}-${pad2(soldDay)}`;

  return (
    <div>
      <PageHeader
        title={t("nav.sales")}
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
      <DataTable columns={cols} rows={filteredSales} loading={list.isLoading} error={list.error} rowKey={(r) => r.id} />
      <FormDialog
        key={`sale-${creating}`}
        open={creating}
        onOpenChange={(v) => !v && setCreating(false)}
        title={t("common.add")}
        size="lg"
        submitting={create.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          create.mutate({
            propertyId: Number(pid),
            buyerClientId: Number(bid),
            salePrice: Number(fd.get("salePrice") ?? 0),
            deedNumber: String(fd.get("deedNumber") ?? ""),
            soldAt: String(fd.get("soldAt") ?? ""),
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("nav.properties")}</Label>
            <Select value={pid} onValueChange={setPid}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {(properties.data ?? [])
                  .filter((p) => p.status !== "Sold")
                  .map((property) => (
                    <SelectItem key={property.id} value={String(property.id)}>
                      {propertyLabelById.get(property.id) ?? property.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("nav.buyers")}</Label>
            <Select value={bid} onValueChange={setBid}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {(buyers.data ?? []).map((buyer) => (
                  <SelectItem key={buyer.id} value={String(buyer.id)}>
                    {buyerLabelById.get(buyer.id) ?? buyer.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="salePrice">{t("common.salePrice")}</Label><Input id="salePrice" name="salePrice" type="number" step="0.01" required /></div>
          <div className="space-y-2"><Label htmlFor="deedNumber">{t("common.deedNumber")}</Label><Input id="deedNumber" name="deedNumber" required /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="soldAt">{t("common.soldAt")}</Label>
            <input type="hidden" id="soldAt" name="soldAt" value={soldAt} />
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
              <Input ref={soldYearRef} aria-label="Sold year" inputMode="numeric" placeholder="YYYY" value={soldYear} onChange={(e) => { const next = sanitizeDigits(e.target.value, 4); setSoldYear(next); if (next.length === 4) soldMonthRef.current?.focus(); }} maxLength={4} required />
              <span className="text-muted-foreground">/</span>
              <Input ref={soldMonthRef} aria-label="Sold month" inputMode="numeric" placeholder="MM" value={soldMonth} onChange={(e) => { const next = sanitizeDigits(e.target.value, 2); setSoldMonth(next); if (next.length === 2) soldDayRef.current?.focus(); }} onBlur={() => setSoldMonth((m) => clampMonth(m))} onKeyDown={(e) => onSegKey(e, soldMonth, soldYearRef)} maxLength={2} required />
              <span className="text-muted-foreground">/</span>
              <Input ref={soldDayRef} aria-label="Sold day" inputMode="numeric" placeholder="DD" value={soldDay} onChange={(e) => { const next = sanitizeDigits(e.target.value, 2); setSoldDay(next); }} onBlur={() => setSoldDay((d) => clampDay(d))} onKeyDown={(e) => onSegKey(e, soldDay, soldMonthRef)} maxLength={2} required />
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
