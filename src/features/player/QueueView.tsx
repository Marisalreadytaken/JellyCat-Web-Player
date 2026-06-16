import { useNavigate } from "react-router-dom";
import { useLayoutEffect, useRef, useState } from "react";
import { usePlayerStore } from "@core/player/audioService";
import { IconButton, JButton, Section, TrackRow, icons } from "@shared/ui";

export function QueueView() {
  const navigate = useNavigate();
  const player = usePlayerStore();
  const [isExiting, setIsExiting] = useState(false);
  const [queueMessage, setQueueMessage] = useState("");
  const currentItemRef = useRef<HTMLDivElement | null>(null);
  const currentIndex = player.currentTrack
    ? player.queue.findIndex((track) => track.id === player.currentTrack?.id)
    : -1;

  const exitQueue = () => {
    setIsExiting(true);
    window.setTimeout(() => navigate(-1), 220);
  };

  useLayoutEffect(() => {
    if (!currentItemRef.current) return;
    currentItemRef.current.scrollIntoView({ block: "start", behavior: "auto" });
  }, [currentIndex, player.queue.length]);

  const saveQueue = async () => {
    const name = window.prompt("Playlist name", `JellyCat Queue ${new Date().toLocaleDateString()}`);
    if (!name?.trim()) return;
    setQueueMessage("SAVING QUEUE");
    try {
      await player.saveQueueAsPlaylist(name.trim());
      setQueueMessage("QUEUE SAVED");
    } catch {
      setQueueMessage("SAVE FAILED");
    }
  };

  return (
    <main className={`screen queue-screen ${isExiting ? "exiting" : ""}`}>
      <div className="topbar">
        <IconButton label="Back" icon={icons.back} onClick={exitQueue} />
        <h1>QUEUE</h1>
        <span className="spacer" />
        <JButton icon={icons.playlist} onClick={() => void saveQueue()} disabled={!player.queue.length}>SAVE</JButton>
        <JButton icon={icons.filter} onClick={player.clearPlayed} disabled={currentIndex <= 0}>CLEAR PLAYED</JButton>
        <JButton accent icon={icons.trash} onClick={player.clearQueue}>CLEAR</JButton>
      </div>
      <Section title="QUEUE :: CURRENT" action={queueMessage || `// ${currentIndex + 1 || 0} / ${player.queue.length} TRACKS`} />
      {!player.queue.length && player.lastQueueSnapshot ? (
        <div className="feature-panel">
          <div>
            <strong>LAST QUEUE</strong>
            <p>{player.lastQueueSnapshot.queue.length} tracks / {new Date(player.lastQueueSnapshot.createdAt).toLocaleString()}</p>
          </div>
          <JButton icon={icons.play} onClick={() => player.restoreQueueSnapshot(player.lastQueueSnapshot!)}>RESTORE</JButton>
        </div>
      ) : null}
      {player.queue.length ? player.queue.map((track, index) => (
        <div
          key={`${track.id}-${index}`}
          ref={index === currentIndex ? currentItemRef : undefined}
          className={`queue-item ${index === currentIndex ? "current" : ""}`}
        >
          <TrackRow track={track} index={index} contextTracks={player.queue} />
          <IconButton label="Move up" icon={icons.arrowUp} disabled={index === 0} onClick={() => player.moveQueueItem(index, Math.max(0, index - 1))} />
          <IconButton label="Move down" icon={icons.down} disabled={index === player.queue.length - 1} onClick={() => player.moveQueueItem(index, Math.min(player.queue.length - 1, index + 1))} />
          <IconButton label="Remove from queue" icon={icons.trash} onClick={() => player.removeFromQueue(index)} />
        </div>
      )) : <div className="empty-state">// QUEUE EMPTY</div>}
      {player.queueHistory.length ? (
        <>
          <Section title="QUEUE :: HISTORY" />
          <div className="compact-track-list">
            {player.queueHistory.map((snapshot) => (
              <button key={snapshot.id} type="button" className="settings-row compact-track-row" onClick={() => player.restoreQueueSnapshot(snapshot)}>
                <span>{snapshot.name.toUpperCase()}</span>
                <span className="spacer" />
                <span>{snapshot.queue.length} tracks</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}
