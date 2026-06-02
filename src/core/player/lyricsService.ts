import { create } from "zustand";
import type { LyricLine, LyricsState, Track } from "@domain/types";
import { ticksToSeconds } from "@domain/types";

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

export const useLyricsStore = create<LyricsStore>((set, get) => ({
  ...initialState,
  fetchLyrics: async (track) => {
    set({ ...initialState, isLoading: true });
    const params = new URLSearchParams({
      artist_name: track.artistName,
      album_name: track.albumName,
      track_name: track.title,
      duration: String(Math.round(ticksToSeconds(track.durationTicks)))
    });
    try {
      const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
      if (!response.ok) {
        set({ ...initialState, isLoading: false });
        return;
      }
      const data = (await response.json()) as { syncedLyrics?: string; plainLyrics?: string };
      const lines = data.syncedLyrics ? parseSyncedLyrics(data.syncedLyrics) : [];
      set({
        lines,
        plainLyrics: lines.length ? "" : data.plainLyrics ?? "",
        hasLyrics: lines.length > 0 || Boolean(data.plainLyrics),
        isLoading: false,
        currentLineIndex: 0
      });
    } catch {
      set({ ...initialState, isLoading: false });
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

export const lyricsInternals = { parseSyncedLyrics };
