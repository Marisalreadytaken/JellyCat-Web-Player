import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = "http://127.0.0.1:5174";
const mockBase = "https://mock.jellycat";
const outDir = path.resolve(process.cwd(), "screenshots");

const session = {
  serverUrl: mockBase,
  userId: "user-1",
  username: "Mar",
  accessToken: "token-123"
};

const storageKeys = {
  session: "jellycat:web:session",
  theme: "jellycat:web:theme",
  immersivePlayerBackground: "jellycat:web:immersivePlayerBackground",
  searchHistory: "jellycat:web:searchHistory",
  recentActivity: "jellycat:web:recentActivity"
};

function hashCode(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = Math.imul(31, h) + input.charCodeAt(i) | 0;
  return Math.abs(h);
}

function pickPalette(id) {
  const palettes = [
    ["#0f172a", "#1d4ed8", "#38bdf8"],
    ["#1f1147", "#7c3aed", "#f472b6"],
    ["#0f3d3e", "#14b8a6", "#5eead4"],
    ["#3f1d2f", "#db2777", "#fb7185"],
    ["#3b2f0b", "#f59e0b", "#fde68a"]
  ];
  return palettes[hashCode(id) % palettes.length];
}

function artSvg(title, subtitle, id) {
  const [a, b, c] = pickPalette(id);
  const safeTitle = String(title).toUpperCase();
  const safeSubtitle = String(subtitle ?? "").toUpperCase();
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="55%" stop-color="${b}"/>
      <stop offset="100%" stop-color="${c}"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="24"/></filter>
    <pattern id="grid" width="84" height="84" patternUnits="userSpaceOnUse">
      <path d="M 84 0 L 0 0 0 84" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="1000" height="1000" fill="url(#g)"/>
  <circle cx="780" cy="210" r="170" fill="rgba(255,255,255,0.18)" filter="url(#blur)"/>
  <circle cx="190" cy="790" r="240" fill="rgba(0,0,0,0.18)" filter="url(#blur)"/>
  <rect width="1000" height="1000" fill="url(#grid)" opacity="0.55"/>
  <g opacity="0.92">
    <rect x="90" y="82" width="820" height="820" rx="48" fill="rgba(0,0,0,0.18)"/>
    <rect x="120" y="112" width="760" height="760" rx="32" fill="rgba(255,255,255,0.08)"/>
  </g>
  <text x="140" y="444" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="74" font-weight="700" letter-spacing="6">${safeTitle}</text>
  <text x="140" y="518" fill="rgba(255,255,255,0.86)" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="8">${safeSubtitle}</text>
  <text x="140" y="712" fill="rgba(255,255,255,0.72)" font-family="Arial, Helvetica, sans-serif" font-size="24" letter-spacing="4">JELLYCAT / MOCK ARTWORK</text>
</svg>`;
}

function makeSilentWav(seconds = 2, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = seconds * sampleRate;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

const libraryId = "library-1";
const artists = [
  { id: "artist-1", name: "Midnight Runner", artworkTag: "artist-1-tag", albumCount: 2 },
  { id: "artist-2", name: "Circuit Bloom", artworkTag: "artist-2-tag", albumCount: 1 }
];
const albums = [
  { id: "album-1", name: "Night Drive", artistName: "Midnight Runner", year: 2026, artworkTag: "album-1-tag", trackCount: 4, format: "flac", artistId: "artist-1" },
  { id: "album-2", name: "Afterglow Protocol", artistName: "Circuit Bloom", year: 2025, artworkTag: "album-2-tag", trackCount: 3, format: "mp3", artistId: "artist-2" },
  { id: "album-3", name: "Static Horizon", artistName: "Midnight Runner", year: 2024, artworkTag: "album-3-tag", trackCount: 5, format: "aac", artistId: "artist-1" }
];
const playlists = [
  { id: "playlist-1", name: "Late Night Mix", trackCount: 5, artworkTag: "playlist-1-tag" },
  { id: "playlist-2", name: "Coding Sessions", trackCount: 3, artworkTag: "playlist-2-tag" }
];
const tracks = [
  { id: "track-1", title: "Midnight Signal", albumId: "album-1", albumName: "Night Drive", artistName: "Midnight Runner", durationTicks: 248_000_000, artworkTag: "album-1-tag", isFavorite: true, container: "flac", bitrate: 940, playCount: 12, dateCreated: "2026-05-15T19:10:00.000Z" },
  { id: "track-2", title: "Neon Exhaust", albumId: "album-1", albumName: "Night Drive", artistName: "Midnight Runner", durationTicks: 223_000_000, artworkTag: "album-1-tag", isFavorite: false, container: "flac", bitrate: 930, playCount: 8, dateCreated: "2026-05-14T18:20:00.000Z" },
  { id: "track-3", title: "Highway Static", albumId: "album-1", albumName: "Night Drive", artistName: "Midnight Runner", durationTicks: 198_000_000, artworkTag: "album-1-tag", isFavorite: true, container: "flac", bitrate: 905, playCount: 18, dateCreated: "2026-05-13T18:55:00.000Z" },
  { id: "track-4", title: "Afterglow", albumId: "album-2", albumName: "Afterglow Protocol", artistName: "Circuit Bloom", durationTicks: 240_000_000, artworkTag: "album-2-tag", isFavorite: false, container: "mp3", bitrate: 320, playCount: 5, dateCreated: "2026-05-11T20:00:00.000Z" },
  { id: "track-5", title: "Signal Bloom", albumId: "album-2", albumName: "Afterglow Protocol", artistName: "Circuit Bloom", durationTicks: 216_000_000, artworkTag: "album-2-tag", isFavorite: true, container: "mp3", bitrate: 320, playCount: 9, dateCreated: "2026-05-10T20:00:00.000Z" },
  { id: "track-6", title: "Ghost Circuit", albumId: "album-2", albumName: "Afterglow Protocol", artistName: "Circuit Bloom", durationTicks: 208_000_000, artworkTag: "album-2-tag", isFavorite: false, container: "mp3", bitrate: 320, playCount: 4, dateCreated: "2026-05-09T20:00:00.000Z" },
  { id: "track-7", title: "Static Horizon", albumId: "album-3", albumName: "Static Horizon", artistName: "Midnight Runner", durationTicks: 260_000_000, artworkTag: "album-3-tag", isFavorite: false, container: "aac", bitrate: 256, playCount: 2, dateCreated: "2026-05-08T20:00:00.000Z" },
  { id: "track-8", title: "Nocturne Loop", albumId: "album-3", albumName: "Static Horizon", artistName: "Midnight Runner", durationTicks: 212_000_000, artworkTag: "album-3-tag", isFavorite: true, container: "aac", bitrate: 256, playCount: 15, dateCreated: "2026-05-07T20:00:00.000Z" }
];

const tracksByAlbum = new Map(albums.map((album) => [album.id, tracks.filter((track) => track.albumId === album.id)]));
const tracksByArtist = new Map(artists.map((artist) => [artist.id, tracks.filter((track) => track.artistName === artist.name)]));
const playlistTracks = new Map([
  ["playlist-1", tracks.slice(0, 5).map((track, index) => ({ ...track, playlistItemId: `playlist-1-entry-${index + 1}` }))],
  ["playlist-2", tracks.slice(3, 6).map((track, index) => ({ ...track, playlistItemId: `playlist-2-entry-${index + 1}` }))]
]);

function toItemResponse(items) {
  return JSON.stringify({ Items: items, TotalRecordCount: items.length });
}

function albumNode(album) {
  return {
    Id: album.id,
    Name: album.name,
    Type: "MusicAlbum",
    AlbumArtist: album.artistName,
    ProductionYear: album.year,
    ChildCount: album.trackCount,
    Container: album.format,
    ImageTags: { Primary: album.artworkTag }
  };
}

function artistNode(artist) {
  return {
    Id: artist.id,
    Name: artist.name,
    Type: "MusicArtist",
    ChildCount: artist.albumCount,
    ImageTags: { Primary: artist.artworkTag }
  };
}

function playlistNode(playlist) {
  return {
    Id: playlist.id,
    Name: playlist.name,
    Type: "Playlist",
    ChildCount: playlist.trackCount,
    ImageTags: { Primary: playlist.artworkTag }
  };
}

function trackNode(track) {
  return {
    Id: track.id,
    Name: track.title,
    Type: "Audio",
    AlbumId: track.albumId,
    Album: track.albumName,
    Artists: [track.artistName],
    RunTimeTicks: track.durationTicks,
    ImageTags: { Primary: track.artworkTag },
    AlbumPrimaryImageTag: track.artworkTag,
    UserData: { IsFavorite: track.isFavorite, PlayCount: track.playCount },
    Container: track.container,
    MediaSources: [{ Container: track.container, Bitrate: track.bitrate ? track.bitrate * 1000 : undefined }],
    DateCreated: track.dateCreated,
    PlaylistItemId: track.playlistItemId
  };
}

function filteredTracks(query) {
  let result = [...tracks];
  if (query.get("filters") === "IsFavorite") result = result.filter((track) => track.isFavorite);

  const parentId = query.get("parentId");
  if (parentId) {
    if (tracksByAlbum.has(parentId)) result = tracksByAlbum.get(parentId);
    else if (tracksByArtist.has(parentId)) result = tracksByArtist.get(parentId);
  }

  const artistIds = query.get("artistIds");
  if (artistIds) {
    const [artistId] = artistIds.split(",");
    if (tracksByArtist.has(artistId)) result = tracksByArtist.get(artistId);
  }

  const searchTerm = query.get("searchTerm");
  if (searchTerm) {
    const needle = searchTerm.toLowerCase();
    result = tracks.filter((track) => `${track.title} ${track.artistName} ${track.albumName}`.toLowerCase().includes(needle));
  }

  const sortBy = query.get("sortBy");
  const sortOrder = query.get("sortOrder") ?? "Ascending";
  const compare = (a, b) => {
    if (sortBy === "DateCreated") return Date.parse(a.dateCreated) - Date.parse(b.dateCreated);
    if (sortBy === "Album") return a.albumName.localeCompare(b.albumName) || a.title.localeCompare(b.title);
    if (sortBy === "Artist") return a.artistName.localeCompare(b.artistName) || a.title.localeCompare(b.title);
    if (sortBy === "ParentIndexNumber,IndexNumber,SortName") return a.title.localeCompare(b.title);
    if (sortBy === "Album,ParentIndexNumber,IndexNumber,SortName") return a.albumName.localeCompare(b.albumName) || a.title.localeCompare(b.title);
    return a.title.localeCompare(b.title);
  };
  result = [...result].sort((a, b) => (sortOrder === "Descending" ? -compare(a, b) : compare(a, b)));

  const startIndex = Number(query.get("startIndex") ?? 0);
  const limit = query.get("limit");
  const total = result.length;
  if (limit) result = result.slice(startIndex, startIndex + Number(limit));
  return { items: result.map(trackNode), total };
}

function makeResponse(status, body, headers = {}) {
  return {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body)
  };
}

function routePayload(url, method) {
  const { pathname, searchParams } = url;
  if (pathname === "/System/Info/Public") return makeResponse(200, { ServerName: "Mock Jellyfin", Version: "10.0.0" });
  if (pathname === "/Users/user-1/Views") return makeResponse(200, { Items: [{ Id: libraryId, Name: "Music", CollectionType: "music" }] });

  if (pathname === "/Users/user-1/Items" && searchParams.get("includeItemTypes") === "MusicAlbum") {
    return makeResponse(200, toItemResponse(albums.map(albumNode)));
  }
  if (pathname === "/Users/user-1/Items" && searchParams.get("includeItemTypes") === "MusicArtist") {
    return makeResponse(200, toItemResponse(artists.map(artistNode)));
  }
  if (pathname === "/Users/user-1/Items" && searchParams.get("includeItemTypes") === "Audio" && searchParams.get("searchTerm")) {
    const needle = searchParams.get("searchTerm").toLowerCase();
    const matchedAlbums = albums.filter((album) => `${album.name} ${album.artistName}`.toLowerCase().includes(needle)).map(albumNode);
    const matchedArtists = artists.filter((artist) => artist.name.toLowerCase().includes(needle)).map(artistNode);
    const matchedTracks = tracks.filter((track) => `${track.title} ${track.artistName} ${track.albumName}`.toLowerCase().includes(needle)).map(trackNode);
    return makeResponse(200, toItemResponse([...matchedArtists, ...matchedAlbums, ...matchedTracks]));
  }
  if (pathname === "/Users/user-1/Items" && searchParams.get("includeItemTypes") === "Audio") {
    const { items, total } = filteredTracks(searchParams);
    return makeResponse(200, { Items: items, TotalRecordCount: total });
  }
  if (pathname === "/Users/user-1/Items" && searchParams.get("includeItemTypes") === "Playlist") {
    return makeResponse(200, toItemResponse(playlists.map(playlistNode)));
  }
  if (pathname === "/Users/user-1/Items" && searchParams.get("parentId") && searchParams.get("includeItemTypes") === "MusicAlbum") {
    const parent = searchParams.get("parentId");
    const list = albums.filter((album) => album.artistId === parent || parent === libraryId).map(albumNode);
    return makeResponse(200, toItemResponse(list));
  }

  if (pathname === "/Playlists/playlist-1/Items") return makeResponse(200, { Items: playlistTracks.get("playlist-1").map(trackNode), TotalRecordCount: playlistTracks.get("playlist-1").length });
  if (pathname === "/Playlists/playlist-2/Items") return makeResponse(200, { Items: playlistTracks.get("playlist-2").map(trackNode), TotalRecordCount: playlistTracks.get("playlist-2").length });
  if (pathname === "/Playlists" && method === "GET") return makeResponse(200, toItemResponse(playlists.map(playlistNode)));

  if (pathname.startsWith("/Items/") && pathname.endsWith("/Images/Primary")) {
    const id = pathname.split("/")[2];
    const meta = [...albums, ...artists, ...playlists].find((item) => item.id === id) ?? { id, name: id, artistName: "" };
    return { status: 200, headers: { "content-type": "image/svg+xml; charset=utf-8" }, body: artSvg(meta.name, meta.artistName ?? "", id) };
  }
  if (pathname.startsWith("/Audio/") && pathname.endsWith("/universal")) {
    return { status: 200, headers: { "content-type": "audio/wav" }, body: makeSilentWav(2) };
  }
  if (pathname === "/Sessions/Playing" || pathname === "/Sessions/Playing/Progress" || pathname === "/Sessions/Playing/Stopped") return makeResponse(204, "");
  if (pathname.startsWith("/Items/") && method === "DELETE") return makeResponse(204, "");
  if (pathname.startsWith("/Playlists/") && method === "DELETE") return makeResponse(204, "");
  if (pathname.startsWith("/Playlists/") && method === "POST") return makeResponse(200, { Id: "playlist-new" });
  if (pathname === "/Playlists" && method === "POST") return makeResponse(200, { Id: "playlist-new" });
  if (pathname === "/Users/AuthenticateByName" && method === "POST") return makeResponse(200, { AccessToken: "token-123", User: { Id: "user-1", Name: "Mar" } });
  return null;
}

async function setupContext(context, withSession) {
  await context.addInitScript(({ session, withSession, storageKeys }) => {
    localStorage.setItem(storageKeys.theme, "original");
    localStorage.setItem(storageKeys.immersivePlayerBackground, "true");
    localStorage.setItem(storageKeys.searchHistory, JSON.stringify(["night drive", "midnight signal", "static horizon"]));
    localStorage.setItem(storageKeys.recentActivity, JSON.stringify([
      { id: "album-1", name: "Night Drive", artistName: "Midnight Runner", artworkId: "album-1", artworkTag: "album-1-tag", format: "flac", type: "album", lastPlayed: "2026-05-31T18:30:00.000Z" },
      { id: "playlist-1", name: "Late Night Mix", artworkId: "playlist-1", artworkTag: "playlist-1-tag", type: "playlist", lastPlayed: "2026-05-31T17:10:00.000Z" }
    ]));
    if (withSession) localStorage.setItem(storageKeys.session, JSON.stringify(session));
    else localStorage.removeItem(storageKeys.session);
    sessionStorage.clear();
  }, { session, withSession, storageKeys });
}

async function installRoutes(page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.origin === mockBase) {
      const payload = routePayload(url, method);
      if (payload) return route.fulfill(payload);
      return route.fulfill({ status: 404, body: "Not found" });
    }
    if (url.hostname === "lrclib.net") {
      return route.fulfill({
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          syncedLyrics: "[00:00.00] midnight signal\n[00:12.00] neon wakes the avenue\n[00:26.00] we drive until the city bends\n[00:40.00] into the static horizon\n[00:55.00] the night keeps moving",
          plainLyrics: "Midnight signal, neon wakes the avenue."
        })
      });
    }
    return route.continue();
  });
}

async function navigateSpa(page, pathname) {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, pathname);
  await page.waitForLoadState("networkidle");
}

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--disable-gpu"]
});

const files = [];
const loginContext = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const loginPage = await loginContext.newPage();
await setupContext(loginContext, false);
await installRoutes(loginPage);
await loginPage.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
files.push(path.join(outDir, "01-login.png"));
await loginPage.screenshot({ path: files[0], fullPage: false });
await loginContext.close();

const appContext = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const appPage = await appContext.newPage();
await setupContext(appContext, true);
await installRoutes(appPage);

await appPage.goto(`${baseURL}/home`, { waitUntil: "networkidle" });
await appPage.getByRole("button", { name: "SHUFFLE ALL" }).click();
await appPage.waitForTimeout(500);
files.push(path.join(outDir, "02-home.png"));
await appPage.screenshot({ path: files[1], fullPage: false });

await navigateSpa(appPage, "/search");
await appPage.getByPlaceholder("TYPE TO SEARCH...").fill("night");
await appPage.waitForTimeout(700);
files.push(path.join(outDir, "03-search.png"));
await appPage.screenshot({ path: files[2], fullPage: false });

await navigateSpa(appPage, "/library/albums/album-1");
files.push(path.join(outDir, "04-album-detail.png"));
await appPage.screenshot({ path: files[3], fullPage: false });

await navigateSpa(appPage, "/now-playing");
await appPage.getByRole("button", { name: "!!! LYRICS !!!" }).click();
await appPage.waitForTimeout(500);
files.push(path.join(outDir, "05-now-playing.png"));
await appPage.screenshot({ path: files[4], fullPage: false });
await appContext.close();

/*
files.push(await capture(browser, "02-home", true, "/home", async (page) => {
  await page.getByRole("button", { name: "SHUFFLE ALL" }).click();
  await page.waitForTimeout(500);
}));
files.push(await capture(browser, "03-search", true, "/search", async (page) => {
  await page.getByPlaceholder("TYPE TO SEARCH...").fill("night");
  await page.waitForTimeout(700);
}));
files.push(await capture(browser, "04-album-detail", true, "/library/albums/album-1"));
files.push(await capture(browser, "05-now-playing", true, "/now-playing", async (page) => {
  await page.getByRole("button", { name: "!!! LYRICS !!!" }).click();
  await page.waitForTimeout(500);
}));
*/

await browser.close();
console.log(files.join("\n"));
