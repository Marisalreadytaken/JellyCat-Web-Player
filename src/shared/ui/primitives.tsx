import type React from "react";
import type { LucideIcon } from "lucide-react";

export function CheckerStrip() {
  return <div className="checker-strip" />;
}

export function Divider() {
  return <div className="j-divider" />;
}

export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="j-section">
      <span>{title}</span>
      {action ? <button type="button" onClick={onAction}>{action}</button> : null}
    </div>
  );
}

export function StatusDot({ online = true }: { online?: boolean }) {
  return <span className={`status-dot ${online ? "" : "pink"}`} />;
}

export function Badge({ text }: { text?: string }) {
  if (!text) return null;
  return <span className="badge">{text}</span>;
}

export function JButton({
  children,
  icon: Icon,
  accent,
  type = "button",
  onClick,
  disabled
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
  accent?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button className={`j-button ${accent ? "accent" : ""}`} type={type} onClick={onClick} disabled={disabled}>
      {Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  icon: Icon,
  onClick,
  active,
  type = "button",
  disabled
}: {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  active?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      className={`icon-button ${active ? "active" : ""}`}
      type={type}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={17} />
    </button>
  );
}

export function KofiButton() {
  return (
    <a className="icon-button kofi-button" href="https://ko-fi.com/mar_" target="_blank" rel="noopener noreferrer" aria-label="Support JellyCat on Ko-fi" title="Support JellyCat on Ko-fi">
      <span className="pixel-coffee-cup" aria-hidden="true">
        <span className="pixel-coffee-steam" />
        <span className="pixel-coffee-body" />
        <span className="pixel-coffee-handle" />
      </span>
    </a>
  );
}

export function LoadingState({ label = "LOADING" }: { label?: string }) {
  return <div className="loading-state">// {label}</div>;
}

export function EmptyState({ label }: { label: string }) {
  return <div className="empty-state">// {label}</div>;
}
