import { describe, it, expect } from "vitest";
import { shapeReactions } from "../api/utils/reactions.js";

describe("shapeReactions", () => {
  it("aggregates counts and collects my reactions", () => {
    const raw = [
      { emoji: "👍", userId: "u1" },
      { emoji: "👍", userId: "u2" },
      { emoji: "😂", userId: "u1" },
    ];
    const { counts, myReactions } = shapeReactions(raw, "u1");

    expect(counts).toEqual({ "👍": 2, "😂": 1 });
    expect(myReactions.sort()).toEqual(["👍", "😂"].sort());
  });

  it("handles empty input", () => {
    const { counts, myReactions } = shapeReactions([], "u1");
    expect(counts).toEqual({});
    expect(myReactions).toEqual([]);
  });
});
