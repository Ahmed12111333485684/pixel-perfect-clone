import { normalizeForSearch } from "./search";

/**
 * Client aggregation logic. Clients are derived (not stored): records from the
 * request / seeker / listing / lead tables are grouped into one client when
 * they share a normalized name AND any of their phone numbers overlap
 * (primary or secondary). Secondary phone fields exist specifically so the
 * same person can be linked across a new request or listing.
 *
 * No schema / backend changes involved — everything is computed client-side.
 */

export type ClientRecordKind = "request" | "seeker" | "listing" | "lead";

export interface ClientRecordField {
  label: string;
  value: string;
}

export interface ClientRecord {
  kind: ClientRecordKind;
  id: number;
  name: string;
  phones: string[];
  createdAt: string;
  fields: ClientRecordField[];
  link?: { to: string; search: Record<string, unknown> };
}

export interface PreparedRecord extends ClientRecord {
  normalizedName: string;
  normalizedPhones: string[];
}

export interface Client {
  /** Stable, ASCII-safe id derived from the group key, used for routing. */
  id: string;
  /** Most complete name found among the client's records. */
  name: string;
  /** Raw phone numbers as recorded, primary first, deduplicated. */
  phones: string[];
  /** Normalized phone numbers for search matching. */
  phoneNumbers: string[];
  count: number;
  counts: Record<ClientRecordKind, number>;
  lastActiveAt: string;
  records: PreparedRecord[];
}

/** Arabic tashkeel (diacritics) and tatweel — removed for name matching. */
const TASHKEEL_TATWEEL = /[\u064B-\u0652\u0670\u0640]/g;
const PUNCTUATION = /[.,/#!$%^&*;:{}=\-_`~()+[\]{}"\\|<>؟،؛]/g;

/** Strips whitespace, Arabic alef/hamza variants, tashkeel and punctuation. */
export function normalizeName(value: string | null | undefined): string {
  return normalizeForSearch(value).replace(TASHKEEL_TATWEEL, "").replace(PUNCTUATION, "");
}

/**
 * Canonicalizes a phone number: digits only, then normalizes international /
 * local Saudi formats so "+966 50 123 4567", "00966501234567", "050 123 4567"
 * and "501234567" all resolve to "0501234567". Landlines are kept as-is.
 */
export function normalizePhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D+/g, "");
  if (!digits) return "";

  let core = digits;
  if (core.startsWith("00966")) core = core.slice(5);
  else if (core.startsWith("966")) core = core.slice(3);
  else if (core.startsWith("00")) core = core.slice(2);

  if (core.startsWith("5") && core.length === 9) return `0${core}`;
  return core;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function stableHash(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function connectByPhone(records: PreparedRecord[]): PreparedRecord[][] {
  const parent = new Map<number, number>();
  const byPhone = new Map<string, number[]>();

  const find = (x: number): number => {
    let root = parent.get(x) ?? x;
    while (root !== (parent.get(root) ?? root)) root = parent.get(root) ?? root;
    return root;
  };

  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  records.forEach((_, i) => parent.set(i, i));
  records.forEach((record, i) => {
    for (const phone of record.normalizedPhones) {
      const holders = byPhone.get(phone) ?? [];
      holders.push(i);
      byPhone.set(phone, holders);
    }
  });
  for (const holders of byPhone.values()) {
    for (let i = 1; i < holders.length; i++) union(holders[0], holders[i]);
  }

  const groups = new Map<number, PreparedRecord[]>();
  records.forEach((record, i) => {
    const root = find(i);
    const bucket = groups.get(root) ?? [];
    bucket.push(record);
    groups.set(root, bucket);
  });
  return [...groups.values()];
}

function makeClient(records: PreparedRecord[]): Client {
  const sorted = [...records].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() > 0 ? -1 : 1,
  );

  const nameCandidates = unique(sorted.map((r) => r.name).filter(Boolean));
  const name = nameCandidates.length
    ? nameCandidates.reduce((longest, candidate) =>
        candidate.length > longest.length ? candidate : longest,
      )
    : "Unknown";

  const displayPhones: string[] = [];
  for (const record of sorted) {
    for (const rawPhone of record.phones) {
      if (!rawPhone.trim()) continue;
      const normalized = normalizePhone(rawPhone);
      if (displayPhones.some((existing) => normalizePhone(existing) === normalized)) continue;
      displayPhones.push(rawPhone);
    }
  }

  const counts: Record<ClientRecordKind, number> = { request: 0, seeker: 0, listing: 0, lead: 0 };
  for (const record of sorted) counts[record.kind] += 1;

  const groupKey = [
    sorted[0].normalizedName,
    ...unique(sorted.flatMap((r) => r.normalizedPhones)).sort(),
  ].join("|");

  return {
    id: stableHash(groupKey),
    name,
    phones: displayPhones,
    phoneNumbers: unique(sorted.flatMap((r) => r.normalizedPhones)),
    count: sorted.length,
    counts,
    lastActiveAt: sorted[0].createdAt,
    records: sorted,
  };
}

/**
 * Groups raw records into clients. Records without a usable name or with no
 * phone numbers are skipped — they cannot be identified as a client.
 */
export function buildClients(inputs: ClientRecord[]): Client[] {
  const prepared = inputs
    .map((record) => ({
      ...record,
      normalizedName: normalizeName(record.name),
      normalizedPhones: unique(record.phones.map(normalizePhone).filter(Boolean)),
    }))
    .filter((record) => record.normalizedName && record.normalizedPhones.length > 0);

  const byName = new Map<string, PreparedRecord[]>();
  for (const record of prepared) {
    const bucket = byName.get(record.normalizedName) ?? [];
    bucket.push(record);
    byName.set(record.normalizedName, bucket);
  }

  const clients: Client[] = [];
  for (const bucket of byName.values()) {
    for (const component of connectByPhone(bucket)) {
      clients.push(makeClient(component));
    }
  }
  return clients;
}

/** True when a client matches a free-text query by name or any phone number. */
export function clientMatchesQuery(
  client: Client,
  query: string,
  normalize: (value: string | null | undefined) => string = normalizeForSearch,
): boolean {
  const normalized = normalize(query);
  if (!normalized) return true;
  if (normalizeName(client.name).includes(normalized)) return true;
  return client.phoneNumbers.some((phone) => phone.includes(normalized));
}

/** Renders a phone number with country code ("+966 50 123 4567"). */
export function formatPhone(value: string): string {
  const digits = normalizePhone(value);
  if (!digits) return value;
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+966 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return digits;
}
