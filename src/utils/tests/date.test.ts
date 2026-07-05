import { describe, expect, it } from "vitest";

import { formatJoinedDate } from "../date";

describe("formatJoinedDate", () => {
  it("formats a valid ISO string as 'MMM yyyy'", () => {
    expect(formatJoinedDate("2024-03-15T00:00:00.000Z")).toBe("Mar 2024");
  });

  it("returns null for empty string", () => {
    expect(formatJoinedDate("")).toBeNull();
  });

  it("returns null for null / undefined", () => {
    expect(formatJoinedDate(null)).toBeNull();
    expect(formatJoinedDate(undefined)).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(formatJoinedDate("not-a-date")).toBeNull();
  });

  it("formats in UTC so the displayed month is timezone-stable", () => {
    // UTC midnight on the 1st of a month — in negative-offset timezones
    // (e.g. UTC-5) local time is Feb 29, which would render "Feb 2024"
    // if we let the runtime default to local TZ. Forcing UTC keeps it
    // "Mar 2024" for every viewer.
    expect(formatJoinedDate("2024-03-01T00:00:00.000Z")).toBe("Mar 2024");

    // Last instant of December in UTC — local time in positive offsets
    // would already be January of the next year. Should stay "Dec 2024".
    expect(formatJoinedDate("2024-12-31T23:59:59.000Z")).toBe("Dec 2024");
  });
});
