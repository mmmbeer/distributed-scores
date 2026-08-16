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
  "table-tennis",
  "squash",
  "softball",
  "lacrosse",
  "rugby",
  "handball",
  "water-polo",
  "field-hockey",
] as const;

export type Sport = (typeof SPORT_IDS)[number];

export type SportDefinition = {
  name: string;
  icon: string;
  category: "Court & net" | "Field & diamond" | "Ice & water";
  sideNoun: "Team" | "Player";
  scoreButtons: number[];
  formatOptions: { value: number; label: string; detail: string }[];
  unit: "set" | "quarter" | "half" | "period" | "inning";
  winByTwo: boolean;
};

export const SPORTS: Record<Sport, SportDefinition> = {
  volleyball: {
    name: "Volleyball", icon: "VB", category: "Court & net", sideNoun: "Team", scoreButtons: [1], unit: "set", winByTwo: true,
    formatOptions: [
      { value: 3, label: "Best of 3", detail: "First to 2 sets" },
      { value: 5, label: "Best of 5", detail: "First to 3 sets" },
    ],
  },
  basketball: {
    name: "Basketball", icon: "BK", category: "Court & net", sideNoun: "Team", scoreButtons: [1, 2, 3], unit: "quarter", winByTwo: false,
    formatOptions: [
      { value: 4, label: "4 quarters", detail: "Standard game" },
      { value: 2, label: "2 halves", detail: "College-style clock" },
    ],
  },
  football: {
    name: "Football", icon: "FB", category: "Field & diamond", sideNoun: "Team", scoreButtons: [1, 2, 3, 6], unit: "quarter", winByTwo: false,
    formatOptions: [{ value: 4, label: "4 quarters", detail: "Standard game" }],
  },
  tennis: {
    name: "Tennis", icon: "TN", category: "Court & net", sideNoun: "Player", scoreButtons: [1], unit: "set", winByTwo: true,
    formatOptions: [
      { value: 3, label: "Best of 3", detail: "First to 2 sets" },
      { value: 5, label: "Best of 5", detail: "First to 3 sets" },
    ],
  },
  baseball: {
    name: "Baseball", icon: "BB", category: "Field & diamond", sideNoun: "Team", scoreButtons: [1], unit: "inning", winByTwo: false,
    formatOptions: [
      { value: 9, label: "9 innings", detail: "Standard game" },
      { value: 7, label: "7 innings", detail: "Short format" },
    ],
  },
  hockey: {
    name: "Ice hockey", icon: "IH", category: "Ice & water", sideNoun: "Team", scoreButtons: [1], unit: "period", winByTwo: false,
    formatOptions: [{ value: 3, label: "3 periods", detail: "Standard game" }],
  },
  soccer: {
    name: "Soccer", icon: "SC", category: "Field & diamond", sideNoun: "Team", scoreButtons: [1], unit: "half", winByTwo: false,
    formatOptions: [{ value: 2, label: "2 halves", detail: "Standard match" }],
  },
  pickleball: {
    name: "Pickleball", icon: "PB", category: "Court & net", sideNoun: "Player", scoreButtons: [1], unit: "set", winByTwo: true,
    formatOptions: [
      { value: 3, label: "Best of 3", detail: "Games to 11" },
      { value: 5, label: "Best of 5", detail: "Games to 11" },
    ],
  },
  badminton: {
    name: "Badminton", icon: "BD", category: "Court & net", sideNoun: "Player", scoreButtons: [1], unit: "set", winByTwo: true,
    formatOptions: [{ value: 3, label: "Best of 3", detail: "Games to 21" }],
  },
  "table-tennis": {
    name: "Table tennis", icon: "TT", category: "Court & net", sideNoun: "Player", scoreButtons: [1], unit: "set", winByTwo: true,
    formatOptions: [
      { value: 5, label: "Best of 5", detail: "First to 3 games" },
      { value: 7, label: "Best of 7", detail: "First to 4 games" },
      { value: 3, label: "Best of 3", detail: "First to 2 games" },
    ],
  },
  squash: {
    name: "Squash", icon: "SQ", category: "Court & net", sideNoun: "Player", scoreButtons: [1], unit: "set", winByTwo: true,
    formatOptions: [
      { value: 5, label: "Best of 5", detail: "First to 3 games" },
      { value: 3, label: "Best of 3", detail: "First to 2 games" },
    ],
  },
  softball: {
    name: "Softball", icon: "SB", category: "Field & diamond", sideNoun: "Team", scoreButtons: [1], unit: "inning", winByTwo: false,
    formatOptions: [
      { value: 7, label: "7 innings", detail: "Standard game" },
      { value: 5, label: "5 innings", detail: "Short or youth format" },
    ],
  },
  lacrosse: {
    name: "Lacrosse", icon: "LX", category: "Field & diamond", sideNoun: "Team", scoreButtons: [1], unit: "quarter", winByTwo: false,
    formatOptions: [{ value: 4, label: "4 quarters", detail: "Field and sixes" }],
  },
  rugby: {
    name: "Rugby", icon: "RG", category: "Field & diamond", sideNoun: "Team", scoreButtons: [2, 3, 5, 7], unit: "half", winByTwo: false,
    formatOptions: [{ value: 2, label: "2 halves", detail: "Union and sevens" }],
  },
  handball: {
    name: "Handball", icon: "HB", category: "Court & net", sideNoun: "Team", scoreButtons: [1], unit: "half", winByTwo: false,
    formatOptions: [{ value: 2, label: "2 halves", detail: "Indoor handball" }],
  },
  "water-polo": {
    name: "Water polo", icon: "WP", category: "Ice & water", sideNoun: "Team", scoreButtons: [1], unit: "quarter", winByTwo: false,
    formatOptions: [{ value: 4, label: "4 periods", detail: "Standard match" }],
  },
  "field-hockey": {
    name: "Field hockey", icon: "FH", category: "Field & diamond", sideNoun: "Team", scoreButtons: [1], unit: "quarter", winByTwo: false,
    formatOptions: [{ value: 4, label: "4 quarters", detail: "Standard match" }],
  },
};

export const SPORT_GROUPS = (["Court & net", "Field & diamond", "Ice & water"] as const).map((name) => ({
  name,
  sports: SPORT_IDS.filter((sport) => SPORTS[sport].category === name),
}));

export function isSport(value: unknown): value is Sport {
  return typeof value === "string" && (SPORT_IDS as readonly string[]).includes(value);
}

export function setsToWin(sport: Sport, format: number) {
  return SPORTS[sport].unit === "set" ? Math.ceil(format / 2) : 1;
}

export function setUnitName(sport: Sport) {
  return sport === "volleyball" || sport === "tennis" ? "set" : "game";
}

export function segmentLabel(sport: Sport, current: number, format: number) {
  if (sport === "basketball") return format === 2 ? `Half ${current}` : `Q${current}`;
  const unit = SPORTS[sport].unit;
  if (unit === "quarter") return `Q${current}`;
  if (unit === "half") return `Half ${current}`;
  if (unit === "period") return `Period ${current}`;
  if (unit === "inning") return `Inning ${current}`;
  return `${setUnitName(sport) === "set" ? "Set" : "Game"} ${current}`;
}

export function targetFor(sport: Sport, current: number, format: number, stateTarget?: number) {
  if (sport === "volleyball") return current === format ? 15 : 25;
  if (sport === "pickleball") return stateTarget || 11;
  if (sport === "badminton") return 21;
  if (sport === "table-tennis" || sport === "squash") return 11;
  if (sport === "tennis") return 4;
  return 0;
}

export function tennisPointLabel(points: number, opponent: number, tiebreak = false) {
  if (tiebreak) return String(points);
  if (points >= 4 && points > opponent) return "AD";
  return ["0", "15", "30", "40"][Math.min(points, 3)] || "40";
}
