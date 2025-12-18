/**
 * Compute the external base URL (origin) for this deployment.
 *
 * Priority:
 * 1) PRODUCTION_BASE_URL (explicit, should include protocol, e.g. https://app.example.com)
 * 2) VERCEL_URL (provided by Vercel, host only - we prefix https://)
 * 3) REPLIT_DOMAINS / REPLIT_DOMAIN (backward compatibility)
 * 4) http://localhost:5000 (local dev)
 */
export function getBaseUrl(): string {
  const explicit = process.env.PRODUCTION_BASE_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, ""); // trim trailing slash
  }

  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel}`.replace(/\/+$/, "");
  }

  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) {
    const first = replitDomains.split(",")[0];
    if (first) {
      return `https://${first}`.replace(/\/+$/, "");
    }
  }

  const replitDomain = process.env.REPLIT_DOMAIN;
  if (replitDomain) {
    return `https://${replitDomain}`.replace(/\/+$/, "");
  }

  return "http://localhost:5000";
}



