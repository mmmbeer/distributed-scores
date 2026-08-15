"use client";

import { PointerEvent as ReactPointerEvent, useRef } from "react";
import { segmentLabel, SPORTS } from "../../lib/sports";
import {
  displayScore,
  getSides,
  secondaryScore,
  type Match,
  type Side,
  type Team,
} from "../../lib/match";

export type ScoreGesture = "point" | "set";
export type GestureFeedback = { id: number; side: Side; text: string } | null;

export function SetHistory({ match }: { match: Match }) {
  if (!match.sets.length) {
    return <span className="no-sets">No completed {SPORTS[match.sport].unit}s</span>;
  }
  return <div className="set-history">{match.sets.map((set) => (
    <span key={set.setNumber}>
      <small>{SPORTS[match.sport].unit.slice(0, 1).toUpperCase()}{set.setNumber}</small>
      <b>{set.teamAScore}</b><i>–</i><b>{set.teamBScore}</b>
    </span>
  ))}</div>;
}

export function LiveBoard({
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
    if (Math.hypot(dx, dy) < 18) return onGesture?.(side, "point", 1);
    if (Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) >= 42) {
      return onGesture?.(side, "point", dy < 0 ? 1 : -1);
    }
    if (Math.abs(dx) >= 42) onGesture?.(side, "set", dx > 0 ? 1 : -1);
  }

  function scoreSide(side: Side, team: Team) {
    const teamKey = side === "left"
      ? match.leftTeamKey
      : match.leftTeamKey === "a" ? "b" : "a";
    const quickScores = SPORTS[match.sport].scoreButtons.filter((amount) => amount > 1);
    const keyboardGestures: Record<string, [ScoreGesture, number]> = {
      Enter: ["point", 1],
      " ": ["point", 1],
      ArrowUp: ["point", 1],
      ArrowDown: ["point", -1],
      ArrowLeft: ["set", -1],
      ArrowRight: ["set", 1],
    };

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
          const next = keyboardGestures[event.key];
          if (!next) return;
          event.preventDefault();
          onGesture?.(side, next[0], next[1]);
        }}
        aria-label={scorekeeper ? `${team.name}, score ${displayScore(match, teamKey)}, ${secondaryScore(match, teamKey)}. Tap or swipe to update.` : undefined}
      >
        <div className="side-heading"><span className="color-dot" /><h2>{team.name}</h2><small>{secondaryScore(match, teamKey)}</small></div>
        <strong className="big-score" aria-label={`${team.name} ${displayScore(match, teamKey)}`}>{displayScore(match, teamKey)}</strong>
        {scorekeeper && quickScores.length > 0 && <div className="score-actions" aria-label={`${team.name} scoring plays`}>{quickScores.map((amount) => (
          <button
            key={amount}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => { event.stopPropagation(); onGesture?.(side, "point", amount); }}
          >+{amount}</button>
        ))}</div>}
        {scorekeeper && <div className="gesture-cues" aria-hidden="true"><span>↑ + score</span><span>tap +1</span><span>win − / + →</span></div>}
        {feedback?.side === side && <span key={feedback.id} className="gesture-feedback" aria-live="polite">{feedback.text}</span>}
      </section>
    );
  }

  return (
    <div className={`live-board ${scorekeeper ? "scorekeeper-board" : "viewer-board"}`}>
      {scoreSide("left", left)}
      <div className="court-center">
        <span>{match.status === "complete" ? "FINAL" : segmentLabel(match.sport, match.currentSet, match.bestOf).toUpperCase()}</span>
        <i>:</i><small>{SPORTS[match.sport].name.toUpperCase()}</small>
      </div>
      {scoreSide("right", right)}
    </div>
  );
}
