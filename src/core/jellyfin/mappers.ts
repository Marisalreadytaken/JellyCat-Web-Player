import type { Album, Artist, Playlist, Track } from "@domain/types";
import type { JellyfinItemNode } from "./types";

function itemArtworkId(node: JellyfinItemNode): string | undefined {
  return node.ImageTags?.Primary ? node.Id : undefined;
}

export function mapAlbum(node: JellyfinItemNode): Album {
  return {
    id: node.Id,
    name: node.Name,
    artistName: node.AlbumArtist ?? "Unknown Artist",
    year: node.ProductionYear,
    artworkId: itemArtworkId(node),
    artworkTag: node.ImageTags?.Primary,
    trackCount: node.ChildCount,
    format: node.Container ?? node.MediaSources?.[0]?.Container
  };
}

export function mapArtist(node: JellyfinItemNode): Artist {
  return {
    id: node.Id,
    name: node.Name,
    artworkId: itemArtworkId(node),
    artworkTag: node.ImageTags?.Primary,
    albumCount: node.ChildCount
  };
}

export function mapPlaylist(node: JellyfinItemNode): Playlist {
  return {
    id: node.Id,
    name: node.Name,
    trackCount: node.ChildCount,
    artworkId: itemArtworkId(node),
    artworkTag: node.ImageTags?.Primary
  };
}

export function mapTrack(node: JellyfinItemNode, fallbackAlbumId?: string): Track {
  return {
    id: node.Id,
    title: node.Name,
    albumId: node.AlbumId ?? fallbackAlbumId ?? node.Id,
    artistName: node.Artists?.[0] ?? "Unknown Artist",
    albumName: node.Album ?? "Unknown Album",
    durationTicks: node.RunTimeTicks ?? 0,
    artworkItemId: itemArtworkId(node),
    artworkTag: node.ImageTags?.Primary ?? node.AlbumPrimaryImageTag,
    playlistItemId: node.PlaylistItemId,
    isFavorite: node.UserData?.IsFavorite ?? false,
    container: node.Container ?? node.MediaSources?.[0]?.Container,
    bitrate: node.MediaSources?.[0]?.Bitrate ? Math.round((node.MediaSources[0].Bitrate ?? 0) / 1000) : undefined,
    playCount: node.UserData?.PlayCount,
    dateCreated: node.DateCreated
  };
}
