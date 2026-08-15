"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { segmentLabel, SPORTS } from "../../lib/sports";
import {
  matchStatusLine,
  teamKeyForSide,
  winnerReady,
  type Match,
  type Side,
} from "../../lib/match";
import { matchApi, savedScorekeeperToken, shareMatch } from "../match-client";
import { useLiveMatch } from "../hooks/use-live-match";
import { LiveBoard, type GestureFeedback, type ScoreGesture } from "./live-board";
import {
  EditTeamsDialog,
  KeeperSettingsDialog,
  ResetMatchDialog,
  type KeeperPreferences,
} from "./keeper-dialogs";
import { ConnectionStatus, MatchError, MatchLoading, Notification } from "./ui";

type KeeperDialog = "teams" | "settings" | "reset" | null;
type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

export function KeepView({ code, onHome }: { code: string; onHome: () => void }) {
  const pending = useRef(0);
  const { match, setMatch, connection, lastReceivedAt, error } = useLiveMatch(code, pending);
  const [token, setToken] = useState("");
  const [dialog, setDialog] = useState<KeeperDialog>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [feedback, setFeedback] = useState<GestureFeedback>(null);
  const [preferences, setPreferences] = useState<KeeperPreferences>({ fullscreen: true, wakeLock: true });
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const queue = useRef(Promise.resolve());
  const feedbackId = useRef(0);
  const wakeLock = useRef<WakeLockSentinelLike | null>(null);
  const dismissNotice = useCallback(() => setNotice(""), []);

  useEffect(() => {
    const hashToken = new URLSearchParams(window.location.hash.slice(1)).get("key") || "";
    const stored = sessionStorage.getItem(`scorekeeper:${code}`) || savedScorekeeperToken(code);
    const next = hashToken || stored;
    if (next) sessionStorage.setItem(`scorekeeper:${code}`, next);
    const timer = window.setTimeout(() => setToken(next), 0);
    return () => window.clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreferences({
        fullscreen: localStorage.getItem("scorekeeper:fullscreen") !== "0",
        wakeLock: localStorage.getItem("scorekeeper:wake-lock") !== "0",
      });
      setFullscreenActive(Boolean(document.fullscreenElement));
    }, 0);
    const updateFullscreen = () => setFullscreenActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("fullscreenchange", updateFullscreen);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const nav = navigator as WakeLockNavigator;
    async function acquire() {
      if (!preferences.wakeLock || document.visibilityState !== "visible" || wakeLock.current || !nav.wakeLock) return;
      try {
        const sentinel = await nav.wakeLock.request("screen");
        if (cancelled) return void await sentinel.release();
        wakeLock.current = sentinel;
        sentinel.addEventListener("release", () => { wakeLock.current = null; });
      } catch {
        wakeLock.current = null;
      }
    }
    const visibilityChanged = () => { if (document.visibilityState === "visible") void acquire(); };
    void acquire();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", visibilityChanged);
      void wakeLock.current?.release().catch(() => undefined);
      wakeLock.current = null;
    };
  }, [preferences.wakeLock]);

  const send = useCallback(async (payload: Record<string, unknown>) => {
    if (!token) throw new Error("The private scorekeeper key is missing");
    const result = await matchApi<{ match: Match }>(`/api/v1/matches/${code}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    setMatch(result.match);
  }, [code, token, setMatch]);

  function point(side: Side, amount: number) {
    if (!match || match.status === "complete") return;
    pending.current += 1;
    if (match.sport !== "tennis") setMatch((current) => {
      if (!current) return current;
      const key = teamKeyForSide(current, side) === "a" ? "teamA" : "teamB";
      return { ...current, [key]: { ...current[key], points: Math.max(0, current[key].points + amount) } };
    });
    queue.current = queue.current
      .then(() => send({ action: "point", side, amount }))
      .catch((reason) => setNotice(reason instanceof Error ? reason.message : "Score did not save"))
      .finally(() => { pending.current -= 1; });
  }

  function setWin(side: Side, amount: number) {
    if (!match) return;
    pending.current += 1;
    setMatch((current) => {
      if (!current) return current;
      const teamKey = teamKeyForSide(current, side);
      const key = teamKey === "a" ? "teamA" : "teamB";
      const nextSets = Math.min(current.setsToWin, Math.max(0, current[key].sets + amount));
      const otherSets = teamKey === "a" ? current.teamB.sets : current.teamA.sets;
      const status = SPORTS[current.sport].unit === "set" && Math.max(nextSets, otherSets) >= current.setsToWin ? "complete" : "live";
      return { ...current, [key]: { ...current[key], sets: nextSets }, status };
    });
    queue.current = queue.current
      .then(() => send({ action: "setCount", side, amount }))
      .catch((reason) => setNotice(reason instanceof Error ? reason.message : "Set count did not save"))
      .finally(() => { pending.current -= 1; });
  }

  function ensureFullscreen() {
    if (!preferences.fullscreen || document.fullscreenElement) return;
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  function showGestureFeedback(side: Side, text: string) {
    const id = ++feedbackId.current;
    setFeedback({ id, side, text });
    window.setTimeout(() => setFeedback((current) => current?.id === id ? null : current), 520);
  }

  function gesture(side: Side, kind: ScoreGesture, amount: number) {
    if (busy) return;
    ensureFullscreen();
    navigator.vibrate?.(12);
    if (kind === "point") {
      point(side, amount);
      showGestureFeedback(side, amount > 0 ? `+${amount}` : "UNDO");
    } else {
      setWin(side, amount);
      showGestureFeedback(side, amount > 0 ? "WIN +1" : "WIN −1");
    }
  }

  function togglePreference(key: keyof KeeperPreferences) {
    const next = !preferences[key];
    setPreferences((current) => ({ ...current, [key]: next }));
    localStorage.setItem(key === "fullscreen" ? "scorekeeper:fullscreen" : "scorekeeper:wake-lock", next ? "1" : "0");
    if (key !== "fullscreen") return;
    if (next) void document.documentElement.requestFullscreen?.().catch(() => undefined);
    else if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
  }

  async function run(payload: Record<string, unknown>, message = "") {
    setBusy(true);
    setNotice("");
    try {
      await queue.current;
      await send(payload);
      if (message) setNotice(message);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Unable to update the match");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <MatchError message={error} />;
  if (!match) return <MatchLoading message="Opening the scorekeeper" />;
  if (!token) return <MatchError message="This link can watch the score, but it does not include the private scorekeeper key." />;

  const ready = winnerReady(match);
  const readyName = ready === "a" ? match.teamA.name : ready === "b" ? match.teamB.name : "";
  const setScoring = ["volleyball", "pickleball", "badminton"].includes(match.sport);
  const automatic = match.sport === "tennis";
  const advanceLabel = match.currentSet >= match.bestOf ? "Finish game" : `End ${segmentLabel(match.sport, match.currentSet, match.bestOf)}`;

  return (
    <main className="match-shell keep-shell">
      <header className="match-header keep-header">
        <button className="home-icon" type="button" onClick={onHome} aria-label="Return to home">‹</button>
        <button className="keep-code" onClick={() => { void navigator.clipboard.writeText(match.code); setNotice("Match code copied"); }} aria-label={`Copy watch code ${match.code}`}><span>Code</span><b>{match.code}</b></button>
        <ConnectionStatus connection={connection} lastReceivedAt={lastReceivedAt} scoreUpdatedAt={match.updatedAt} />
        <button className="keeper-header-button" onClick={async () => { await shareMatch(match); setNotice("Viewer link shared"); }} aria-label="Share viewer link">↗</button>
      </header>
      <LiveBoard match={match} scorekeeper onGesture={gesture} feedback={feedback} />
      <nav className="keeper-controls" aria-label="Match controls">
        <button onClick={() => void run({ action: "swap" })} disabled={busy} aria-label="Swap team sides"><span aria-hidden="true">⇄</span><small>Sides</small></button>
        <button onClick={() => setDialog("teams")} disabled={busy} aria-label="Edit teams"><span aria-hidden="true">✎</span><small>Teams</small></button>
        <button className={ready || (!setScoring && !automatic) ? "finish-ready" : ""} onClick={() => setScoring ? ready && void run({ action: "finishSet", winner: ready }, "Game recorded") : !automatic && void run({ action: "advance" }, match.currentSet >= match.bestOf ? "Final recorded" : "Segment recorded")} disabled={(setScoring && !ready) || automatic || busy}>{setScoring ? (ready ? `Finish · ${readyName}` : `${segmentLabel(match.sport, match.currentSet, match.bestOf)} · ${match.currentTarget}`) : automatic ? matchStatusLine(match) : advanceLabel}</button>
        <button onClick={() => setDialog("settings")} aria-label="Scorekeeper settings"><span aria-hidden="true">⚙</span><small>Settings</small></button>
      </nav>
      <Notification message={notice} onDismiss={dismissNotice} />
      {dialog === "teams" && <EditTeamsDialog match={match} onClose={() => setDialog(null)} onSave={(values) => run(values)} />}
      {dialog === "settings" && <KeeperSettingsDialog preferences={preferences} fullscreenActive={fullscreenActive} onToggle={togglePreference} onRequestReset={() => setDialog("reset")} onClose={() => setDialog(null)} />}
      {dialog === "reset" && <ResetMatchDialog onCancel={() => setDialog(null)} onConfirm={() => { setDialog(null); void run({ action: "reset" }, "Match reset"); }} />}
    </main>
  );
}
