import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jellyfinClient } from "@core/jellyfin";
import { AlbumCard, ArtistCard, EmptyState, IconButton, LoadingState, PlaylistRow, Section, icons } from "@shared/ui";
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
  const playlists = useQuery({ queryKey: ["playlists"], queryFn: () => jellyfinClient.getPlaylists() });
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
        <IconButton label="New playlist" icon={icons.playlist} onClick={() => void createPlaylist()} />
      </div>
      <Section title="LIBRARY" action={playlists.data ? `// ${playlists.data.length} RECORDS` : undefined} />
      {playlists.isLoading ? <LoadingState label="LOADING PLAYLISTS" /> : playlists.error ? <EmptyState label={(playlists.error as Error).message} /> : playlists.data?.length ? (
        playlists.data.map((playlist) => <PlaylistRow key={playlist.id} playlist={playlist} />)
      ) : <EmptyState label="NO PLAYLISTS FOUND" />}
    </main>
  );
}
