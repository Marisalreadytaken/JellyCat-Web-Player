import type React from "react";
import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@core/player/audioService";

export function ProgressBlocks({
  progress,
  blocks = 40,
  interactive,
  onSeek
}: {
  progress: number;
  blocks?: number;
  interactive?: boolean;
  onSeek?: (progress: number) => void;
}) {
  const boundedProgress = Math.max(0, Math.min(1, progress));
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const durationSeconds = usePlayerStore((state) => state.durationSeconds);
  const [localProgress, setLocalProgress] = useState(boundedProgress);
  const [displayProgress, setDisplayProgress] = useState(boundedProgress);
  const dragRef = useRef(false);
  const displayProgressRef = useRef(boundedProgress);
  const syncRef = useRef({ progress: boundedProgress, time: performance.now() });
  const blockWidth = 10;
  const gapWidth = 1.5;
  const railWidth = blocks * blockWidth + (blocks - 1) * gapWidth;

  const setRenderedProgress = (nextProgress: number) => {
    const next = Math.max(0, Math.min(1, nextProgress));
    displayProgressRef.current = next;
    setDisplayProgress(next);
  };

  useEffect(() => {
    if (dragRef.current) return;

    const current = displayProgressRef.current;
    const isSmallPlaybackCorrection = isPlaying && boundedProgress < current && current - boundedProgress < 0.025;
    const nextProgress = isSmallPlaybackCorrection ? current : boundedProgress;

    syncRef.current = { progress: nextProgress, time: performance.now() };
    setLocalProgress(boundedProgress);
    setRenderedProgress(nextProgress);
  }, [boundedProgress, isPlaying]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (!dragRef.current && isPlaying && durationSeconds > 0) {
        const elapsed = (performance.now() - syncRef.current.time) / 1000;
        setRenderedProgress(syncRef.current.progress + elapsed / durationSeconds);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [durationSeconds, isPlaying]);

  const progressFromEvent = (event: { clientX: number }, element: HTMLDivElement) => {
    const rect = element.getBoundingClientRect();
    return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  };

  const updateLocalProgress = (event: React.PointerEvent<HTMLDivElement>) => {
    const pct = progressFromEvent(event, event.currentTarget);
    setLocalProgress(pct);
    setDisplayProgress(pct);
    return pct;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !onSeek) return;
    dragRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateLocalProgress(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    updateLocalProgress(event);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !interactive || !onSeek) return;
    const pct = updateLocalProgress(event);
    dragRef.current = false;
    syncRef.current = { progress: pct, time: performance.now() };
    displayProgressRef.current = pct;
    onSeek(pct);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const renderedProgress = dragRef.current ? localProgress : displayProgress;
  return (
    <div
      className="progress-blocks"
      style={{ "--blocks": blocks } as React.CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg className="progress-svg" viewBox={`0 0 ${railWidth} 8`} preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: blocks }).map((_, index) => {
          const x = index * (blockWidth + gapWidth);
          const start = index / blocks;
          const end = (index + 1) / blocks;
          const fillWidth = blockWidth * Math.max(0, Math.min(1, (renderedProgress - start) / (end - start)));

          return (
            <g key={index}>
              <rect className="progress-block" x={x} y="0" width={blockWidth} height="8" />
              <rect className="progress-block-fill" x={x} y="0" width={fillWidth} height="8" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
