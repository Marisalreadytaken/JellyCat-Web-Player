export const SONGS_PAGE_SIZE = 200;
export const SONGS_CACHE_TIME_MS = 30 * 60 * 1000;
export const playlistSortKey = "jellycat:playlist:sort";

export type PlaylistSort = "index" | "name" | "recent";

export function loadPlaylistSort(): PlaylistSort {
  if (typeof window === "undefined") return "index";
  const savedSort = localStorage.getItem(playlistSortKey);
  return savedSort === "name" || savedSort === "recent" || savedSort === "index" ? savedSort : "index";
}
