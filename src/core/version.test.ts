import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLatestVersion, isNewerVersion, normalizeVersion } from "./version";

describe("version helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes plain and tagged semver versions", () => {
    expect(normalizeVersion("1.2.0")).toBe("1.2.0");
    expect(normalizeVersion("v1.2.0")).toBe("1.2.0");
  });

  it("detects newer semver versions numerically", () => {
    expect(isNewerVersion("1.2.0", "1.1.0")).toBe(true);
    expect(isNewerVersion("v1.2.0", "1.1.0")).toBe(true);
    expect(isNewerVersion("1.10.0", "1.9.9")).toBe(true);
  });

  it("ignores equal, older, malformed, and prerelease-like values", () => {
    expect(isNewerVersion("1.1.0", "1.1.0")).toBe(false);
    expect(isNewerVersion("1.0.9", "1.1.0")).toBe(false);
    expect(isNewerVersion("latest", "1.1.0")).toBe(false);
    expect(isNewerVersion("1.2.0-beta.1", "1.1.0")).toBe(false);
  });

  it("returns the normalized latest GitHub release tag", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ tag_name: "v1.2.0" }), { status: 200 })));

    await expect(fetchLatestVersion()).resolves.toBe("1.2.0");
  });

  it("ignores draft or prerelease GitHub releases", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ tag_name: "v1.2.0", prerelease: true }), { status: 200 })));

    await expect(fetchLatestVersion()).resolves.toBeUndefined();
  });
});
