import { Link } from "react-router-dom";
import type { Artist, Playlist, Track } from "@domain/types";
import { formatDuration, ticksToSeconds } from "@domain/types";
import { usePlayerStore } from "@core/player/audioService";
import { Artwork } from "./artwork";
import { icons } from "./icons";
import { Badge, IconButton } from "./primitives";

export function ArtistRow({ artist }: { artist: Artist }) {
  return (
    <Link className="row" to={`/library/artists/${encodeURIComponent(artist.id)}`}>
      <Artwork className="artist-row-artwork" itemId={artist.artworkId} tag={artist.artworkTag} icon={icons.artist} maxHeight={96} />
      <div className="row-main">
        <div className="row-title">{artist.name}</div>
        <div className="row-subtitle">{artist.albumCount ?? 0} albums</div>
      </div>
    </Link>
  );
}

export function PlaylistRow({ playlist }: { playlist: Playlist }) {
  return (
    <Link className="row" to={`/library/playlists/${encodeURIComponent(playlist.id)}`}>
      <Artwork className="playlist-row-artwork" itemId={playlist.artworkId ?? playlist.id} tag={playlist.artworkTag} icon={icons.playlist} maxHeight={300} />
      <div className="row-main">
        <div className="row-title">{playlist.name}</div>
        <div className="row-subtitle">{playlist.trackCount ?? 0} tracks</div>
      </div>
    </Link>
  );
}

export function TrackRow({
  track,
  index,
  contextTracks,
  onFavorite,
  onDelete,
  onRemoveFromPlaylist
}: {
  track: Track;
  index: number;
  contextTracks: Track[];
  onFavorite?: (track: Track) => void | Promise<void>;
  onDelete?: (track: Track) => void | Promise<void>;
  onRemoveFromPlaylist?: (track: Track) => void | Promise<void>;
}) {
  const player = usePlayerStore();
  const isPlaying = player.currentTrack?.id === track.id;
  const artworkId = track.artworkItemId ?? track.albumId;

  return (
    <div className={`row ${isPlaying ? "playing" : ""}`}>
      <button className="artwork" style={{ width: 38, height: 38, padding: 0 }} onClick={() => player.play(contextTracks, index)} aria-label={`Play ${track.title}`}>
        <Artwork className="artwork" itemId={artworkId} tag={track.artworkTag} maxHeight={96} />
      </button>
      <div className="row-main" role="button" tabIndex={0} onClick={() => player.play(contextTracks, index)}>
        <div className="row-title">{track.title}</div>
        <div className="row-subtitle">{track.artistName} / {formatDuration(ticksToSeconds(track.durationTicks))}</div>
      </div>
      <Badge text={track.container?.toUpperCase()} />
      <div className="row-actions">
        <IconButton label="Play next" icon={icons.skip} onClick={() => player.playNext(track)} />
        {onFavorite ? <IconButton label={track.isFavorite ? "Unfavorite" : "Favorite"} icon={icons.heart} active={track.isFavorite} onClick={() => void onFavorite(track)} /> : null}
        {onRemoveFromPlaylist ? <IconButton label="Remove from playlist" icon={icons.playlist} onClick={() => void onRemoveFromPlaylist(track)} /> : null}
        {onDelete ? <IconButton label="Delete" icon={icons.trash} onClick={() => void onDelete(track)} /> : null}
      </div>
    </div>
  );
}
