import { describe, expect, it } from "vitest";
import { matchesPhoneQuery, normalizePhone } from "./phone";

describe("matchesPhoneQuery", () => {
  it("matches a number stored in a different format than the query", () => {
    expect(matchesPhoneQuery(["+966 551620530"], "0551620530")).toBe(true);
    expect(matchesPhoneQuery(["+966 551620530"], "+966 551620530")).toBe(true);
    expect(matchesPhoneQuery(["+966 551620530"], "551620530")).toBe(true);
    expect(matchesPhoneQuery(["0551620530"], "+966 551620530")).toBe(true);
    expect(matchesPhoneQuery(["0551620530"], "00966551620530")).toBe(true);
    expect(matchesPhoneQuery(["055-162-0530"], "0551620530")).toBe(true);
    expect(matchesPhoneQuery(["055 162 0530"], "0551620530")).toBe(true);
  });

  it("matches any of the given numbers", () => {
    expect(matchesPhoneQuery(["", "+966 551620530"], "0551620530")).toBe(true);
    expect(matchesPhoneQuery([null, undefined], "0551620530")).toBe(false);
  });

  it("does not match a different number", () => {
    expect(matchesPhoneQuery(["+966 551620530"], "0551620531")).toBe(false);
    expect(matchesPhoneQuery(["+966 551620530"], "0501112222")).toBe(false);
  });

  it("ignores queries that are not phone numbers", () => {
    expect(matchesPhoneQuery(["+966 551620530"], "راكان")).toBe(false);
    expect(matchesPhoneQuery(["+966 551620530"], "2024")).toBe(false);
    expect(matchesPhoneQuery(["+966 551620530"], "")).toBe(false);
  });

  it("keeps foreign numbers separate from Saudi ones", () => {
    expect(matchesPhoneQuery(["+971 501234567"], "0501234567")).toBe(false);
    expect(matchesPhoneQuery(["+971 501234567"], "+971 501234567")).toBe(true);
    expect(matchesPhoneQuery(["+971 0501234567"], "+971 501234567")).toBe(true);
  });

  it("still normalizes the same way as before", () => {
    expect(normalizePhone("+966 50 123 4567")).toBe("0501234567");
  });
});
