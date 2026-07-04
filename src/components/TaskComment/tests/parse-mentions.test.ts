import { describe, it, expect } from "vitest";

import { parseMentions } from "../parse-mentions";

describe("parseMentions", () => {
  it("extracts deduped id/label pairs from editor mention spans", () => {
    const html =
      '<p>hey <span data-mention-id="u1" data-mention="Alice">Alice</span> and ' +
      '<span data-mention-id="u2" data-mention="Bob">Bob</span> and again ' +
      '<span data-mention-id="u1" data-mention="Alice">Alice</span></p>';
    expect(parseMentions(html)).toEqual([
      { id: "u1", label: "Alice" },
      { id: "u2", label: "Bob" },
    ]);
  });

  it("returns an empty array when there are no mentions", () => {
    expect(parseMentions("<p>just text</p>")).toEqual([]);
    expect(parseMentions("")).toEqual([]);
  });
});
