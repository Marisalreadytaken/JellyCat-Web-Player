import { create } from "zustand";
import type { AppTheme, AuthSession, ConnectionStatus } from "@domain/types";
import { authSessionStorage, preferenceStorage, type AuthPersistence } from "@core/storage/storage";
import { jellyfinClient } from "@core/jellyfin";

interface AppStore {
  session: AuthSession | null;
  authPersistence: AuthPersistence | null;
  theme: AppTheme;
  immersivePlayerBackground: boolean;
  connection: ConnectionStatus;
  isAuthenticated: boolean;
  setSession: (session: AuthSession | null, persistence?: AuthPersistence) => void;
  setTheme: (theme: AppTheme) => void;
  setImmersivePlayerBackground: (enabled: boolean) => void;
  checkConnection: () => Promise<void>;
}

const initialStoredSession = authSessionStorage.load();
if (initialStoredSession) {
  jellyfinClient.setSession(initialStoredSession.session);
}

export const useAppStore = create<AppStore>((set, get) => ({
  session: initialStoredSession?.session ?? null,
  authPersistence: initialStoredSession?.persistence ?? null,
  isAuthenticated: Boolean(initialStoredSession?.session.accessToken),
  theme: preferenceStorage.loadTheme(),
  immersivePlayerBackground: preferenceStorage.loadImmersive(),
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
  }
}));

window.addEventListener("online", () => void useAppStore.getState().checkConnection());
