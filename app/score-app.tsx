"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { segmentLabel, SPORT_IDS, SPORTS, tennisPointLabel, type Sport } from "../lib/sports";

type TeamKey = "a" | "b";
type Side = "left" | "right";
type Team = { name: string; color: string; points: number; sets: number };
type CompletedSet = { setNumber: number; teamAScore: number; teamBScore: number; winner: TeamKey };
type Match = {
  code: string;
  sport: Sport;
  teamA: Team;
  teamB: Team;
  leftTeamKey: TeamKey;
  bestOf: number;
  setsToWin: number;
  currentSet: number;
  currentTarget: number;
  status: "live" | "complete";
  version: number;
  updatedAt: string;
  expiresAt: string;
  sets: CompletedSet[];
  state: { gamesA?: number; gamesB?: number; tiebreak?: boolean; target?: number };
};

type SavedScorekeeperSession = { code: string; token: string; createdAt: string };
type OwnedActiveSession = { match: Match; token: string };

type ViewMode = "home" | "watch" | "keep" | "developers";
type ConnectionState = "connecting" | "live" | "reconnecting" | "offline";
const COLORS = ["#D84C3F", "#3657B3", "#137B6C", "#E8902E", "#7048A8", "#202632", "#B52B63", "#7A8B36"];
const RECENT_SCOREKEEPER_KEY = "scorekeeper:recent-sessions";

function readSavedScorekeeperSessions(): SavedScorekeeperSession[] {
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

function saveScorekeeperSession(code: string, token: string) {
  try {
    const sessions = readSavedScorekeeperSessions().filter((session) => session.code !== code);
    sessions.unshift({ code, token, createdAt: new Date().toISOString() });
    localStorage.setItem(RECENT_SCOREKEEPER_KEY, JSON.stringify(sessions.slice(0, 20)));
  } catch {
    // Private browsing modes may prevent device-local storage.
  }
}

function savedScorekeeperToken(code: string) {
  return readSavedScorekeeperSessions().find((session) => session.code === code)?.token || "";
}

function routeFromLocation(): { mode: ViewMode; code: string } {
  if (typeof window === "undefined") return { mode: "home", code: "" };
  const [, segment = "", code = ""] = window.location.pathname.split("/");
  if (segment === "watch") return { mode: "watch", code: code.toUpperCase() };
  if (segment === "keep") return { mode: "keep", code: code.toUpperCase() };
  if (segment === "developers") return { mode: "developers", code: "" };
  return { mode: "home", code: "" };
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Unable to load the match");
  return data;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand ${compact ? "brand-compact" : ""}`} href="/" aria-label="Shared Scores home">
      <span className="brand-mark" aria-hidden="true"><Image src="/shared-scores-mark.png" alt="" width={42} height={42} priority unoptimized /></span>
      <span>Shared<strong>Scores</strong></span>
    </Link>
  );
}

function CodeInput({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  return (
    <div className="code-entry">
      <label htmlFor="share-code">Match code</label>
      <div className="code-entry-row">
        <input
          id="share-code"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 6))}
          placeholder="ABC123"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={6}
          aria-describedby="code-help"
          onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }}
        />
        <button className="button button-dark" onClick={onSubmit} disabled={value.length !== 6}>Watch live</button>
      </div>
      <span id="code-help">Enter the six-character code from the scorekeeper.</span>
    </div>
  );
}

function ScoreRail({ match, mode, onOpen }: { match: Match; mode: "watch" | "keep"; onOpen: () => void }) {
  const sides = getSides(match);
  const leftKey = match.leftTeamKey;
  const rightKey = leftKey === "a" ? "b" : "a";
  const label = mode === "keep" ? "Resume scoring" : "Watch score";
  return (
    <button className={`score-rail ${mode === "keep" ? "score-rail-owned" : ""}`} onClick={onOpen} aria-label={`${label}: ${sides.left.name} ${sides.left.points}, ${sides.right.name} ${sides.right.points}`}>
      <span className="score-rail-state"><i />{match.status === "complete" ? "Final" : "Live"}<small>{SPORTS[match.sport].name} · {segmentLabel(match.sport, match.currentSet, match.bestOf)}</small></span>
      <span className="score-rail-team" style={{ "--rail-color": sides.left.color } as React.CSSProperties}><i /><b>{sides.left.name}</b><strong>{displayScore(match, leftKey)}</strong><small>{secondaryScore(match, leftKey)}</small></span>
      <span className="score-rail-divider">:</span>
      <span className="score-rail-team" style={{ "--rail-color": sides.right.color } as React.CSSProperties}><i /><b>{sides.right.name}</b><strong>{displayScore(match, rightKey)}</strong><small>{secondaryScore(match, rightKey)}</small></span>
      <span className="score-rail-code"><small>{mode === "keep" ? "Scorekeeper" : "Code"}</small><b>{match.code}</b><i aria-hidden="true">→</i></span>
    </button>
  );
}

function HomeView({ onSetup, onWatch, onResume }: { onSetup: () => void; onWatch: (code: string) => void; onResume: (code: string, token: string) => void }) {
  const [code, setCode] = useState("");
  const [publicMatches, setPublicMatches] = useState<Match[]>([]);
  const [publicLoaded, setPublicLoaded] = useState(false);
  const [ownedSessions, setOwnedSessions] = useState<OwnedActiveSession[]>([]);
  const watch = () => { if (code.length === 6) onWatch(code); };

  useEffect(() => {
    let cancelled = false;
    async function refreshPublicMatches() {
      try {
        const result = await api<{ matches: Match[] }>("/api/v1/matches/recent");
        if (!cancelled) setPublicMatches(result.matches);
      } catch {
        if (!cancelled) setPublicMatches([]);
      } finally {
        if (!cancelled) setPublicLoaded(true);
      }
    }
    void refreshPublicMatches();
    const interval = window.setInterval(refreshPublicMatches, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const saved = readSavedScorekeeperSessions();
    async function loadOwnedSessions() {
      const loaded = await Promise.all(saved.map(async (session) => {
        try {
          const result = await api<{ match: Match }>(`/api/v1/matches/${session.code}`);
          return result.match.status === "live" ? { match: result.match, token: session.token } : null;
        } catch {
          return null;
        }
      }));
      if (!cancelled) {
        setOwnedSessions(loaded.filter((session): session is OwnedActiveSession => Boolean(session)).sort((a, b) => b.match.updatedAt.localeCompare(a.match.updatedAt)).slice(0, 5));
      }
    }
    void loadOwnedSessions();
    return () => { cancelled = true; };
  }, []);
  return (
    <main className="landing-shell">
      <header className="landing-header">
        <Brand />
        <nav><a href="#watch">Watch live</a><a href="#how-it-works">How it works</a><a href="/developers">Score API</a></nav>
        <button className="nav-start" onClick={onSetup}>Start scoring <span aria-hidden="true">↗</span></button>
      </header>

      <section className="arena-hero">
        <div className="arena-photo" role="img" aria-label="Rotating sideline action from volleyball, basketball, soccer, and tennis">
          <span className="hero-sport-photo hero-volleyball" />
          <span className="hero-sport-photo hero-basketball" />
          <span className="hero-sport-photo hero-soccer" />
          <span className="hero-sport-photo hero-tennis" />
        </div>
        <div className="arena-copy">
          <span className="sport-label"><i /> Live scorekeeping</span>
          <h1>Every point.<br /><em>Everywhere.</em></h1>
          <p>Run the scoreboard courtside. Share one link. Keep every remote viewer on the same score.</p>
          <div className="arena-actions">
            <button className="sport-button sport-button-primary" onClick={onSetup}>Start scoring <span aria-hidden="true">→</span></button>
            <a href="#watch">I have a match code</a>
          </div>
          <small>No account. No install. Just the score.</small>
          <div className="hero-sport-list" aria-label="Supported sports">Volleyball <i /> Basketball <i /> Football <i /> Tennis <i /> Baseball <i /> Hockey <i /> Soccer <i /> Pickleball <i /> Badminton</div>
        </div>
        <div className="hero-score" aria-label="Example live score: North Stars 23, Eagles 21">
          <div className="hero-score-status"><i /> Live <span>Set 2</span></div>
          <div className="hero-score-team"><span>North Stars</span><strong>23</strong><small>Sets 1</small></div>
          <b>:</b>
          <div className="hero-score-team"><span>Eagles</span><strong>21</strong><small>Sets 0</small></div>
          <div className="hero-score-code"><span>Watch code</span><strong>COURT</strong></div>
        </div>
        <div className="photo-credit hero-credit">Photos: <a href="https://unsplash.com/photos/volleyball-players-jump-to-hit-the-ball-over-the-net-ErPSzVX066Q" target="_blank" rel="noreferrer">N. Ketterer</a> · <a href="https://unsplash.com/photos/basketball-players-in-action-during-a-game-h9teyHyKvds" target="_blank" rel="noreferrer">S. Kessler</a> · <a href="https://unsplash.com/photos/soccer-players-in-action-during-an-outdoor-game-on-grass-B2HEmGkLsVY" target="_blank" rel="noreferrer">M. Protzen</a> · <a href="https://www.pexels.com/photo/tennis-player-in-action-on-outdoor-court-36231026/" target="_blank" rel="noreferrer">S. Mren</a></div>
      </section>

      <div className="score-ticker" aria-hidden="true">
        <div>
          <span>Point by point</span><i>◆</i><span>One live link</span><i>◆</i><span>Courtside fast</span><i>◆</i><span>Any screen</span><i>◆</i>
          <span>Point by point</span><i>◆</i><span>One live link</span><i>◆</i><span>Courtside fast</span><i>◆</i><span>Any screen</span><i>◆</i>
        </div>
      </div>

      <section className="score-lobby" aria-labelledby="scores-in-play-title">
        {ownedSessions.length > 0 && <div className="owned-sessions">
          <header><div><span className="section-kicker">This browser</span><h2>Your active scoreboards</h2></div><small>Private scorekeeper access stays on this device.</small></header>
          <div>{ownedSessions.map((session) => <ScoreRail key={session.match.code} match={session.match} mode="keep" onOpen={() => onResume(session.match.code, session.token)} />)}</div>
        </div>}
        <header className="score-lobby-header">
          <div><span className="section-kicker">Scores in play</span><h2 id="scores-in-play-title">Follow the action.</h2></div>
          <p>The 10 most recently updated public scoreboards. Select a matchup to watch live.</p>
        </header>
        <div className="public-score-list">
          {publicMatches.map((match) => <ScoreRail key={match.code} match={match} mode="watch" onOpen={() => onWatch(match.code)} />)}
          {publicLoaded && publicMatches.length === 0 && <div className="score-lobby-empty"><span>No public matches are active right now.</span><button onClick={onSetup}>Start the first one <i aria-hidden="true">→</i></button></div>}
        </div>
      </section>

      <section id="watch" className="watch-zone">
        <div className="watch-lead">
          <span className="section-kicker">Watching from away?</span>
          <h2>Jump into<br />the match.</h2>
          <p>Enter the six-character code from the scorekeeper. The scoreboard updates automatically.</p>
        </div>
        <CodeInput value={code} onChange={setCode} onSubmit={watch} />
      </section>

      <section id="how-it-works" className="play-flow">
        <header>
          <span className="section-kicker">From sideline to sofa</span>
          <h2>One phone.<br /><em>Every screen.</em></h2>
        </header>
        <ol>
          <li><b>01</b><div><h3>Set the matchup</h3><p>Choose the sport, name both sides and use the format built for that game.</p></div><span aria-hidden="true">→</span></li>
          <li><b>02</b><div><h3>Score at game speed</h3><p>Tap or swipe on either side. Big controls stay fast and readable courtside.</p></div><span aria-hidden="true">→</span></li>
          <li><b>03</b><div><h3>Send the code</h3><p>One link keeps everyone current, whether ten people watch or hundreds do.</p></div><span aria-hidden="true">→</span></li>
        </ol>
      </section>

      <section className="sideline-story">
        <div className="sideline-photo sideline-photo-action" role="img" aria-label="Indoor volleyball match in progress">
          <a className="photo-credit" href="https://www.pexels.com/photo/people-playing-volleyball-6203521/" target="_blank" rel="noreferrer">Photo: Pavel Danilyuk / Pexels</a>
        </div>
        <div className="sideline-copy">
          <span className="section-kicker">Built for the sideline</span>
          <h2>Nothing between you and the next point.</h2>
          <p>The scorekeeper view fills the phone, stays awake and puts every action under one thumb. Viewers get a clean scoreboard that follows along in real time.</p>
          <button className="sport-link" onClick={onSetup}>Start a scoreboard <span aria-hidden="true">↗</span></button>
        </div>
        <div className="sideline-photo sideline-photo-board" role="img" aria-label="Basketball game and arena scoreboard">
          <a className="photo-credit" href="https://unsplash.com/photos/basketball-game-in-progress-with-a-scoreboard-Rl8ZSwK4WnA" target="_blank" rel="noreferrer">Photo: Luke Miller / Unsplash</a>
        </div>
      </section>

      <section className="final-whistle">
        <div>
          <span className="sport-label"><i /> Ready for first serve?</span>
          <h2>Put the score<br />in everyone&apos;s hands.</h2>
        </div>
        <button className="sport-button sport-button-primary" onClick={onSetup}>Start scoring <span aria-hidden="true">→</span></button>
      </section>

      <footer className="landing-footer">
        <Brand compact />
        <p>Fast live scoring for courts, fields, rinks and diamonds.</p>
        <nav><a href="#watch">Watch a match</a><a href="/developers">Score API</a></nav>
      </footer>
    </main>
  );
}

function ColorPicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <fieldset className="color-picker">
      <legend>{label}</legend>
      <div>{COLORS.map((color) => (
        <button key={color} type="button" style={{ backgroundColor: color }} className={value === color ? "selected" : ""} onClick={() => onChange(color)} aria-label={`Choose ${color}`} aria-pressed={value === color} />
      ))}</div>
    </fieldset>
  );
}

function SetupModal({ onCancel, onCreated }: { onCancel: () => void; onCreated: (code: string) => void }) {
  const [sport, setSport] = useState<Sport>("volleyball");
  const [teamAName, setTeamAName] = useState("Home");
  const [teamBName, setTeamBName] = useState("Visitors");
  const [teamAColor, setTeamAColor] = useState(COLORS[0]);
  const [teamBColor, setTeamBColor] = useState(COLORS[1]);
  const [bestOf, setBestOf] = useState(3);
  const [target, setTarget] = useState(11);
  const [showOnHome, setShowOnHome] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLFormElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstInputRef.current?.focus();
    firstInputRef.current?.select();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onCancel]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const wantsFullscreen = localStorage.getItem("scorekeeper:fullscreen") !== "0";
    if (wantsFullscreen && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ match: Match; scorekeeperToken: string }>("/api/v1/matches", {
        method: "POST",
        body: JSON.stringify({ sport, teamAName, teamBName, teamAColor, teamBColor, bestOf, target, showOnHome }),
      });
      sessionStorage.setItem(`scorekeeper:${result.match.code}`, result.scorekeeperToken);
      saveScorekeeperSession(result.match.code, result.scorekeeperToken);
      onCreated(result.match.code);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the match");
      setBusy(false);
    }
  }

  return (
    <div className="setup-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <form ref={dialogRef} className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title" aria-describedby="setup-description" onSubmit={submit}>
        <header className="setup-modal-header">
          <span className="eyebrow"><i /> New {SPORTS[sport].name} scoreboard</span>
          <button className="setup-close" type="button" onClick={onCancel} aria-label="Close match setup">×</button>
        </header>
        <div className="setup-modal-intro">
          <h1 id="setup-title">Set the matchup</h1>
          <p id="setup-description">Choose a sport and set the two sides. Details appear on the public live score.</p>
        </div>
        <fieldset className="sport-picker">
          <legend>Sport</legend>
          <div>{SPORT_IDS.map((id) => <button key={id} type="button" className={sport === id ? "selected" : ""} aria-pressed={sport === id} onClick={() => {
            setSport(id);
            setBestOf(SPORTS[id].formatOptions[0].value);
            if (SPORTS[id].sideNoun === "Player") {
              if (teamAName === "Home") setTeamAName("Player one");
              if (teamBName === "Visitors") setTeamBName("Player two");
            } else {
              if (teamAName === "Player one") setTeamAName("Home");
              if (teamBName === "Player two") setTeamBName("Visitors");
            }
          }}><span>{SPORTS[id].icon}</span><b>{SPORTS[id].name}</b></button>)}</div>
        </fieldset>
        <div className="team-setup-grid">
          <section style={{ "--team-color": teamAColor } as React.CSSProperties}>
            <span className="team-label">{SPORTS[sport].sideNoun} one</span>
            <label>{SPORTS[sport].sideNoun} name<input ref={firstInputRef} value={teamAName} onChange={(event) => setTeamAName(event.target.value)} maxLength={50} required /></label>
            <ColorPicker value={teamAColor} onChange={setTeamAColor} label="Team color" />
          </section>
          <section style={{ "--team-color": teamBColor } as React.CSSProperties}>
            <span className="team-label">{SPORTS[sport].sideNoun} two</span>
            <label>{SPORTS[sport].sideNoun} name<input value={teamBName} onChange={(event) => setTeamBName(event.target.value)} maxLength={50} required /></label>
            <ColorPicker value={teamBColor} onChange={setTeamBColor} label="Team color" />
          </section>
        </div>
        <fieldset className="format-picker">
          <legend>Match format</legend>
          {SPORTS[sport].formatOptions.map((option) => <label key={option.value}><input type="radio" name="format" checked={bestOf === option.value} onChange={() => setBestOf(option.value)} /><span><b>{option.label}</b><small>{option.detail}</small></span></label>)}
        </fieldset>
        {sport === "pickleball" && <fieldset className="target-picker"><legend>Points per game</legend>{[11, 15, 21].map((value) => <label key={value}><input type="radio" name="target" checked={target === value} onChange={() => setTarget(value)} /><span>{value}</span></label>)}</fieldset>}
        <label className="home-listing-option">
          <input type="checkbox" checked={showOnHome} onChange={(event) => setShowOnHome(event.target.checked)} />
          <span><i aria-hidden="true">✓</i><b>Show this score on the home page</b><small>Anyone can open the live score. Uncheck this for code-only sharing.</small></span>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="sport-button sport-button-primary setup-submit" disabled={busy}>{busy ? "Creating match…" : <>Start scoring <span aria-hidden="true">→</span></>}</button>
      </form>
    </div>
  );
}

function MatchLoading({ message = "Loading the live score" }: { message?: string }) {
  return <main className="match-message"><Brand /><div className="loader" /><h1>{message}</h1></main>;
}

function MatchError({ message }: { message: string }) {
  return <main className="match-message"><Brand /><span className="error-mark">!</span><h1>{message}</h1><Link className="button button-dark" href="/">Return home</Link></main>;
}

function getSides(match: Match) {
  const left = match.leftTeamKey === "a" ? match.teamA : match.teamB;
  const right = match.leftTeamKey === "a" ? match.teamB : match.teamA;
  return { left, right };
}

function displayScore(match: Match, key: TeamKey) {
  const team = key === "a" ? match.teamA : match.teamB;
  const opponent = key === "a" ? match.teamB : match.teamA;
  return match.sport === "tennis" ? tennisPointLabel(team.points, opponent.points, match.state.tiebreak) : String(team.points);
}

function secondaryScore(match: Match, key: TeamKey) {
  const team = key === "a" ? match.teamA : match.teamB;
  if (match.sport === "tennis") return `${key === "a" ? match.state.gamesA || 0 : match.state.gamesB || 0} games · ${team.sets} sets`;
  if (SPORTS[match.sport].unit === "set") return `${team.sets} ${team.sets === 1 ? "set" : "sets"}`;
  return segmentLabel(match.sport, match.currentSet, match.bestOf);
}

function matchStatusLine(match: Match) {
  if (match.status === "complete") return "Match complete";
  if (match.sport === "tennis") return `${match.state.tiebreak ? "Tiebreak" : `Games ${match.state.gamesA || 0}–${match.state.gamesB || 0}`} · best of ${match.bestOf}`;
  if (SPORTS[match.sport].unit === "set") return `Playing to ${match.currentTarget}${match.sport === "badminton" ? " · cap at 30" : " · win by 2"}`;
  return `${segmentLabel(match.sport, match.currentSet, match.bestOf)} of ${match.bestOf}`;
}

function winnerReady(match: Match): TeamKey | null {
  if (!["volleyball", "pickleball", "badminton"].includes(match.sport)) return null;
  const a = match.teamA.points;
  const b = match.teamB.points;
  if (a >= match.currentTarget && a - b >= 2) return "a";
  if (b >= match.currentTarget && b - a >= 2) return "b";
  return null;
}

function SetHistory({ match }: { match: Match }) {
  if (!match.sets.length) return <span className="no-sets">No completed {SPORTS[match.sport].unit}s</span>;
  return <div className="set-history">{match.sets.map((set) => (
    <span key={set.setNumber}><small>{SPORTS[match.sport].unit.slice(0, 1).toUpperCase()}{set.setNumber}</small><b>{set.teamAScore}</b><i>–</i><b>{set.teamBScore}</b></span>
  ))}</div>;
}

type ScoreGesture = "point" | "set";
type GestureFeedback = { id: number; side: Side; text: string } | null;

function LiveBoard({
  match,
  scorekeeper,
  onGesture,
  feedback,
}: {
  match: Match;
  scorekeeper: boolean;
  onGesture?: (side: Side, kind: ScoreGesture, amount: number) => void;
  feedback?: GestureFeedback;
}) {
  const { left, right } = getSides(match);
  const pointerStart = useRef<{ id: number; x: number; y: number; side: Side } | null>(null);

  function pointerDown(event: ReactPointerEvent<HTMLElement>, side: Side) {
    if (!scorekeeper) return;
    pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY, side };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function pointerUp(event: ReactPointerEvent<HTMLElement>, side: Side) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!scorekeeper || !start || start.id !== event.pointerId || start.side !== side) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 18) {
      onGesture?.(side, "point", 1);
      return;
    }
    if (Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) >= 42) {
      onGesture?.(side, "point", dy < 0 ? 1 : -1);
      return;
    }
    if (Math.abs(dx) >= 42) onGesture?.(side, "set", dx > 0 ? 1 : -1);
  }

  function scoreSide(side: Side, team: Team) {
    const teamKey: TeamKey = side === "left" ? match.leftTeamKey : match.leftTeamKey === "a" ? "b" : "a";
    const quickScores = SPORTS[match.sport].scoreButtons.filter((amount) => amount > 1);
    return (
      <section
        className="score-side"
        style={{ "--side-color": team.color } as React.CSSProperties}
        onPointerDown={(event) => pointerDown(event, side)}
        onPointerUp={(event) => pointerUp(event, side)}
        onPointerCancel={() => { pointerStart.current = null; }}
        role={scorekeeper ? "button" : undefined}
        tabIndex={scorekeeper ? 0 : undefined}
        onKeyDown={(event) => {
          if (!scorekeeper) return;
          const gestures: Record<string, [ScoreGesture, number]> = {
            Enter: ["point", 1],
            " ": ["point", 1],
            ArrowUp: ["point", 1],
            ArrowDown: ["point", -1],
            ArrowLeft: ["set", -1],
            ArrowRight: ["set", 1],
          };
          const next = gestures[event.key];
          if (!next) return;
          event.preventDefault();
          onGesture?.(side, next[0], next[1]);
        }}
        aria-label={scorekeeper ? `${team.name}, score ${displayScore(match, teamKey)}, ${secondaryScore(match, teamKey)}. Tap or swipe to update.` : undefined}
      >
        <div className="side-heading"><span className="color-dot" /><h2>{team.name}</h2><small>{secondaryScore(match, teamKey)}</small></div>
        <strong className="big-score" aria-label={`${team.name} ${displayScore(match, teamKey)}`}>{displayScore(match, teamKey)}</strong>
        {scorekeeper && quickScores.length > 0 && <div className="score-actions" aria-label={`${team.name} scoring plays`}>{quickScores.map((amount) => <button key={amount} type="button" onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onGesture?.(side, "point", amount); }}>+{amount}</button>)}</div>}
        {scorekeeper && <div className="gesture-cues" aria-hidden="true"><span>↑ + score</span><span>tap +1</span><span>win − / + →</span></div>}
        {feedback?.side === side && <span key={feedback.id} className="gesture-feedback" aria-live="polite">{feedback.text}</span>}
      </section>
    );
  }

  return (
    <div className={`live-board ${scorekeeper ? "scorekeeper-board" : "viewer-board"}`}>
      {scoreSide("left", left)}
      <div className="court-center"><span>{match.status === "complete" ? "FINAL" : segmentLabel(match.sport, match.currentSet, match.bestOf).toUpperCase()}</span><i>:</i><small>{SPORTS[match.sport].name.toUpperCase()}</small></div>
      {scoreSide("right", right)}
    </div>
  );
}

function useLiveMatch(code: string, pendingChanges?: { readonly current: number }) {
  const [match, setMatch] = useState<Match | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [lastReceivedAt, setLastReceivedAt] = useState<number | null>(null);
  const [error, setError] = useState(code.length === 6 ? "" : "That match code is not valid");
  const lastReceivedRef = useRef<number | null>(null);

  const markReceived = useCallback(() => {
    const receivedAt = Date.now();
    lastReceivedRef.current = receivedAt;
    setLastReceivedAt(receivedAt);
    setConnection("live");
  }, []);

  const load = useCallback(async () => {
    const result = await api<{ match: Match }>(`/api/v1/matches/${code}`);
    if (!pendingChanges || pendingChanges.current === 0) setMatch(result.match);
    markReceived();
    return result.match;
  }, [code, markReceived, pendingChanges]);

  useEffect(() => {
    if (code.length !== 6) return;
    let active = true;
    let source: EventSource | null = null;
    const initial = window.setTimeout(() => {
      load().then(() => {
        if (!active) return;
        source = new EventSource(`/api/v1/matches/${code}/events`);
        source.addEventListener("score", (event) => {
          const payload = JSON.parse((event as MessageEvent).data) as { match: Match };
          if (!pendingChanges || pendingChanges.current === 0) setMatch(payload.match);
          markReceived();
        });
        source.onopen = markReceived;
        source.onerror = () => {
          const lastReceived = lastReceivedRef.current;
          if (!navigator.onLine) setConnection("offline");
          else if (!lastReceived || Date.now() - lastReceived > 25_000) setConnection("reconnecting");
        };
      }).catch((reason) => setError(reason instanceof Error ? reason.message : "Match not found"));
    }, 0);
    const fallback = window.setInterval(() => load().catch(() => {
      const lastReceived = lastReceivedRef.current;
      setConnection(!navigator.onLine || (lastReceived && Date.now() - lastReceived > 60_000) ? "offline" : "reconnecting");
    }), 15_000);
    const watchdog = window.setInterval(() => {
      const lastReceived = lastReceivedRef.current;
      if (!navigator.onLine || (lastReceived && Date.now() - lastReceived > 60_000)) setConnection("offline");
      else if (!lastReceived || Date.now() - lastReceived > 25_000) setConnection("reconnecting");
    }, 5_000);
    return () => {
      active = false;
      window.clearTimeout(initial);
      source?.close();
      window.clearInterval(fallback);
      window.clearInterval(watchdog);
    };
  }, [code, load, markReceived, pendingChanges]);

  return { match, setMatch, connection, lastReceivedAt, error };
}

function relativeTime(timestamp: number | null, now: number) {
  if (!timestamp) return "Waiting for the first update";
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 5) return "Received just now";
  if (seconds < 60) return `Received ${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  return `Received ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
}

function ConnectionIndicator({ connection, lastReceivedAt, scoreUpdatedAt }: { connection: ConnectionState; lastReceivedAt: number | null; scoreUpdatedAt: string }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const labels: Record<ConnectionState, { title: string; detail: string }> = {
    live: { title: "Connected", detail: "Receiving live score updates." },
    connecting: { title: "Connecting", detail: "Opening the live score feed." },
    reconnecting: { title: "Updates delayed", detail: "Reconnecting while periodic score checks continue." },
    offline: { title: "Disconnected", detail: "The score may be out of date until the connection returns." },
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const label = labels[connection];
  return (
    <div className={`connection-indicator ${connection} ${open ? "open" : ""}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <button type="button" aria-label={`${label.title}. ${relativeTime(lastReceivedAt, now)}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <i aria-hidden="true" />
      </button>
      <div className="connection-popover" role="status">
        <strong><i aria-hidden="true" />{label.title}</strong>
        <span>{label.detail}</span>
        <small>{relativeTime(lastReceivedAt, now)}</small>
        <small>Score changed {new Date(scoreUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
      </div>
    </div>
  );
}

function shareMatch(match: Match) {
  const url = `${window.location.origin}/watch/${match.code}`;
  if (navigator.share) return navigator.share({ title: `${match.teamA.name} vs ${match.teamB.name}`, text: `Watch the live score. Code: ${match.code}`, url }).catch(() => undefined);
  return navigator.clipboard.writeText(url);
}

function WatchView({ code }: { code: string }) {
  const { match, connection, lastReceivedAt, error } = useLiveMatch(code);
  const [copied, setCopied] = useState(false);
  if (error) return <MatchError message={error} />;
  if (!match) return <MatchLoading />;
  return (
    <main className="match-shell watch-shell">
      <header className="match-header">
        <Brand compact />
        <div className="match-meta"><ConnectionIndicator connection={connection} lastReceivedAt={lastReceivedAt} scoreUpdatedAt={match.updatedAt} /><b>CODE {match.code}</b></div>
        <button className="header-action" onClick={async () => { await shareMatch(match); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }}>{copied ? "Copied" : "Share"}</button>
      </header>
      <LiveBoard match={match} scorekeeper={false} />
      <footer className="viewer-footer"><SetHistory match={match} /><span>{matchStatusLine(match)}</span></footer>
    </main>
  );
}

function EditTeams({ match, onClose, onSave }: { match: Match; onClose: () => void; onSave: (values: Record<string, unknown>) => Promise<void> }) {
  const [teamAName, setTeamAName] = useState(match.teamA.name);
  const [teamBName, setTeamBName] = useState(match.teamB.name);
  const [teamAColor, setTeamAColor] = useState(match.teamA.color);
  const [teamBColor, setTeamBColor] = useState(match.teamB.color);
  const [busy, setBusy] = useState(false);
  return (
    <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="edit-sheet" onSubmit={async (event) => { event.preventDefault(); setBusy(true); await onSave({ action: "edit", teamAName, teamBName, teamAColor, teamBColor }); onClose(); }}>
        <header><div><span>Match settings</span><h2>Edit teams</h2></div><button type="button" onClick={onClose}>×</button></header>
        <label>Team one<input value={teamAName} onChange={(event) => setTeamAName(event.target.value)} maxLength={50} /></label>
        <ColorPicker value={teamAColor} onChange={setTeamAColor} label="Team one color" />
        <label>Team two<input value={teamBName} onChange={(event) => setTeamBName(event.target.value)} maxLength={50} /></label>
        <ColorPicker value={teamBColor} onChange={setTeamBColor} label="Team two color" />
        <button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
      </form>
    </div>
  );
}

type KeeperPreferences = { fullscreen: boolean; wakeLock: boolean };
type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener: (type: "release", listener: () => void) => void };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };

function KeeperSettings({
  preferences,
  fullscreenActive,
  onToggle,
  onReset,
  onClose,
}: {
  preferences: KeeperPreferences;
  fullscreenActive: boolean;
  onToggle: (key: keyof KeeperPreferences) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="edit-sheet keeper-settings" role="dialog" aria-modal="true" aria-labelledby="displaySettingsTitle">
        <header><div><span>Scorekeeper</span><h2 id="displaySettingsTitle">Display settings</h2></div><button type="button" onClick={onClose} aria-label="Close settings">×</button></header>
        <button className="setting-row" type="button" role="switch" aria-checked={preferences.fullscreen} onClick={() => onToggle("fullscreen")}>
          <span><b>Fullscreen</b><small>{preferences.fullscreen && !fullscreenActive ? "Starts on the next score gesture" : "Hide browser controls while scoring"}</small></span>
          <i className={preferences.fullscreen ? "on" : ""} />
        </button>
        <button className="setting-row" type="button" role="switch" aria-checked={preferences.wakeLock} onClick={() => onToggle("wakeLock")}>
          <span><b>Keep screen awake</b><small>Prevent the display from sleeping during a match</small></span>
          <i className={preferences.wakeLock ? "on" : ""} />
        </button>
        <div className="gesture-key">
          <b>Gesture controls</b>
          <span><i>Tap</i> Add point</span>
          <span><i>↑ / ↓</i> Add / remove score</span>
          <span><i>← / →</i> Remove / add win</span>
        </div>
        <button className="settings-reset" type="button" onClick={onReset}>Reset match</button>
      </section>
    </div>
  );
}

function KeepView({ code, onHome }: { code: string; onHome: () => void }) {
  const pending = useRef(0);
  const { match, setMatch, connection, error } = useLiveMatch(code, pending);
  const [token, setToken] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [feedback, setFeedback] = useState<GestureFeedback>(null);
  const [preferences, setPreferences] = useState<KeeperPreferences>({ fullscreen: true, wakeLock: true });
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const queue = useRef(Promise.resolve());
  const feedbackId = useRef(0);
  const wakeLock = useRef<WakeLockSentinelLike | null>(null);

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
        if (cancelled) {
          await sentinel.release();
          return;
        }
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
    const result = await api<{ match: Match }>(`/api/v1/matches/${code}`, {
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
      const teamKey = side === "left" ? current.leftTeamKey : current.leftTeamKey === "a" ? "b" : "a";
      const key = teamKey === "a" ? "teamA" : "teamB";
      return { ...current, [key]: { ...current[key], points: Math.max(0, current[key].points + amount) } };
    });
    queue.current = queue.current.then(() => send({ action: "point", side, amount })).catch((reason) => setNotice(reason instanceof Error ? reason.message : "Score did not save")).finally(() => { pending.current -= 1; });
  }

  function setWin(side: Side, amount: number) {
    if (!match) return;
    pending.current += 1;
    setMatch((current) => {
      if (!current) return current;
      const teamKey = side === "left" ? current.leftTeamKey : current.leftTeamKey === "a" ? "b" : "a";
      const key = teamKey === "a" ? "teamA" : "teamB";
      const nextSets = Math.min(current.setsToWin, Math.max(0, current[key].sets + amount));
      const nextTeam = { ...current[key], sets: nextSets };
      const otherSets = teamKey === "a" ? current.teamB.sets : current.teamA.sets;
      const status = SPORTS[current.sport].unit === "set" && Math.max(nextSets, otherSets) >= current.setsToWin ? "complete" : "live";
      return { ...current, [key]: nextTeam, status };
    });
    queue.current = queue.current.then(() => send({ action: "setCount", side, amount })).catch((reason) => setNotice(reason instanceof Error ? reason.message : "Set count did not save")).finally(() => { pending.current -= 1; });
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
    if (key === "fullscreen") {
      if (next) void document.documentElement.requestFullscreen?.().catch(() => undefined);
      else if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    }
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
        <button className="keep-code" onClick={() => navigator.clipboard.writeText(match.code)} aria-label={`Copy watch code ${match.code}`}><span>Code</span><b>{match.code}</b></button>
        <span className={`keeper-sync ${connection}`} title={connection === "live" ? "Score is synced" : "Reconnecting"} aria-label={connection === "live" ? "Score is synced" : "Reconnecting"}><i /></span>
        <button className="keeper-header-button" onClick={() => shareMatch(match)} aria-label="Share viewer link">↗</button>
      </header>
      <LiveBoard match={match} scorekeeper onGesture={gesture} feedback={feedback} />
      <nav className="keeper-controls" aria-label="Match controls">
        <button onClick={() => run({ action: "swap" })} disabled={busy} aria-label="Swap team sides"><span aria-hidden="true">⇄</span><small>Sides</small></button>
        <button onClick={() => setEditOpen(true)} disabled={busy} aria-label="Edit teams"><span aria-hidden="true">✎</span><small>Teams</small></button>
        <button className={ready || (!setScoring && !automatic) ? "finish-ready" : ""} onClick={() => setScoring ? ready && run({ action: "finishSet", winner: ready }, "Game recorded") : !automatic && run({ action: "advance" }, match.currentSet >= match.bestOf ? "Final recorded" : "Segment recorded")} disabled={(setScoring && !ready) || automatic || busy}>{setScoring ? (ready ? `Finish · ${readyName}` : `${segmentLabel(match.sport, match.currentSet, match.bestOf)} · ${match.currentTarget}`) : automatic ? matchStatusLine(match) : advanceLabel}</button>
        <button onClick={() => setSettingsOpen(true)} aria-label="Scorekeeper settings"><span aria-hidden="true">⚙</span><small>Settings</small></button>
      </nav>
      {notice && <div className="keeper-notice" role="status">{notice}</div>}
      {editOpen && <EditTeams match={match} onClose={() => setEditOpen(false)} onSave={(values) => run(values)} />}
      {settingsOpen && <KeeperSettings
        preferences={preferences}
        fullscreenActive={fullscreenActive}
        onToggle={togglePreference}
        onReset={() => {
          if (window.confirm("Reset the score and completed segments for this match?")) {
            setSettingsOpen(false);
            void run({ action: "reset" });
          }
        }}
        onClose={() => setSettingsOpen(false)}
      />}
    </main>
  );
}

export function DevelopersView() {
  return (
    <main className="developer-shell">
      <header><Brand /><Link className="button button-dark" href="/">Open the app</Link></header>
      <section className="developer-hero"><span className="eyebrow"><i /> Public read API</span><h1>Put the live score<br />anywhere.</h1><p>Read any supported sport as JSON or subscribe to the same live score events used by the viewer page. Public endpoints are read-only and support cross-origin requests.</p></section>
      <section className="api-grid">
        <article><span>Snapshot</span><h2>Get current score</h2><code>GET /api/v1/matches/{"{code}"}</code><p>Returns the sport, two sides, current score, segment history, match status, and a monotonically increasing version.</p></article>
        <article><span>Live stream</span><h2>Subscribe to changes</h2><code>GET /api/v1/matches/{"{code}"}/events</code><p>A Server-Sent Events stream. Listen for <b>score</b> events and read the match object from each event.</p></article>
      </section>
      <section className="code-example"><header><span>Browser example</span><a href="/api/v1/openapi.json">OpenAPI JSON</a></header><pre>{`const source = new EventSource(
  "https://scores.fairway3games.com/api/v1/matches/ABC123/events"
);

source.addEventListener("score", (event) => {
  const { match } = JSON.parse(event.data);
  renderScore(match);
});`}</pre></section>
      <aside className="api-note"><b>Writes stay private.</b><p>Creating a match returns a scorekeeper token. Score updates require that token as a bearer credential. Viewer links and public API responses never expose it.</p></aside>
    </main>
  );
}

export default function ScoreApp() {
  const [route, setRoute] = useState<{ mode: ViewMode; code: string }>({ mode: "home", code: "" });
  const [setupOpen, setSetupOpen] = useState(false);
  useEffect(() => {
    const syncRoute = () => {
      const next = routeFromLocation();
      if (next.mode !== "keep" && document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
      setRoute(next);
    };
    const timer = window.setTimeout(syncRoute, 0);
    window.addEventListener("popstate", syncRoute);
    return () => { window.clearTimeout(timer); window.removeEventListener("popstate", syncRoute); };
  }, []);
  const navigate = (mode: "home" | "watch" | "keep", code = "") => {
    const path = mode === "home" ? "/" : `/${mode}/${code}`;
    window.history.pushState({}, "", path);
    if (mode !== "keep" && document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    setRoute({ mode, code });
  };
  if (route.mode === "watch") return <WatchView code={route.code} />;
  if (route.mode === "keep") return <KeepView code={route.code} onHome={() => navigate("home")} />;
  if (route.mode === "developers") return <DevelopersView />;
  return <>
    <HomeView onSetup={() => setSetupOpen(true)} onWatch={(code) => navigate("watch", code)} onResume={(code, token) => { sessionStorage.setItem(`scorekeeper:${code}`, token); navigate("keep", code); }} />
    {setupOpen && <SetupModal onCancel={() => setSetupOpen(false)} onCreated={(code) => { setSetupOpen(false); navigate("keep", code); }} />}
  </>;
}
