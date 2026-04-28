import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

  const create = useMutation({
    mutationFn: (vals: { propertyId: number; buyerClientId: number; salePrice: number; deedNumber: string; soldAt: string }) =>
      api("/api/sales", { method: "POST", body: vals }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales"] }); toast.success(t("common.success")); setCreating(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cols: Column<Sale>[] = [
    { key: "deed", header: t("common.deedNumber"), cell: (r) => <span className="font-mono text-xs">{r.deedNumber}</span> },
    { key: "prop", header: t("nav.properties"), cell: (r) => `#${r.propertyId}` },
    { key: "buyer", header: t("nav.buyers"), cell: (r) => `#${r.buyerClientId}` },
    { key: "price", header: t("common.salePrice"), cell: (r) => <span className="font-medium">{formatMoney(r.salePrice)}</span> },
    { key: "sold", header: t("common.soldAt"), cell: (r) => formatDate(r.soldAt) },
  ];

  const [pid, setPid] = useState("");
  const [bid, setBid] = useState("");

  return (
    <div>
      <PageHeader
        title={t("nav.sales")}
        actions={auth.isStaff && <Button onClick={() => setCreating(true)}><Plus className="me-1 h-4 w-4" />{t("common.add")}</Button>}
      />
      <DataTable columns={cols} rows={list.data} loading={list.isLoading} error={list.error} rowKey={(r) => r.id} />
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
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="soldAt">{t("common.soldAt")}</Label><Input id="soldAt" name="soldAt" type="date" required /></div>
        </div>
      </FormDialog>
    </div>
  );
}
