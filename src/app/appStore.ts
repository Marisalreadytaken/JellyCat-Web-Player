import { create } from "zustand";
import type { AppTheme, AuthSession, ConnectionStatus, SavedProfile } from "@domain/types";
import { authSessionStorage, preferenceStorage, profileStorage, type AuthPersistence } from "@core/storage/storage";
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
  profiles: SavedProfile[];
  activeProfileId: string | null;
  setSession: (session: AuthSession | null, persistence?: AuthPersistence) => void;
  selectProfile: (profileId: string) => boolean;
  forgetProfile: (profileId: string) => void;
  createProfilePlaceholder: (serverUrl: string, username: string) => SavedProfile;
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
const initialProfile = initialStoredSession
  ? profileStorage.upsertSession(initialStoredSession.session, initialStoredSession.persistence)
  : null;

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
  profiles: profileStorage.loadProfiles(),
  activeProfileId: initialProfile?.id ?? null,
  setSession: (session, persistence = "session") => {
    if (session) {
      authSessionStorage.save(session, persistence);
      const profile = profileStorage.upsertSession(session, persistence);
      jellyfinClient.setSession(session);
      set({
        session,
        authPersistence: persistence,
        isAuthenticated: Boolean(session.accessToken),
        profiles: profileStorage.loadProfiles(),
        activeProfileId: profile.id
      });
      return;
    } else {
      authSessionStorage.clear();
      jellyfinClient.clearSession();
    }
    set({ session: null, authPersistence: null, isAuthenticated: false });
  },
  selectProfile: (profileId) => {
    const stored = profileStorage.loadSession(profileId);
    if (!stored?.session.accessToken) {
      authSessionStorage.clear();
      jellyfinClient.clearSession();
      profileStorage.touchProfile(profileId, "none");
      set({
        session: null,
        authPersistence: null,
        isAuthenticated: false,
        profiles: profileStorage.loadProfiles(),
        activeProfileId: profileId
      });
      return false;
    }

    authSessionStorage.save(stored.session, stored.persistence);
    profileStorage.touchProfile(profileId, stored.persistence);
    jellyfinClient.setSession(stored.session);
    set({
      session: stored.session,
      authPersistence: stored.persistence,
      isAuthenticated: true,
      profiles: profileStorage.loadProfiles(),
      activeProfileId: profileId
    });
    return true;
  },
  forgetProfile: (profileId) => {
    const activeProfileId = get().activeProfileId;
    profileStorage.forgetProfile(profileId);
    if (activeProfileId === profileId) {
      authSessionStorage.clear();
      jellyfinClient.clearSession();
      set({
        session: null,
        authPersistence: null,
        isAuthenticated: false,
        profiles: profileStorage.loadProfiles(),
        activeProfileId: null
      });
      return;
    }
    set({ profiles: profileStorage.loadProfiles() });
  },
  createProfilePlaceholder: (serverUrl, username) => {
    const profile = profileStorage.createPlaceholder(serverUrl, username);
    set({ profiles: profileStorage.loadProfiles(), activeProfileId: profile.id });
    return profile;
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
