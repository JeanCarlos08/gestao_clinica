import { NextRequest } from "next/server";

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export function slugName(name: string): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function extractGoogleDocId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const patterns = [
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{20,})$/,
  ];
  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function buildGoogleDocEmbedUrl(docId: string): string {
  return `https://docs.google.com/document/d/${docId}/edit?usp=sharing`;
}

export function buildGoogleDocViewUrl(docId: string): string {
  return `https://docs.google.com/document/d/${docId}/view`;
}

export function formatDateBr(value: string): string {
  if (!value) return "";
  for (const fmt of ["YYYY-MM-DD", "DD/MM/YYYY"]) {
    try {
      if (fmt === "YYYY-MM-DD") {
        const [y, m, d] = value.split("-");
        return `${d}/${m}/${y}`;
      }
      return value;
    } catch {
      continue;
    }
  }
  return value;
}

export function jsonOk(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return Response.json({ detail: message }, { status });
}
