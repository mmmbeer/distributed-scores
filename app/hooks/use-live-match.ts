"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionState, Match } from "../../lib/match";
import { matchApi } from "../match-client";

const RECONNECTING_AFTER_MS = 25_000;
const OFFLINE_AFTER_MS = 60_000;
const FALLBACK_POLL_MS = 30_000;

export function useLiveMatch(code: string, pendingChanges?: { readonly current: number }) {
  const [match, setMatch] = useState<Match | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [lastReceivedAt, setLastReceivedAt] = useState<number | null>(null);
  const [error, setError] = useState(code.length === 6 ? "" : "That match code is not valid");
  const lastReceivedRef = useRef<number | null>(null);
  const connectionRef = useRef<ConnectionState>("connecting");

  const updateConnection = useCallback((next: ConnectionState) => {
    connectionRef.current = next;
    setConnection(next);
  }, []);

  const markReceived = useCallback(() => {
    const receivedAt = Date.now();
    lastReceivedRef.current = receivedAt;
    setLastReceivedAt(receivedAt);
    updateConnection("live");
  }, [updateConnection]);

  const load = useCallback(async () => {
    const result = await matchApi<{ match: Match }>(`/api/v1/matches/${code}`);
    if (!pendingChanges || pendingChanges.current === 0) setMatch(result.match);
    setError("");
    markReceived();
    return result.match;
  }, [code, markReceived, pendingChanges]);

  useEffect(() => {
    if (code.length !== 6) return;
    let active = true;
    let source: EventSource | null = null;

    function assessConnection() {
      const lastReceived = lastReceivedRef.current;
      if (!navigator.onLine || (lastReceived && Date.now() - lastReceived > OFFLINE_AFTER_MS)) {
        updateConnection("offline");
      } else if (!lastReceived || Date.now() - lastReceived > RECONNECTING_AFTER_MS) {
        updateConnection("reconnecting");
      }
    }

    async function connect() {
      try {
        await load();
        if (!active) return;
        source = new EventSource(`/api/v1/matches/${code}/events`);
        source.addEventListener("score", (event) => {
          const payload = JSON.parse((event as MessageEvent).data) as { match: Match };
          if (!pendingChanges || pendingChanges.current === 0) setMatch(payload.match);
          markReceived();
        });
        source.onopen = markReceived;
        source.onerror = assessConnection;
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Match not found");
      }
    }

    const initial = window.setTimeout(() => void connect(), 0);
    const fallback = window.setInterval(() => {
      if (document.visibilityState === "visible" && connectionRef.current !== "live") {
        void load().catch(assessConnection);
      }
    }, FALLBACK_POLL_MS);
    const watchdog = window.setInterval(assessConnection, 5_000);
    const online = () => void load().catch(assessConnection);
    const offline = () => updateConnection("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    return () => {
      active = false;
      window.clearTimeout(initial);
      source?.close();
      window.clearInterval(fallback);
      window.clearInterval(watchdog);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [code, load, markReceived, pendingChanges, updateConnection]);

  return { match, setMatch, connection, lastReceivedAt, error };
}
