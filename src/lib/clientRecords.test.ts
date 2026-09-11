import { describe, expect, it } from "vitest";
import type { CommercialListing, Lead, RequestListItem, ResidentialSeeker } from "./api";
import {
  commercialListingToClientRecord,
  leadToClientRecord,
  requestRecordToClientRecord,
  residentialSeekerToClientRecord,
} from "./clientRecords";

describe("record converters", () => {
  it("maps a request to a single primary phone", () => {
    const item = {
      id: 1,
      fullName: "أحمد",
      mobileNumber: "0501234567",
      requestType: "rent",
      createdAt: "2024-01-01T00:00:00Z",
    } as RequestListItem;
    const record = requestRecordToClientRecord(item);
    expect(record.kind).toBe("request");
    expect(record.name).toBe("أحمد");
    expect(record.phones).toEqual(["0501234567"]);
  });

  it("maps a seeker to primary + secondary phones", () => {
    const item = {
      id: 1,
      fullName: "خالد",
      mobile: "0501234567",
      mobile2: "0507654321",
      createdAt: "2024-01-01T00:00:00Z",
    } as ResidentialSeeker;
    const record = residentialSeekerToClientRecord(item);
    expect(record.kind).toBe("seeker");
    expect(record.phones).toEqual(["0501234567", "0507654321"]);
  });

  it("falls back to the secondary phone when the primary is empty", () => {
    const item = {
      id: 1,
      fullName: "خالد",
      mobile: null,
      mobile2: "0507654321",
      createdAt: "2024-01-01T00:00:00Z",
    } as ResidentialSeeker;
    const record = residentialSeekerToClientRecord(item);
    expect(record.phones).toEqual(["0507654321", "0507654321"]);
  });

  it("maps a listing to primary + secondary phones", () => {
    const item = {
      id: 1,
      ownerName: "مالك",
      mobile1: "0501234567",
      mobile2: "0507654321",
      createdAt: "2024-01-01T00:00:00Z",
    } as CommercialListing;
    const record = commercialListingToClientRecord(item);
    expect(record.kind).toBe("listing");
    expect(record.phones).toEqual(["0501234567", "0507654321"]);
  });

  it("maps a lead to a single phone", () => {
    const item = {
      id: 1,
      fullName: "فهد",
      phone: "0501234567",
      propertyName: "فيلا",
      propertyAddress: "الرياض",
      propertyType: "villa",
      ownerNationalId: "1",
      email: "a@b.com",
      intent: "buy",
      listedPrice: 1000,
      status: "new",
      createdAt: "2024-01-01T00:00:00Z",
    } as Lead;
    const record = leadToClientRecord(item);
    expect(record.kind).toBe("lead");
    expect(record.name).toBe("فهد");
    expect(record.phones).toEqual(["0501234567"]);
  });
});
