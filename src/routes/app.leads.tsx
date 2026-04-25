import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type Lead, type LeadIntent, type LeadStatus } from "@/lib/api";
import { PageHeader, StatusBadge, LoadingBlock, ErrorBlock, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormDialog, ConfirmDialog } from "@/components/FormDialog";
import { CheckCircle2, Inbox, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { leadStatusTone, formatDateTime } from "@/lib/format";

const INTENTS: LeadIntent[] = ["Buy", "Rent", "Sell", "LetOut"];
const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "ClosedLost", "ClosedWon"];

export const Route = createFileRoute("/app/leads")({ component: LeadsPage });

function LeadsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [intent, setIntent] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [approving, setApproving] = useState<Lead | null>(null);

  const list = useQuery({
    queryKey: ["leads", intent, status],
    queryFn: () =>
      api<Lead[]>("/api/leads", {
        query: {
          intent: intent === "all" ? undefined : intent,
          status: status === "all" ? undefined : status,
        },
      }),
  });

  const update = useMutation({
    mutationFn: (vals: { id: number; status?: LeadStatus; notes?: string }) =>
      api(`/api/leads/${vals.id}`, { method: "PUT", body: vals }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast.success(t("common.updated")); setEditing(null); setSelected(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: (id: number) => api<{ propertyId: number }>(`/api/leads/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
      toast.success(t("common.leadApproved"));
      setApproving(null); setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const m: Record<LeadStatus, Lead[]> = { New: [], Contacted: [], Qualified: [], ClosedLost: [], ClosedWon: [] };
    (list.data ?? []).forEach((l) => m[l.status].push(l));
    return m;
  }, [list.data]);

  return (
    <div>
      <PageHeader
        title={t("nav.leads")}
        actions={
          <div className="flex items-center gap-2">
            <Select value={intent} onValueChange={setIntent}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {INTENTS.map((i) => <SelectItem key={i} value={i}>{t(`intent.${i}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`leadStatus.${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {list.isLoading ? <LoadingBlock /> :
        list.error ? <ErrorBlock message={(list.error as Error).message} /> :
        (list.data?.length ?? 0) === 0 ? <EmptyState icon={<Inbox className="h-6 w-6" />} /> :
        (
          <div className="grid gap-4 lg:grid-cols-5">
            {STATUSES.map((s) => (
              <div key={s} className="rounded-xl border border-border bg-card p-3 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{t(`leadStatus.${s}`)}</span>
                  <StatusBadge tone={leadStatusTone(s)}>{grouped[s].length}</StatusBadge>
                </div>
                <div className="space-y-2">
                  {grouped[s].map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setSelected(l)}
                      className="block w-full rounded-lg border border-border bg-background p-3 text-start transition hover:border-gold hover:shadow-card"
                    >
                      <div className="text-sm font-medium">{l.propertyName}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{l.fullName} · {t(`intent.${l.intent}`)}</div>
                    </button>
                  ))}
                  {grouped[s].length === 0 && (
                    <p className="px-1 py-2 text-xs text-muted-foreground">{t("common.empty")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* Lead detail drawer-like dialog */}
      <FormDialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={selected?.propertyName ?? ""}
        description={selected?.propertyAddress}
        size="lg"
        submitLabel={t("common.close" as never) ?? "Close"}
        onSubmit={(e) => { e.preventDefault(); setSelected(null); }}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={leadStatusTone(selected.status)}>{t(`leadStatus.${selected.status}`)}</StatusBadge>
              <StatusBadge tone="info">{t(`intent.${selected.intent}`)}</StatusBadge>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2"><span className="font-medium">{selected.fullName}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {selected.phone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {selected.email}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("common.nationalId")}: <span className="font-mono">{selected.ownerNationalId}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("common.createdAt")}: {formatDateTime(selected.createdAt)}
              </div>
            </div>
            {selected.notes && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">{selected.notes}</div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(selected)}>{t("common.edit")}</Button>
              {selected.status !== "ClosedWon" && (
                <Button size="sm" className="bg-gold-gradient text-gold-foreground" onClick={() => setApproving(selected)}>
                  <CheckCircle2 className="me-1 h-4 w-4" />
                  {t("common.approveLead")}
                </Button>
              )}
            </div>
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        title={t("common.edit")}
        submitting={update.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          if (!editing) return;
          const fd = new FormData(e.currentTarget);
          update.mutate({
            id: editing.id,
            status: String(fd.get("status") ?? editing.status) as LeadStatus,
            notes: String(fd.get("notes") ?? "") || undefined,
          });
        }}
      >
        {editing && (
          <>
            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <Select name="status" defaultValue={editing.status}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`leadStatus.${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
              {/* Hidden mirror input so FormData picks it up */}
              <input type="hidden" name="status" defaultValue={editing.status} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t("common.notes")}</Label>
              <Textarea id="notes" name="notes" rows={4} defaultValue={editing.notes ?? ""} />
            </div>
          </>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!approving}
        onOpenChange={(v) => !v && setApproving(null)}
        title={t("common.approveLead")}
        description={approving?.propertyName}
        confirmLabel={t("common.approve")}
        loading={approve.isPending}
        onConfirm={() => approving && approve.mutate(approving.id)}
      />
    </div>
  );
}
