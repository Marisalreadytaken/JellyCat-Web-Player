import { afterEach, describe, expect, it } from "vitest";
import type { AuthSession } from "@domain/types";
import { authSessionStorage, preferenceStorage, storageKeys } from "./storage";

const session: AuthSession = {
  serverUrl: "https://jellyfin.example",
  userId: "user-1",
  username: "mar",
  accessToken: "token-1"
};

describe("authSessionStorage", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("stores auth in sessionStorage by default", () => {
    authSessionStorage.save(session, "session");

    expect(sessionStorage.getItem(`${storageKeys.session}:session`)).toContain("token-1");
    expect(localStorage.getItem(storageKeys.session)).toBeNull();
    expect(authSessionStorage.load()).toEqual({ session, persistence: "session" });
  });

  it("stores auth in localStorage only for persistent login", () => {
    authSessionStorage.save(session, "persistent");

    expect(localStorage.getItem(storageKeys.session)).toContain("token-1");
    expect(sessionStorage.getItem(`${storageKeys.session}:session`)).toBeNull();
    expect(authSessionStorage.load()).toEqual({ session, persistence: "persistent" });
  });

  it("clears both session-only and persistent auth", () => {
    authSessionStorage.save(session, "persistent");
    authSessionStorage.save({ ...session, accessToken: "token-2" }, "session");
    authSessionStorage.clear();

    expect(localStorage.getItem(storageKeys.session)).toBeNull();
    expect(sessionStorage.getItem(`${storageKeys.session}:session`)).toBeNull();
    expect(authSessionStorage.load()).toBeNull();
  });
});

describe("preferenceStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("enables local Jellyfin lyrics by default and persists changes", () => {
    expect(preferenceStorage.loadLocalJellyfinLyrics()).toBe(true);

    preferenceStorage.saveLocalJellyfinLyrics(false);

    expect(localStorage.getItem(storageKeys.localJellyfinLyrics)).toBe("false");
    expect(preferenceStorage.loadLocalJellyfinLyrics()).toBe(false);
  });
});
