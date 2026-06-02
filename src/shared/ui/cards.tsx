import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import type { Album, Artist, RecentItem } from "@domain/types";
import { Artwork } from "./artwork";
import { icons } from "./icons";

export function AlbumCard({ album }: { album: Album }) {
  return (
    <Link className="album-card" to={`/library/albums/${encodeURIComponent(album.id)}`}>
      <Artwork className="album-art" itemId={album.artworkId ?? album.id} tag={album.artworkTag} icon={icons.album} maxHeight={300} />
      <h3>{album.name}</h3>
      <p>{album.artistName}</p>
    </Link>
  );
}

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link className="album-card" to={`/library/artists/${encodeURIComponent(artist.id)}`}>
      <Artwork className="album-art" itemId={artist.artworkId} tag={artist.artworkTag} icon={icons.artist} maxHeight={300} />
      <h3>{artist.name}</h3>
      <p>{artist.albumCount ?? 0} albums</p>
    </Link>
  );
}

export function RecentItemCard({ item }: { item: RecentItem }) {
  const href = item.type === "album"
    ? `/library/albums/${encodeURIComponent(item.id)}`
    : `/library/playlists/${encodeURIComponent(item.id)}`;
  return (
    <Link className="recent-card" to={href}>
      <Artwork className="album-art" itemId={item.artworkId ?? item.id} tag={item.artworkTag} icon={item.type === "album" ? icons.album : icons.playlist} maxHeight={300} />
      <h3>{item.name}</h3>
      <p>{item.type === "album" ? item.artistName ?? "Album" : "Playlist"}</p>
    </Link>
  );
}

export function LibraryGridButton({ to, title, icon: Icon }: { to: string; title: string; icon: LucideIcon }) {
  return (
    <Link className="library-button" to={to}>
      <Icon size={28} />
      <span>{title}</span>
    </Link>
  );
}
