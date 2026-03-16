import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function getToken() {
  return localStorage.getItem("sb_token");
}

export function setToken(token: string) {
  localStorage.setItem("sb_token", token);
}

export function clearToken() {
  localStorage.removeItem("sb_token");
}

export async function apiRequest(method: string, path: string, body?: unknown) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Error del servidor");
  }
  return res.json();
}
