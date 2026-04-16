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
  const hasBody = init?.body !== undefined && init.body !== null;
  const baseHeaders: Record<string, string> = hasBody
    ? { "Content-Type": "application/json" }
    : {};

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...baseHeaders,
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

/**
 * Start an OAuth sign-in flow via Auth.js.
 *
 * Auth.js expects a POST to `/api/auth/signin/:provider` with a CSRF token in
 * the request body. A GET to that path is handled by Auth.js's built-in
 * sign-in page renderer, which we don't use and which throws `UnknownAction`.
 *
 * We fetch the CSRF token, then submit a hidden form so the browser follows
 * the 302 redirect to the provider.
 */
export async function signInWithProvider(
  provider: "github" | "google",
  options: { callbackUrl?: string } = {},
): Promise<void> {
  const csrfResponse = await fetch(`${API_BASE}/api/auth/csrf`, {
    credentials: "include",
  });
  if (!csrfResponse.ok) {
    throw new Error(`Failed to fetch CSRF token (${csrfResponse.status})`);
  }
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const callbackUrl = options.callbackUrl ?? window.location.href;

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${API_BASE}/api/auth/signin/${provider}`;

  const csrfInput = document.createElement("input");
  csrfInput.type = "hidden";
  csrfInput.name = "csrfToken";
  csrfInput.value = csrfToken;
  form.appendChild(csrfInput);

  const callbackInput = document.createElement("input");
  callbackInput.type = "hidden";
  callbackInput.name = "callbackUrl";
  callbackInput.value = callbackUrl;
  form.appendChild(callbackInput);

  document.body.appendChild(form);
  form.submit();
}
