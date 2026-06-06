// Lightweight fetch-based API client for the Property Management API.

const TOKEN_KEY = "estatly.token";

export function getApiBaseUrl(): string {
  // Configurable via VITE_API_BASE_URL. Falls back to localhost.
  const url = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5015";
  return url.replace(/\/+$/, "");
}

export function resolveApiAssetUrl(urlOrPath: string | undefined | null): string {
  if (!urlOrPath) return "";
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  const base = getApiBaseUrl();
  const normalizedPath = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  return `${base}${normalizedPath}`;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** When true, response is returned as Blob */
  asBlob?: boolean;
  /** When true, no auth header is attached */
  anonymous?: boolean;
  signal?: AbortSignal;
}

function buildQuery(query?: ApiOptions["query"]) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}${buildQuery(opts.query)}`;
  const headers: Record<string, string> = {};
  if (!opts.anonymous) {
    const token = getStoredToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body,
    signal: opts.signal,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let detail: string | undefined;
    try {
      const data = await res.json();
      if (data && typeof data === "object") {
        if (typeof data.error === "string") message = data.error;
        if (typeof data.detail === "string") detail = data.detail;
      }
    } catch {
      // ignore
    }
    if (res.status === 401) {
      setStoredToken(null);
    }
    throw new ApiError(message, res.status, detail);
  }

  if (opts.asBlob) {
    return (await res.blob()) as unknown as T;
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ============ Domain types ============
export type Role = "Admin" | "Employee" | "Partner";

export interface UserDto {
  id: number;
  username: string;
  role: Role;
  screenPermissions: string[];
  ownerId?: number | null;
  ownerFullName?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: Role;
  screenPermissions: string[];
}

export interface Owner {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  nationalId: string;
  notes?: string | null;
  createdAt: string;
}

export interface Partner {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  nationalId?: string | null;
  falLicenseNumber?: string | null;
  commercialRegistrationNumber?: string | null;
  location?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  userId?: number | null;
  createdAt: string;
}

export interface CreatePartnerDto {
  fullName: string;
  phone: string;
  email?: string;
  nationalId?: string;
  notes?: string;
}

export interface UpdatePartnerDto {
  fullName: string;
  phone: string;
  email?: string;
  nationalId?: string;
  notes?: string;
}

export interface CreatePartnerAccountDto {
  username: string;
  password: string;
}

export interface OwnerStats {
  ownerId: number;
  propertiesPending?: number;
  propertiesApproved?: number;
  propertiesRejected?: number;
  propertiesSold?: number;
  contractsActive?: number;
  contractsExpired?: number;
  contractsTerminated?: number;
  contractsPending?: number;
  [k: string]: number | undefined;
}

export type PropertyStatus = "Pending" | "Approved" | "Rejected" | "Sold";
export interface Amenity {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}
export interface PropertyDto {
  id: number;
  ownerId: number;
  name: string;
  address: string;
  type: string;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  listingType: "Rental" | "Sale";
  salePrice?: number | null;
  rentPrice?: number | null;
  deedNumber?: string | null;
  details?: Record<string, unknown> | null;
  status: PropertyStatus;
  createdAt: string;
  amenities?: Amenity[];
}
export interface PropertyImage {
  id: number;
  propertyId: number;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  isPrimary: boolean;
  url: string;
  createdAt: string;
}

export interface Tenant {
  id: number;
  propertyId?: number | null;
  propertyName?: string | null;
  fullName: string;
  phone: string;
  email: string;
  nationalId: string;
  createdAt: string;
}
export type ContractStatus = "Active" | "Expired" | "Terminated" | "Pending";
export interface Contract {
  id: number;
  propertyId: number;
  tenantId: number;
  deedNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: ContractStatus;
  createdAt: string;
}
export type PaymentStatusT = "Pending" | "Paid" | "Overdue";
export interface Payment {
  id: number;
  contractId: number;
  dueDate: string;
  paidDate?: string | null;
  amount: number;
  status: PaymentStatusT;
  createdAt: string;
}
export interface EmployeeProductivityRecord {
  id: number;
  userId: number;
  employeeUsername: string;
  workDate: string;
  callIntakeCount: number;
  servedClientsCount: number;
  officeVisitorsCount: number;
  whatsappClientsCount: number;
  googleMapsReviewsCount: number;
  brokerageContractsCount: number;
  leaseContractsCount: number;
  propertyPhotographyCount: number;
  hashemPropertyPhotographyCount: number;
  inspectionCount: number;
  contentWritingCount: number;
  createdAt: string;
  updatedAt?: string | null;
}
export interface EmployeeProductivityUpsertDto {
  callIntakeCount: number;
  servedClientsCount: number;
  officeVisitorsCount: number;
  whatsappClientsCount: number;
  googleMapsReviewsCount: number;
  brokerageContractsCount: number;
  leaseContractsCount: number;
  propertyPhotographyCount: number;
  hashemPropertyPhotographyCount: number;
  inspectionCount: number;
  contentWritingCount: number;
}
export interface Buyer {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  nationalId: string;
  createdAt: string;
}
export interface Sale {
  id: number;
  propertyId: number;
  buyerClientId: number;
  salePrice: number;
  deedNumber: string;
  soldAt: string;
  createdAt: string;
}

export type LeadIntent = "Buy" | "Rent" | "Sell" | "LetOut";
export type LeadStatus = "New" | "Contacted" | "Qualified" | "ClosedLost" | "ClosedWon";
export interface LeadImage {
  id: number;
  leadId: number;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  isPrimary: boolean;
  fileUrl?: string;
  createdAt: string;
}
export interface SubmitPartnerLeadDto {
  propertyName: string;
  address: string;
  type: string;
  intent: LeadIntent;
  listedPrice: number;
  notes?: string;
}
export interface Lead {
  id: number;
  propertyId?: number | null;
  propertyName: string;
  propertyAddress: string;
  propertyType: string;
  ownerNationalId: string;
  fullName: string;
  phone: string;
  email: string;
  notes?: string;
  intent: LeadIntent;
  listedPrice: number;
  status: LeadStatus;
  preferredContactAt?: string | null;
  lastContactedAt?: string | null;
  assignedToUserId?: number | null;
  assignedToUsername?: string | null;
  partnerId?: string | null;
  partnerName?: string | null;
  commissionAmount?: number | null;
  commissionStatus?: string | null;
  commissionNotes?: string | null;
  images?: LeadImage[];
  createdAt: string;
}

export interface PublicProperty {
  id: number;
  name: string;
  address: string;
  type: string;
  salePrice?: number | null;
  rentPrice?: number | null;
  status: PropertyStatus;
  createdAt: string;
  primaryImageUrl?: string | null;
  images?: PublicPropertyImage[];
  amenities?: Amenity[];
}

export interface PublicPropertyImage {
  id: number;
  originalFileName: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface RequestListItem {
  id: number;
  requestDate?: string | null;
  status?: string | null;
  employee?: string | null;
  fullName: string;
  mobileNumber: string;
  requestType: string;
  location?: string | null;
  createdAt: string;
}

export interface RequestDetails {
  id: number;
  requestDate?: string | null;
  status?: string | null;
  employee?: string | null;
  via?: string | null;
  fullName: string;
  nationality?: string | null;
  profession?: string | null;
  bedroomCount?: number | null;
  mobileNumber: string;
  requestType: string;
  maxBudget?: number | null;
  paymentType?: string | null;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface RequestPropertySuggestion extends PropertyDto {
  score: number;
  reasons: { key: string; args?: Record<string, string> }[];
}

export interface CommercialListing {
  id: number;
  rowFlag?: string | null;
  contactDate?: string | null;
  listingCategory?: string | null;
  propertyStatus?: string | null;
  listingType?: string | null;
  brokerageContract?: string | null;
  licenseNumber?: string | null;
  contractExpiry?: string | null;
  adNumber?: string | null;
  dealThrough?: string | null;
  employee?: string | null;
  broker?: string | null;
  ownerName?: string | null;
  mobile1?: string | null;
  mobile2?: string | null;
  availableUnits?: string | null;
  deedNumber?: string | null;
  propertyType?: string | null;
  roomsCount?: string | null;
  buildingAge?: string | null;
  hasElevator?: string | null;
  otherDetails?: string | null;
  rentAmount?: string | null;
  paymentType?: string | null;
  location?: string | null;
  coordinates?: string | null;
  hasKey?: string | null;
  publishedTahmid?: string | null;
  publishedBoard?: string | null;
  publishedDesigns?: string | null;
  publishedHaraj?: string | null;
  publishedDeal?: string | null;
  publishedAqar?: string | null;
  publishedBayut?: string | null;
  publishedDhaki?: string | null;
  publishedWhatsapp?: string | null;
  publishedTwitter?: string | null;
  publishedWhatsappGroup?: string | null;
  publishedWhatsappChannel?: string | null;
  publishedSnapchat?: string | null;
  publishedX?: string | null;
  publishedInstagram?: string | null;
  publishedTiktok?: string | null;
  notes?: string | null;
  brokerageContracts?: CommercialListingBrokerageContract[] | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CommercialListingBrokerageContract {
  brokerageContract?: string | null;
  licenseNumber?: string | null;
  contractExpiry?: string | null;
  sortOrder: number;
}

export interface ResidentialSeeker {
  id: number;
  serialNumber?: string | null;
  requestDate?: string | null;
  status?: string | null;
  employee?: string | null;
  receiver?: string | null;
  sourceChannel?: string | null;
  listingType?: string | null;
  propertyType?: string | null;
  mobile?: string | null;
  fullName?: string | null;
  nationality?: string | null;
  profession?: string | null;
  familyCount?: string | null;
  requestDescription?: string | null;
  maxBudget?: string | null;
  paymentType?: string | null;
  preferredLocation?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Advertisement {
  id: number;
  code: string;
  status: string;
  visitDate?: string | null;
  expiryDate?: string | null;
  adNumber?: string | null;
  propertyType: string;
  location?: string | null;
  quantity: number;
  locationChangeCount: number;
  adType: string;
  installationType: string;
  officeName?: string | null;
  phoneNumber?: string | null;
  boardPrice?: number | null;
  remainingAmount?: number | null;
  notes?: string | null;
  propertyId?: number | null;
  propertyCodeOrFallback: string;
  createdAt: string;
  updatedAt?: string | null;
}

// ============ Partner helpers ============
export function fetchPartners() {
  return api<Partner[]>("/api/partners");
}

export function fetchPartner(id: string) {
  return api<Partner>(`/api/partners/${id}`);
}

export function createPartner(input: FormData) {
  const formData = new FormData();
  input.forEach((value, key) => formData.append(key, value));
  return api("/api/partners", { method: "POST", formData });
}

export function updatePartner(id: string, input: FormData) {
  const formData = new FormData();
  input.forEach((value, key) => formData.append(key, value));
  return api(`/api/partners/${id}`, { method: "PUT", formData });
}

export function deletePartner(id: string) {
  return api(`/api/partners/${id}`, { method: "DELETE" });
}

export function createPartnerAccount(id: string, input: CreatePartnerAccountDto) {
  return api(`/api/partners/${id}/account`, { method: "POST", body: input });
}

export function submitPartnerLead(formData: FormData) {
  return api<Lead>("/api/leads/submit-partner", { method: "POST", formData });
}

export function fetchPartnerLeads() {
  return api<Lead[]>("/api/leads");
}
