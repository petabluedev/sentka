// Utility to build an API URL that can point to either the app's own routes
// or an external backend defined via environment variables.
type ApiUrlOptions = { origin?: string };

export function apiUrl(path: string, opts: ApiUrlOptions = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const base =
    process.env.SENTKA_API_BASE_URL ||
    process.env.NEXT_PUBLIC_SENTKA_API_BASE_URL ||
    opts.origin ||
    "";

  if (!base) return normalizedPath;

  const normalizedBase = base.endsWith("/")
    ? base.slice(0, -1)
    : base;

  return `${normalizedBase}${normalizedPath}`;
}
