import { afterEach, describe, expect, it } from "vitest";
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
});
