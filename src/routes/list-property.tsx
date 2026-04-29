import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, type Lead, type LeadIntent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PublicFooter } from "@/components/PublicFooter";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/list-property")({
  head: () => ({
    meta: [
      { title: "List your property — Estatly" },
      { name: "description", content: "Submit your property to Estatly. Our team will reach out." },
      { property: "og:title", content: "List your property — Estatly" },
      { property: "og:description", content: "Submit your property to Estatly. Our team will reach out." },
    ],
  }),
  component: LeadIntakePage,
});

const INTENTS: LeadIntent[] = ["Buy", "Rent", "Sell", "LetOut"];
const PROPERTY_TYPES = ["Apartment", "Villa", "Office", "Land", "Shop", "Warehouse"];

function LeadIntakePage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [intent, setIntent] = useState<LeadIntent>("Sell");
  const [type, setType] = useState<string>("Apartment");
  const formRef = useRef<HTMLFormElement>(null);
  const parseDateParts = (value?: string) => {
    const safe = value?.slice(0, 10) ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(safe)) return { year: "", month: "", day: "" };
    return { year: safe.slice(0, 4), month: safe.slice(5, 7), day: safe.slice(8, 10) };
  };
  const [prefYear, setPrefYear] = useState("");
  const [prefMonth, setPrefMonth] = useState("");
  const [prefDay, setPrefDay] = useState("");
  const [prefTime, setPrefTime] = useState("");
  useEffect(() => { /* keep blank by default */ }, []);

  const reset = () => {
    setSubmitted(null);
    setFiles([]);
    setIntent("Sell");
    setType("Apartment");
    formRef.current?.reset();
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("intent", intent);
    fd.set("propertyType", type);
    // Append images under "images" key
    fd.delete("images");
    files.forEach((f) => fd.append("images", f));
    setLoading(true);
    try {
      const lead = await api<Lead>("/api/leads/submit", {
        method: "POST",
        formData: fd,
        anonymous: true,
      });
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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-elegant">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="font-display text-3xl">{t("lead.submitted")}</h1>
            <p className="mt-2 text-muted-foreground">
              {submitted.propertyName} — #{submitted.id}
            </p>
            {submitted.images && submitted.images.length > 0 && (
              <div className="mt-6 grid grid-cols-3 gap-2">
                {submitted.images.slice(0, 6).map((img) => (
                  <div
                    key={img.id}
                    className="aspect-square rounded-lg border border-border bg-muted text-xs flex items-center justify-center text-muted-foreground"
                  >
                    {img.originalFileName}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-8 flex justify-center gap-3">
              <Button onClick={reset}>{t("lead.submitAnother")}</Button>
              <Button asChild variant="outline">
                <Link to="/">{t("common.back")}</Link>
              </Button>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-semibold">{t("lead.pageTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("lead.pageSubtitle")}</p>
        </div>

        <form ref={formRef} onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-card">
          <Section title={t("common.details")}>
            <Field id="propertyName" label={t("lead.propertyName")} required />
            <Field id="propertyAddress" label={t("lead.propertyAddress")} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("lead.propertyType")}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("lead.intent")}</Label>
                <Select value={intent} onValueChange={(v) => setIntent(v as LeadIntent)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTENTS.map((i) => (
                      <SelectItem key={i} value={i}>{t(`intent.${i}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="listedPrice">
                {intent === "Rent" || intent === "LetOut" ? t("common.monthlyRent") : t("common.salePrice")}
                <span className="text-destructive"> *</span>
              </Label>
              <Input id="listedPrice" name="listedPrice" type="number" step="0.01" min="0" required />
            </div>
            <Field id="ownerNationalId" label={t("lead.ownerNationalId")} required />
          </Section>

          <Section title={t("lead.contactName")}>
            <Field id="fullName" label={t("lead.contactName")} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phone" label={t("lead.contactPhone")} required type="tel" />
              <Field id="email" label={t("lead.contactEmail")} required type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredContactAt">{t("lead.preferredContactAt")} <span className="text-xs text-muted-foreground">({t("common.optional")})</span></Label>
                <input type="hidden" id="preferredContactAt" name="preferredContactAt" value={(prefYear && prefMonth && prefDay) ? `${prefYear}-${prefMonth}-${prefDay}T${prefTime}` : ""} />
                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
                    <Input inputMode="numeric" placeholder="YYYY" value={prefYear} onChange={(e) => setPrefYear(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} />
                    <span className="text-muted-foreground">/</span>
                    <Input inputMode="numeric" placeholder="MM" value={prefMonth} onChange={(e) => setPrefMonth(e.target.value.replace(/\D/g, "").slice(0, 2))} maxLength={2} />
                    <span className="text-muted-foreground">/</span>
                    <Input inputMode="numeric" placeholder="DD" value={prefDay} onChange={(e) => setPrefDay(e.target.value.replace(/\D/g, "").slice(0, 2))} maxLength={2} />
                  </div>
                  <Input type="time" value={prefTime} onChange={(e) => setPrefTime(e.target.value)} />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t("lead.notes")}</Label>
              <Textarea id="notes" name="notes" rows={4} />
            </div>
          </Section>

          <Section title={t("lead.images")}>
            <ImagePicker files={files} onChange={setFiles} />
          </Section>

          <Button type="submit" className="w-full bg-gold-gradient text-gold-foreground hover:opacity-95" disabled={loading} size="lg">
            {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {loading ? t("common.submitting") : t("common.submit")}
          </Button>
        </form>
      </div>
      <PublicFooter />
    </div>
  );
}

function Header() {
  const { t } = useTranslation();
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <BrandLogo />
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button asChild variant="outline" size="sm">
            <Link to="/login">{t("nav.signIn")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
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

function ImagePicker({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-6 py-10 text-sm text-muted-foreground transition hover:border-gold hover:bg-accent/40"
      >
        <ImagePlus className="h-6 w-6" />
        <span>Click to upload images</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          onChange([...files, ...list]);
        }}
      />
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((f, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/80 text-foreground opacity-0 transition group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
