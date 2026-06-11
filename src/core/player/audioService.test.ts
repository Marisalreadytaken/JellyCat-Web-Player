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

type FakeListener = () => void;

class FakeAudio {
  paused = true;
  src = "";
  preload = "";
  currentTime = 0;
  duration = 12;
  listeners = new Map<string, FakeListener[]>();
  load = vi.fn(() => this.dispatch("loadstart"));
  play = vi.fn(async () => {
    this.paused = false;
    this.dispatch("playing");
  });
  pause = vi.fn(() => {
    this.paused = true;
    this.dispatch("pause");
  });
  removeAttribute = vi.fn((name: string) => {
    if (name === "src") this.src = "";
  });
  addEventListener = vi.fn((event: string, listener: FakeListener) => {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
  });

  dispatch(event: string): void {
    for (const listener of this.listeners.get(event) ?? []) listener();
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function setupAudioService() {
  const audioInstances: FakeAudio[] = [];
  const fetchLyrics = vi.fn(() => new Promise<void>(() => undefined));
  const reportPlaybackStarted = vi.fn(async () => undefined);

  vi.stubGlobal("Audio", vi.fn(function AudioMock() {
    const audio = new FakeAudio();
    audioInstances.push(audio);
    return audio;
  }));

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
  return { audioInstances, fetchLyrics, reportPlaybackStarted, usePlayerStore };
}

describe("audio service playback startup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts audio before lyrics finish loading", async () => {
    const { audioInstances, fetchLyrics, reportPlaybackStarted, usePlayerStore } = await setupAudioService();

    usePlayerStore.getState().play([track], 0);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(audioInstances[0].load).toHaveBeenCalled();
    expect(audioInstances[0].play).toHaveBeenCalled();
    expect(fetchLyrics).toHaveBeenCalledWith(track);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().playbackStatus).toBe("playing");
    expect(reportPlaybackStarted).toHaveBeenCalledWith(track.id);
  });

  it("marks a selected track as loading before media starts", async () => {
    const { audioInstances, usePlayerStore } = await setupAudioService();
    const pendingPlayback = deferred<void>();
    audioInstances[0].play.mockReturnValueOnce(pendingPlayback.promise);

    usePlayerStore.getState().play([track], 0);

    expect(usePlayerStore.getState()).toMatchObject({
      currentTrack: track,
      isPlaying: false,
      playbackStatus: "loading"
    });
  });

  it("tracks playing, buffering, error, and idle media states", async () => {
    const { audioInstances, usePlayerStore } = await setupAudioService();

    usePlayerStore.getState().play([track], 0);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(usePlayerStore.getState()).toMatchObject({ isPlaying: true, playbackStatus: "playing" });

    audioInstances[0].dispatch("waiting");
    expect(usePlayerStore.getState()).toMatchObject({
      currentTrack: track,
      playbackStatus: "buffering"
    });

    audioInstances[0].dispatch("stalled");
    expect(usePlayerStore.getState().playbackStatus).toBe("buffering");

    audioInstances[0].dispatch("error");
    expect(usePlayerStore.getState().playbackStatus).toBe("error");
    expect(usePlayerStore.getState().playbackError).toBeTruthy();

    usePlayerStore.getState().clearQueue();
    expect(usePlayerStore.getState()).toMatchObject({
      currentTrack: null,
      isPlaying: false,
      playbackStatus: "idle"
    });
  });

  it("marks user pause as paused", async () => {
    const { usePlayerStore } = await setupAudioService();

    usePlayerStore.getState().play([track], 0);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    await usePlayerStore.getState().togglePlayPause();

    expect(usePlayerStore.getState()).toMatchObject({
      isPlaying: false,
      playbackStatus: "paused"
    });
  });
});
