import type { CommercialListing, Lead, RequestListItem, ResidentialSeeker } from "./api";
import type { ClientRecord } from "./clients";

/**
 * Normalizes the four request/listing/lead API shapes into a common
 * ClientRecord. `fields` hold { label, value } pairs where `label` is a key
 * under the `clients.field.*` i18n namespace; the rendered page translates it.
 */

export function requestRecordToClientRecord(item: RequestListItem): ClientRecord {
  return {
    kind: "request",
    id: item.id,
    name: item.fullName,
    phones: [item.mobileNumber],
    createdAt: item.createdAt,
    fields: [
      { label: "requestDate", value: item.requestDate ?? "" },
      { label: "status", value: item.status ?? "" },
      { label: "requestType", value: item.requestType ?? "" },
      { label: "location", value: item.location ?? "" },
    ].filter((field) => field.value),
  };
}

export function residentialSeekerToClientRecord(item: ResidentialSeeker): ClientRecord {
  return {
    kind: "seeker",
    id: item.id,
    name: item.fullName ?? "",
    phones: [item.mobile ?? item.mobile2 ?? "", item.mobile2 ?? ""],
    createdAt: item.createdAt,
    fields: [
      { label: "serialNumber", value: item.serialNumber ?? "" },
      { label: "requestDate", value: item.requestDate ?? "" },
      { label: "status", value: item.status ?? "" },
      { label: "listingType", value: item.listingType ?? "" },
      { label: "city", value: item.city ?? "" },
      { label: "maxBudget", value: item.maxBudget ?? "" },
    ].filter((field) => field.value),
    link: { to: "/app/residential-seekers", search: { selected: item.id } },
  };
}

export function commercialListingToClientRecord(item: CommercialListing): ClientRecord {
  const city = [item.city, Array.isArray(item.district) ? item.district[0] : undefined]
    .filter(Boolean)
    .join(" - ");
  return {
    kind: "listing",
    id: item.id,
    name: item.ownerName ?? "",
    phones: [item.mobile1 ?? item.mobile2 ?? "", item.mobile2 ?? ""],
    createdAt: item.createdAt,
    fields: [
      { label: "offerCode", value: item.offerCode ?? "" },
      { label: "propertyType", value: item.propertyType ?? "" },
      { label: "listingStatus", value: item.propertyStatus ?? "" },
      { label: "city", value: city },
      { label: "rentAmount", value: item.rentAmount ?? "" },
    ].filter((field) => field.value),
    link: { to: "/app/listings", search: { selected: item.id } },
  };
}

export function leadToClientRecord(item: Lead): ClientRecord {
  const city = [item.city, item.district].filter(Boolean).join(" - ");
  return {
    kind: "lead",
    id: item.id,
    name: item.fullName,
    phones: [item.phone],
    createdAt: item.createdAt,
    fields: [
      { label: "intent", value: item.intent },
      { label: "leadStatus", value: item.status },
      { label: "propertyName", value: item.propertyName },
      { label: "price", value: item.listedPrice ? String(item.listedPrice) : "" },
      { label: "city", value: city },
    ].filter((field) => field.value),
    link: { to: `/app/leads/${item.id}`, search: {} },
  };
}
