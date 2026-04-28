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
export type Role = "Admin" | "AgencyOwner" | "OwnerClient";

export interface UserDto {
  id: number;
  username: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: Role;
}

export interface Owner {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  nationalId: string;
  createdAt: string;
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
export interface Amenity { id: number; name: string; description?: string; createdAt: string; }
export interface PropertyDto {
  id: number;
  ownerId: number;
  name: string;
  address: string;
  type: string;
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

export interface Tenant { id: number; fullName: string; phone: string; email: string; nationalId: string; createdAt: string; }
export type ContractStatus = "Active" | "Expired" | "Terminated" | "Pending";
export interface Contract {
  id: number; propertyId: number; tenantId: number; deedNumber: string;
  startDate: string; endDate: string; monthlyRent: number; status: ContractStatus; createdAt: string;
}
export type PaymentStatusT = "Pending" | "Paid" | "Overdue";
export interface Payment {
  id: number; contractId: number; dueDate: string; paidDate?: string | null;
  amount: number; status: PaymentStatusT; createdAt: string;
}
export interface Buyer { id: number; fullName: string; phone: string; email: string; nationalId: string; createdAt: string; }
export interface Sale {
  id: number; propertyId: number; buyerClientId: number; salePrice: number;
  deedNumber: string; soldAt: string; createdAt: string;
}

export type LeadIntent = "Buy" | "Rent" | "Sell" | "LetOut";
export type LeadStatus = "New" | "Contacted" | "Qualified" | "ClosedLost" | "ClosedWon";
export interface LeadImage {
  id: number; leadId: number; originalFileName: string; mimeType: string;
  sizeBytes: number; sortOrder: number; isPrimary: boolean;
  fileUrl?: string; createdAt: string;
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
  status: LeadStatus;
  preferredContactAt?: string | null;
  lastContactedAt?: string | null;
  assignedToUserId?: number | null;
  assignedToUsername?: string | null;
  images?: LeadImage[];
  createdAt: string;
}
