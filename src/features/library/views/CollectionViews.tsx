import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jellyfinClient } from "@core/jellyfin";
import { AlbumCard, ArtistCard, EmptyState, IconButton, JButton, LoadingState, PlaylistRow, Section, icons } from "@shared/ui";
import { playlistLimitModeKey, SONGS_PAGE_SIZE } from "../constants";
import { BackHeader } from "../components/BackHeader";

export function AlbumsView() {
  const albums = useQuery({ queryKey: ["albums"], queryFn: () => jellyfinClient.getAlbums() });
  return (
    <main className="screen">
      <BackHeader title="ALBUMS" />
      <Section title="ALBUMS" action={albums.data ? `// ${albums.data.length} RECORDS` : undefined} />
      {albums.isLoading ? <LoadingState label="LOADING ALBUMS" /> : albums.error ? <EmptyState label={(albums.error as Error).message} /> : (
        <div className="grid-responsive">
          {albums.data?.map((album) => <AlbumCard key={album.id} album={album} />)}
        </div>
      )}
    </main>
  );
}

export function ArtistsView() {
  const artists = useQuery({ queryKey: ["artists"], queryFn: () => jellyfinClient.getArtists() });
  return (
    <main className="screen">
      <BackHeader title="ARTISTS" />
      <Section title="ARTISTS" action={artists.data ? `// ${artists.data.length} RECORDS` : undefined} />
      {artists.isLoading ? <LoadingState label="LOADING ARTISTS" /> : artists.error ? <EmptyState label={(artists.error as Error).message} /> : artists.data?.length ? (
        <div className="grid-responsive">
          {artists.data.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}
        </div>
      ) : <EmptyState label="NO ARTISTS FOUND" />}
    </main>
  );
}

export function PlaylistsView() {
  const queryClient = useQueryClient();
  const [isLimited, setIsLimited] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(playlistLimitModeKey) !== "limitless";
  });
  const [page, setPage] = useState(0);
  const playlists = useQuery({
    queryKey: ["playlists", isLimited, page],
    queryFn: () => jellyfinClient.getPlaylistsPage({
      startIndex: isLimited ? page * SONGS_PAGE_SIZE : undefined,
      limit: isLimited ? SONGS_PAGE_SIZE : undefined
    }),
    placeholderData: (previousData) => previousData
  });
  const visiblePlaylists = playlists.data?.playlists ?? [];
  const totalPlaylists = playlists.data?.total ?? visiblePlaylists.length;
  const pageCount = Math.max(1, Math.ceil(totalPlaylists / SONGS_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const displayedStart = totalPlaylists ? safePage * SONGS_PAGE_SIZE + 1 : 0;
  const displayedEnd = isLimited ? Math.min((safePage + 1) * SONGS_PAGE_SIZE, totalPlaylists) : totalPlaylists;

  useEffect(() => {
    setPage(0);
  }, [isLimited]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    localStorage.setItem(playlistLimitModeKey, isLimited ? "limit" : "limitless");
  }, [isLimited]);

  const createPlaylist = async () => {
    const name = window.prompt("Playlist name");
    if (!name?.trim()) return;
    await jellyfinClient.createPlaylist(name.trim());
    await queryClient.invalidateQueries({ queryKey: ["playlists"] });
  };
  return (
    <main className="screen">
      <div className="topbar">
        <IconButton label="Back" icon={icons.back} onClick={() => history.back()} />
        <h1>PLAYLISTS</h1>
        <span className="spacer" />
        <IconButton label="New playlist" icon={icons.plus} onClick={() => void createPlaylist()} />
      </div>
      <div className="j-section">
        <span>LIBRARY</span>
        <div className="section-actions">
          <span className="section-pill">// {isLimited ? `${displayedStart}-${displayedEnd} / ` : ""}{totalPlaylists} RECORDS</span>
          <JButton icon={icons.filter} accent={!isLimited} onClick={() => setIsLimited((value) => !value)}>
            {isLimited ? "LIMIT 200" : "LIMITLESS"}
          </JButton>
        </div>
      </div>
      {isLimited ? (
        <div className="action-row">
          <div className="page-controls">
            <JButton icon={icons.arrowLeft} disabled={safePage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>PREV</JButton>
            <span>PAGE {safePage + 1} / {pageCount}</span>
            <JButton icon={icons.arrowRight} disabled={safePage >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>NEXT</JButton>
          </div>
        </div>
      ) : null}
      {playlists.isLoading ? <LoadingState label="LOADING PLAYLISTS" /> : playlists.error ? <EmptyState label={(playlists.error as Error).message} /> : visiblePlaylists.length ? (
        visiblePlaylists.map((playlist) => <PlaylistRow key={playlist.id} playlist={playlist} />)
      ) : <EmptyState label="NO PLAYLISTS FOUND" />}
    </main>
  );
}
