import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { SearchResults, Track } from "@domain/types";
import { friendlyErrorMessage, jellyfinClient } from "@core/jellyfin";
import { preferenceStorage } from "@core/storage/storage";
import { AlbumCard, ArtistRow, CheckerStrip, EmptyState, IconButton, KofiButton, LoadingState, Section, TrackRow, icons } from "@shared/ui";

const emptyResults: SearchResults = { artists: [], albums: [], tracks: [] };

export function SearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [history, setHistory] = useState(preferenceStorage.loadSearchHistory());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(emptyResults);
      setIsLoading(false);
      setError(null);
      return undefined;
    }
    setIsLoading(true);
    const timer = window.setTimeout(() => {
      void jellyfinClient.search(trimmed).then((next) => {
        setResults(next);
        setError(null);
        const nextHistory = [trimmed, ...history.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 20);
        setHistory(nextHistory);
        preferenceStorage.saveSearchHistory(nextHistory);
      }).catch((err) => {
        setResults(emptyResults);
        setError(friendlyErrorMessage(err, "Search failed. Try again."));
      }).finally(() => setIsLoading(false));
    }, 360);
    return () => window.clearTimeout(timer);
  }, [query]);

  const hasResults = useMemo(
    () => results.artists.length || results.albums.length || results.tracks.length,
    [results]
  );

  const removeHistory = (item: string) => {
    const next = history.filter((entry) => entry !== item);
    setHistory(next);
    preferenceStorage.saveSearchHistory(next);
  };

  const clearHistory = () => {
    setHistory([]);
    preferenceStorage.saveSearchHistory([]);
  };

  return (
    <main className="screen">
      <div className="topbar">
        <h1>SEARCH</h1>
        <KofiButton />
        <span className="spacer" />
        <IconButton label="Clear" icon={icons.trash} onClick={() => setQuery("")} />
      </div>
      <Section title="LIBRARY" />
      <div style={{ padding: "0 14px 12px" }}>
        <input className="search-input" placeholder="TYPE TO SEARCH..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <CheckerStrip />
      {!query.trim() ? (
        history.length ? (
          <>
            <Section title="RECENT SEARCHES" action="CLEAR ALL" onAction={clearHistory} />
            {history.map((item) => (
              <div className="row" key={item}>
                <button className="row-main" style={{ border: 0, background: "transparent", textAlign: "left" }} onClick={() => setQuery(item)}>
                  <div className="row-title">{item}</div>
                </button>
                <IconButton label="Remove" icon={icons.trash} onClick={() => removeHistory(item)} />
              </div>
            ))}
          </>
        ) : <EmptyState label="ENTER QUERY TO SEARCH" />
      ) : isLoading ? <LoadingState label="SEARCHING" /> : error ? <EmptyState label={error} /> : !hasResults ? <EmptyState label="NO RESULTS FOUND" /> : (
        <SearchResultsView results={results} />
      )}
    </main>
  );
}

function SearchResultsView({ results }: { results: SearchResults }) {
  const [tracks, setTracks] = useState<Track[]>(results.tracks);

  useEffect(() => setTracks(results.tracks), [results.tracks]);

  const toggleFavorite = async (track: Track) => {
    await jellyfinClient.updateFavoriteStatus(track.id, !track.isFavorite);
    setTracks((current) => current.map((item) => item.id === track.id ? { ...item, isFavorite: !item.isFavorite } : item));
  };

  const deleteTrack = async (track: Track) => {
    if (!window.confirm(`Delete ${track.title} from the Jellyfin server?`)) return;
    await jellyfinClient.deleteItem(track.id);
    setTracks((current) => current.filter((item) => item.id !== track.id));
  };

  return (
    <>
      {results.artists.length ? (
        <>
          <Section title="ARTISTS" action={`// ${results.artists.length}`} />
          {results.artists.slice(0, 8).map((artist) => <ArtistRow key={artist.id} artist={artist} />)}
        </>
      ) : null}
      {results.albums.length ? (
        <>
          <Section title="ALBUMS" action={`// ${results.albums.length}`} />
          <div className="h-scroll">
            {results.albums.map((album) => <AlbumCard key={album.id} album={album} />)}
          </div>
        </>
      ) : null}
      {tracks.length ? (
        <>
          <Section title="TRACKS" action={`// ${tracks.length}`} />
          {tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              contextTracks={tracks}
              onFavorite={toggleFavorite}
              onDelete={deleteTrack}
            />
          ))}
        </>
      ) : null}
      <div style={{ height: 120 }} />
      <Link to="/library" className="j-button" style={{ margin: 14 }}>BACK TO LIBRARY</Link>
    </>
  );
}
