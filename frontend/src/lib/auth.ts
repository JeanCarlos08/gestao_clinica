export interface LoggedUserProfile {
  username: string;
  role: string;
  displayName: string;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "==".slice((normalized.length + 3) % 4);

  if (typeof atob === "function") {
    return atob(padded);
  }

  throw new Error("Base64 decode not available");
}

export function getLoggedUserProfile(token: string | null): LoggedUserProfile {
  if (!token) {
    return {
      username: "",
      role: "",
      displayName: "Usuário",
    };
  }

  try {
    const payload = token.split(".")[1];
    if (!payload) {
      throw new Error("Token sem payload");
    }

    const decoded = JSON.parse(decodeBase64Url(payload)) as { sub?: string; role?: string };
    const username = decoded.sub?.trim() || "";
    const role = decoded.role?.trim() || "";

    return {
      username,
      role,
      displayName: buildDisplayName(username),
    };
  } catch {
    return {
      username: "",
      role: "",
      displayName: "Usuário",
    };
  }
}

export function buildDisplayName(value: string): string {
  if (!value) return "Usuário";
  return value
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function getUserInitials(value: string): string {
  const normalized = buildDisplayName(value);
  const initials = normalized
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials || "?";
}

// ── Refresh Token ─────────────────────────────────────────

export function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const decoded = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function hasRole(token: string | null, requiredRole: string): boolean {
  if (!token) return false;
  const profile = getLoggedUserProfile(token);
  if (!profile.role) return false;
  const roleHierarchy: Record<string, number> = { admin: 3, manager: 2, viewer: 1 };
  const userLevel = roleHierarchy[profile.role] ?? 0;
  const requiredLevel = roleHierarchy[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

export function requireAuth(): boolean {
  const token = localStorage.getItem("token");
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("token");
    clearRefreshToken();
    window.location.href = "/";
    return false;
  }
  return true;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
}

export function setRefreshToken(token: string): void {
  localStorage.setItem("refresh_token", token);
}

export function clearRefreshToken(): void {
  localStorage.removeItem("refresh_token");
}

export async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    if (data.refresh_token) setRefreshToken(data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}
