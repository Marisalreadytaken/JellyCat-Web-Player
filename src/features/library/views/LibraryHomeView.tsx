import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@app/appStore";
import { jellyfinClient } from "@core/jellyfin";
import { usePlayerStore } from "@core/player/audioService";
import { AlbumCard, CheckerStrip, Divider, EmptyState, KofiButton, LibraryGridButton, LoadingState, Section, Ticker, icons } from "@shared/ui";

export function LibraryHomeView() {
  const navigate = useNavigate();
  const isOnline = useAppStore((state) => state.connection.isServerAvailable);
  const player = usePlayerStore();
  const recentAlbums = useQuery({
    queryKey: ["library", "recent-albums"],
    queryFn: () => jellyfinClient.getRecentAlbums(33),
    enabled: isOnline
  });

  return (
    <main className="screen">
      <div className="topbar">
        <h1>LIBRARY</h1>
        <KofiButton />
      </div>
      <CheckerStrip />
      <Ticker track={player.currentTrack} />
      <div className="grid-two">
        <LibraryGridButton to="/library/songs" title="SONGS" icon={icons.music} />
        <LibraryGridButton to="/library/playlists" title="PLAYLISTS" icon={icons.playlist} />
        <LibraryGridButton to="/library/albums" title="ALBUMS" icon={icons.album} />
        <LibraryGridButton to="/library/artists" title="ARTISTS" icon={icons.artist} />
      </div>
      <Divider />
      <Section title="ALBUMS :: RECENT" action="VIEW ALL" onAction={() => navigate("/library/albums")} />
      {!isOnline ? <EmptyState label="SERVER UNAVAILABLE" /> : recentAlbums.isLoading ? <LoadingState label="LOADING ALBUMS" /> : (
        <div className="grid-responsive">
          {recentAlbums.data?.map((album) => <AlbumCard key={album.id} album={album} />)}
        </div>
      )}
    </main>
  );
}
