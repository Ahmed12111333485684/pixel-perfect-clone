import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "./app";
import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, submitPartnerLead, type Lead, type LeadIntent } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PROPERTY_TYPES, localizePropertyType } from "@/lib/property-types";

export const Route = createFileRoute("/partner/submit-property")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("estatly.token");
    if (!token) throw redirect({ to: "/login" });
  },
  component: () => <AppLayout><PartnerSubmitPropertyPage /></AppLayout>,
});

const INTENTS: LeadIntent[] = ["Buy", "Rent", "Sell", "LetOut"];

function PartnerSubmitPropertyPage() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [submitted, setSubmitted] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [intent, setIntent] = useState<LeadIntent>("Sell");
  const [type, setType] = useState<string>("Apartment");
  const formRef = useRef<HTMLFormElement>(null);

  if (!auth.isPartner) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        {t("common.noScreenAccess")}
      </div>
    );
  }

  const reset = () => {
    setSubmitted(null);
    setFiles([]);
    setIntent("Sell");
    setType("Apartment");
    formRef.current?.reset();
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    const raw = new FormData(e.currentTarget);

    fd.set("propertyName", String(raw.get("propertyName") ?? ""));
    fd.set("address", String(raw.get("address") ?? ""));
    fd.set("type", type);
    fd.set("intent", intent);
    fd.set("listedPrice", String(raw.get("listedPrice") ?? "0"));
    fd.set("notes", String(raw.get("notes") ?? ""));
    files.forEach((file) => fd.append("images", file));

    setLoading(true);
    try {
      const lead = await submitPartnerLead(fd);
      setSubmitted(lead);
      toast.success(t("lead.submitted"));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("common.error");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-elegant">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl">{t("lead.submitted")}</h1>
          <p className="mt-2 text-muted-foreground">{submitted.propertyName} - #{submitted.id}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button onClick={reset}>{t("lead.submitAnother")}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t("nav.submitProperty")} subtitle={t("partner.submitPropertySubtitle")} />
      <form ref={formRef} onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-card">
        <Field id="propertyName" label={t("lead.propertyName")} required />
        <Field id="address" label={t("lead.propertyAddress")} required />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("lead.propertyType")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((p) => <SelectItem key={p} value={p}>{localizePropertyType(t, p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("lead.intent")}</Label>
            <Select value={intent} onValueChange={(v) => setIntent(v as LeadIntent)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTENTS.map((i) => <SelectItem key={i} value={i}>{t(`intent.${i}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="listedPrice">
            {intent === "Rent" || intent === "LetOut" ? t("common.monthlyRent") : t("common.salePrice")}
          </Label>
          <Input id="listedPrice" name="listedPrice" type="number" step="0.01" min="0" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">{t("lead.notes")}</Label>
          <Textarea id="notes" name="notes" rows={4} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="images">{t("lead.images")}</Label>
          <Input
            id="images"
            name="images"
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => setFiles(Array.from(e.currentTarget.files ?? []))}
          />
        </div>

        <Button type="submit" className="w-full bg-gold-gradient text-gold-foreground hover:opacity-95" disabled={loading} size="lg">
          {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {loading ? t("common.submitting") : t("common.submit")}
        </Button>
      </form>
    </div>
  );
}

function Field({ id, label, required, type = "text" }: { id: string; label: string; required?: boolean; type?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input id={id} name={id} type={type} required={required} />
    </div>
  );
}
