import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Track } from "@domain/types";

const makeTrack = (id: number, playCount = 0): Track => ({
  id: `track-${id}`,
  title: `Track ${id}`,
  albumId: "album-1",
  artistName: "Artist",
  albumName: "Album",
  durationTicks: 120_000_000,
  isFavorite: id % 2 === 0,
  playCount
});

const getTracksPage = vi.fn();
const getArtistTracks = vi.fn();

vi.mock("@core/jellyfin", () => ({
  jellyfinClient: {
    getTracksPage,
    getArtistTracks
  }
}));

describe("smart mixes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds favorites from a capped first page", async () => {
    getTracksPage.mockResolvedValueOnce({ tracks: [makeTrack(1), makeTrack(2)], total: 2 });
    const { buildSmartMix } = await import("./smartMixes");

    const result = await buildSmartMix("favorites");

    expect(getTracksPage).toHaveBeenCalledWith({
      sortBy: "SortName",
      sortOrder: "Ascending",
      favoritesOnly: true,
      limit: 500,
      startIndex: 0
    });
    expect(result.tracks).toHaveLength(2);
  });

  it("limits recently added to 100 tracks", async () => {
    getTracksPage.mockResolvedValueOnce({ tracks: [makeTrack(1)], total: 1 });
    const { buildSmartMix } = await import("./smartMixes");

    await buildSmartMix("recently-added");

    expect(getTracksPage).toHaveBeenCalledWith({
      sortBy: "DateCreated",
      sortOrder: "Descending",
      limit: 100,
      startIndex: 0
    });
  });

  it("scans unplayed tracks with a bounded page count", async () => {
    getTracksPage.mockResolvedValue({ tracks: Array.from({ length: 500 }, (_, index) => makeTrack(index, 1)), total: 3000 });
    const { buildSmartMix } = await import("./smartMixes");

    const result = await buildSmartMix("unplayed");

    expect(result.tracks).toHaveLength(0);
    expect(getTracksPage).toHaveBeenCalledTimes(4);
  });

  it("returns an empty artist radio mix when no artist is available", async () => {
    const { buildSmartMix } = await import("./smartMixes");

    const result = await buildSmartMix("artist-radio");

    expect(result.tracks).toEqual([]);
    expect(getArtistTracks).not.toHaveBeenCalled();
  });
});
