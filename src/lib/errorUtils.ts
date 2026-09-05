import { ApiError } from "./api";

export type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const FIELD_LABELS_AR: Record<string, string> = {
  fullName: "الاسم الكامل",
  mobile: "رقم الجوال",
  mobileNumber: "رقم الجوال",
  mobile1: "رقم الجوال الرئيسي",
  mobile2: "رقم الجوال الثاني",
  phone: "رقم الهاتف",
  email: "البريد الإلكتروني",
  username: "اسم المستخدم",
  password: "كلمة المرور",
  propertyName: "اسم العقار",
  propertyAddress: "عنوان العقار",
  propertyType: "نوع العقار",
  listedPrice: "السعر",
  salePrice: "سعر البيع",
  rentPrice: "سعر الإيجار",
  deedNumber: "رقم الصك",
  ownerNationalId: "الهوية الوطنية للمالك",
  nationalId: "رقم الهوية الوطنية",
  district: "الحي",
  city: "المدينة",
  address: "العنوان",
  maxBudget: "الميزانية القصوى",
  paymentType: "طريقة الدفع",
  requestCategory: "تصنيف العقار",
  intent: "الغرض",
  licenseNumber: "رقم الترخيص",
  contractExpiry: "تاريخ انتهاء العقد",
  adNumber: "رقم الإعلان",
  ownerName: "اسم المالك",
  buildingAge: "عمر العقار",
  roomsCount: "عدد الغرف",
  familyCount: "عدد أفراد الأسرة",
  startDate: "تاريخ البدء",
  endDate: "تاريخ الانتهاء",
  monthlyRent: "الإيجار الشهري",
  amount: "المبلغ",
  offerCode: "رمز العرض / المرجع",
  serialNumber: "الرقم التسلسلي",
  code: "الكود المرجعي",
  "common-propertytype": "نوع العقار",
  "common.propertyType": "نوع العقار",
  "residentialSeekers.propertyType": "نوع العقار",
  "lead.propertyType": "نوع العقار",
};

/**
 * Translates technical or English field names into friendly localized field names.
 */
export function getFriendlyFieldLabel(field: string): string {
  const normalized = field
    .replace(/^common[-.]/i, "")
    .replace(/^residentialSeekers[-.]/i, "")
    .replace(/^lead[-.]/i, "")
    .replace(/[*:]/g, "")
    .trim();

  if (FIELD_LABELS_AR[normalized]) return FIELD_LABELS_AR[normalized];
  if (FIELD_LABELS_AR[field]) return FIELD_LABELS_AR[field];

  // CamelCase or kebab-case to readable string
  const formatted = normalized.replace(/-/g, " ").replace(/([A-Z])/g, " $1").trim();
  return FIELD_LABELS_AR[formatted] || formatted;
}

const INVALID_OPERATION_AR: Record<string, string> = {
  "Password is required": "كلمة المرور مطلوبة.",
  "Password must be at least 8 characters long": "كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.",
  "Password must include at least one letter": "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل.",
  "Password must include at least one number": "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.",
  "Role must be Admin or Employee": "يجب أن تكون الصلاحية (Admin) أو (Employee).",
  "Employee users must have at least one visible screen": "يجب تحديد شاشة واحدة على الأقل للموظف.",
  "Screen permissions can only be set for Employee users": "أذونات الشاشات متاحة فقط لمستخدمي (Employee).",
  "Username already in use": "اسم المستخدم مستخدم بالفعل.",
};

function mapInvalidOperationMessage(message: string): string | null {
  const normalized = message.trim();
  for (const [key, arabic] of Object.entries(INVALID_OPERATION_AR)) {
    if (normalized.toLowerCase() === key.toLowerCase()) return arabic;
  }
  return null;
}

/**
 * Returns a clear message listing specific missing required field names.
 */
export function formatMissingFieldsMessage(fields: string[], t?: TranslateFn): string {
  const translate = t || ((key: string) => key);
  const prefix = translate("common.requiredFieldsMissing", { defaultValue: "يرجى تعبئة الحقول المطلوبة التالية" });
  if (fields.length === 0) return prefix;
  return `${prefix}:\n• ${fields.join("\n• ")}`;
}

/**
 * Converts any caught error into a clear, localized message string for UI/Toasts.
 */
export function getFriendlyErrorMessage(err: unknown, t?: TranslateFn): string {
  const translate = t || ((key: string) => key);

  if (err instanceof ApiError) {
    // 1. Handle validation array / dictionary details if present
    if (err.details) {
      if (Array.isArray(err.details) && err.details.length > 0) {
        const prefix = translate("error.validation", { defaultValue: "يرجى تصحيح الأخطاء التالية:" });
        return `${prefix}\n• ${err.details.join("\n• ")}`;
      }
      if (typeof err.details === "object") {
        const messages: string[] = [];
        for (const [field, errs] of Object.entries(err.details)) {
          const friendlyField = getFriendlyFieldLabel(field);
          if (Array.isArray(errs)) {
            const errStr = errs.map(e => e.replace(/is required/i, "مطلوب")).join(", ");
            messages.push(`${friendlyField}: ${errStr}`);
          } else if (typeof errs === "string") {
            const errStr = (errs as string).replace(/is required/i, "مطلوب");
            messages.push(`${friendlyField}: ${errStr}`);
          }
        }
        if (messages.length > 0) {
          const prefix = translate("error.validation", { defaultValue: "يرجى تصحيح الأخطاء التالية:" });
          return `${prefix}\n• ${messages.join("\n• ")}`;
        }
      }
    }

    // 2. Handle structured error codes
    if (err.errorCode) {
      switch (err.errorCode) {
        case "ERR_NOT_FOUND":
          return translate("error.notFound", { defaultValue: "العنصر المطلوب غير موجود." });
        case "ERR_VALIDATION_FAILED":
          return translate("error.validation", { defaultValue: "يرجى تصحيح الأخطاء التالية:" });
        case "ERR_DUPLICATE_KEY":
          if (err.message) {
            if (err.message.includes("Username")) return "اسم المستخدم مستخدم بالفعل.";
            if (err.message.includes("National ID") || err.message.includes("NationalId")) return "رقم الهوية الوطنية مسجل بالفعل.";
            if (err.message.includes("Phone") || err.message.includes("Mobile")) return "رقم الهاتف/الجوال مسجل بالفعل.";
            if (err.message.includes("Email")) return "البريد الإلكتروني مسجل بالفعل.";
            if (err.message.includes("Deed")) return "رقم الصك موجود بالفعل.";
            if (err.message.includes("License")) return "رقم الترخيص موجود بالفعل.";
            if (err.message.includes("OfferCode") || err.message.includes("Offer code")) return "رمز العرض (الكود) موجود بالفعل.";
            if (err.message.includes("SerialNumber") || err.message.includes("Serial number")) return "الرقم التسلسلي موجود بالفعل.";
            if (err.message.includes("AdNumber") || err.message.includes("Ad number")) return "رقم الإعلان موجود بالفعل.";
            if (err.message.includes("Code")) return "الكود المرجعي موجود بالفعل.";
          }
          return translate("error.duplicateKey", { defaultValue: "بيانات مكررة: البيانات المدخلة مكررة وموجودة بالفعل في النظام." });
        case "ERR_DB_UPDATE":
          return translate("error.dbUpdate", { defaultValue: "تعذر حفظ البيانات. يرجى التأكد من عدم وجود بيانات مكررة أو خاطئة." });
        case "ERR_INVALID_OPERATION":
          if (err.message) {
            const mapped = mapInvalidOperationMessage(err.message);
            if (mapped) return mapped;
          }
          return translate("error.invalidOperation", { defaultValue: "الإجراء غير مسموح به في الحالة الحالية." });
        case "ERR_BAD_REQUEST":
          return translate("error.badRequest", { defaultValue: "بيانات الطلب غير صالحة. يرجى التحقق من البيانات المدخلة." });
        case "ERR_INTERNAL_SERVER":
          return translate("error.serverError", { defaultValue: "حدث خطأ في الخادم. يرجى التواصل مع الدعم أو المحاولة لاحقاً." });
      }
    }

    // 3. Fallback by HTTP status code
    switch (err.status) {
      case 401:
        return translate("error.unauthorized", { defaultValue: "انتهت الجلسة أو ليس لديك صلاحية للوصول." });
      case 403:
        return translate("error.forbidden", { defaultValue: "ليس لديك الصلاحية المطلوبة للقيام بهذا الإجراء." });
      case 404:
        return translate("error.notFound", { defaultValue: "العنصر المطلوب غير موجود." });
      case 422:
        return translate("error.validation", { defaultValue: "يرجى تصحيح الأخطاء التالية:" });
      case 500:
      case 502:
      case 503:
        return translate("error.serverError", { defaultValue: "حدث خطأ في الخادم. يرجى التواصل مع الدعم أو المحاولة لاحقاً." });
    }

    // 4. Return message if customized and non-generic
    if (err.message && !err.message.startsWith("HTTP ")) {
      if (err.message.toLowerCase().includes("already in use") || err.message.toLowerCase().includes("already exists")) {
        if (err.message.includes("Username")) return "اسم المستخدم مستخدم بالفعل.";
        return translate("error.duplicateKey", { defaultValue: "بيانات مكررة: البيانات المدخلة مكررة وموجودة بالفعل في النظام." });
      }
      return err.message;
    }
  }

  if (err instanceof Error) {
    if (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")) {
      return translate("error.network", { defaultValue: "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت." });
    }
    if (err.message && err.message.length > 0 && !err.message.startsWith("HTTP ")) {
      return err.message;
    }
  }

  return translate("error.generic", { defaultValue: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." });
}
