export type JellyfinItemNode = {
  Id: string;
  Name: string;
  Type?: string;
  AlbumArtist?: string;
  ProductionYear?: number;
  ChildCount?: number;
  AlbumId?: string;
  AlbumPrimaryImageTag?: string;
  Artists?: string[];
  Album?: string;
  RunTimeTicks?: number;
  ImageTags?: Record<string, string>;
  PlaylistItemId?: string;
  UserData?: { IsFavorite?: boolean; PlayCount?: number };
  Container?: string;
  MediaSources?: Array<{ Container?: string; Bitrate?: number }>;
  DateCreated?: string;
  CollectionType?: string;
};

export type ItemsResponse = { Items: JellyfinItemNode[]; TotalRecordCount?: number };

export type TracksPage = {
  tracks: import("@domain/types").Track[];
  total: number;
};

export type ServerCheckResult = {
  ok: boolean;
  diagnostic?: string;
};

export type JellyfinLyricsResponse = {
  Lyrics?: Array<{
    Text?: string;
    Start?: number | null;
  }>;
};
