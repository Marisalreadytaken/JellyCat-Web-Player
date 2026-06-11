import { create } from "zustand";
import type { AppTheme, AuthSession, ConnectionStatus } from "@domain/types";
import { authSessionStorage, preferenceStorage, type AuthPersistence } from "@core/storage/storage";
import { jellyfinClient } from "@core/jellyfin";
import { appVersion, fetchLatestVersion, isNewerVersion } from "@core/version";

interface AppStore {
  session: AuthSession | null;
  authPersistence: AuthPersistence | null;
  appVersion: string;
  latestVersion?: string;
  isUpdateAvailable: boolean;
  theme: AppTheme;
  immersivePlayerBackground: boolean;
  localJellyfinLyrics: boolean;
  connection: ConnectionStatus;
  isAuthenticated: boolean;
  setSession: (session: AuthSession | null, persistence?: AuthPersistence) => void;
  setTheme: (theme: AppTheme) => void;
  setImmersivePlayerBackground: (enabled: boolean) => void;
  setLocalJellyfinLyrics: (enabled: boolean) => void;
  checkConnection: () => Promise<void>;
  checkForUpdate: () => Promise<void>;
}

const initialStoredSession = authSessionStorage.load();
if (initialStoredSession) {
  jellyfinClient.setSession(initialStoredSession.session);
}

export const useAppStore = create<AppStore>((set, get) => ({
  session: initialStoredSession?.session ?? null,
  authPersistence: initialStoredSession?.persistence ?? null,
  isAuthenticated: Boolean(initialStoredSession?.session.accessToken),
  appVersion,
  latestVersion: undefined,
  isUpdateAvailable: false,
  theme: preferenceStorage.loadTheme(),
  immersivePlayerBackground: preferenceStorage.loadImmersive(),
  localJellyfinLyrics: preferenceStorage.loadLocalJellyfinLyrics(),
  connection: {
    isServerAvailable: true,
    isNetworkConnected: navigator.onLine,
    diagnostic: undefined
  },
  setSession: (session, persistence = "session") => {
    if (session) {
      authSessionStorage.save(session, persistence);
      jellyfinClient.setSession(session);
    } else {
      authSessionStorage.clear();
      jellyfinClient.clearSession();
    }
    set({ session, authPersistence: session ? persistence : null, isAuthenticated: Boolean(session?.accessToken) });
  },
  setTheme: (theme) => {
    preferenceStorage.saveTheme(theme);
    set({ theme });
  },
  setImmersivePlayerBackground: (enabled) => {
    preferenceStorage.saveImmersive(enabled);
    set({ immersivePlayerBackground: enabled });
  },
  setLocalJellyfinLyrics: (enabled) => {
    preferenceStorage.saveLocalJellyfinLyrics(enabled);
    set({ localJellyfinLyrics: enabled });
  },
  checkConnection: async () => {
    const session = get().session;
    const isNetworkConnected = navigator.onLine;
    if (!session) {
      set({ connection: { isNetworkConnected, isServerAvailable: false } });
      return;
    }
    const result = await jellyfinClient.checkServerStatus();
    set({
      connection: {
        isNetworkConnected,
        isServerAvailable: result.ok,
        diagnostic: result.diagnostic
      }
    });
  },
  checkForUpdate: async () => {
    try {
      const latestVersion = await fetchLatestVersion();
      set({
        latestVersion,
        isUpdateAvailable: isNewerVersion(latestVersion, appVersion)
      });
    } catch {
      set({ latestVersion: undefined, isUpdateAvailable: false });
    }
  }
}));

window.addEventListener("online", () => void useAppStore.getState().checkConnection());
