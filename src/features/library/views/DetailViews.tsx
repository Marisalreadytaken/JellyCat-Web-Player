import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import type { Track } from "@domain/types";
import { jellyfinClient } from "@core/jellyfin";
import { usePlayerStore } from "@core/player/audioService";
import { useRecentActivityStore } from "@core/player/recentActivity";
import { AlbumCard, Badge, EmptyState, IconButton, JButton, LoadingState, Section, TrackRow, icons } from "@shared/ui";
import { playlistLimitModeKey, playlistSortKey, loadPlaylistSort, SONGS_PAGE_SIZE, type PlaylistSort } from "../constants";
import { AddSongsModal } from "../components/AddSongsModal";
import { PlaylistArtwork } from "../components/PlaylistArtwork";

export function AlbumDetailView() {
  const { albumId = "" } = useParams();
  const queryClient = useQueryClient();
  const player = usePlayerStore();
  const recent = useRecentActivityStore();
  const albumQuery = useQuery({
    queryKey: ["album", albumId, "metadata"],
    queryFn: async () => (await jellyfinClient.getAlbums(500)).find((album) => album.id === albumId)
  });
  const tracksQuery = useQuery({
    queryKey: ["album", albumId, "tracks"],
    queryFn: () => jellyfinClient.getAlbumTracks(albumId)
  });
  const album = albumQuery.data;
  const tracks = tracksQuery.data ?? [];

  const toggleFavorite = async (track: Track) => {
    await jellyfinClient.updateFavoriteStatus(track.id, !track.isFavorite);
    await queryClient.invalidateQueries({ queryKey: ["album", albumId, "tracks"] });
  };

  return (
    <main className="screen playlist-detail-screen">
      <div className="detail-topbar">
        <IconButton label="Back" icon={icons.back} onClick={() => history.back()} />
        <h1>ALBUM</h1>
      </div>
      <div className="playlist-detail-layout">
        <aside className="playlist-info-panel">
          <PlaylistArtwork itemId={album?.artworkId ?? albumId} tag={album?.artworkTag} icon={icons.album} />
          <div className="playlist-detail-copy">
            <p>ALBUM</p>
            <h2>{album?.name ?? "ALBUM"}</h2>
            <span>{album?.artistName ?? "UNKNOWN ARTIST"}</span>
            <span>{tracks.length} TRACKS</span>
            {album?.format ? <Badge text={album.format.toUpperCase()} /> : null}
          </div>
          <div className="playlist-detail-actions">
            <JButton icon={icons.play} accent disabled={!tracks.length} onClick={() => { if (tracks.length) { player.play(tracks, 0); if (album) recent.trackAlbum(album); } }}>PLAY ALL</JButton>
            <JButton icon={icons.shuffle} disabled={!tracks.length} onClick={() => { if (tracks.length) { player.play([...tracks].sort(() => Math.random() - 0.5), 0); if (album) recent.trackAlbum(album); } }}>SHUFFLE</JButton>
          </div>
        </aside>
        <section className="playlist-tracks-panel">
          <Section title={`TRACKLIST :: ${tracks.length} TRACKS`} />
          <div className="playlist-track-list">
            {tracksQuery.isLoading ? <LoadingState label="LOADING TRACKS" /> : tracks.map((track, index) => (
              <TrackRow key={track.id} track={track} index={index} contextTracks={tracks} onFavorite={toggleFavorite} onDelete={async (item) => {
                if (window.confirm(`Delete ${item.title} from the Jellyfin server?`)) {
                  await jellyfinClient.deleteItem(item.id);
                  await queryClient.invalidateQueries({ queryKey: ["album", albumId, "tracks"] });
                }
              }} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export function ArtistDetailView() {
  const { artistId = "" } = useParams();
  const navigate = useNavigate();
  const artistsQuery = useQuery({ queryKey: ["artists"], queryFn: () => jellyfinClient.getArtists() });
  const artist = artistsQuery.data?.find((item) => item.id === artistId);
  const albums = useQuery({
    queryKey: ["artist", artistId, "albums"],
    queryFn: () => jellyfinClient.getArtistAlbums(artistId)
  });
  const tracksQuery = useQuery({
    queryKey: ["artist", artistId, "tracks"],
    queryFn: () => jellyfinClient.getArtistTracks(artistId),
    enabled: Boolean(artistId)
  });
  const artistTracks = tracksQuery.data ?? [];
  return (
    <main className="screen playlist-detail-screen">
      <div className="detail-topbar">
        <IconButton label="Back" icon={icons.back} onClick={() => navigate(-1)} />
        <h1>ARTIST</h1>
      </div>
      <div className="playlist-detail-layout">
        <aside className="playlist-info-panel">
          <PlaylistArtwork itemId={artist?.artworkId} tag={artist?.artworkTag} icon={icons.artist} />
          <div className="playlist-detail-copy">
            <p>ARTIST</p>
            <h2>{artist?.name ?? "ARTIST"}</h2>
            <span>{albums.data?.length ?? 0} ALBUMS</span>
            <span>{artistTracks.length} TRACKS</span>
          </div>
          <div className="playlist-detail-actions">
            <JButton icon={icons.play} accent disabled={!artistTracks.length} onClick={() => { if (artistTracks.length) usePlayerStore.getState().play(artistTracks, 0); }}>PLAY ALL</JButton>
            <JButton icon={icons.shuffle} disabled={!artistTracks.length} onClick={() => { if (artistTracks.length) usePlayerStore.getState().play([...artistTracks].sort(() => Math.random() - 0.5), 0); }}>SHUFFLE</JButton>
          </div>
        </aside>
        <section className="playlist-tracks-panel">
          <Section title={`ALBUMS :: ${albums.data?.length ?? 0} RECORDS`} />
          {albums.isLoading ? <LoadingState label="LOADING ALBUMS" /> : albums.data?.length ? (
            <div className="grid-responsive">
              {albums.data.map((album) => <AlbumCard key={album.id} album={album} />)}
            </div>
          ) : <EmptyState label="NO ALBUMS FOUND" />}
        </section>
      </div>
    </main>
  );
}

export function PlaylistDetailView() {
  const { playlistId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<PlaylistSort>(() => loadPlaylistSort());
  const [isLimited, setIsLimited] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(playlistLimitModeKey) !== "limitless";
  });
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const playlists = useQuery({ queryKey: ["playlists"], queryFn: () => jellyfinClient.getPlaylists() });
  const tracksQuery = useQuery({
    queryKey: ["playlist", playlistId, "tracks", isLimited, page],
    queryFn: () => jellyfinClient.getPlaylistTracksPage(playlistId, {
      startIndex: isLimited ? page * SONGS_PAGE_SIZE : undefined,
      limit: isLimited ? SONGS_PAGE_SIZE : undefined
    }),
    placeholderData: (previousData) => previousData
  });
  const playlist = playlists.data?.find((item) => item.id === playlistId);
  const recent = useRecentActivityStore();
  const totalTracks = tracksQuery.data?.total ?? tracksQuery.data?.tracks.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalTracks / SONGS_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const displayedStart = totalTracks ? safePage * SONGS_PAGE_SIZE + 1 : 0;
  const displayedEnd = isLimited ? Math.min((safePage + 1) * SONGS_PAGE_SIZE, totalTracks) : totalTracks;

  const tracks = useMemo(() => {
    const source = tracksQuery.data?.tracks ?? [];
    if (sort === "name") return [...source].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "recent") return [...source].sort((a, b) => Date.parse(b.dateCreated ?? "") - Date.parse(a.dateCreated ?? ""));
    return source;
  }, [sort, tracksQuery.data?.tracks]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["playlist", playlistId, "tracks"] });

  useEffect(() => {
    setPage(0);
  }, [isLimited, playlistId, sort]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    localStorage.setItem(playlistLimitModeKey, isLimited ? "limit" : "limitless");
  }, [isLimited]);

  useEffect(() => {
    localStorage.setItem(playlistSortKey, sort);
  }, [sort]);

  const uploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await jellyfinClient.uploadPlaylistImage(playlistId, await file.arrayBuffer(), file.type);
    await queryClient.invalidateQueries({ queryKey: ["playlists"] });
  };

  const rename = async () => {
    if (!playlist) return;
    const next = window.prompt("New playlist name", playlist.name);
    if (!next?.trim()) return;
    await jellyfinClient.renamePlaylist(playlist.id, next.trim());
    await queryClient.invalidateQueries({ queryKey: ["playlists"] });
  };

  const removePlaylist = async () => {
    if (!playlist || !window.confirm(`Delete playlist ${playlist.name}?`)) return;
    await jellyfinClient.deletePlaylist(playlist.id);
    history.back();
  };

  return (
    <main className="screen playlist-detail-screen">
      <div className="detail-topbar">
        <IconButton label="Back" icon={icons.back} onClick={() => navigate(-1)} />
        <h1>PLAYLIST</h1>
      </div>
      <div className="playlist-detail-layout">
        <aside className="playlist-info-panel">
          <PlaylistArtwork itemId={playlist?.artworkId ?? playlistId} tag={playlist?.artworkTag} />
          <div className="playlist-detail-copy">
            <p>PLAYLIST</p>
            <h2>{playlist?.name ?? "PLAYLIST"}</h2>
            <span>{totalTracks} TRACKS</span>
          </div>
          <div className="playlist-detail-actions">
            <JButton icon={icons.play} accent disabled={!tracks.length} onClick={() => { if (tracks.length) { usePlayerStore.getState().play(tracks, 0); if (playlist) recent.trackPlaylist(playlist); } }}>PLAY ALL</JButton>
            <JButton icon={icons.shuffle} disabled={!tracks.length} onClick={() => { if (tracks.length) { usePlayerStore.getState().play([...tracks].sort(() => Math.random() - 0.5), 0); if (playlist) recent.trackPlaylist(playlist); } }}>SHUFFLE</JButton>
            <select className="form-select" value={sort} onChange={(event) => setSort(event.target.value as PlaylistSort)}>
              <option value="index">CUSTOM</option>
              <option value="name">NAME</option>
              <option value="recent">RECENT</option>
            </select>
            <JButton icon={icons.plus} onClick={() => setShowAdd(true)}>ADD SONGS</JButton>
            <label className="j-button">
              <icons.upload size={15} />
              COVER
              <input type="file" accept="image/*" hidden onChange={(event) => void uploadCover(event)} />
            </label>
            <JButton icon={icons.edit} onClick={() => void rename()}>RENAME</JButton>
            <JButton accent icon={icons.trash} onClick={() => void removePlaylist()}>DELETE</JButton>
          </div>
        </aside>
        <section className="playlist-tracks-panel">
          <div className="j-section">
            <span>TRACKLIST :: {isLimited ? `${displayedStart}-${displayedEnd} / ` : ""}{totalTracks} TRACKS</span>
            <div className="section-actions">
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
          <div className="playlist-track-list">
            {tracksQuery.isLoading ? <LoadingState label="LOADING TRACKS" /> : tracks.map((track, index) => (
              <TrackRow
                key={`${track.id}-${track.playlistItemId ?? index}`}
                track={track}
                index={index}
                contextTracks={tracks}
                onFavorite={async (item) => {
                  await jellyfinClient.updateFavoriteStatus(item.id, !item.isFavorite);
                  await invalidate();
                }}
                onDelete={async (item) => {
                  if (window.confirm(`Delete ${item.title} from the Jellyfin server?`)) {
                    await jellyfinClient.deleteItem(item.id);
                    await invalidate();
                  }
                }}
                onRemoveFromPlaylist={async (item) => {
                  if (item.playlistItemId) {
                    await jellyfinClient.removeTrackFromPlaylist(playlistId, item.playlistItemId);
                    await invalidate();
                  }
                }}
              />
            ))}
          </div>
        </section>
      </div>
      {showAdd ? <AddSongsModal playlistId={playlistId} onClose={() => setShowAdd(false)} onDone={() => void invalidate()} /> : null}
    </main>
  );
}
