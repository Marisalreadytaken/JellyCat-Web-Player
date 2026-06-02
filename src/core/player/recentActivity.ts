import { create } from "zustand";
import type { Album, Playlist, RecentItem } from "@domain/types";
import { preferenceStorage } from "@core/storage/storage";

interface RecentActivityStore {
  items: RecentItem[];
  trackAlbum: (album: Album) => void;
  trackPlaylist: (playlist: Playlist) => void;
  clear: () => void;
}

function updateRecent(items: RecentItem[], item: RecentItem): RecentItem[] {
  return [item, ...items.filter((existing) => existing.id !== item.id)].slice(0, 5);
}

export const useRecentActivityStore = create<RecentActivityStore>((set, get) => ({
  items: preferenceStorage.loadRecentActivity(),
  trackAlbum: (album) => {
    const item: RecentItem = {
      id: album.id,
      name: album.name,
      artistName: album.artistName,
      artworkId: album.artworkId,
      artworkTag: album.artworkTag,
      format: album.format,
      type: "album",
      lastPlayed: new Date().toISOString()
    };
    const items = updateRecent(get().items, item);
    preferenceStorage.saveRecentActivity(items);
    set({ items });
  },
  trackPlaylist: (playlist) => {
    const item: RecentItem = {
      id: playlist.id,
      name: playlist.name,
      artworkId: playlist.artworkId,
      artworkTag: playlist.artworkTag,
      type: "playlist",
      lastPlayed: new Date().toISOString()
    };
    const items = updateRecent(get().items, item);
    preferenceStorage.saveRecentActivity(items);
    set({ items });
  },
  clear: () => {
    preferenceStorage.saveRecentActivity([]);
    set({ items: [] });
  }
}));
