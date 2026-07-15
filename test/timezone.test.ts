import { describe, expect, it } from "vitest";
import { TimeZoneError, normalizeTimeZone } from "../src/timezone";

describe("normalizeTimeZone", () => {
  it.each([
    ["Asia/Taipei", "Asia/Taipei"],
    ["Asia/Shanghai", "Asia/Shanghai"],
    ["America/Los_Angeles", "America/Los_Angeles"],
    ["UTC", "UTC"],
    ["UTC8", "Asia/Shanghai"],
    ["Shanghai", "Asia/Shanghai"],
    ["Taipei", "Asia/Taipei"],
    ["台北", "Asia/Taipei"],
    ["Osaka", "Asia/Tokyo"],
    ["大阪", "Asia/Tokyo"],
    ["LosAngeles", "America/Los_Angeles"],
    ["Los Angeles", "America/Los_Angeles"],
    ["洛杉矶", "America/Los_Angeles"],
  ])("maps %s to %s", (input, expected) => {
    expect(normalizeTimeZone(input)).toBe(expected);
  });

  it("requires an exact city name", () => {
    expect(() => normalizeTimeZone("Taipeiw")).toThrowError(new TimeZoneError("Taipeiw"));
  });
});
