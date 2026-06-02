import { describe, expect, it } from "vitest";
import { lyricsInternals } from "./lyricsService";

describe("lyrics parsing", () => {
  it("parses synced LRC lines in timestamp order", () => {
    const lines = lyricsInternals.parseSyncedLyrics("[00:12.50] hello\n[00:01.00] intro");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ timestamp: 1, text: "intro" });
    expect(lines[1]).toMatchObject({ timestamp: 12.5, text: "hello" });
  });
});
