import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { AlbumCard, CheckerStrip, Divider, EmptyState, JButton, KofiButton, LoadingState, RecentItemCard, Section, StatusDot, Ticker, icons } from "@shared/ui";
import { useAppStore } from "@app/appStore";
import { jellyfinClient } from "@core/jellyfin";
import { usePlayerStore } from "@core/player/audioService";
import { useRecentActivityStore } from "@core/player/recentActivity";
import { loadSongsSort } from "../library/songsPreferences";

export function HomeView() {
  const navigate = useNavigate();
  const connection = useAppStore((state) => state.connection);
  const player = usePlayerStore();
  const recentItems = useRecentActivityStore((state) => state.items);
  const albumsQuery = useQuery({
    queryKey: ["home", "recent-albums"],
    queryFn: () => jellyfinClient.getRecentAlbums(12),
    enabled: connection.isServerAvailable
  });

  const shuffleAll = async () => {
    const tracks = await jellyfinClient.getAllTracks("SortName", "Ascending", 500);
    if (tracks.length) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      player.play(shuffled, 0);
    }
  };

  const shuffleFavorites = async () => {
    const tracks = (await jellyfinClient.getAllTracks("SortName", "Ascending", 500)).filter((track) => track.isFavorite);
    if (tracks.length) player.play(tracks.sort(() => Math.random() - 0.5), 0);
  };

  const playAll = async () => {
    const sort = loadSongsSort();
    const tracks = await jellyfinClient.getAllTracks(sort.value, sort.order);
    if (tracks.length) player.play(tracks, 0);
  };

  return (
    <main className="screen">
      <div className="topbar">
        <div className="brand-lockup">
          <strong>JELLYCAT</strong>
          <span className="cat-mark">{` /\\_/\\\n( o.o )`}</span>
        </div>
        <KofiButton />
        <span className="spacer" />
        <StatusDot online={connection.isServerAvailable} />
        <span className="row-subtitle">{connection.isServerAvailable ? "ONLINE" : "SERVER UNAVAILABLE"}</span>
        <Link to="/settings" className="icon-button" aria-label="Settings"><icons.settings size={17} /></Link>
      </div>
      <CheckerStrip />
      <Ticker track={player.currentTrack} />
      <div className="action-row">
        <JButton icon={icons.shuffle} onClick={() => void shuffleAll()}>SHUFFLE ALL</JButton>
        <JButton icon={icons.heart} onClick={() => void shuffleFavorites()} disabled={!connection.isServerAvailable}>SHUFFLE FAVORITES</JButton>
        <JButton icon={icons.play} onClick={() => void playAll()} disabled={!connection.isServerAvailable}>PLAY ALL</JButton>
      </div>
      <Divider />
      <Section title="ALBUMS :: RECENT" action="VIEW ALL" onAction={() => navigate("/library/albums")} />
      {albumsQuery.isLoading ? <LoadingState label="LOADING ALBUMS" /> : albumsQuery.data?.length ? (
        <div className="h-scroll">
          {albumsQuery.data.map((album) => <AlbumCard key={album.id} album={album} />)}
        </div>
      ) : <EmptyState label="NO RECORDS FOUND" />}
      <Divider />
      <Section title="LISTEN NOW" />
      {recentItems.length ? (
        <div className="h-scroll">
          {recentItems.map((item) => <RecentItemCard key={`${item.type}-${item.id}`} item={item} />)}
        </div>
      ) : <EmptyState label="NO RECENT ACTIVITY" />}
    </main>
  );
}
