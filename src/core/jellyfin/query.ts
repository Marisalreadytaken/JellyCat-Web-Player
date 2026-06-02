export function encodeQuery(items: Array<[string, string | number | undefined | null]>): string {
  const params = new URLSearchParams();
  for (const [key, value] of items) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  return params.toString();
}
