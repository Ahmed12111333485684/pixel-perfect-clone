import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, type ResidentialSeeker } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PublicFooter } from "@/components/PublicFooter";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PROPERTY_TYPES, localizePropertyType } from "@/lib/property-types";

export const Route = createFileRoute("/property-request")({
  head: () => ({
    meta: [
      { title: "Find your property — Nour Consultancy" },
      {
        name: "description",
        content:
          "Looking for a property? Tell us what you're looking for and our team will help you find it.",
      },
      { property: "og:title", content: "Find your property — Nour Consultancy" },
      {
        property: "og:description",
        content: "Looking for a property? Tell us what you're looking for.",
      },
    ],
  }),
  component: PropertyRequestPage,
});

interface RequestSubmission {
  id: number;
  fullName: string;
}

function PropertyRequestPage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState<RequestSubmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestType, setRequestType] = useState<string>("Rental");
  const [requestCategory, setRequestCategory] = useState<string>("سكني");
  const [propertyType, setPropertyType] = useState<string>(PROPERTY_TYPES[0]);
  const formRef = useRef<HTMLFormElement>(null);

  const reset = () => {
    setSubmitted(null);
    setRequestType("Rental");
    setRequestCategory("سكني");
    setPropertyType(PROPERTY_TYPES[0]);
    formRef.current?.reset();
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const fullName = formData.get("fullName") as string;
    const mobileNumber = formData.get("mobileNumber") as string;

    if (!fullName.trim() || !mobileNumber.trim()) {
      toast.error(t("common.requiredFieldsMissing") || "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const result = await api<ResidentialSeeker>("/residential-seekers/submit", {
        method: "POST",
        body: {
          sourceChannel: "Public website",
          listingType: requestType,
          requestCategory,
          propertyType,
          fullName,
          mobile: mobileNumber,
          nationality: formData.get("nationality") || undefined,
          profession: formData.get("profession") || undefined,
          familyCount: formData.get("familyCount")
            ? String(formData.get("familyCount"))
            : undefined,
          requestDescription: formData.get("notes") || undefined,
          maxBudget: formData.get("maxBudget") ? String(formData.get("maxBudget")) : undefined,
          paymentType: formData.get("paymentType") || undefined,
          preferredLocation: formData.get("location") || undefined,
          notes: formData.get("notes") || undefined,
        },
        anonymous: true,
      });

      setSubmitted({ id: result.id, fullName: result.fullName || fullName });
      toast.success(t("common.recordCreated") || "Request submitted successfully!");
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
            <h1 className="font-display text-3xl">
              {t("common.requestSubmitted") || "Request Submitted!"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t("common.requestSubmittedMessage") ||
                "Thank you for your request. Our team will reach out to you shortly."}
            </p>
            <p className="mt-1 font-medium text-foreground">{submitted.fullName}</p>
            <Button onClick={reset} asChild variant="outline" className="mt-8">
              <Link to="/">{t("common.home")}</Link>
            </Button>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant sm:p-10">
          <div>
            <h1 className="font-display text-3xl">
              {t("propertyRequest.title") || "Looking for a Property?"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t("propertyRequest.subtitle") ||
                "Tell us what you're looking for and we'll help you find the perfect property."}
            </p>
          </div>

          <form ref={formRef} onSubmit={onSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div className="text-sm font-medium">{t("common.personalInformation")}</div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="fullName" className="text-xs font-medium">
                    {t("common.fullName")} *
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    required
                    placeholder={t("common.fullName")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="mobileNumber" className="text-xs font-medium">
                    {t("common.mobileNumber")} *
                  </Label>
                  <Input
                    id="mobileNumber"
                    name="mobileNumber"
                    required
                    placeholder={t("common.mobileNumber")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="nationality" className="text-xs font-medium">
                    {t("common.nationality")}
                  </Label>
                  <Input
                    id="nationality"
                    name="nationality"
                    placeholder={t("common.nationality")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="profession" className="text-xs font-medium">
                    {t("common.profession")}
                  </Label>
                  <Input
                    id="profession"
                    name="profession"
                    placeholder={t("common.profession")}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-medium">{t("common.propertyPreferences")}</div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="requestType" className="text-xs font-medium">
                    {t("common.requestType")} *
                  </Label>
                  <Select value={requestType} onValueChange={setRequestType}>
                    <SelectTrigger id="requestType" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rental">{t("requestType.Rental") || "Rental"}</SelectItem>
                      <SelectItem value="Purchase">
                        {t("requestType.Purchase") || "Purchase"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="requestCategory" className="text-xs font-medium">
                    تصنيف الطلب
                  </Label>
                  <Select value={requestCategory} onValueChange={setRequestCategory}>
                    <SelectTrigger id="requestCategory" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="سكني">سكني</SelectItem>
                      <SelectItem value="تجاري">تجاري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="propertyType" className="text-xs font-medium">
                    {t("lead.propertyType")}
                  </Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger id="propertyType" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {localizePropertyType(t, type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location" className="text-xs font-medium">
                    {t("common.location")}
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder={t("common.location")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="familyCount" className="text-xs font-medium">
                    {t("residentialSeekers.familyCount")}
                  </Label>
                  <Input
                    id="familyCount"
                    name="familyCount"
                    type="number"
                    min="0"
                    placeholder={t("residentialSeekers.familyCount")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="maxBudget" className="text-xs font-medium">
                    {t("common.maxBudget")}
                  </Label>
                  <Input
                    id="maxBudget"
                    name="maxBudget"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t("common.maxBudget")}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="paymentType" className="text-xs font-medium">
                    {t("common.paymentType")}
                  </Label>
                  <Input
                    id="paymentType"
                    name="paymentType"
                    placeholder={t("common.paymentType")}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="notes" className="text-xs font-medium">
                  {t("common.notes")}
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder={
                    t("propertyRequest.notesPlaceholder") ||
                    "Tell us more about what you're looking for..."
                  }
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("common.submit")}
            </Button>
          </form>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          <p>
            {t("propertyRequest.privacy") ||
              "Your information is safe with us and will only be used to help you find the perfect property."}
          </p>
        </div>
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
            <Link to="/">{t("common.home")}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-gold-gradient text-gold-foreground hover:opacity-95"
          >
            <Link to="/available-properties">{t("publicProperties.browse")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
