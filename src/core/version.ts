export const appVersion = __APP_VERSION__;

const latestReleaseUrl = "https://api.github.com/repos/Mariano14782/JellyCat-Web-Player/releases/latest";

type ReleaseResponse = {
  tag_name?: string;
  draft?: boolean;
  prerelease?: boolean;
};

type Semver = {
  major: number;
  minor: number;
  patch: number;
};

export function normalizeVersion(version: string | undefined): string | undefined {
  const match = version?.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/i);
  if (!match) return undefined;
  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`;
}

function parseSemver(version: string | undefined): Semver | undefined {
  const normalized = normalizeVersion(version);
  if (!normalized) return undefined;
  const [major, minor, patch] = normalized.split(".").map(Number);
  return { major, minor, patch };
}

export function isNewerVersion(candidate: string | undefined, current = appVersion): boolean {
  const next = parseSemver(candidate);
  const active = parseSemver(current);
  if (!next || !active) return false;

  if (next.major !== active.major) return next.major > active.major;
  if (next.minor !== active.minor) return next.minor > active.minor;
  return next.patch > active.patch;
}

export async function fetchLatestVersion(): Promise<string | undefined> {
  const response = await fetch(latestReleaseUrl, {
    headers: {
      Accept: "application/vnd.github+json"
    }
  });

  if (!response.ok) return undefined;

  const release = (await response.json()) as ReleaseResponse;
  if (release.draft || release.prerelease) return undefined;

  return normalizeVersion(release.tag_name);
}

