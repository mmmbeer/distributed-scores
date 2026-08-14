export const SPORT_IDS = [
  "volleyball",
  "basketball",
  "football",
  "tennis",
  "baseball",
  "hockey",
  "soccer",
  "pickleball",
  "badminton",
] as const;

export type Sport = (typeof SPORT_IDS)[number];

export type SportDefinition = {
  name: string;
  icon: string;
  sideNoun: "Team" | "Player";
  scoreButtons: number[];
  formatOptions: { value: number; label: string; detail: string }[];
  unit: "set" | "quarter" | "half" | "period" | "inning";
  winByTwo: boolean;
};

export const SPORTS: Record<Sport, SportDefinition> = {
  volleyball: {
    name: "Volleyball", icon: "VB", sideNoun: "Team", scoreButtons: [1], unit: "set", winByTwo: true,
    formatOptions: [
      { value: 3, label: "Best of 3", detail: "First to 2 sets" },
      { value: 5, label: "Best of 5", detail: "First to 3 sets" },
    ],
  },
  basketball: {
    name: "Basketball", icon: "BK", sideNoun: "Team", scoreButtons: [1, 2, 3], unit: "quarter", winByTwo: false,
    formatOptions: [
      { value: 4, label: "4 quarters", detail: "Standard game" },
      { value: 2, label: "2 halves", detail: "College-style clock" },
    ],
  },
  football: {
    name: "Football", icon: "FB", sideNoun: "Team", scoreButtons: [1, 2, 3, 6], unit: "quarter", winByTwo: false,
    formatOptions: [{ value: 4, label: "4 quarters", detail: "Standard game" }],
  },
  tennis: {
    name: "Tennis", icon: "TN", sideNoun: "Player", scoreButtons: [1], unit: "set", winByTwo: true,
    formatOptions: [
      { value: 3, label: "Best of 3", detail: "First to 2 sets" },
      { value: 5, label: "Best of 5", detail: "First to 3 sets" },
    ],
  },
  baseball: {
    name: "Baseball", icon: "BB", sideNoun: "Team", scoreButtons: [1], unit: "inning", winByTwo: false,
    formatOptions: [
      { value: 9, label: "9 innings", detail: "Standard game" },
      { value: 7, label: "7 innings", detail: "Short format" },
    ],
  },
  hockey: {
    name: "Hockey", icon: "HK", sideNoun: "Team", scoreButtons: [1], unit: "period", winByTwo: false,
    formatOptions: [{ value: 3, label: "3 periods", detail: "Standard game" }],
  },
  soccer: {
    name: "Soccer", icon: "SC", sideNoun: "Team", scoreButtons: [1], unit: "half", winByTwo: false,
    formatOptions: [{ value: 2, label: "2 halves", detail: "Standard match" }],
  },
  pickleball: {
    name: "Pickleball", icon: "PB", sideNoun: "Player", scoreButtons: [1], unit: "set", winByTwo: true,
    formatOptions: [
      { value: 3, label: "Best of 3", detail: "Games to 11" },
      { value: 5, label: "Best of 5", detail: "Games to 11" },
    ],
  },
  badminton: {
    name: "Badminton", icon: "BD", sideNoun: "Player", scoreButtons: [1], unit: "set", winByTwo: true,
    formatOptions: [{ value: 3, label: "Best of 3", detail: "Games to 21" }],
  },
};

export function isSport(value: unknown): value is Sport {
  return typeof value === "string" && (SPORT_IDS as readonly string[]).includes(value);
}

export function setsToWin(sport: Sport, format: number) {
  return SPORTS[sport].unit === "set" ? Math.ceil(format / 2) : 1;
}

export function segmentLabel(sport: Sport, current: number, format: number) {
  if (sport === "basketball") return format === 2 ? `Half ${current}` : `Q${current}`;
  if (sport === "football") return `Q${current}`;
  if (sport === "soccer") return `Half ${current}`;
  if (sport === "hockey") return `Period ${current}`;
  if (sport === "baseball") return `Inning ${current}`;
  return `Set ${current}`;
}

export function targetFor(sport: Sport, current: number, format: number, stateTarget?: number) {
  if (sport === "volleyball") return current === format ? 15 : 25;
  if (sport === "pickleball") return stateTarget || 11;
  if (sport === "badminton") return 21;
  if (sport === "tennis") return 4;
  return 0;
}

export function tennisPointLabel(points: number, opponent: number, tiebreak = false) {
  if (tiebreak) return String(points);
  if (points >= 4 && points > opponent) return "AD";
  return ["0", "15", "30", "40"][Math.min(points, 3)] || "40";
}
