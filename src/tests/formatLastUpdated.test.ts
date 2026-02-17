import { formatLastUpdatedTimestamp } from "@/lib/formatLastUpdated";

describe("formatLastUpdatedTimestamp", () => {
  it("returns placeholder for null/undefined", () => {
    expect(formatLastUpdatedTimestamp(undefined)).toBe("—");
    expect(formatLastUpdatedTimestamp(null)).toBe("—");
  });

  it("formats ISO strings as YYYY-MM-DD HH:mm UTC", () => {
    expect(formatLastUpdatedTimestamp("2026-02-16T20:15:41.000Z")).toBe(
      "2026-02-16 20:15 UTC"
    );
  });

  it("returns placeholder for invalid dates", () => {
    expect(formatLastUpdatedTimestamp("not-a-date")).toBe("—");
  });
});
