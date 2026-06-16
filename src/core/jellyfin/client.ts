import { Jellyfin } from "@jellyfin/sdk";
import type { Album, Artist, AuthSession, LyricsPayload, Playlist, SearchResults, Track } from "@domain/types";
import { normalizeBaseUrl } from "@domain/types";
import { JellyfinRequestError, maybeCorsDiagnostic } from "./errors";
import { arrayBufferToBase64, detectMimeType } from "./media";
import { mapAlbum, mapArtist, mapLyrics, mapPlaylist, mapTrack } from "./mappers";
import { encodeQuery } from "./query";
import type { ItemsResponse, JellyfinLyricsResponse, ServerCheckResult, TracksPage } from "./types";
import { appVersion } from "@core/version";

const clientInfo = { name: "JellyCat Web", version: appVersion };
const deviceIdKey = "jellycat:web:deviceId";
const maxSearchVariants = 5;
const looseSearchLimit = 1000;
const looseArtistSearchLimit = 500;
const looseSearchResultLimit = 50;

function createDeviceId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `jellycat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function getDeviceId(): string {
  const existing = localStorage.getItem(deviceIdKey);
  if (existing) return existing;
  const next = createDeviceId();
  localStorage.setItem(deviceIdKey, next);
  return next;
}

function tidySearchQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

function addUniqueSearchVariant(variants: string[], query: string): void {
  const normalized = tidySearchQuery(query);
  if (!normalized) return;
  if (variants.some((item) => item.toLowerCase() === normalized.toLowerCase())) return;
  if (variants.length < maxSearchVariants) variants.push(normalized);
}

function buildSearchVariants(query: string): string[] {
  const variants: string[] = [];
  const base = tidySearchQuery(query);
  addUniqueSearchVariant(variants, base);

  const punctuationLoose = tidySearchQuery(base.replace(/[^\p{L}\p{N}&]+/gu, " "));
  addUniqueSearchVariant(variants, punctuationLoose);

  const withAmpersand = tidySearchQuery(punctuationLoose.replace(/\band\b/gi, "&"));
  addUniqueSearchVariant(variants, withAmpersand);

  const withAnd = tidySearchQuery(punctuationLoose.replace(/&/g, " and "));
  addUniqueSearchVariant(variants, withAnd);

  const withoutConnector = tidySearchQuery(withAnd.replace(/\band\b/gi, " "));
  addUniqueSearchVariant(variants, withoutConnector);

  const withApostrophes = tidySearchQuery(punctuationLoose.replace(/\b(\p{L}+)nt\b/giu, (match, prefix: string) => {
    return match === match.toUpperCase() ? `${prefix}N'T` : `${prefix}n't`;
  }));
  addUniqueSearchVariant(variants, withApostrophes);

  return variants;
}

function looseSearchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function looseSearchTokens(query: string): string[] {
  const key = looseSearchKey(query).replace(/\band\b/g, " ");
  return Array.from(new Set(key.split(" ").filter((token) => token.length >= 2)));
}

function looseMatches(query: string, values: string[]): boolean {
  const tokens = looseSearchTokens(query);
  if (!tokens.length) return false;
  const key = looseSearchKey(values.filter(Boolean).join(" "));
  return tokens.every((token) => key.includes(token));
}

function mergeSearchResults(resultSets: SearchResults[]): SearchResults {
  const merged: SearchResults = { artists: [], albums: [], tracks: [] };
  const artists = new Set<string>();
  const albums = new Set<string>();
  const tracks = new Set<string>();

  for (const results of resultSets) {
    for (const artist of results.artists) {
      if (artists.has(artist.id)) continue;
      artists.add(artist.id);
      merged.artists.push(artist);
    }
    for (const album of results.albums) {
      if (albums.has(album.id)) continue;
      albums.add(album.id);
      merged.albums.push(album);
    }
    for (const track of results.tracks) {
      if (tracks.has(track.id)) continue;
      tracks.add(track.id);
      merged.tracks.push(track);
    }
  }

  return merged;
}

class JellyfinClient {
  private session: AuthSession | null = null;
  private musicLibraryId?: string;
  private readonly sdk = new Jellyfin({
    clientInfo,
    deviceInfo: { name: "Browser", id: getDeviceId() }
  });

  setSession(session: AuthSession): void {
    this.session = { ...session, serverUrl: normalizeBaseUrl(session.serverUrl) };
    this.sdk.createApi(this.session.serverUrl, this.session.accessToken);
  }

  clearSession(): void {
    this.session = null;
    this.musicLibraryId = undefined;
  }

  getSession(): AuthSession | null {
    return this.session;
  }

  async authenticate(serverUrl: string, username: string, password: string): Promise<AuthSession> {
    const baseURL = normalizeBaseUrl(serverUrl);
    const response = await fetch(`${baseURL}/Users/AuthenticateByName`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emby-Authorization": `MediaBrowser Client="${clientInfo.name}", Device="Browser", DeviceId="${getDeviceId()}", Version="${clientInfo.version}"`
      },
      body: JSON.stringify({ Username: username, Pw: password })
    }).catch((error: unknown) => {
      console.warn("Jellyfin authentication request failed.", error);
      throw new JellyfinRequestError(maybeCorsDiagnostic(error, baseURL));
    });

    if (!response.ok) {
      console.warn("Jellyfin authentication returned a non-success status.", response.status);
      throw new JellyfinRequestError(`Authentication failed (${response.status}). Check server URL, username, and password.`, response.status);
    }

    const data = (await response.json()) as { AccessToken: string; User: { Id: string; Name: string } };
    const session: AuthSession = {
      serverUrl: baseURL,
      userId: data.User.Id,
      username: data.User.Name,
      accessToken: data.AccessToken
    };
    this.setSession(session);
    return session;
  }

  async disconnect(): Promise<void> {
    this.clearSession();
  }

  async checkServerStatus(): Promise<ServerCheckResult> {
    const baseURL = this.session?.serverUrl;
    if (!baseURL) return { ok: false };
    try {
      const response = await fetch(`${baseURL}/System/Info/Public`, { signal: AbortSignal.timeout(5000) });
      return { ok: response.ok };
    } catch (error) {
      console.warn("Jellyfin server status check failed.", error);
      return { ok: false, diagnostic: maybeCorsDiagnostic(error, baseURL) };
    }
  }

  async getMusicLibraryId(): Promise<string> {
    if (this.musicLibraryId) return this.musicLibraryId;
    const data = await this.request<ItemsResponse>(`/Users/${this.requireSession().userId}/Views`);
    const musicView = data.Items.find((item) => item.CollectionType?.toLowerCase() === "music");
    if (!musicView) throw new Error("Music library not found on this Jellyfin server.");
    this.musicLibraryId = musicView.Id;
    return musicView.Id;
  }

  async getAlbums(limit = 300): Promise<Album[]> {
    const session = this.requireSession();
    const data = await this.request<ItemsResponse>(`/Users/${session.userId}/Items?${encodeQuery([
      ["includeItemTypes", "MusicAlbum"],
      ["recursive", "true"],
      ["sortBy", "SortName"],
      ["sortOrder", "Ascending"],
      ["fields", "PrimaryImageAspectRatio,DateCreated,ChildCount,Container,MediaSources"],
      ["limit", limit]
    ])}`);
    return data.Items.map(mapAlbum);
  }

  async getRecentAlbums(limit = 12): Promise<Album[]> {
    const session = this.requireSession();
    const parentId = await this.getMusicLibraryId().catch(() => undefined);
    const data = await this.request<ItemsResponse>(`/Users/${session.userId}/Items?${encodeQuery([
      ["includeItemTypes", "MusicAlbum"],
      ["recursive", "true"],
      ["sortBy", "DateCreated"],
      ["sortOrder", "Descending"],
      ["fields", "PrimaryImageAspectRatio,DateCreated,ChildCount,Container,MediaSources"],
      ["limit", limit],
      ["parentId", parentId]
    ])}`);
    return data.Items.map(mapAlbum);
  }

  async getArtists(limit = 300): Promise<Artist[]> {
    const session = this.requireSession();
    const data = await this.request<ItemsResponse>(`/Users/${session.userId}/Items?${encodeQuery([
      ["includeItemTypes", "MusicArtist"],
      ["recursive", "true"],
      ["sortBy", "SortName"],
      ["sortOrder", "Ascending"],
      ["fields", "ChildCount,PrimaryImageAspectRatio"],
      ["limit", limit]
    ])}`);
    return data.Items.map(mapArtist);
  }

  async getArtistAlbums(artistId: string): Promise<Album[]> {
    const session = this.requireSession();
    const data = await this.request<ItemsResponse>(`/Users/${session.userId}/Items?${encodeQuery([
      ["parentId", artistId],
      ["includeItemTypes", "MusicAlbum"],
      ["recursive", "true"],
      ["sortBy", "ProductionYear"],
      ["sortOrder", "Descending"],
      ["fields", "Container,PrimaryImageAspectRatio"]
    ])}`);
    return data.Items.map(mapAlbum);
  }

  async getArtistTracks(artistId: string): Promise<Track[]> {
    const session = this.requireSession();
    const data = await this.request<ItemsResponse>(`/Users/${session.userId}/Items?${encodeQuery([
      ["artistIds", artistId],
      ["includeItemTypes", "Audio"],
      ["recursive", "true"],
      ["sortBy", "Album,ParentIndexNumber,IndexNumber,SortName"],
      ["sortOrder", "Ascending"],
      ["fields", "PrimaryImageAspectRatio,ParentId,AlbumId,AlbumPrimaryImageTag,ArtistItems,Container,MediaSources,PlayCount,DateCreated"]
    ])}`);
    return data.Items.map((item) => mapTrack(item));
  }

  async getPlaylists(): Promise<Playlist[]> {
    return (await this.getPlaylistsPage()).playlists;
  }

  async getPlaylistsPage({ limit, startIndex }: { limit?: number; startIndex?: number } = {}): Promise<{ playlists: Playlist[]; total: number }> {
    const session = this.requireSession();
    const data = await this.request<ItemsResponse>(`/Users/${session.userId}/Items?${encodeQuery([
      ["includeItemTypes", "Playlist"],
      ["recursive", "true"],
      ["sortBy", "SortName"],
      ["sortOrder", "Ascending"],
      ["fields", "ChildCount,PrimaryImageAspectRatio"],
      ["startIndex", startIndex],
      ["limit", limit]
    ])}`);
    const playlists = data.Items.map(mapPlaylist);
    return { playlists, total: data.TotalRecordCount ?? playlists.length };
  }

  async createPlaylist(name: string): Promise<string> {
    const session = this.requireSession();
    const created = await this.request<{ Id?: string }>(`/Playlists?${encodeQuery([
      ["name", name],
      ["userId", session.userId],
      ["mediaType", "Audio"]
    ])}`, { method: "POST", acceptJson: true });
    if (!created.Id) throw new Error("Jellyfin did not return the created playlist ID.");
    return created.Id;
  }

  async renamePlaylist(playlistId: string, newName: string): Promise<string> {
    const tracks = await this.getPlaylistTracks(playlistId);
    const cover = await this.fetchArtworkBytes(playlistId).catch(() => null);
    await this.deletePlaylist(playlistId);
    const newId = await this.createPlaylist(newName);
    if (tracks.length) await this.addTracksToPlaylist(newId, tracks.map((track) => track.id));
    if (cover) await this.uploadPlaylistImage(newId, cover.buffer, cover.mimeType);
    return newId;
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await this.request(`/Items/${playlistId}`, { method: "DELETE" });
  }

  async uploadPlaylistImage(playlistId: string, imageData: ArrayBuffer, mimeType = detectMimeType(imageData)): Promise<void> {
    await this.request(`/Items/${playlistId}/Images/Primary`, {
      method: "POST",
      body: arrayBufferToBase64(imageData),
      contentType: mimeType
    });
  }

  async addTracksToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    const session = this.requireSession();
    await this.request(`/Playlists/${playlistId}/Items?${encodeQuery([
      ["ids", trackIds.join(",")],
      ["userId", session.userId]
    ])}`, { method: "POST", acceptJson: true });
  }

  async removeTrackFromPlaylist(playlistId: string, entryId: string): Promise<void> {
    await this.request(`/Playlists/${playlistId}/Items?${encodeQuery([["EntryIds", entryId]])}`, { method: "DELETE" });
  }

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    return (await this.getPlaylistTracksPage(playlistId)).tracks;
  }

  async getPlaylistTracksPage(playlistId: string, { limit, startIndex }: { limit?: number; startIndex?: number } = {}): Promise<TracksPage> {
    const session = this.requireSession();
    const data = await this.request<ItemsResponse>(`/Playlists/${playlistId}/Items?${encodeQuery([
      ["userId", session.userId],
      ["fields", "PrimaryImageAspectRatio,ParentId,AlbumId,AlbumPrimaryImageTag,ArtistItems,PlaylistItemId,Container,MediaSources,PlayCount,DateCreated"],
      ["startIndex", startIndex],
      ["limit", limit]
    ])}`);
    const tracks = data.Items.map((item) => mapTrack(item, playlistId));
    return { tracks, total: data.TotalRecordCount ?? tracks.length };
  }

  async getAlbumTracks(albumId: string): Promise<Track[]> {
    const session = this.requireSession();
    const data = await this.request<ItemsResponse>(`/Users/${session.userId}/Items?${encodeQuery([
      ["parentId", albumId],
      ["includeItemTypes", "Audio"],
      ["sortBy", "ParentIndexNumber,IndexNumber,SortName"],
      ["sortOrder", "Ascending"],
      ["fields", "ArtistItems,Container,MediaSources,PlayCount"]
    ])}`);
    return data.Items.map((item) => mapTrack(item, albumId));
  }

  async getTracksPage({
    sortBy = "SortName",
    sortOrder = "Ascending",
    limit,
    startIndex,
    favoritesOnly
  }: {
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    startIndex?: number;
    favoritesOnly?: boolean;
  } = {}): Promise<TracksPage> {
    const session = this.requireSession();
    const data = await this.request<ItemsResponse>(`/Users/${session.userId}/Items?${encodeQuery([
      ["includeItemTypes", "Audio"],
      ["recursive", "true"],
      ["sortBy", sortBy],
      ["sortOrder", sortOrder],
      ["fields", "PrimaryImageAspectRatio,ParentId,AlbumId,AlbumPrimaryImageTag,ArtistItems,Container,MediaSources,PlayCount,DateCreated"],
      ["filters", favoritesOnly ? "IsFavorite" : undefined],
      ["startIndex", startIndex],
      ["limit", limit]
    ])}`);
    const tracks = data.Items.map((item) => mapTrack(item));
    return { tracks, total: data.TotalRecordCount ?? tracks.length };
  }

  async getAllTracks(sortBy = "SortName", sortOrder = "Ascending", limit?: number): Promise<Track[]> {
    return (await this.getTracksPage({ sortBy, sortOrder, limit })).tracks;
  }

  async search(query: string): Promise<SearchResults> {
    const variants = buildSearchVariants(query);
    const results = await Promise.all([
      ...variants.map((variant) => this.searchExact(variant)),
      this.searchLoose(query)
    ]);
    return mergeSearchResults(results);
  }

  private async searchExact(query: string): Promise<SearchResults> {
    const session = this.requireSession();
    const data = await this.request<ItemsResponse>(`/Users/${session.userId}/Items?${encodeQuery([
      ["searchTerm", query],
      ["includeItemTypes", "MusicAlbum,MusicArtist,Audio"],
      ["recursive", "true"],
      ["limit", "50"],
      ["fields", "PrimaryImageAspectRatio,ArtistItems,Container,MediaSources,PlayCount"]
    ])}`);
    const results: SearchResults = { artists: [], albums: [], tracks: [] };
    for (const item of data.Items) {
      if (item.Type === "MusicArtist") results.artists.push(mapArtist(item));
      if (item.Type === "MusicAlbum") results.albums.push(mapAlbum(item));
      if (item.Type === "Audio") results.tracks.push(mapTrack(item));
    }
    return results;
  }

  private async searchLoose(query: string): Promise<SearchResults> {
    if (looseSearchTokens(query).join("").length < 3) return { artists: [], albums: [], tracks: [] };

    const session = this.requireSession();
    const [artistData, mediaData] = await Promise.all([
      this.request<ItemsResponse>(`/Users/${session.userId}/Items?${encodeQuery([
        ["includeItemTypes", "MusicArtist"],
        ["recursive", "true"],
        ["sortBy", "SortName"],
        ["sortOrder", "Ascending"],
        ["limit", looseArtistSearchLimit],
        ["fields", "ChildCount,PrimaryImageAspectRatio"]
      ])}`),
      this.request<ItemsResponse>(`/Users/${session.userId}/Items?${encodeQuery([
        ["includeItemTypes", "MusicAlbum,Audio"],
        ["recursive", "true"],
        ["sortBy", "SortName"],
        ["sortOrder", "Ascending"],
        ["limit", looseSearchLimit],
        ["fields", "PrimaryImageAspectRatio,ArtistItems,Container,MediaSources,PlayCount"]
      ])}`)
    ]);

    const results: SearchResults = { artists: [], albums: [], tracks: [] };
    for (const item of artistData.Items) {
      if (item.Type === "MusicArtist" && results.artists.length < looseSearchResultLimit && looseMatches(query, [item.Name])) {
        results.artists.push(mapArtist(item));
      }
    }
    for (const item of mediaData.Items) {
      if (item.Type === "MusicAlbum" && results.albums.length < looseSearchResultLimit && looseMatches(query, [item.Name, item.AlbumArtist ?? ""])) {
        results.albums.push(mapAlbum(item));
      }
      if (item.Type === "Audio" && results.tracks.length < looseSearchResultLimit && looseMatches(query, [item.Name, item.Album ?? "", ...(item.Artists ?? [])])) {
        results.tracks.push(mapTrack(item));
      }
    }

    return results;
  }

  async getLyrics(trackId: string): Promise<LyricsPayload | null> {
    const data = await this.request<JellyfinLyricsResponse>(`/Audio/${trackId}/Lyrics`);
    return mapLyrics(data);
  }

  getStreamUrl(trackId: string): string {
    const session = this.requireSession();
    return `${session.serverUrl}/Audio/${trackId}/universal?${encodeQuery([
      ["api_key", session.accessToken],
      ["userId", session.userId],
      ["Container", "opus,mp3,aac,m4a,m4b,flac,webma,webm,wav,ogg"]
    ])}`;
  }

  artworkUrl(itemId: string, tag?: string, maxHeight = 500): string {
    const session = this.requireSession();
    return `${session.serverUrl}/Items/${itemId}/Images/Primary?${encodeQuery([
      ["api_key", session.accessToken],
      ["maxHeight", maxHeight],
      ["tag", tag]
    ])}`;
  }

  async updateFavoriteStatus(itemId: string, isFavorite: boolean): Promise<void> {
    const session = this.requireSession();
    await this.request(`/Users/${session.userId}/FavoriteItems/${itemId}`, {
      method: isFavorite ? "POST" : "DELETE"
    });
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.request(`/Items/${itemId}`, { method: "DELETE" });
  }

  async reportPlaybackStarted(trackId: string): Promise<void> {
    await this.request("/Sessions/Playing", {
      method: "POST",
      body: JSON.stringify({
        ItemId: trackId,
        AudioStreamIndex: 1,
        IsPaused: false,
        PositionTicks: 0,
        RepeatMode: "RepeatNone",
        PlayMethod: "Transcode"
      }),
      contentType: "application/json"
    }).catch(() => undefined);
  }

  async reportPlaybackProgress(trackId: string, positionSeconds: number, isPaused: boolean): Promise<void> {
    await this.request("/Sessions/Playing/Progress", {
      method: "POST",
      body: JSON.stringify({
        ItemId: trackId,
        PositionTicks: Math.floor(positionSeconds * 10_000_000),
        IsPaused: isPaused,
        PlayMethod: "Transcode"
      }),
      contentType: "application/json"
    }).catch(() => undefined);
  }

  async reportPlaybackStopped(trackId: string, positionSeconds: number): Promise<void> {
    await this.request("/Sessions/Playing/Stopped", {
      method: "POST",
      body: JSON.stringify({
        ItemId: trackId,
        PositionTicks: Math.floor(positionSeconds * 10_000_000),
        PlayMethod: "Transcode"
      }),
      contentType: "application/json"
    }).catch(() => undefined);
  }

  private async fetchArtworkBytes(itemId: string): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
    const response = await fetch(this.artworkUrl(itemId, undefined, 1000), {
      headers: this.authHeaders()
    });
    if (!response.ok) throw new Error("Artwork request failed.");
    const buffer = await response.arrayBuffer();
    return { buffer, mimeType: response.headers.get("content-type") ?? detectMimeType(buffer) };
  }

  private async request<T = void>(
    path: string,
    options: {
      method?: string;
      body?: BodyInit | null;
      contentType?: string;
      acceptJson?: boolean;
    } = {}
  ): Promise<T> {
    const session = this.requireSession();
    const response = await fetch(`${session.serverUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...this.authHeaders(),
        ...(options.contentType ? { "Content-Type": options.contentType } : {}),
        ...(options.acceptJson ? { Accept: "application/json" } : {})
      },
      body: options.body
    }).catch((error: unknown) => {
      console.warn("Jellyfin request failed before a response was received.", error);
      throw new JellyfinRequestError(maybeCorsDiagnostic(error, session.serverUrl));
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn("Jellyfin request returned a non-success status.", {
        status: response.status,
        path,
        body
      });
      throw new JellyfinRequestError(`Jellyfin request failed (${response.status}). Try again or check server permissions.`, response.status, body);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) return (await response.json()) as T;
    return undefined as T;
  }

  private authHeaders(): Record<string, string> {
    const session = this.requireSession();
    return { Authorization: `MediaBrowser Token="${session.accessToken}"` };
  }

  private requireSession(): AuthSession {
    if (!this.session) throw new Error("JellyCat is not connected to a Jellyfin server.");
    return this.session;
  }
}

export const jellyfinClient = new JellyfinClient();
export const jellyfinInternals = {
  createDeviceId,
  mapTrack,
  mapAlbum,
  mapArtist,
  mapPlaylist,
  mapLyrics,
  encodeQuery,
  maybeCorsDiagnostic,
  buildSearchVariants,
  looseMatches,
  looseSearchKey,
  mergeSearchResults
};
