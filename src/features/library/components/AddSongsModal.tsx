import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { jellyfinClient } from "@core/jellyfin";
import { JButton, LoadingState, icons } from "@shared/ui";

export function AddSongsModal({ playlistId, onClose, onDone }: { playlistId: string; onClose: () => void; onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const tracks = useQuery({ queryKey: ["add-songs", "library"], queryFn: () => jellyfinClient.getAllTracks("SortName", "Ascending", 1000) });
  const displayed = (tracks.data ?? []).filter((track) => `${track.title} ${track.artistName}`.toLowerCase().includes(query.toLowerCase()));
  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const add = async () => {
    await jellyfinClient.addTracksToPlaylist(playlistId, Array.from(selected));
    onDone();
    onClose();
  };
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="topbar">
          <JButton icon={icons.close} onClick={onClose}>CANCEL</JButton>
          <h1>ADD SONGS</h1>
          <span className="spacer" />
          <JButton accent icon={icons.plus} disabled={!selected.size} onClick={() => void add()}>ADD ({selected.size})</JButton>
        </div>
        <div style={{ padding: 14 }}><input className="search-input" placeholder="SEARCH SONGS..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        {tracks.isLoading ? <LoadingState label="LOADING LIBRARY" /> : displayed.map((track) => (
          <button key={track.id} className="row" style={{ width: "100%", borderLeft: 0, borderRight: 0 }} onClick={() => toggle(track.id)}>
            <span style={{ color: selected.has(track.id) ? "var(--j-pink)" : "var(--j-dim)" }}>{selected.has(track.id) ? "■" : "□"}</span>
            <span className="row-main"><span className="row-title">{track.title}</span><span className="row-subtitle">{track.artistName}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}
