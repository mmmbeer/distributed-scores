import type { Sport } from "./sports";

export type RuleVariant = {
  name: string;
  scoring: string;
  note: string;
};

export type OfficialSource = {
  label: string;
  organization: string;
  url: string;
};

export type SportRules = {
  sport: Sport;
  title: string;
  description: string;
  intro: string;
  quickFacts: { label: string; value: string }[];
  scoring: string[];
  variants: RuleVariant[];
  scorekeeperTips: string[];
  sources: OfficialSource[];
};

export const SPORT_RULES: Record<Sport, SportRules> = {
  volleyball: {
    sport: "volleyball",
    title: "How to Keep Score in Volleyball",
    description: "Learn rally scoring, set and match formats, deciding-set rules, and common volleyball scoring variants with links to the official FIVB rules.",
    intro: "Indoor volleyball uses rally scoring, so every rally awards one point. The team that wins the required number of sets wins the match. Local leagues often shorten the match, but the point logic stays the same.",
    quickFacts: [
      { label: "Standard match", value: "Best of 5 sets" },
      { label: "Regular set", value: "First to 25, win by 2" },
      { label: "Deciding set", value: "First to 15, win by 2" },
    ],
    scoring: [
      "Award one point to the team that wins each rally, whether it served or received.",
      "End a regular set when a team reaches at least 25 points with a two-point lead.",
      "In a best-of-five match, play the fifth set to 15. A two-point lead is still required.",
      "Record the set winner, reset the point score, and continue until one team wins the required number of sets.",
    ],
    variants: [
      { name: "Best of 5", scoring: "First to 3 sets", note: "The FIVB indoor standard. Sets 1–4 go to 25 and set 5 goes to 15." },
      { name: "Best of 3", scoring: "First to 2 sets", note: "Common for schools, recreation, pools, and shorter schedules. The deciding third set is commonly played to 15 unless local rules say otherwise." },
      { name: "Beach volleyball", scoring: "Best of 3; 21, 21, 15", note: "The first two sets go to 21 and the deciding set goes to 15, always win by two." },
    ],
    scorekeeperTips: ["Confirm best-of-three or best-of-five before first serve.", "Add one point after every rally.", "Use the set control only after the two-point margin is reached."],
    sources: [
      { label: "Official Volleyball Rules", organization: "FIVB", url: "https://www.fivb.com/volleyball/the-game/official-volleyball-rules/" },
      { label: "Official Volleyball Rules 2025–2028 (PDF)", organization: "FIVB", url: "https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-EN-v05.pdf" },
    ],
  },
  basketball: {
    sport: "basketball",
    title: "How to Keep Score in Basketball",
    description: "A practical guide to basketball points, quarters, halves, overtime, and the FIBA, NBA, and college scoring formats.",
    intro: "Basketball adds points continuously throughout timed periods. Free throws are worth one point, field goals inside the three-point line are worth two, and shots made from beyond the arc are worth three.",
    quickFacts: [
      { label: "Scoring plays", value: "1, 2, or 3 points" },
      { label: "FIBA format", value: "Four 10-minute quarters" },
      { label: "NBA format", value: "Four 12-minute quarters" },
    ],
    scoring: [
      "Add one point for each successful free throw.",
      "Add two points for a successful field goal released from inside the three-point line.",
      "Add three points for a successful field goal released from outside the three-point line.",
      "At the end of regulation, the higher score wins. Tied games continue with overtime periods until the tie is broken.",
    ],
    variants: [
      { name: "FIBA", scoring: "4 × 10-minute quarters", note: "International rules use five-minute overtime periods." },
      { name: "NBA", scoring: "4 × 12-minute quarters", note: "NBA overtime periods are five minutes." },
      { name: "NCAA men", scoring: "2 × 20-minute halves", note: "Use the two-halves option in the scorekeeper setup." },
      { name: "NCAA women", scoring: "4 × 10-minute quarters", note: "The period structure matches FIBA, though other rules differ." },
    ],
    scorekeeperTips: ["Use the +1, +2, and +3 buttons for the scoring play that was awarded.", "Advance the quarter or half only when the game clock expires.", "Check the official signal before correcting a two-point shot to three points."],
    sources: [
      { label: "Official Basketball Rules", organization: "FIBA", url: "https://about.fiba.basketball/en/our-sport/official-basketball-rules" },
      { label: "Rule No. 5: Scoring and Timing", organization: "NBA", url: "https://official.nba.com/rule-no-5-scoring-and-timing/" },
      { label: "Women’s basketball period rules", organization: "NCAA", url: "https://www.ncaa.org/story.aspx?division=d3&file_date=1-28-2016&filename=women-s-basketball-rules-changes-reaping-benefits" },
    ],
  },
  football: {
    sport: "football",
    title: "How to Keep Score in Football",
    description: "Track touchdowns, field goals, conversions, safeties, quarters, and common American football scoring variants.",
    intro: "American football combines several scoring plays. The scoreboard total matters more than the number of scores, so record the exact point value after the ruling on the field.",
    quickFacts: [
      { label: "Touchdown", value: "6 points" },
      { label: "Field goal", value: "3 points" },
      { label: "Safety", value: "2 points" },
    ],
    scoring: [
      "Add six points for a touchdown.",
      "After a touchdown, add one for a successful kick or two for a successful scrimmage try.",
      "Add three points for a field goal and two points for a safety.",
      "Play four quarters. If the competition requires a winner and regulation ends tied, follow its overtime procedure.",
    ],
    variants: [
      { name: "NFL", scoring: "4 × 15-minute quarters", note: "Professional scoring uses 6, 3, 2, and 1-point plays, with league-specific overtime." },
      { name: "College", scoring: "4 × 15-minute quarters", note: "NCAA overtime uses alternating possessions rather than a timed extra period." },
      { name: "High school", scoring: "4 × 12-minute quarters", note: "State associations may add local timing and overtime rules." },
      { name: "Flag football", scoring: "Competition-specific", note: "Touchdown and conversion values can differ. Confirm the event rules before kickoff." },
    ],
    scorekeeperTips: ["Record the touchdown first, then record the conversion as a separate score.", "Wait for the officials to signal a field goal or safety.", "Use the quarter control at the end of each period."],
    sources: [
      { label: "2026 NFL Rulebook", organization: "NFL Football Operations", url: "https://operations.nfl.com/rules-officiating/2026-nfl-rulebook" },
      { label: "Football terms and scoring definitions", organization: "NFL Football Operations", url: "https://operations.nfl.com/rules-officiating/nfl-football-basics/football-terms" },
    ],
  },
  tennis: {
    sport: "tennis",
    title: "How to Keep Score in Tennis",
    description: "Understand tennis points, games, sets, deuce, advantage, tiebreaks, and best-of-three and best-of-five match formats.",
    intro: "Tennis is scored in layers: points win games, games win sets, and sets win the match. Shared Scores handles the 0–15–30–40 sequence, deuce, advantage, games, and set totals automatically.",
    quickFacts: [
      { label: "Point sequence", value: "0, 15, 30, 40, game" },
      { label: "Standard set", value: "First to 6 games, win by 2" },
      { label: "Tiebreak", value: "Usually first to 7, win by 2" },
    ],
    scoring: [
      "Award one point to the player or team that wins the rally. The display advances through 15, 30, and 40.",
      "At 40–40, the score is deuce. A player must win two consecutive points to win the game: advantage, then game.",
      "A standard set is won at six games with a two-game lead. At 6–6, most formats use a tiebreak.",
      "The player who wins two sets in a best-of-three match, or three sets in a best-of-five match, wins the match.",
    ],
    variants: [
      { name: "Best of 3", scoring: "First to 2 sets", note: "The most common match length for recreational and professional play." },
      { name: "Best of 5", scoring: "First to 3 sets", note: "Used in selected major men’s events and team competitions." },
      { name: "Match tiebreak", scoring: "First to 10, win by 2", note: "Often replaces a final set in doubles and local competition." },
      { name: "Tie Break Tens", scoring: "One tiebreak to 10", note: "An ITF-recognized short-form event with no games or sets." },
    ],
    scorekeeperTips: ["Tap the side that won the rally; the app handles tennis notation.", "Confirm whether the final set uses a tiebreak or continues until a two-game lead.", "For a match tiebreak, follow the event’s local format."],
    sources: [
      { label: "Rules of Tennis", organization: "International Tennis Federation", url: "https://www.itftennis.com/en/about-us/governance/rules-and-regulations/" },
      { label: "Tennis glossary and tiebreak scoring", organization: "International Tennis Federation", url: "https://www.itftennis.com/en/about-us/organisation/tennis-glossary/" },
      { label: "Tie Break Tens", organization: "International Tennis Federation", url: "https://www.itftennis.com/en/tours/tie-break-tens/" },
    ],
  },
  baseball: {
    sport: "baseball",
    title: "How to Keep Score in Baseball",
    description: "Track baseball runs by inning, understand regulation and extra innings, and compare nine-inning and seven-inning formats.",
    intro: "A baseball scoreboard records runs, not hits or base runners. Add one run each time a runner legally reaches home plate, and keep the teams’ totals through each half-inning.",
    quickFacts: [
      { label: "Standard game", value: "9 innings" },
      { label: "One inning", value: "Top and bottom halves" },
      { label: "Winner", value: "Most runs after regulation" },
    ],
    scoring: [
      "Add one run whenever a runner legally reaches home plate before the third out, subject to the play’s official ruling.",
      "The visiting team bats in the top half and the home team bats in the bottom half of each inning.",
      "After nine innings, the team with more runs wins. If the home team leads after the top of the ninth, the bottom half is not played.",
      "If the score is tied after regulation, continue into extra innings under the competition’s runner-placement rules.",
    ],
    variants: [
      { name: "Nine innings", scoring: "9 complete innings", note: "The professional standard and the default for most adult baseball." },
      { name: "Seven innings", scoring: "7 complete innings", note: "Common in youth, amateur, and short-format competition. Local mercy rules may also end the game early." },
      { name: "Extra innings", scoring: "Continue until the tie breaks", note: "MLB regular-season extra innings begin with an automatic runner on second; other leagues vary." },
    ],
    scorekeeperTips: ["Add only runs confirmed by the plate umpire or official scorer.", "Advance the inning after both teams complete their half-inning.", "Use the seven-inning option when the league schedule calls for it."],
    sources: [
      { label: "Regulation game rules", organization: "Major League Baseball", url: "https://www.mlb.com/glossary/rules/regulation-game" },
      { label: "Designated runner in extra innings", organization: "Major League Baseball", url: "https://www.mlb.com/glossary/rules/designated-runner" },
    ],
  },
  hockey: {
    sport: "hockey",
    title: "How to Keep Score in Hockey",
    description: "Learn hockey goal scoring, periods, regulation ties, overtime, shootouts, and common youth game-length variants.",
    intro: "Ice hockey awards one goal when the puck legally enters the net. The score is the total number of goals, carried through three periods and any overtime required by the competition.",
    quickFacts: [
      { label: "Goal", value: "1 point" },
      { label: "Maximum standard game", value: "3 × 20-minute periods" },
      { label: "Tied regulation", value: "Overtime or tie, by competition" },
    ],
    scoring: [
      "Add one goal after the official confirms that the puck legally entered the net.",
      "Carry the cumulative score through all three regulation periods.",
      "At the end of regulation, the higher score wins. A tied game may remain a tie or continue to overtime.",
      "If a shootout decides the game, the official final score generally adds one goal to the winning team, regardless of the number of shootout attempts scored.",
    ],
    variants: [
      { name: "NHL regulation", scoring: "3 × 20-minute periods", note: "Regular-season ties continue to overtime and then a shootout if needed." },
      { name: "Playoff hockey", scoring: "Sudden-death overtime periods", note: "Play continues until a goal decides the game; no shootout is used." },
      { name: "Youth and recreation", scoring: "Shorter periods", note: "USA Hockey competitions may use shorter period and penalty lengths by age and event." },
    ],
    scorekeeperTips: ["Wait for the referee’s goal signal before adding a point.", "Advance the period only when it ends.", "Check the event rules for whether a regulation tie stands."],
    sources: [
      { label: "Rule 636: Time of Game", organization: "USA Hockey", url: "https://www.usahockeyrulebook.com/page/7746/rule-636-start-of-game-and-time-of-game-time-outs" },
      { label: "Official hockey glossary", organization: "National Hockey League", url: "https://www.nhl.com/info/hockey-glossary" },
      { label: "Tournament overtime rules", organization: "USA Hockey", url: "https://www.usahockey.com/tournamentrules" },
    ],
  },
  soccer: {
    sport: "soccer",
    title: "How to Keep Score in Soccer",
    description: "Track soccer goals through two halves and understand draws, extra time, and penalty shootouts under the IFAB Laws of the Game.",
    intro: "Soccer uses a simple running total: each valid goal counts once. The standard match has two equal 45-minute halves, with time added for stoppages.",
    quickFacts: [
      { label: "Goal", value: "1 point" },
      { label: "Standard match", value: "2 × 45-minute halves" },
      { label: "Level after regulation", value: "Draw or tiebreak procedure" },
    ],
    scoring: [
      "Add one goal when the whole ball passes over the goal line between the posts and under the crossbar without an attacking offense.",
      "Carry the cumulative score from the first half into the second half.",
      "The team with more goals at full time wins. If the scores are equal, the result is a draw unless the competition requires a winner.",
      "A competition may use two periods of extra time and kicks from the penalty mark to determine a winner.",
    ],
    variants: [
      { name: "League match", scoring: "Two halves; draws allowed", note: "Standings commonly award competition points after the final result." },
      { name: "Knockout match", scoring: "Extra time, then penalties", note: "IFAB allows competition rules to choose approved procedures for determining a winner." },
      { name: "Youth and small-sided", scoring: "Shorter halves", note: "Competition rules set age-appropriate match length; each goal still counts once." },
    ],
    scorekeeperTips: ["Add the goal only after the referee confirms it.", "Keep shootout kicks separate from the regulation score.", "Use the halves control for regulation; note local extra-time rules separately."],
    sources: [
      { label: "Law 7: The Duration of the Match", organization: "IFAB", url: "https://www.theifab.com/laws/latest/the-duration-of-the-match/" },
      { label: "Law 10: Determining the Outcome", organization: "IFAB", url: "https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/" },
    ],
  },
  pickleball: {
    sport: "pickleball",
    title: "How to Keep Score in Pickleball",
    description: "Understand pickleball side-out and rally scoring, games to 11, 15, or 21, win-by-two rules, and common match formats.",
    intro: "Traditional pickleball uses side-out scoring, so only the serving side can win a point. Games are usually played to 11 and must be won by two, but official formats also allow games to 15 or 21 and provisional rally scoring.",
    quickFacts: [
      { label: "Standard game", value: "First to 11, win by 2" },
      { label: "Traditional scoring", value: "Serving side scores" },
      { label: "Long formats", value: "First to 15 or 21" },
    ],
    scoring: [
      "Under traditional side-out scoring, award a point only when the serving player or team wins the rally.",
      "A standard game is won at 11 with a two-point margin.",
      "Tournament formats may use one game to 15 or 21, still normally win by two.",
      "A match may be one game, best two-of-three, or best three-of-five, depending on the event format.",
    ],
    variants: [
      { name: "Best of 3 to 11", scoring: "First to 2 games", note: "The standard match format under USA Pickleball rules." },
      { name: "Best of 5 to 11", scoring: "First to 3 games", note: "An approved longer match format." },
      { name: "One game to 15 or 21", scoring: "Win by 2", note: "An approved tournament format for a single longer game." },
      { name: "Rally scoring", scoring: "Every rally awards a point", note: "USA Pickleball lists provisional rally-scoring formats; confirm the event’s selected procedure." },
    ],
    scorekeeperTips: ["Choose 11, 15, or 21 in setup.", "For side-out scoring, tap only when the serving side wins the rally.", "Confirm best-of-three or best-of-five before play."],
    sources: [
      { label: "Official rulebook and rules resources", organization: "USA Pickleball", url: "https://usapickleball.org/rules/" },
      { label: "Basic rules summary", organization: "USA Pickleball", url: "https://usapickleball.org/rules/summary/" },
      { label: "Approved tournament formats", organization: "USA Pickleball", url: "https://usapickleball.org/sanctioning/formats/" },
    ],
  },
  badminton: {
    sport: "badminton",
    title: "How to Keep Score in Badminton",
    description: "Learn badminton rally scoring, the current 3×21 format, the approved 3×15 format for 2027, deuce limits, and match scoring.",
    intro: "Badminton uses rally scoring, so every rally awards one point. Through January 3, 2027, the international format remains best of three games to 21. BWF has approved a new best-of-three, games-to-15 system beginning January 4, 2027.",
    quickFacts: [
      { label: "Current international format", value: "Best of 3 to 21" },
      { label: "Current cap", value: "First to 30 at 29–29" },
      { label: "From Jan. 4, 2027", value: "Best of 3 to 15" },
    ],
    scoring: [
      "Award one point to the side that wins each rally.",
      "Under the current 3×21 system, win a game at 21 with a two-point lead. At 29–29, the next point wins 30–29.",
      "The first side to win two games wins the match.",
      "Starting January 4, 2027, BWF international play changes to games to 15 with a two-point margin and a cap at 21.",
    ],
    variants: [
      { name: "3×21 current format", scoring: "Best of 3; games to 21", note: "Win by two, capped at 30. This remains the international format through January 3, 2027." },
      { name: "3×15 approved format", scoring: "Best of 3; games to 15", note: "Win by two, capped at 21. BWF implementation begins January 4, 2027." },
      { name: "Local short format", scoring: "Event-specific", note: "Schools and recreation programs may use shorter games. Confirm the tournament rules before starting." },
    ],
    scorekeeperTips: ["Use the current 21-point setting unless your event has adopted 3×15 early.", "Add one point after every rally.", "At 20–20, keep playing until a two-point lead or the 30-point cap."],
    sources: [
      { label: "Laws of Badminton", organization: "Badminton World Federation", url: "https://corporate.bwfbadminton.com/statutes/" },
      { label: "BWF members approve 3×15 scoring", organization: "Badminton World Federation", url: "https://bwfbadminton.com/news-single/2026/04/25/bwf-members-approve-3x15-scoring-system" },
      { label: "3×15 implementation date", organization: "USA Badminton", url: "https://usabadminton.org/bwf-approves-3x15-scoring-system/" },
    ],
  },
  "table-tennis": {
    sport: "table-tennis",
    title: "How to Keep Score in Table Tennis",
    description: "Track table tennis games to 11, deuce, service changes, and best-of-three, best-of-five, or best-of-seven matches.",
    intro: "Table tennis uses rally scoring, so every rally produces a point. A game normally goes to 11, but play continues beyond 10–10 until one side leads by two.",
    quickFacts: [{ label: "Standard game", value: "First to 11, win by 2" }, { label: "Common match", value: "Best of 5 games" }, { label: "At 10–10", value: "Serve changes every point" }],
    scoring: ["Award one point to the winner of every rally.", "End the game at 11 only when one side leads by at least two points.", "Change service every two points before 10–10, then after every point.", "Record the game and reset the rally score until one side wins a majority of the scheduled games."],
    variants: [{ name: "Best of 5", scoring: "First to 3 games", note: "A common tournament and club format." }, { name: "Best of 7", scoring: "First to 4 games", note: "Used in many major championship matches." }, { name: "Best of 3", scoring: "First to 2 games", note: "Useful for pools, youth play, and short schedules." }],
    scorekeeperTips: ["Add one after every rally.", "At 10–10, wait for a two-point lead.", "Choose the scheduled match length before play."],
    sources: [{ label: "Technical documents", organization: "World Table Tennis", url: "https://www.worldtabletennis.com/technicaldocuments" }, { label: "Match officials documents", organization: "ITTF", url: "https://www.ittf.com/committees/umpires-referees/documents/" }],
  },
  squash: {
    sport: "squash",
    title: "How to Keep Score in Squash",
    description: "Track squash rally scoring, games to 11, win-by-two play at 10-all, and best-of-three or best-of-five matches.",
    intro: "Modern squash awards one point on every rally. Games go to 11, and a 10–10 game continues until one player leads by two points.",
    quickFacts: [{ label: "Game", value: "First to 11, win by 2" }, { label: "Standard match", value: "Best of 5 games" }, { label: "Short match", value: "Best of 3 games" }],
    scoring: ["Award one point to the player who wins each rally.", "At 10–10, continue until either player leads by two.", "Record the completed game and reset the rally score to zero.", "The first player to three games in a best-of-five match, or two in a best-of-three match, wins."],
    variants: [{ name: "Best of 5", scoring: "First to 3 games", note: "The normal full match under World Squash rules." }, { name: "Best of 3", scoring: "First to 2 games", note: "An approved shorter format." }],
    scorekeeperTips: ["Tap the rally winner once.", "Do not stop at 11 if the margin is only one.", "Record lets without changing the score."],
    sources: [{ label: "Rules of Squash", organization: "World Squash Officiating", url: "https://worldsquashofficiating.com/rules-of-squash/" }, { label: "Rules and regulations", organization: "World Squash", url: "https://www.worldsquash.org/" }],
  },
  softball: {
    sport: "softball",
    title: "How to Keep Score in Softball",
    description: "Track softball runs by inning, seven-inning games, shortened formats, extra innings, and run-ahead endings.",
    intro: "Softball uses a cumulative run total like baseball, but a regulation international game is seven innings. Local youth and recreational leagues often use time limits or shorter games.",
    quickFacts: [{ label: "Standard game", value: "7 innings" }, { label: "Score", value: "1 run per runner home" }, { label: "Tie", value: "Extra innings by event rule" }],
    scoring: ["Add one run when a runner legally reaches home plate.", "The visiting team bats in the top half and the home team in the bottom half.", "Carry the total through seven innings unless a run-ahead or local time rule ends play.", "If tied after regulation, continue under the competition’s extra-inning procedure."],
    variants: [{ name: "Fast pitch", scoring: "7 innings", note: "The WBSC international standard." }, { name: "Slow pitch", scoring: "Usually 7 innings", note: "Home-run limits and local run rules may apply." }, { name: "Youth or timed", scoring: "5 innings or time limit", note: "Confirm the local schedule and run-ahead rule." }],
    scorekeeperTips: ["Add only runs confirmed by the umpire.", "Advance after both half-innings.", "Use the five-inning option only when local rules call for it."],
    sources: [{ label: "2026 Softball World Cup regulations", organization: "WBSC", url: "https://static.wbsc.org/uploads/federations/0/cms/documents/67c5ebaf-198b-2402-f7aa-4ad06d975914.pdf" }, { label: "Official softball resources", organization: "WBSC", url: "https://www.wbsc.org/en/organisation/documents" }],
  },
  lacrosse: {
    sport: "lacrosse",
    title: "How to Keep Score in Lacrosse",
    description: "Track lacrosse goals through four quarters, including field, women’s, box, and sixes timing variants.",
    intro: "Most lacrosse scoreboards add one for each legal goal and carry the total through four quarters. The quarter length and overtime procedure depend on the discipline and competition.",
    quickFacts: [{ label: "Goal", value: "1 point" }, { label: "Field format", value: "4 × 15-minute quarters" }, { label: "Sixes format", value: "4 × 8-minute quarters" }],
    scoring: ["Add one point when the officials award a goal.", "Carry the running total through all four quarters.", "Confirm the score with the officials at each quarter break.", "Use the event’s sudden-victory or overtime procedure if regulation ends tied."],
    variants: [{ name: "Field lacrosse", scoring: "4 × 15-minute quarters", note: "The World Lacrosse men’s field format." }, { name: "Sixes", scoring: "4 × 8-minute quarters", note: "A faster small-sided discipline." }, { name: "Box lacrosse", scoring: "4 × 15-minute quarters", note: "Indoor rules also use a running goal total." }],
    scorekeeperTips: ["Wait for the goal signal.", "Advance one quarter at a time.", "Keep any local two-point-arc rule separate unless the event uses one."],
    sources: [{ label: "2025–2027 Men’s Field Rules", organization: "World Lacrosse", url: "https://worldlacrosse.sport/wp-content/uploads/2025/03/WL_Mens-Rules_25-27_FINAL.pdf" }, { label: "Sixes format primer", organization: "World Lacrosse", url: "https://worldlacrosse.sport/sixes-primer-catch-up-on-the-discipline-ahead-of-the-world-games-2025/" }],
  },
  rugby: {
    sport: "rugby",
    title: "How to Keep Score in Rugby",
    description: "Track rugby tries, conversions, penalty goals, drop goals, halves, sevens, and penalty tries.",
    intro: "Rugby combines several scoring plays. A try is worth five, a conversion two, and a penalty goal or drop goal three. A penalty try awards seven without a conversion attempt.",
    quickFacts: [{ label: "Try", value: "5 points" }, { label: "Conversion", value: "2 points" }, { label: "Penalty or drop goal", value: "3 points" }],
    scoring: ["Add five for a try, then two if the conversion succeeds.", "Add three for a successful penalty goal or drop goal.", "Add seven for a penalty try and do not add a separate conversion.", "Carry the score through both halves; the higher score at full time wins unless the competition requires extra time."],
    variants: [{ name: "Rugby union", scoring: "2 × 40-minute halves", note: "The standard fifteen-a-side format." }, { name: "Rugby sevens", scoring: "2 × 7-minute halves", note: "Finals may use longer halves under competition rules." }, { name: "Youth and touch", scoring: "Modified timing", note: "Scoring and match length may be adapted locally." }],
    scorekeeperTips: ["Record the try before the conversion.", "Use +7 only for an awarded penalty try.", "Check the referee’s signal before adding a kick."],
    sources: [{ label: "Law 8: Scoring", organization: "World Rugby", url: "https://passport.world.rugby/laws-of-the-game/laws-by-number/8-scoring/" }, { label: "Law 5: Time", organization: "World Rugby", url: "https://passport.world.rugby/laws-of-the-game/laws-by-number/5-time/" }],
  },
  handball: {
    sport: "handball",
    title: "How to Keep Score in Team Handball",
    description: "Track indoor handball goals across two halves, regulation ties, overtime, and seven-metre tiebreaks.",
    intro: "Indoor handball uses a running goal total. Every legal goal counts once, whether scored from open play, a free throw, or a seven-metre throw.",
    quickFacts: [{ label: "Goal", value: "1 point" }, { label: "Adult match", value: "2 × 30-minute halves" }, { label: "Winner", value: "Most goals" }],
    scoring: ["Add one point for every goal confirmed by the referees.", "Carry the score from the first half into the second.", "A tied league match may finish as a draw.", "Knockout events may use overtime and then seven-metre throws under their competition rules."],
    variants: [{ name: "Senior indoor", scoring: "2 × 30-minute halves", note: "The standard adult format." }, { name: "Youth", scoring: "Shorter halves", note: "The IHF shortens playing time for younger age groups." }, { name: "Knockout", scoring: "Overtime, then tiebreak", note: "Follow the event’s decision procedure." }],
    scorekeeperTips: ["Add one only after the goal signal.", "Advance at halftime.", "Keep tiebreak throws separate from the regulation score when required."],
    sources: [{ label: "Rules of the Game: Indoor Handball", organization: "IHF", url: "https://www.ihf.info/sites/default/files/2022-09/09A%20-%20Rules%20of%20the%20Game_Indoor%20Handball_E.pdf" }, { label: "Handball rules overview", organization: "IHF", url: "https://www.ihf.info/sites/default/files/2020-01/H%40S_rules_brochure.pdf" }],
  },
  "water-polo": {
    sport: "water-polo",
    title: "How to Keep Score in Water Polo",
    description: "Track water polo goals by period, regulation totals, penalty shootouts, and current World Aquatics competition rules.",
    intro: "Water polo uses a running goal total through four periods. Each legal goal counts once, including goals from penalty throws and power-play situations.",
    quickFacts: [{ label: "Goal", value: "1 point" }, { label: "Match", value: "4 periods" }, { label: "Tied knockout", value: "Penalty shootout" }],
    scoring: ["Add one when the whole ball crosses the goal line under the crossbar.", "Carry the cumulative score through all four periods.", "At regulation end, the higher score wins or the match remains a draw if the competition allows.", "If a shootout is required, follow the event rule for recording the official final result."],
    variants: [{ name: "World Aquatics", scoring: "4 regulation periods", note: "Current timing and possession rules are maintained in the competition regulations." }, { name: "Youth", scoring: "Shorter periods", note: "Age-group competitions may shorten playing time." }, { name: "Knockout", scoring: "Shootout after a tie", note: "The tournament procedure determines the winner." }],
    scorekeeperTips: ["Wait for the official goal signal.", "Advance after each period.", "Do not mix exclusion counts into the goal total."],
    sources: [{ label: "Current competition regulations", organization: "World Aquatics", url: "https://www.worldaquatics.com/news/3090417/competition-regulations" }, { label: "2025 rules update", organization: "World Aquatics", url: "https://www.worldaquatics.com/news/4186172/world-aquatics-updates-competition-regulations-2025" }],
  },
  "field-hockey": {
    sport: "field-hockey",
    title: "How to Keep Score in Field Hockey",
    description: "Track field hockey goals through four quarters, draws, shootouts, and common youth or indoor variants.",
    intro: "Field hockey awards one goal when the ball is legally played into the goal after an attacker touches it inside the circle. The running total carries through four quarters.",
    quickFacts: [{ label: "Goal", value: "1 point" }, { label: "Outdoor match", value: "4 × 15-minute quarters" }, { label: "Winner", value: "Most goals" }],
    scoring: ["Add one after the umpire awards a goal.", "Carry the score through four regulation quarters.", "A tied pool or league match may remain a draw.", "Knockout competitions may use a shootout to determine which team advances."],
    variants: [{ name: "Outdoor hockey", scoring: "4 × 15-minute quarters", note: "The international standard." }, { name: "Indoor hockey", scoring: "Competition-specific periods", note: "Use the event timing while keeping the same one-goal scoring." }, { name: "Youth", scoring: "Shorter quarters", note: "Local associations set age-appropriate duration." }],
    scorekeeperTips: ["Wait for the umpire’s goal signal.", "Advance one quarter at a time.", "Keep a shootout result separate when the competition requires it."],
    sources: [{ label: "Rules of Hockey", organization: "International Hockey Federation", url: "https://www.fih.hockey/about-fih/official-documents/rules-of-hockey" }, { label: "Rules and regulations", organization: "International Hockey Federation", url: "https://www.fih.hockey/about-fih/official-documents" }],
  },
};

export const RULE_SPORTS = Object.values(SPORT_RULES);
