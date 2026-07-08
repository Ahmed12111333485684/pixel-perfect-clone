import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormDialog } from "@/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPreview } from "@/components/MediaPreview";
import { resolveApiAssetUrl, type Partner } from "@/lib/api";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function FormField({
  id,
  label,
  defaultValue,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}

export function PartnerDialog({
  open,
  onOpenChange,
  partner,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partner: Partner | null;
  onSubmit: (vals: {
    fullName: string;
    phone?: string;
    email?: string;
    nationalId?: string;
    falLicenseNumber?: string;
    commercialRegistrationNumber?: string;
    location?: string;
    notes?: string;
    partnerType?: string;
    companyName?: string;
    photo?: File | null;
  }) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const [partnerType, setPartnerType] = useState<string>(partner?.partnerType ?? "فرد");

  const key = `${partner?.id ?? "new"}-${open}`;
  return (
    <FormDialog
      key={key}
      open={open}
      onOpenChange={onOpenChange}
      title={partner ? t("common.edit") : t("common.add")}
      submitting={submitting}
      size="lg"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const photoInput = e.currentTarget.elements.namedItem("photo") as HTMLInputElement | null;
        onSubmit({
          fullName: String(fd.get("fullName") ?? ""),
          phone: String(fd.get("phone") ?? "") || undefined,
          email: String(fd.get("email") ?? "") || undefined,
          nationalId: String(fd.get("nationalId") ?? "") || undefined,
          falLicenseNumber: String(fd.get("falLicenseNumber") ?? "") || undefined,
          commercialRegistrationNumber:
            String(fd.get("commercialRegistrationNumber") ?? "") || undefined,
          location: String(fd.get("location") ?? "") || undefined,
          notes: String(fd.get("notes") ?? "") || undefined,
          partnerType: String(fd.get("partnerType") ?? "") || undefined,
          companyName: String(fd.get("companyName") ?? "") || undefined,
          photo: photoInput?.files?.[0] ?? null,
        });
      }}
    >
      <FormField
        id="fullName"
        label={t("common.fullName")}
        defaultValue={partner?.fullName}
        required
      />
      <div className="space-y-2">
        <Label>{t("common.partnerType")}</Label>
        <RadioGroup
          name="partnerType"
          value={partnerType}
          onValueChange={setPartnerType}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2 space-x-reverse">
            <RadioGroupItem value="فرد" id="type-individual" />
            <Label htmlFor="type-individual">فرد</Label>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <RadioGroupItem value="منشأة" id="type-facility" />
            <Label htmlFor="type-facility">منشأة</Label>
          </div>
        </RadioGroup>
      </div>
      {partnerType === "منشأة" && (
        <FormField
          id="companyName"
          label={t("common.companyName")}
          defaultValue={partner?.companyName ?? ""}
        />
      )}
      <FormField id="phone" label={t("common.phone")} defaultValue={partner?.phone ?? ""} />
      <FormField id="email" label={t("common.email")} type="email" defaultValue={partner?.email ?? ""} />
      <FormField id="nationalId" label={t("common.nationalId")} defaultValue={partner?.nationalId ?? ""} />
      <FormField id="falLicenseNumber" label={t("common.falLicenseNumber")} defaultValue={partner?.falLicenseNumber ?? ""} />
      <FormField id="commercialRegistrationNumber" label={t("common.commercialRegistrationNumber")} defaultValue={partner?.commercialRegistrationNumber ?? ""} />
      <FormField id="location" label={t("common.partnerLocation")} defaultValue={partner?.location ?? ""} />
      <div className="space-y-2">
        <Label htmlFor="photo">{t("common.photo")}</Label>
        <Input id="photo" name="photo" type="file" accept="image/*" />
        {partner?.photoUrl && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div className="h-16 w-16 overflow-hidden rounded-md border border-border bg-background">
              <MediaPreview
                src={resolveApiAssetUrl(partner.photoUrl)}
                alt={partner.fullName}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-sm text-muted-foreground">{t("common.photo")}</div>
          </div>
        )}
      </div>
      <FormField id="notes" label={t("common.notes")} defaultValue={partner?.notes ?? ""} />
    </FormDialog>
  );
}
