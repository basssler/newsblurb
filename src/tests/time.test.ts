import { formatRelativeTime } from "@/lib/time";

describe("formatRelativeTime", () => {
  it("returns placeholder when date is null", () => {
    expect(formatRelativeTime(null)).toBe("Unknown");
  });

  it("returns 'Just now' for under 1 minute", () => {
    const now = new Date("2026-02-17T04:00:00.000Z");
    const date = new Date("2026-02-17T03:59:30.000Z");
    expect(formatRelativeTime(date, now)).toBe("Just now");
  });

  it("returns minutes", () => {
    const now = new Date("2026-02-17T04:00:00.000Z");
    const date = new Date("2026-02-17T03:01:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("59m ago");
  });

  it("returns hours", () => {
    const now = new Date("2026-02-17T04:00:00.000Z");
    const date = new Date("2026-02-17T03:00:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("1h ago");
  });

  it("returns days", () => {
    const now = new Date("2026-02-17T04:00:00.000Z");
    const date = new Date("2026-02-15T04:00:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("2d ago");
  });
});
