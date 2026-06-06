import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LyricsPayload, Track } from "@domain/types";
import { lyricsInternals, useLyricsStore } from "./lyricsService";

const trackA: Track = {
  id: "track-a",
  title: "A",
  albumId: "album-a",
  artistName: "Artist",
  albumName: "Album",
  durationTicks: 100_000_000,
  isFavorite: false
};

const trackB: Track = {
  ...trackA,
  id: "track-b",
  title: "B"
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("lyrics parsing", () => {
  it("parses synced LRC lines in timestamp order", () => {
    const lines = lyricsInternals.parseSyncedLyrics("[00:12.50] hello\n[00:01.00] intro");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ timestamp: 1, text: "intro" });
    expect(lines[1]).toMatchObject({ timestamp: 12.5, text: "hello" });
  });
});

describe("lyrics loading", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useLyricsStore.setState({
      lines: [],
      plainLyrics: "",
      isLoading: false,
      currentLineIndex: 0,
      hasLyrics: false
    });
  });

  it("ignores stale lyric responses after a newer track request starts", async () => {
    const first = deferred<LyricsPayload | null>();
    const second = deferred<LyricsPayload | null>();

    const { jellyfinClient } = await import("@core/jellyfin");
    vi.spyOn(jellyfinClient, "getLyrics")
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const firstRequest = useLyricsStore.getState().fetchLyrics(trackA);
    const secondRequest = useLyricsStore.getState().fetchLyrics(trackB);

    second.resolve({
      lines: [{ id: "b-1", timestamp: 1, text: "new lyric" }],
      plainLyrics: ""
    });
    await secondRequest;

    expect(useLyricsStore.getState()).toMatchObject({
      hasLyrics: true,
      isLoading: false,
      lines: [{ id: "b-1", timestamp: 1, text: "new lyric" }]
    });

    first.resolve({
      lines: [{ id: "a-1", timestamp: 1, text: "stale lyric" }],
      plainLyrics: ""
    });
    await firstRequest;

    expect(useLyricsStore.getState()).toMatchObject({
      hasLyrics: true,
      isLoading: false,
      lines: [{ id: "b-1", timestamp: 1, text: "new lyric" }]
    });
  });
});
