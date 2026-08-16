import { segmentLabel, setUnitName, SPORTS, tennisPointLabel, type Sport } from "./sports";

export type TeamKey = "a" | "b";
export type Side = "left" | "right";
export type ConnectionState = "connecting" | "live" | "reconnecting" | "offline";
export type MatchStatus = "live" | "complete";

export type Team = {
  name: string;
  color: string;
  points: number;
  sets: number;
};

export type CompletedSet = {
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
  winner: TeamKey;
};

export type MatchState = {
  gamesA?: number;
  gamesB?: number;
  tiebreak?: boolean;
  target?: number;
};

export type Match = {
  code: string;
  sport: Sport;
  teamA: Team;
  teamB: Team;
  leftTeamKey: TeamKey;
  bestOf: number;
  setsToWin: number;
  currentSet: number;
  currentTarget: number;
  status: MatchStatus;
  version: number;
  updatedAt: string;
  expiresAt: string;
  sets: CompletedSet[];
  state: MatchState;
};

export function teamKeyForSide(match: Match, side: Side): TeamKey {
  return side === "left" ? match.leftTeamKey : match.leftTeamKey === "a" ? "b" : "a";
}

export function getSides(match: Match) {
  return match.leftTeamKey === "a"
    ? { left: match.teamA, right: match.teamB }
    : { left: match.teamB, right: match.teamA };
}

export function displayScore(match: Match, key: TeamKey) {
  const team = key === "a" ? match.teamA : match.teamB;
  const opponent = key === "a" ? match.teamB : match.teamA;
  return match.sport === "tennis"
    ? tennisPointLabel(team.points, opponent.points, match.state.tiebreak)
    : String(team.points);
}

export function secondaryScore(match: Match, key: TeamKey) {
  const team = key === "a" ? match.teamA : match.teamB;
  if (match.sport === "tennis") {
    const games = key === "a" ? match.state.gamesA || 0 : match.state.gamesB || 0;
    return `${games} games · ${team.sets} sets`;
  }
  if (SPORTS[match.sport].unit === "set") {
    const unit = setUnitName(match.sport);
    return `${team.sets} ${unit}${team.sets === 1 ? "" : "s"}`;
  }
  return segmentLabel(match.sport, match.currentSet, match.bestOf);
}

export function matchStatusLine(match: Match) {
  if (match.status === "complete") return "Match complete";
  if (match.sport === "tennis") {
    const detail = match.state.tiebreak
      ? "Tiebreak"
      : `Games ${match.state.gamesA || 0}–${match.state.gamesB || 0}`;
    return `${detail} · best of ${match.bestOf}`;
  }
  if (SPORTS[match.sport].unit === "set") {
    const rule = match.sport === "badminton" ? "cap at 30" : "win by 2";
    return `Playing to ${match.currentTarget} · ${rule}`;
  }
  return `${segmentLabel(match.sport, match.currentSet, match.bestOf)} of ${match.bestOf}`;
}

export function winnerReady(match: Match): TeamKey | null {
  if (SPORTS[match.sport].unit !== "set" || match.sport === "tennis") return null;
  const difference = match.teamA.points - match.teamB.points;
  if (match.sport === "badminton" && Math.max(match.teamA.points, match.teamB.points) === 30) {
    return difference > 0 ? "a" : "b";
  }
  if (match.teamA.points >= match.currentTarget && difference >= 2) return "a";
  if (match.teamB.points >= match.currentTarget && difference <= -2) return "b";
  return null;
}
