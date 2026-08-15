"use client";

import { useCallback, useEffect, useState } from "react";
import { segmentLabel, SPORTS } from "../../lib/sports";
import { displayScore, getSides, secondaryScore, type Match } from "../../lib/match";
import { matchApi, readSavedScorekeeperSessions } from "../match-client";
import { Brand } from "./ui";

type OwnedActiveSession = { match: Match; token: string };

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

export function HomeView({ onSetup, onWatch, onResume }: { onSetup: () => void; onWatch: (code: string) => void; onResume: (code: string, token: string) => void }) {
  const [code, setCode] = useState("");
  const [publicMatches, setPublicMatches] = useState<Match[]>([]);
  const [publicLoaded, setPublicLoaded] = useState(false);
  const [ownedSessions, setOwnedSessions] = useState<OwnedActiveSession[]>([]);
  const watch = () => { if (code.length === 6) onWatch(code); };

  const refreshPublicMatches = useCallback(async () => {
    try {
      const result = await matchApi<{ matches: Match[] }>("/api/v1/matches/recent");
      setPublicMatches(result.matches);
    } catch {
      setPublicMatches([]);
    } finally {
      setPublicLoaded(true);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshPublicMatches(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshPublicMatches();
    }, 15_000);
    const onVisible = () => { if (document.visibilityState === "visible") void refreshPublicMatches(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [refreshPublicMatches]);

  useEffect(() => {
    let cancelled = false;
    const saved = readSavedScorekeeperSessions();
    void Promise.all(saved.map(async (session) => {
      try {
        const result = await matchApi<{ match: Match }>(`/api/v1/matches/${session.code}`);
        return result.match.status === "live" ? { match: result.match, token: session.token } : null;
      } catch {
        return null;
      }
    })).then((loaded) => {
      if (cancelled) return;
      setOwnedSessions(loaded.filter((session): session is OwnedActiveSession => Boolean(session))
        .sort((a, b) => b.match.updatedAt.localeCompare(a.match.updatedAt)).slice(0, 5));
    });
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
          <span className="hero-sport-photo hero-volleyball" /><span className="hero-sport-photo hero-basketball" />
          <span className="hero-sport-photo hero-soccer" /><span className="hero-sport-photo hero-tennis" />
        </div>
        <div className="arena-copy">
          <span className="sport-label"><i /> Live scorekeeping</span>
          <h1>Every point.<br /><em>Everywhere.</em></h1>
          <p>Run the scoreboard courtside. Share one link. Keep every remote viewer on the same score.</p>
          <div className="arena-actions"><button className="sport-button sport-button-primary" onClick={onSetup}>Start scoring <span aria-hidden="true">→</span></button><a href="#watch">I have a match code</a></div>
          <small>No account. No install. Just the score.</small>
          <div className="hero-sport-list" aria-label="Supported sports">Volleyball <i /> Basketball <i /> Football <i /> Tennis <i /> Baseball <i /> Hockey <i /> Soccer <i /> Pickleball <i /> Badminton</div>
        </div>
        <div className="hero-score" aria-label="Example live score: North Stars 23, Eagles 21">
          <div className="hero-score-status"><i /> Live <span>Set 2</span></div><div className="hero-score-team"><span>North Stars</span><strong>23</strong><small>Sets 1</small></div>
          <b>:</b><div className="hero-score-team"><span>Eagles</span><strong>21</strong><small>Sets 0</small></div><div className="hero-score-code"><span>Watch code</span><strong>COURT</strong></div>
        </div>
        <div className="photo-credit hero-credit">Photos: <a href="https://unsplash.com/photos/volleyball-players-jump-to-hit-the-ball-over-the-net-ErPSzVX066Q" target="_blank" rel="noreferrer">N. Ketterer</a> · <a href="https://unsplash.com/photos/basketball-players-in-action-during-a-game-h9teyHyKvds" target="_blank" rel="noreferrer">S. Kessler</a> · <a href="https://unsplash.com/photos/soccer-players-in-action-during-an-outdoor-game-on-grass-B2HEmGkLsVY" target="_blank" rel="noreferrer">M. Protzen</a> · <a href="https://www.pexels.com/photo/tennis-player-in-action-on-outdoor-court-36231026/" target="_blank" rel="noreferrer">S. Mren</a></div>
      </section>

      <div className="score-ticker" aria-hidden="true"><div><span>Point by point</span><i>◆</i><span>One live link</span><i>◆</i><span>Courtside fast</span><i>◆</i><span>Any screen</span><i>◆</i><span>Point by point</span><i>◆</i><span>One live link</span><i>◆</i><span>Courtside fast</span><i>◆</i><span>Any screen</span><i>◆</i></div></div>

      <section className="score-lobby" aria-labelledby="scores-in-play-title">
        {ownedSessions.length > 0 && <div className="owned-sessions"><header><div><span className="section-kicker">This browser</span><h2>Your active scoreboards</h2></div><small>Private scorekeeper access stays on this device.</small></header><div>{ownedSessions.map((session) => <ScoreRail key={session.match.code} match={session.match} mode="keep" onOpen={() => onResume(session.match.code, session.token)} />)}</div></div>}
        <header className="score-lobby-header"><div><span className="section-kicker">Scores in play</span><h2 id="scores-in-play-title">Follow the action.</h2></div><p>The 10 most recently updated public scoreboards. Select a matchup to watch live.</p></header>
        <div className="public-score-list">{publicMatches.map((match) => <ScoreRail key={match.code} match={match} mode="watch" onOpen={() => onWatch(match.code)} />)}{publicLoaded && publicMatches.length === 0 && <div className="score-lobby-empty"><span>No public matches are active right now.</span><button onClick={onSetup}>Start the first one <i aria-hidden="true">→</i></button></div>}</div>
      </section>

      <section id="watch" className="watch-zone"><div className="watch-lead"><span className="section-kicker">Watching from away?</span><h2>Jump into<br />the match.</h2><p>Enter the six-character code from the scorekeeper. The scoreboard updates automatically.</p></div><CodeInput value={code} onChange={setCode} onSubmit={watch} /></section>

      <section id="how-it-works" className="play-flow"><header><span className="section-kicker">From sideline to sofa</span><h2>One phone.<br /><em>Every screen.</em></h2></header><ol>
        <li><b>01</b><div><h3>Set the matchup</h3><p>Choose the sport, name both sides and use the format built for that game.</p></div><span aria-hidden="true">→</span></li>
        <li><b>02</b><div><h3>Score at game speed</h3><p>Tap or swipe on either side. Big controls stay fast and readable courtside.</p></div><span aria-hidden="true">→</span></li>
        <li><b>03</b><div><h3>Send the code</h3><p>One link keeps everyone current, whether ten people watch or hundreds do.</p></div><span aria-hidden="true">→</span></li>
      </ol></section>

      <section className="sideline-story"><div className="sideline-photo sideline-photo-action" role="img" aria-label="Indoor volleyball match in progress"><a className="photo-credit" href="https://www.pexels.com/photo/people-playing-volleyball-6203521/" target="_blank" rel="noreferrer">Photo: Pavel Danilyuk / Pexels</a></div><div className="sideline-copy"><span className="section-kicker">Built for the sideline</span><h2>Nothing between you and the next point.</h2><p>The scorekeeper view fills the phone, stays awake and puts every action under one thumb. Viewers get a clean scoreboard that follows along in real time.</p><button className="sport-link" onClick={onSetup}>Start a scoreboard <span aria-hidden="true">↗</span></button></div><div className="sideline-photo sideline-photo-board" role="img" aria-label="Basketball game and arena scoreboard"><a className="photo-credit" href="https://unsplash.com/photos/basketball-game-in-progress-with-a-scoreboard-Rl8ZSwK4WnA" target="_blank" rel="noreferrer">Photo: Luke Miller / Unsplash</a></div></section>

      <section className="final-whistle"><div><span className="sport-label"><i /> Ready for first serve?</span><h2>Put the score<br />in everyone&apos;s hands.</h2></div><button className="sport-button sport-button-primary" onClick={onSetup}>Start scoring <span aria-hidden="true">→</span></button></section>
      <footer className="landing-footer"><Brand compact /><p>Fast live scoring for courts, fields, rinks and diamonds.</p><nav><a href="#watch">Watch a match</a><a href="/developers">Score API</a></nav></footer>
    </main>
  );
}
