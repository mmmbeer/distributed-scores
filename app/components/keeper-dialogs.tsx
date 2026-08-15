"use client";

import { useState } from "react";
import type { Match } from "../../lib/match";
import { ColorPicker } from "./ui";
import { Modal } from "./modal";

export type KeeperPreferences = { fullscreen: boolean; wakeLock: boolean };

export function EditTeamsDialog({ match, onClose, onSave }: {
  match: Match;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [teamAName, setTeamAName] = useState(match.teamA.name);
  const [teamBName, setTeamBName] = useState(match.teamB.name);
  const [teamAColor, setTeamAColor] = useState(match.teamA.color);
  const [teamBColor, setTeamBColor] = useState(match.teamB.color);
  const [busy, setBusy] = useState(false);

  return (
    <Modal labelledBy="editTeamsTitle" onClose={onClose} onSubmit={async (event) => {
      event.preventDefault();
      setBusy(true);
      try {
        await onSave({ action: "edit", teamAName, teamBName, teamAColor, teamBColor });
        onClose();
      } finally {
        setBusy(false);
      }
    }}>
      <header><div><span>Match settings</span><h2 id="editTeamsTitle">Edit teams</h2></div><button type="button" onClick={onClose} aria-label="Close team settings">×</button></header>
      <label>Team one<input value={teamAName} onChange={(event) => setTeamAName(event.target.value)} maxLength={50} /></label>
      <ColorPicker value={teamAColor} onChange={setTeamAColor} label="Team one color" />
      <label>Team two<input value={teamBName} onChange={(event) => setTeamBName(event.target.value)} maxLength={50} /></label>
      <ColorPicker value={teamBColor} onChange={setTeamBColor} label="Team two color" />
      <button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
    </Modal>
  );
}

export function KeeperSettingsDialog({
  preferences,
  fullscreenActive,
  onToggle,
  onRequestReset,
  onClose,
}: {
  preferences: KeeperPreferences;
  fullscreenActive: boolean;
  onToggle: (key: keyof KeeperPreferences) => void;
  onRequestReset: () => void;
  onClose: () => void;
}) {
  return (
    <Modal className="edit-sheet keeper-settings" labelledBy="displaySettingsTitle" onClose={onClose}>
      <header><div><span>Scorekeeper</span><h2 id="displaySettingsTitle">Display settings</h2></div><button type="button" onClick={onClose} aria-label="Close settings">×</button></header>
      <button className="setting-row" type="button" role="switch" aria-checked={preferences.fullscreen} onClick={() => onToggle("fullscreen")}>
        <span><b>Fullscreen</b><small>{preferences.fullscreen && !fullscreenActive ? "Starts on the next score gesture" : "Hide browser controls while scoring"}</small></span>
        <i className={preferences.fullscreen ? "on" : ""} />
      </button>
      <button className="setting-row" type="button" role="switch" aria-checked={preferences.wakeLock} onClick={() => onToggle("wakeLock")}>
        <span><b>Keep screen awake</b><small>Prevent the display from sleeping during a match</small></span>
        <i className={preferences.wakeLock ? "on" : ""} />
      </button>
      <div className="gesture-key"><b>Gesture controls</b><span><i>Tap</i> Add point</span><span><i>↑ / ↓</i> Add / remove score</span><span><i>← / →</i> Remove / add win</span></div>
      <button className="settings-reset" type="button" onClick={onRequestReset}>Reset match</button>
    </Modal>
  );
}

export function ResetMatchDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal className="edit-sheet confirm-dialog" labelledBy="resetMatchTitle" describedBy="resetMatchDescription" onClose={onCancel}>
      <header><div><span>Destructive action</span><h2 id="resetMatchTitle">Reset this match?</h2></div><button type="button" onClick={onCancel} aria-label="Close confirmation">×</button></header>
      <p id="resetMatchDescription">This clears the current score and every completed segment. The scoreboard link will stay active.</p>
      <div className="confirm-actions"><button className="button" type="button" onClick={onCancel}>Cancel</button><button className="button settings-reset" type="button" onClick={onConfirm}>Reset match</button></div>
    </Modal>
  );
}
