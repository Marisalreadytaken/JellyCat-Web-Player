import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Track } from "@domain/types";
import { jellyfinClient } from "@core/jellyfin";
import { usePlayerStore } from "@core/player/audioService";
import { CheckerStrip, EmptyState, JButton, LoadingState, TrackRow, icons } from "@shared/ui";
import { SONGS_CACHE_TIME_MS, SONGS_PAGE_SIZE } from "../constants";
import { loadSongsSort, songSortOptions, songsLimitModeKey, songsSortKey, type SongSortOption } from "../songsPreferences";
import { BackHeader } from "../components/BackHeader";

export function SongsView() {
  const [sort, setSort] = useState<SongSortOption>(() => loadSongsSort());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isLimited, setIsLimited] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(songsLimitModeKey) !== "limitless";
  });
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();
  const tracksQuery = useQuery({
    queryKey: ["songs", sort.value, sort.order, favoritesOnly, isLimited, page],
    queryFn: () => jellyfinClient.getTracksPage({
      sortBy: sort.value,
      sortOrder: sort.order,
      favoritesOnly,
      startIndex: isLimited ? page * SONGS_PAGE_SIZE : undefined,
      limit: isLimited ? SONGS_PAGE_SIZE : undefined
    }),
    placeholderData: (previousData) => previousData,
    staleTime: SONGS_CACHE_TIME_MS,
    gcTime: SONGS_CACHE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
  const tracks = tracksQuery.data?.tracks ?? [];
  const totalTracks = tracksQuery.data?.total ?? tracks.length;
  const pageCount = Math.max(1, Math.ceil(totalTracks / SONGS_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleTracks = tracks;
  const displayedStart = totalTracks ? safePage * SONGS_PAGE_SIZE + 1 : 0;
  const displayedEnd = isLimited ? Math.min((safePage + 1) * SONGS_PAGE_SIZE, totalTracks) : totalTracks;

  useEffect(() => {
    setPage(0);
  }, [favoritesOnly, isLimited, sort.value]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    localStorage.setItem(songsLimitModeKey, isLimited ? "limit" : "limitless");
  }, [isLimited]);

  useEffect(() => {
    localStorage.setItem(songsSortKey, sort.value);
  }, [sort.value]);

  const toggleFavorite = async (track: Track) => {
    await jellyfinClient.updateFavoriteStatus(track.id, !track.isFavorite);
    await queryClient.invalidateQueries({ queryKey: ["songs"] });
  };

  const deleteTrack = async (track: Track) => {
    if (!window.confirm(`Delete ${track.title} from the Jellyfin server?`)) return;
    await jellyfinClient.deleteItem(track.id);
    await queryClient.invalidateQueries({ queryKey: ["songs"] });
  };

  return (
    <main className="screen">
      <BackHeader title="SONGS" />
      <CheckerStrip />
      <div className="j-section">
        <span>{favoritesOnly ? "FAVORITES" : "LIBRARY"}</span>
        <div className="section-actions">
          <span className="section-pill">// {isLimited ? `${displayedStart}-${displayedEnd} / ` : ""}{totalTracks} TRACKS</span>
          <JButton icon={icons.filter} accent={!isLimited} onClick={() => setIsLimited((value) => !value)}>
            {isLimited ? "LIMIT 200" : "LIMITLESS"}
          </JButton>
        </div>
      </div>
      <div className="action-row">
        <JButton icon={icons.play} onClick={() => visibleTracks.length && usePlayerStore.getState().play(visibleTracks, 0)} disabled={!visibleTracks.length}>PLAY</JButton>
        <JButton icon={icons.shuffle} onClick={() => visibleTracks.length && usePlayerStore.getState().play([...visibleTracks].sort(() => Math.random() - 0.5), 0)} disabled={!visibleTracks.length}>SHUFFLE</JButton>
        <JButton icon={icons.heart} accent={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}>FAVORITES</JButton>
        <select className="form-select" style={{ maxWidth: 180 }} value={sort.value} onChange={(event) => setSort(songSortOptions.find((option) => option.value === event.target.value) ?? songSortOptions[0])}>
          {songSortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {isLimited ? (
          <div className="page-controls">
            <JButton icon={icons.arrowLeft} disabled={safePage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>PREV</JButton>
            <span>PAGE {safePage + 1} / {pageCount}</span>
            <JButton icon={icons.arrowRight} disabled={safePage >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>NEXT</JButton>
          </div>
        ) : null}
      </div>
      {tracksQuery.isLoading ? <LoadingState label="LOADING TRACKS" /> : tracksQuery.error ? <EmptyState label={(tracksQuery.error as Error).message} /> : visibleTracks.map((track, index) => (
        <TrackRow key={track.id} track={track} index={index} contextTracks={visibleTracks} onFavorite={toggleFavorite} onDelete={deleteTrack} />
      ))}
      <div style={{ height: 120 }} />
    </main>
  );
}
