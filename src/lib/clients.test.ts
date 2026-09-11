import { describe, expect, it } from "vitest";
import {
  buildClients,
  clientMatchesQuery,
  formatPhone,
  internationalPhone,
  normalizeName,
  normalizePhone,
  waHref,
  type ClientRecord,
  type ClientRecordKind,
} from "./clients";

function record(partial: Partial<ClientRecord> & { kind: ClientRecordKind }): ClientRecord {
  return {
    id: Math.floor(Math.random() * 1e9),
    name: "",
    phones: [],
    createdAt: "2024-01-01T00:00:00Z",
    fields: [],
    ...partial,
  };
}

describe("normalizeName", () => {
  it("normalizes Arabic alef/hamza variants to a single form", () => {
    expect(normalizeName("أحمد محمد")).toBe("احمدمحمد");
    expect(normalizeName("إبراهيم")).toBe("ابراهيم");
    expect(normalizeName("آدم")).toBe("ادم");
  });

  it("normalizes taa marbuta (ة) to haa (ه)", () => {
    expect(normalizeName("فاطمة")).toBe("فاطمه");
  });

  it("strips tashkeel (diacritics) and tatweel", () => {
    expect(normalizeName("محمدٌ أحمد")).toBe("محمداحمد");
    expect(normalizeName("مــحمد")).toBe("محمد");
  });

  it("strips punctuation and whitespace", () => {
    expect(normalizeName("محمد، أحمد.")).toBe("محمداحمد");
    expect(normalizeName("  Omar  Khaled ")).toBe("omarkhaled");
  });

  it("handles empty and null input", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName("")).toBe("");
  });
});

describe("normalizePhone", () => {
  it("canonicalizes all mobile formats to the same token", () => {
    expect(normalizePhone("+966 50 123 4567")).toBe("0501234567");
    expect(normalizePhone("00966501234567")).toBe("0501234567");
    expect(normalizePhone("966501234567")).toBe("0501234567");
    expect(normalizePhone("050 123 4567")).toBe("0501234567");
    expect(normalizePhone("501234567")).toBe("0501234567");
  });

  it("canonicalizes landline formats to the same token", () => {
    expect(normalizePhone("0112345678")).toBe("0112345678");
    expect(normalizePhone("+966112345678")).toBe("0112345678");
    expect(normalizePhone("00966112345678")).toBe("0112345678");
  });

  it("handles empty and non-numeric input", () => {
    expect(normalizePhone(null)).toBe("");
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("hello")).toBe("");
  });
});

describe("normalizePhone (foreign numbers)", () => {
  it("keeps foreign country-code digits verbatim", () => {
    expect(normalizePhone("+971 50 123 4567")).toBe("971501234567");
    expect(normalizePhone("+20 10 1234 5678")).toBe("201012345678");
    expect(normalizePhone("+1 415 555 0100")).toBe("14155550100");
  });

  it("treats the +CC and 00CC forms of a foreign number identically", () => {
    expect(normalizePhone("00201012345678")).toBe("201012345678");
    expect(normalizePhone("+201012345678")).toBe("201012345678");
    expect(normalizePhone("+971501234567")).toBe("971501234567");
    expect(normalizePhone("00971501234567")).toBe("971501234567");
  });

  it("drops a national trunk 0 so local-style entry matches international entry", () => {
    expect(normalizePhone("+971 0501234567")).toBe("971501234567");
    expect(normalizePhone("+2001012345678")).toBe("201012345678");
  });

  it("never shapes foreign numbers as Saudi", () => {
    expect(normalizePhone("+971501234567")).not.toBe("0501234567");
    expect(normalizePhone("+9710501234567")).not.toBe("0501234567");
  });

  it("leaves long unprefixed numbers untouched instead of stripping their 0", () => {
    expect(normalizePhone("01012345678")).toBe("01012345678");
  });
});

describe("buildClients", () => {
  it("groups records sharing a normalized name and phone into one client", () => {
    const clients = buildClients([
      record({ kind: "request", name: "أحمد محمد", phones: ["0501111111"] }),
      record({ kind: "lead", name: "أحمد محمد", phones: ["00966501111111"] }),
    ]);
    expect(clients).toHaveLength(1);
    expect(clients[0].count).toBe(2);
  });

  it("links records via a secondary phone number", () => {
    const clients = buildClients([
      record({ kind: "request", name: "خالد سعد", phones: ["0501111111"] }),
      record({ kind: "seeker", name: "خالد سعد", phones: ["0502222222", "0501111111"] }),
    ]);
    expect(clients).toHaveLength(1);
    expect(clients[0].count).toBe(2);
  });

  it("merges transitively through a chain of overlapping phones", () => {
    const clients = buildClients([
      record({ kind: "request", name: "سامي", phones: ["0501111111"] }),
      record({ kind: "seeker", name: "سامي", phones: ["0501111111", "0502222222"] }),
      record({ kind: "listing", name: "سامي", phones: ["0502222222"] }),
    ]);
    expect(clients).toHaveLength(1);
    expect(clients[0].count).toBe(3);
  });

  it("merges names that differ only by punctuation/hamza form", () => {
    const clients = buildClients([
      record({ kind: "request", name: "محمد أحمد", phones: ["0501111111"] }),
      record({ kind: "lead", name: "محمد أحمد.", phones: ["0501111111"] }),
    ]);
    expect(clients).toHaveLength(1);
  });

  it("merges a landline written as local and international forms", () => {
    const clients = buildClients([
      record({ kind: "request", name: "مكتب العقار", phones: ["0112345678"] }),
      record({ kind: "lead", name: "مكتب العقار", phones: ["+966112345678"] }),
    ]);
    expect(clients).toHaveLength(1);
  });

  it("keeps records with the same phone but different names separate (conservative rule)", () => {
    const clients = buildClients([
      record({ kind: "request", name: "أحمد علي", phones: ["0501234567"] }),
      record({ kind: "lead", name: "محمد علي", phones: ["0501234567"] }),
    ]);
    expect(clients).toHaveLength(2);
  });

  it("drops records without a usable name", () => {
    const clients = buildClients([record({ kind: "request", name: " ", phones: ["0501234567"] })]);
    expect(clients).toHaveLength(0);
  });

  it("drops records without any phone number", () => {
    const clients = buildClients([record({ kind: "request", name: "محمد", phones: [] })]);
    expect(clients).toHaveLength(0);
  });

  it("drops records whose only phone is junk", () => {
    const clients = buildClients([record({ kind: "request", name: "محمد", phones: ["0"] })]);
    expect(clients).toHaveLength(0);
  });

  it("does not let a junk phone merge records or create a client", () => {
    const clients = buildClients([
      record({ kind: "request", name: "محمد", phones: ["0501234567"] }),
      record({ kind: "lead", name: "محمد", phones: ["123"] }),
    ]);
    expect(clients).toHaveLength(1);
    expect(clients[0].count).toBe(1);
  });

  it("produces the same client ids regardless of input order", () => {
    const a = [
      record({ kind: "request", name: "أحمد محمد", phones: ["0501111111"] }),
      record({ kind: "lead", name: "أحمد محمد", phones: ["0501111111"] }),
    ];
    const b = [...a].reverse();
    const idsA = buildClients(a)
      .map((c) => c.id)
      .sort();
    const idsB = buildClients(b)
      .map((c) => c.id)
      .sort();
    expect(idsA).toEqual(idsB);
  });

  it("never merges a Saudi and a foreign number of the same shape", () => {
    const clients = buildClients([
      record({ kind: "request", name: "خالد", phones: ["+966501234567"] }),
      record({ kind: "lead", name: "خالد", phones: ["+971501234567"] }),
    ]);
    expect(clients).toHaveLength(2);
  });

  it("merges a foreign number typed with and without the trunk 0", () => {
    const clients = buildClients([
      record({ kind: "request", name: "خالد", phones: ["+971 0501234567"] }),
      record({ kind: "lead", name: "خالد", phones: ["+971 501234567"] }),
    ]);
    expect(clients).toHaveLength(1);
    expect(clients[0].count).toBe(2);
  });
});

describe("clientMatchesQuery", () => {
  const clients = buildClients([
    record({ kind: "request", name: "أحمد محمد", phones: ["0501234567"] }),
  ]);
  const client = clients[0];

  it("matches by name", () => {
    expect(clientMatchesQuery(client, "احمد")).toBe(true);
  });

  it("matches by phone regardless of formatting", () => {
    expect(clientMatchesQuery(client, "050 123 4567")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(clientMatchesQuery(client, "xyz")).toBe(false);
  });

  it("matches an empty query", () => {
    expect(clientMatchesQuery(client, "")).toBe(true);
  });
});

describe("clientMatchesQuery (foreign numbers)", () => {
  const clients = buildClients([
    record({ kind: "request", name: "خالد", phones: ["+971501234567"] }),
  ]);
  const client = clients[0];

  it("matches a query that includes the + country code", () => {
    expect(clientMatchesQuery(client, "+971 501234567")).toBe(true);
  });

  it("matches a query with the trunk 0 entry format", () => {
    expect(clientMatchesQuery(client, "+971 0501234567")).toBe(true);
  });
});

describe("formatPhone", () => {
  it("renders Saudi mobiles with +966 and grouping", () => {
    expect(formatPhone("0501234567")).toBe("+966 50 123 4567");
    expect(formatPhone("+966 501234567")).toBe("+966 50 123 4567");
    expect(formatPhone("501234567")).toBe("+966 50 123 4567");
  });

  it("keeps the + on a foreign number that was entered with one", () => {
    expect(formatPhone("+971 501234567")).toBe("+971 501234567");
    expect(formatPhone("00971 0501234567")).toBe("+971501234567");
  });

  it("adds a + to a foreign number stored without one", () => {
    expect(formatPhone("971501234567")).toBe("+971501234567");
    expect(formatPhone("201012345678")).toBe("+201012345678");
  });

  it("leaves ambiguous local-form numbers unchanged", () => {
    expect(formatPhone("01012345678")).toBe("01012345678");
    expect(formatPhone("123")).toBe("123");
  });

  it("returns the raw value when it has no digits", () => {
    expect(formatPhone("???")).toBe("???");
  });
});

describe("internationalPhone / waHref", () => {
  it("builds E.164-style digits for Saudi numbers", () => {
    expect(internationalPhone("0501234567")).toBe("966501234567");
    expect(waHref("0501234567")).toBe("https://wa.me/966501234567");
  });

  it("keeps foreign country-code digits for WhatsApp", () => {
    expect(internationalPhone("+971 501234567")).toBe("971501234567");
    expect(waHref("+971 0501234567")).toBe("https://wa.me/971501234567");
  });

  it("returns an empty href when there are no digits", () => {
    expect(waHref("")).toBe("");
  });
});
