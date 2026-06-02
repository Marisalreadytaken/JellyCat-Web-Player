import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { icons, IconButton, JButton, CheckerStrip, Divider, KofiButton, Section, StatusDot } from "@shared/ui";
import { useAppStore } from "@app/appStore";
import type { AppTheme } from "@domain/types";
import { useRecentActivityStore } from "@core/player/recentActivity";
import { clearAppCache } from "@core/storage/storage";

const themes: AppTheme[] = ["original", "mocha", "macchiato", "frappe", "latte"];

export function SettingsView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cacheMessage, setCacheMessage] = useState("");
  const { session, authPersistence, theme, setTheme, immersivePlayerBackground, setImmersivePlayerBackground, setSession, connection, checkConnection } = useAppStore();
  const clearRecentActivity = useRecentActivityStore((state) => state.clear);

  const clearCache = () => {
    queryClient.clear();
    clearRecentActivity();
    clearAppCache();
    void checkConnection();
    setCacheMessage("CACHE CLEARED");
  };

  return (
    <main className="screen">
      <div className="topbar">
        <IconButton label="Back" icon={icons.back} onClick={() => navigate(-1)} />
        <h1>SETTINGS</h1>
      </div>
      <CheckerStrip />
      <div className="settings-grid">
        <section className="settings-section">
          <Section title="SERVER" />
          <div className="settings-row"><span>URL</span><span className="spacer" />{session?.serverUrl ?? "UNKNOWN"}</div>
          <div className="settings-row"><span>USER</span><span className="spacer" />{session?.username ?? "UNKNOWN"}</div>
          <div className="settings-row"><span>LOGIN STORAGE</span><span className="spacer" />{authPersistence === "persistent" ? "REMEMBERED" : "SESSION ONLY"}</div>
          <div className="settings-row"><StatusDot online={connection.isServerAvailable} />{connection.isServerAvailable ? "CONNECTED" : "OFFLINE"}</div>
          {connection.diagnostic ? <div className="settings-row" style={{ color: "var(--j-pink)" }}>{connection.diagnostic}</div> : null}
          <div className="settings-row">
            <JButton accent onClick={() => setSession(null)}>DISCONNECT</JButton>
          </div>
        </section>
        <section className="settings-section">
          <Section title="APPEARANCE" />
          <div className="settings-row">
            <span>ACTIVE THEME</span>
            <span className="spacer" />
            <select className="form-select" style={{ maxWidth: 190 }} value={theme} onChange={(event) => setTheme(event.target.value as AppTheme)}>
              {themes.map((name) => <option key={name} value={name}>{name.toUpperCase()}</option>)}
            </select>
          </div>
          <label className="settings-row">
            <span>IMMERSIVE PLAYER BACKGROUND</span>
            <span className="spacer" />
            <input type="checkbox" checked={immersivePlayerBackground} onChange={(event) => setImmersivePlayerBackground(event.target.checked)} />
          </label>
        </section>
        <section className="settings-section">
          <Section title="CACHE" />
          <div className="settings-row">
            <span>LOCAL APP DATA</span>
            <span className="spacer" />
            <JButton onClick={clearCache}>CLEAR CACHE</JButton>
          </div>
          {cacheMessage ? <div className="settings-row settings-note">{cacheMessage}</div> : null}
        </section>
        <section className="settings-section">
          <Section title="INFO" />
          <nav className="settings-links" aria-label="Information pages">
            <Link to="/about">ABOUT</Link>
            <Link to="/privacy">PRIVACY</Link>
            <Link to="/terms">TERMS</Link>
            <Link to="/currently-on">CURRENTLY ON</Link>
            <Link to="/notices">NOTICES</Link>
            <Link to="/copyright">COPYRIGHT</Link>
            <Link to="/changelog">CHANGELOG</Link>
            <KofiButton />
          </nav>
        </section>
      </div>
      <Divider />
    </main>
  );
}
