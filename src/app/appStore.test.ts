import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@domain/types";
import { storageKeys } from "@core/storage/storage";
import { useAppStore } from "./appStore";

const session: AuthSession = {
  serverUrl: "https://jellyfin.example",
  userId: "user-1",
  username: "mar",
  accessToken: "token-1"
};

describe("useAppStore auth persistence", () => {
  afterEach(() => {
    useAppStore.getState().setSession(null);
    useAppStore.getState().setLocalJellyfinLyrics(true);
    useAppStore.setState({ latestVersion: undefined, isUpdateAvailable: false });
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("uses session-only auth unless persistent login is requested", () => {
    useAppStore.getState().setSession(session);

    expect(useAppStore.getState().authPersistence).toBe("session");
    expect(sessionStorage.getItem(`${storageKeys.session}:session`)).toContain("token-1");
    expect(localStorage.getItem(storageKeys.session)).toBeNull();
  });

  it("persists auth only when requested and clears it on logout", () => {
    useAppStore.getState().setSession(session, "persistent");

    expect(useAppStore.getState().authPersistence).toBe("persistent");
    expect(localStorage.getItem(storageKeys.session)).toContain("token-1");

    useAppStore.getState().setSession(null);

    expect(useAppStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem(storageKeys.session)).toBeNull();
    expect(sessionStorage.getItem(`${storageKeys.session}:session`)).toBeNull();
  });

  it("persists the local Jellyfin lyrics preference", () => {
    useAppStore.getState().setLocalJellyfinLyrics(false);

    expect(useAppStore.getState().localJellyfinLyrics).toBe(false);
    expect(localStorage.getItem(storageKeys.localJellyfinLyrics)).toBe("false");
  });

  it("marks the app when a newer release is available", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ tag_name: "v1.2.0" }), { status: 200 })));

    await useAppStore.getState().checkForUpdate();

    expect(useAppStore.getState().latestVersion).toBe("1.2.0");
    expect(useAppStore.getState().isUpdateAvailable).toBe(true);
  });

  it("keeps the app usable when the release check fails", async () => {
    useAppStore.setState({ latestVersion: "1.2.0", isUpdateAvailable: true });
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));

    await useAppStore.getState().checkForUpdate();

    expect(useAppStore.getState().latestVersion).toBeUndefined();
    expect(useAppStore.getState().isUpdateAvailable).toBe(false);
  });
});
