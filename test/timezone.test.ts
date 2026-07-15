import { describe, expect, it } from "vitest";
import { TimeZoneError, normalizeTimeZone, timeZoneLabel } from "../src/timezone";

describe("normalizeTimeZone", () => {
  it.each([
    ["Asia/Taipei", "Asia/Taipei"],
    ["Asia/Shanghai", "Asia/Shanghai"],
    ["America/Los_Angeles", "America/Los_Angeles"],
    ["UTC", "UTC"],
    ["UTC8", "Asia/Shanghai"],
    ["UTC9", "Etc/GMT-9"],
    ["UTC+9", "Etc/GMT-9"],
    ["UTC-1", "Etc/GMT+1"],
    ["UTC+14", "Etc/GMT-14"],
    ["UTC-12", "Etc/GMT+12"],
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

  it.each(["UTC+15", "UTC-13"])("rejects an out-of-range offset: %s", (input) => {
    expect(() => normalizeTimeZone(input)).toThrowError(new TimeZoneError(input));
  });

  it("shows a fixed UTC offset without the reversed Etc/GMT identifier", () => {
    expect(timeZoneLabel("Etc/GMT-9", new Date("2026-07-15T06:30:25Z"))).toBe("UTC+9");
    expect(timeZoneLabel("Etc/GMT+1", new Date("2026-07-15T06:30:25Z"))).toBe("UTC-1");
  });
});
