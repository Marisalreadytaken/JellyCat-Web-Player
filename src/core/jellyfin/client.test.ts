import { describe, expect, it } from "vitest";
import { friendlyErrorMessage, JellyfinRequestError, jellyfinInternals } from "@core/jellyfin";

describe("jellyfin mappings", () => {
  it("preserves lowerCamelCase query keys expected by Jellyfin", () => {
    const query = jellyfinInternals.encodeQuery([
      ["includeItemTypes", "Audio"],
      ["sortBy", "SortName"],
      ["sortOrder", "Ascending"]
    ]);
    expect(query).toContain("includeItemTypes=Audio");
    expect(query).toContain("sortBy=SortName");
    expect(query).toContain("sortOrder=Ascending");
    expect(query).not.toContain("IncludeItemTypes");
  });

  it("maps audio nodes to track contracts", () => {
    const track = jellyfinInternals.mapTrack({
      Id: "t1",
      Name: "Song",
      AlbumId: "a1",
      Album: "Album",
      Artists: ["Artist"],
      RunTimeTicks: 30_000_000,
      ImageTags: { Primary: "tag" },
      UserData: { IsFavorite: true, PlayCount: 7 },
      MediaSources: [{ Container: "flac", Bitrate: 900000 }]
    });
    expect(track).toMatchObject({
      id: "t1",
      title: "Song",
      albumId: "a1",
      artistName: "Artist",
      albumName: "Album",
      durationTicks: 30_000_000,
      artworkItemId: "t1",
      isFavorite: true,
      container: "flac",
      bitrate: 900
    });
  });

  it("uses album image tags for tracks without embedded primary artwork", () => {
    const track = jellyfinInternals.mapTrack({
      Id: "t1",
      Name: "Song",
      AlbumId: "a1",
      AlbumPrimaryImageTag: "album-tag"
    });

    expect(track.artworkItemId).toBeUndefined();
    expect(track.artworkTag).toBe("album-tag");
  });
});

describe("friendlyErrorMessage", () => {
  it("shows sanitized Jellyfin request errors", () => {
    const error = new JellyfinRequestError(
      "Jellyfin request failed (500). Try again or check server permissions.",
      500,
      "Internal server stack trace"
    );

    expect(friendlyErrorMessage(error)).toBe("Jellyfin request failed (500). Try again or check server permissions.");
    expect(friendlyErrorMessage(error)).not.toContain("stack trace");
  });

  it("hides unknown raw error messages", () => {
    expect(friendlyErrorMessage(new Error("Raw Jellyfin response body"), "Fallback message.")).toBe("Fallback message.");
  });

  it("keeps CORS and mixed-content guidance user-facing", () => {
    const message = jellyfinInternals.maybeCorsDiagnostic(new TypeError("Failed to fetch"), "http://jellyfin.local");

    expect(message).toContain("CORS");
    expect(message).toContain("mixed-content");
    expect(friendlyErrorMessage(new Error(message))).toBe(message);
  });
});
