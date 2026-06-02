export const songSortOptions = [
  { value: "SortName", label: "NAME", order: "Ascending" },
  { value: "DateCreated", label: "RECENTLY ADDED", order: "Descending" },
  { value: "Album", label: "ALBUM", order: "Ascending" },
  { value: "Artist", label: "ARTIST", order: "Ascending" }
] as const;

export type SongSortOption = (typeof songSortOptions)[number];

export const songsLimitModeKey = "jellycat:songs:limitMode";
export const songsSortKey = "jellycat:songs:sort";

export function loadSongsSort(): SongSortOption {
  if (typeof window === "undefined") return songSortOptions[0];
  const savedSort = localStorage.getItem(songsSortKey);
  return songSortOptions.find((option) => option.value === savedSort) ?? songSortOptions[0];
}
