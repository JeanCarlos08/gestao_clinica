import { tryRefreshToken, clearRefreshToken } from "./auth";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    throw new Error("No token");
  }

  const headers = { ...options.headers, Authorization: `Bearer ${token}` };
  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      const retryHeaders = { ...options.headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(url, { ...options, headers: retryHeaders });
    }
    if (!newToken || res.status === 401) {
      localStorage.removeItem("token");
      clearRefreshToken();
      window.location.href = "/";
      throw new Error("Session expired");
    }
  }

  return res;
}

export async function swrFetcher(url: string) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return [];
  }

  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (res.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      res = await fetch(url, { headers: { Authorization: `Bearer ${newToken}` } });
    }
    if (!newToken || res.status === 401) {
      localStorage.removeItem("token");
      clearRefreshToken();
      window.location.href = "/";
      return [];
    }
  }

  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText} for ${url}`);
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export { API };
