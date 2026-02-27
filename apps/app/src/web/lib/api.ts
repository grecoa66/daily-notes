const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN;

function resolveApiBase(): string {
  if (typeof window === "undefined") {
    return configuredApiOrigin ?? "";
  }

  return "";
}

const API_BASE = resolveApiBase();

export function getApiBase(): string {
  return API_BASE;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
