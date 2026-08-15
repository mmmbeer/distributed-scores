"use client";

import { FormEvent, useRef, useState } from "react";
import { SPORT_IDS, SPORTS, type Sport } from "../../lib/sports";
import type { Match } from "../../lib/match";
import { matchApi, saveScorekeeperSession } from "../match-client";
import { Modal } from "./modal";
import { COLORS, ColorPicker } from "./ui";

export function SetupModal({ onCancel, onCreated }: { onCancel: () => void; onCreated: (code: string) => void }) {
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
  const firstInputRef = useRef<HTMLInputElement>(null);

  function selectSport(id: Sport) {
    setSport(id);
    setBestOf(SPORTS[id].formatOptions[0].value);
    if (SPORTS[id].sideNoun === "Player") {
      if (teamAName === "Home") setTeamAName("Player one");
      if (teamBName === "Visitors") setTeamBName("Player two");
    } else {
      if (teamAName === "Player one") setTeamAName("Home");
      if (teamBName === "Player two") setTeamBName("Visitors");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wantsFullscreen = localStorage.getItem("scorekeeper:fullscreen") !== "0";
    if (wantsFullscreen && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    setBusy(true);
    setError("");
    try {
      const result = await matchApi<{ match: Match; scorekeeperToken: string }>("/api/v1/matches", {
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
    <Modal
      className="setup-modal"
      labelledBy="setup-title"
      describedBy="setup-description"
      initialFocusRef={firstInputRef}
      onClose={onCancel}
      onSubmit={submit}
      variant="setup"
    >
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
        <div>{SPORT_IDS.map((id) => (
          <button key={id} type="button" className={sport === id ? "selected" : ""} aria-pressed={sport === id} onClick={() => selectSport(id)}>
            <span>{SPORTS[id].icon}</span><b>{SPORTS[id].name}</b>
          </button>
        ))}</div>
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
        {SPORTS[sport].formatOptions.map((option) => (
          <label key={option.value}><input type="radio" name="format" checked={bestOf === option.value} onChange={() => setBestOf(option.value)} /><span><b>{option.label}</b><small>{option.detail}</small></span></label>
        ))}
      </fieldset>
      {sport === "pickleball" && <fieldset className="target-picker"><legend>Points per game</legend>{[11, 15, 21].map((value) => (
        <label key={value}><input type="radio" name="target" checked={target === value} onChange={() => setTarget(value)} /><span>{value}</span></label>
      ))}</fieldset>}
      <label className="home-listing-option">
        <input type="checkbox" checked={showOnHome} onChange={(event) => setShowOnHome(event.target.checked)} />
        <span><i aria-hidden="true">✓</i><b>Show this score on the home page</b><small>Anyone can open the live score. Uncheck this for code-only sharing.</small></span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="sport-button sport-button-primary setup-submit" disabled={busy}>{busy ? "Creating match…" : <>Start scoring <span aria-hidden="true">→</span></>}</button>
    </Modal>
  );
}
