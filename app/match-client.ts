import type { Match } from "../lib/match";

export type SavedScorekeeperSession = { code: string; token: string; createdAt: string };
export type ViewMode = "home" | "watch" | "keep" | "developers";

const RECENT_SCOREKEEPER_KEY = "scorekeeper:recent-sessions";

export async function matchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Unable to load the match");
  return data;
}

export function readSavedScorekeeperSessions(): SavedScorekeeperSession[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_SCOREKEEPER_KEY) || "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is SavedScorekeeperSession => Boolean(
      item && typeof item === "object" &&
      typeof (item as SavedScorekeeperSession).code === "string" &&
      typeof (item as SavedScorekeeperSession).token === "string" &&
      typeof (item as SavedScorekeeperSession).createdAt === "string",
    )).slice(0, 20);
  } catch {
    return [];
  }
}

export function saveScorekeeperSession(code: string, token: string) {
  try {
    const sessions = readSavedScorekeeperSessions().filter((session) => session.code !== code);
    sessions.unshift({ code, token, createdAt: new Date().toISOString() });
    localStorage.setItem(RECENT_SCOREKEEPER_KEY, JSON.stringify(sessions.slice(0, 20)));
  } catch {
    // Device-local storage can be unavailable in restrictive browsing modes.
  }
}

export function savedScorekeeperToken(code: string) {
  return readSavedScorekeeperSessions().find((session) => session.code === code)?.token || "";
}

export function routeFromLocation(): { mode: ViewMode; code: string } {
  if (typeof window === "undefined") return { mode: "home", code: "" };
  const [, segment = "", code = ""] = window.location.pathname.split("/");
  if (segment === "watch") return { mode: "watch", code: code.toUpperCase() };
  if (segment === "keep") return { mode: "keep", code: code.toUpperCase() };
  if (segment === "developers") return { mode: "developers", code: "" };
  return { mode: "home", code: "" };
}

export function shareMatch(match: Match) {
  const url = `${window.location.origin}/watch/${match.code}`;
  if (navigator.share) {
    return navigator.share({
      title: `${match.teamA.name} vs ${match.teamB.name}`,
      text: `Watch the live score. Code: ${match.code}`,
      url,
    }).catch(() => undefined);
  }
  return navigator.clipboard.writeText(url);
}
