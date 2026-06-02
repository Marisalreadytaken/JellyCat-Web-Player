import { useNavigate } from "react-router-dom";
import { useLayoutEffect, useRef, useState } from "react";
import { usePlayerStore } from "@core/player/audioService";
import { IconButton, JButton, Section, TrackRow, icons } from "@shared/ui";

export function QueueView() {
  const navigate = useNavigate();
  const player = usePlayerStore();
  const [isExiting, setIsExiting] = useState(false);
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

  return (
    <main className={`screen queue-screen ${isExiting ? "exiting" : ""}`}>
      <div className="topbar">
        <IconButton label="Back" icon={icons.back} onClick={exitQueue} />
        <h1>QUEUE</h1>
        <span className="spacer" />
        <JButton accent onClick={player.clearQueue}>CLEAR</JButton>
      </div>
      <Section title="QUEUE :: CURRENT" action={`// ${currentIndex + 1 || 0} / ${player.queue.length} TRACKS`} />
      {player.queue.length ? player.queue.map((track, index) => (
        <div
          key={`${track.id}-${index}`}
          ref={index === currentIndex ? currentItemRef : undefined}
          className={`queue-item ${index === currentIndex ? "current" : ""}`}
        >
          <TrackRow track={track} index={index} contextTracks={player.queue} />
          <button className="mini-button" disabled={index === 0} onClick={() => player.moveQueueItem(index, Math.max(0, index - 1))}>UP</button>
          <button className="mini-button" onClick={() => player.removeFromQueue(index)}>DEL</button>
        </div>
      )) : <div className="empty-state">// QUEUE EMPTY</div>}
    </main>
  );
}
