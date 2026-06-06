import { create } from "zustand";
import type { LyricLine, LyricsState, Track } from "@domain/types";
import { ticksToSeconds } from "@domain/types";
import { useAppStore } from "@app/appStore";
import { jellyfinClient } from "@core/jellyfin";

interface LyricsStore extends LyricsState {
  fetchLyrics: (track: Track) => Promise<void>;
  updateCurrentLine: (time: number) => void;
}

const initialState: LyricsState = {
  lines: [],
  plainLyrics: "",
  isLoading: false,
  currentLineIndex: 0,
  hasLyrics: false
};

let lyricsRequestSequence = 0;

function parseSyncedLyrics(lrc: string): LyricLine[] {
  return lrc.split(/\r?\n/).flatMap((line, index) => {
    const match = line.trim().match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (!match) return [];
    return [{
      id: `${index}-${match[1]}-${match[2]}`,
      timestamp: Number(match[1]) * 60 + Number(match[2]),
      text: match[3] ?? ""
    }];
  }).sort((a, b) => a.timestamp - b.timestamp);
}

async function fetchLrclibLyrics(track: Track): Promise<Pick<LyricsState, "lines" | "plainLyrics" | "hasLyrics">> {
  const params = new URLSearchParams({
    artist_name: track.artistName,
    album_name: track.albumName,
    track_name: track.title,
    duration: String(Math.round(ticksToSeconds(track.durationTicks)))
  });
  const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
  if (!response.ok) return { lines: [], plainLyrics: "", hasLyrics: false };

  const data = (await response.json()) as { syncedLyrics?: string; plainLyrics?: string };
  const lines = data.syncedLyrics ? parseSyncedLyrics(data.syncedLyrics) : [];
  const plainLyrics = lines.length ? "" : data.plainLyrics ?? "";
  return {
    lines,
    plainLyrics,
    hasLyrics: lines.length > 0 || Boolean(plainLyrics)
  };
}

export const useLyricsStore = create<LyricsStore>((set, get) => ({
  ...initialState,
  fetchLyrics: async (track) => {
    const requestId = ++lyricsRequestSequence;
    const setIfLatest = (state: LyricsState) => {
      if (requestId === lyricsRequestSequence) set(state);
    };

    set({ ...initialState, isLoading: true });
    try {
      if (useAppStore.getState().localJellyfinLyrics) {
        const localLyrics = await jellyfinClient.getLyrics(track.id).catch(() => null);
        if (localLyrics && (localLyrics.lines.length || localLyrics.plainLyrics)) {
          setIfLatest({
            ...localLyrics,
            hasLyrics: true,
            isLoading: false,
            currentLineIndex: 0
          });
          return;
        }
      }

      const lyrics = await fetchLrclibLyrics(track);
      setIfLatest({
        lines: lyrics.lines,
        plainLyrics: lyrics.plainLyrics,
        hasLyrics: lyrics.hasLyrics,
        isLoading: false,
        currentLineIndex: 0
      });
    } catch {
      setIfLatest({ ...initialState, isLoading: false });
    }
  },
  updateCurrentLine: (time) => {
    const { lines, currentLineIndex } = get();
    if (!lines.length) return;
    let next = 0;
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index].timestamp <= time) next = index;
      else break;
    }
    if (next !== currentLineIndex) set({ currentLineIndex: next });
  }
}));

export const lyricsInternals = { fetchLrclibLyrics, parseSyncedLyrics };
