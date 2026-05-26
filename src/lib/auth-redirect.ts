const PUBLIC_SITE_ORIGIN = "https://www.wayhomeoficial.com.br";

function normalizeOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getAuthRedirectUrl(path: `/${string}`): string {
  const configuredOrigin = normalizeOrigin(import.meta.env.VITE_SITE_URL);
  if (configuredOrigin) return `${configuredOrigin}${path}`;

  if (typeof window === "undefined") return `${PUBLIC_SITE_ORIGIN}${path}`;

  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  const origin = isLocal ? PUBLIC_SITE_ORIGIN : window.location.origin;
  return `${origin.replace(/\/$/, "")}${path}`;
}