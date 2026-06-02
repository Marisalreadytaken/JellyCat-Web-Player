import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { JButton, CheckerStrip, KofiButton } from "@shared/ui";
import { friendlyErrorMessage, jellyfinClient } from "@core/jellyfin";
import { useAppStore } from "@app/appStore";

export function LoginView() {
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberBrowser, setRememberBrowser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const setSession = useAppStore((state) => state.setSession);
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const session = await jellyfinClient.authenticate(serverUrl, username, password);
      setSession(session, rememberBrowser ? "persistent" : "session");
      navigate((location.state as { from?: string } | null)?.from ?? "/home", { replace: true });
    } catch (err) {
      setError(friendlyErrorMessage(err, "Connection failed. Check the server URL and credentials."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="screen">
      <CheckerStrip />
      <form className="form-panel" onSubmit={submit}>
        <h1>JELLYCAT</h1>
        <p>Static web terminal for your Jellyfin music library</p>
        <div className="form-stack">
          <input className="form-input" placeholder="SERVER URL" value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} autoComplete="url" required />
          <input className="form-input" placeholder="USERNAME" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
          <input className="form-input" placeholder="PASSWORD" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          <label className="remember-row">
            <input type="checkbox" checked={rememberBrowser} onChange={(event) => setRememberBrowser(event.target.checked)} />
            <span>
              REMEMBER THIS BROWSER
              <small>Stores your Jellyfin access token on this device. Leave off for session-only login.</small>
            </span>
          </label>
          {error ? <div className="error-box">{error}</div> : null}
          <JButton type="submit" accent disabled={isLoading}>{isLoading ? "CONNECTING" : "CONNECT"}</JButton>
        </div>
        <nav className="trust-links" aria-label="Public pages">
          <Link to="/about">ABOUT</Link>
          <Link to="/privacy">PRIVACY</Link>
          <Link to="/terms">TERMS</Link>
          <Link to="/currently-on">CURRENTLY ON</Link>
          <Link to="/notices">NOTICES</Link>
          <KofiButton />
        </nav>
      </form>
    </main>
  );
}
