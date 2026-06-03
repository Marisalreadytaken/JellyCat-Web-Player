import type { AppTheme, AuthSession, RecentItem } from "@domain/types";

const prefix = "jellycat:web:";

export const storageKeys = {
  session: `${prefix}session`,
  theme: `${prefix}theme`,
  immersivePlayerBackground: `${prefix}immersivePlayerBackground`,
  localJellyfinLyrics: `${prefix}localJellyfinLyrics`,
  searchHistory: `${prefix}searchHistory`,
  recentActivity: `${prefix}recentActivity`
};

const sessionStorageKey = `${storageKeys.session}:session`;

export type AuthPersistence = "session" | "persistent";

export type StoredAuthSession = {
  session: AuthSession;
  persistence: AuthPersistence;
};

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadSessionJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveSessionJson<T>(key: string, value: T): void {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export const authSessionStorage = {
  load(): StoredAuthSession | null {
    const persistentSession = loadJson<AuthSession | null>(storageKeys.session, null);
    if (persistentSession) return { session: persistentSession, persistence: "persistent" };

    const session = loadSessionJson<AuthSession | null>(sessionStorageKey, null);
    return session ? { session, persistence: "session" } : null;
  },
  save(session: AuthSession, persistence: AuthPersistence): void {
    this.clear();
    if (persistence === "persistent") {
      saveJson(storageKeys.session, session);
      return;
    }
    saveSessionJson(sessionStorageKey, session);
  },
  clear(): void {
    localStorage.removeItem(storageKeys.session);
    sessionStorage.removeItem(sessionStorageKey);
  }
};

export const preferenceStorage = {
  loadTheme(): AppTheme {
    return loadJson<AppTheme>(storageKeys.theme, "original");
  },
  saveTheme(theme: AppTheme): void {
    saveJson(storageKeys.theme, theme);
  },
  loadImmersive(): boolean {
    return loadJson<boolean>(storageKeys.immersivePlayerBackground, false);
  },
  saveImmersive(value: boolean): void {
    saveJson(storageKeys.immersivePlayerBackground, value);
  },
  loadLocalJellyfinLyrics(): boolean {
    return loadJson<boolean>(storageKeys.localJellyfinLyrics, true);
  },
  saveLocalJellyfinLyrics(value: boolean): void {
    saveJson(storageKeys.localJellyfinLyrics, value);
  },
  loadSearchHistory(): string[] {
    return loadJson<string[]>(storageKeys.searchHistory, []);
  },
  saveSearchHistory(history: string[]): void {
    saveJson(storageKeys.searchHistory, history);
  },
  loadRecentActivity(): RecentItem[] {
    return loadJson<RecentItem[]>(storageKeys.recentActivity, []);
  },
  saveRecentActivity(items: RecentItem[]): void {
    saveJson(storageKeys.recentActivity, items);
  }
};

export function clearAppCache(): void {
  localStorage.removeItem(storageKeys.searchHistory);
  localStorage.removeItem(storageKeys.recentActivity);
  localStorage.removeItem("jellycat:songs:limitMode");
  localStorage.removeItem("jellycat:songs:sort");
  localStorage.removeItem("jellycat:playlist:sort");
}
