import { describe, expect, it } from "vitest";

import { chunk } from "../array";

describe("chunk", () => {
  it("splits an array into equal-sized chunks", () => {
    expect(chunk([1, 2, 3, 4, 5, 6], 2)).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it("puts the remainder in the final chunk", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns one chunk when size >= length", () => {
    expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  it("returns an empty array for empty input", () => {
    expect(chunk([], 5)).toEqual([]);
  });

  it("accepts readonly arrays", () => {
    const input: readonly number[] = [1, 2, 3, 4];
    expect(chunk(input, 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("throws when size is 0", () => {
    expect(() => chunk([1, 2, 3], 0)).toThrow(/size must be >= 1/);
  });

  it("throws when size is negative", () => {
    expect(() => chunk([1, 2, 3], -1)).toThrow(/size must be >= 1/);
  });
});
