export function fingerprint(value: unknown): string {
  return JSON.stringify(value);
}
