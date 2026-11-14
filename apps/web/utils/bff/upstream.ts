/**
 * URL base del backend Express (incluye sufijo /api).
 * Solo para Route Handlers del BFF en servidor.
 */
export function getApiUpstreamUrl(): string {
  const fromEnv =
    process.env.API_UPSTREAM_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000/api";
  return fromEnv.replace(/\/$/, "");
}
