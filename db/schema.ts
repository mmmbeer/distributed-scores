import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const matches = sqliteTable("matches", {
  code: text("code").primaryKey(),
  editTokenHash: text("edit_token_hash").notNull(),
  sport: text("sport").notNull().default("volleyball"),
  teamAName: text("team_a_name").notNull(),
  teamAColor: text("team_a_color").notNull(),
  teamBName: text("team_b_name").notNull(),
  teamBColor: text("team_b_color").notNull(),
  pointsA: integer("points_a").notNull().default(0),
  pointsB: integer("points_b").notNull().default(0),
  setsA: integer("sets_a").notNull().default(0),
  setsB: integer("sets_b").notNull().default(0),
  currentSet: integer("current_set").notNull().default(1),
  bestOf: integer("best_of").notNull().default(3),
  leftTeam: text("left_team").notNull().default("a"),
  status: text("status").notNull().default("live"),
  scoreData: text("score_data").notNull().default("{}"),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const matchSets = sqliteTable(
  "match_sets",
  {
    matchCode: text("match_code")
      .notNull()
      .references(() => matches.code, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    teamAScore: integer("team_a_score").notNull(),
    teamBScore: integer("team_b_score").notNull(),
    winner: text("winner").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.matchCode, table.setNumber] })],
);

export const publicMatchListings = sqliteTable("public_match_listings", {
  matchCode: text("match_code").primaryKey().references(() => matches.code, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull(),
}, (table) => [index("public_match_listings_created_idx").on(table.createdAt)]);
