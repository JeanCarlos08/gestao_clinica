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
