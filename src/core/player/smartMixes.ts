import type { SmartMixDefinition, SmartMixId, SmartMixResult, Track } from "@domain/types";
import { jellyfinClient } from "@core/jellyfin";

const pageSize = 500;
const shuffleCandidateCap = 500;
const recentlyAddedCap = 100;
const maxUnplayedPages = 4;

export const smartMixDefinitions: SmartMixDefinition[] = [
  { id: "favorites", title: "FAVORITES MIX", description: "Shuffle your favorite tracks." },
  { id: "recently-added", title: "RECENTLY ADDED", description: "Newest tracks in your library." },
  { id: "unplayed", title: "UNPLAYED", description: "Tracks with no Jellyfin plays yet." },
  { id: "artist-radio", title: "ARTIST RADIO", description: "Shuffle more from the current artist." }
];

function shuffleTracks(tracks: Track[]): Track[] {
  return [...tracks].sort(() => Math.random() - 0.5);
}

function definitionFor(id: SmartMixId): SmartMixDefinition {
  const definition = smartMixDefinitions.find((item) => item.id === id);
  if (!definition) throw new Error(`Unknown smart mix: ${id}`);
  return definition;
}

async function favoriteMix(): Promise<Track[]> {
  const page = await jellyfinClient.getTracksPage({
    sortBy: "SortName",
    sortOrder: "Ascending",
    favoritesOnly: true,
    limit: shuffleCandidateCap,
    startIndex: 0
  });
  return shuffleTracks(page.tracks);
}

async function recentlyAddedMix(): Promise<Track[]> {
  const page = await jellyfinClient.getTracksPage({
    sortBy: "DateCreated",
    sortOrder: "Descending",
    limit: recentlyAddedCap,
    startIndex: 0
  });
  return page.tracks;
}

async function unplayedMix(): Promise<Track[]> {
  const candidates: Track[] = [];
  for (let pageIndex = 0; pageIndex < maxUnplayedPages && candidates.length < shuffleCandidateCap; pageIndex += 1) {
    const page = await jellyfinClient.getTracksPage({
      sortBy: "SortName",
      sortOrder: "Ascending",
      limit: pageSize,
      startIndex: pageIndex * pageSize
    });
    candidates.push(...page.tracks.filter((track) => !track.playCount).slice(0, shuffleCandidateCap - candidates.length));
    if (!page.tracks.length || page.tracks.length < pageSize) break;
  }
  return shuffleTracks(candidates);
}

async function artistRadioMix(artistId?: string): Promise<Track[]> {
  if (!artistId) return [];
  return shuffleTracks((await jellyfinClient.getArtistTracks(artistId)).slice(0, shuffleCandidateCap));
}

export async function buildSmartMix(id: SmartMixId, options: { artistId?: string } = {}): Promise<SmartMixResult> {
  const tracks = id === "favorites"
    ? await favoriteMix()
    : id === "recently-added"
      ? await recentlyAddedMix()
      : id === "unplayed"
        ? await unplayedMix()
        : await artistRadioMix(options.artistId);

  return {
    definition: definitionFor(id),
    tracks,
    generatedAt: new Date().toISOString()
  };
}

export const smartMixInternals = {
  pageSize,
  shuffleCandidateCap,
  recentlyAddedCap,
  maxUnplayedPages,
  shuffleTracks
};
