import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Track } from "@domain/types";

const track: Track = {
  id: "track-1",
  title: "Song One",
  albumId: "album-1",
  artistName: "Artist",
  albumName: "Album",
  durationTicks: 120_000_000,
  isFavorite: false
};

describe("audio service playback startup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts audio before lyrics finish loading", async () => {
    const audioInstances: Array<{
      paused: boolean;
      src: string;
      preload: string;
      currentTime: number;
      duration: number;
      load: ReturnType<typeof vi.fn>;
      play: ReturnType<typeof vi.fn>;
      pause: ReturnType<typeof vi.fn>;
      addEventListener: ReturnType<typeof vi.fn>;
      removeAttribute: ReturnType<typeof vi.fn>;
    }> = [];

    vi.stubGlobal("Audio", vi.fn(function FakeAudio() {
      const audio = {
        paused: true,
        src: "",
        preload: "",
        currentTime: 0,
        duration: 12,
        load: vi.fn(),
        play: vi.fn(async function (this: { paused: boolean }) {
          this.paused = false;
        }),
        pause: vi.fn(),
        addEventListener: vi.fn(),
        removeAttribute: vi.fn()
      };
      audioInstances.push(audio);
      return audio;
    }));

    const fetchLyrics = vi.fn(() => new Promise<void>(() => undefined));
    const reportPlaybackStarted = vi.fn(async () => undefined);

    vi.doMock("./lyricsService", () => ({
      useLyricsStore: {
        getState: () => ({
          fetchLyrics,
          updateCurrentLine: vi.fn()
        })
      }
    }));

    vi.doMock("@core/jellyfin", () => ({
      jellyfinClient: {
        getStreamUrl: vi.fn(() => "https://jellyfin.example/Audio/track-1/universal"),
        reportPlaybackStarted,
        reportPlaybackProgress: vi.fn(async () => undefined),
        reportPlaybackStopped: vi.fn(async () => undefined),
        artworkUrl: vi.fn(() => "https://jellyfin.example/art.jpg")
      }
    }));

    const { usePlayerStore } = await import("./audioService");

    usePlayerStore.getState().play([track], 0);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(audioInstances[0].load).toHaveBeenCalled();
    expect(audioInstances[0].play).toHaveBeenCalled();
    expect(fetchLyrics).toHaveBeenCalledWith(track);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(reportPlaybackStarted).toHaveBeenCalledWith(track.id);
  });
});
