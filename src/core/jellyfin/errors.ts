export class JellyfinRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly diagnostic?: string
  ) {
    super(message);
    this.name = "JellyfinRequestError";
  }
}

export function maybeCorsDiagnostic(error: unknown, serverUrl?: string): string {
  if (error instanceof TypeError) {
    return `Could not reach ${serverUrl ?? "the Jellyfin server"}. If it works in native apps, this browser may be blocked by CORS or mixed-content policy.`;
  }
  return "Could not complete the Jellyfin request. Try again or check the server connection.";
}

export function friendlyErrorMessage(error: unknown, fallback = "Something went wrong. Try again."): string {
  if (error instanceof JellyfinRequestError) return error.message;
  if (error instanceof TypeError) return maybeCorsDiagnostic(error);
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.includes("CORS") || message.includes("mixed-content")) return message;
  }
  return fallback;
}
