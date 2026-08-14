import { isSport, setsToWin, SPORTS, targetFor, type Sport } from "../lib/sports";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const COLOR_PATTERN = /^#[0-9A-F]{6}$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface MatchEnv { DB: D1Database }
type Side = "left" | "right";
type TeamKey = "a" | "b";
type MatchRow = Record<string, unknown>;
type MatchSet = { setNumber: number; teamAScore: number; teamBScore: number; winner: TeamKey };
type ScoreSnapshot = { team: TeamKey; pointsA: number; pointsB: number; setsA: number; setsB: number; currentSet: number; status: "live" | "complete"; gamesA?: number; gamesB?: number; tiebreak?: boolean };
type ScoreState = { gamesA?: number; gamesB?: number; tiebreak?: boolean; target?: number; history?: ScoreSnapshot[] };
type PublicMatch = {
  code: string; sport: Sport;
  teamA: { name: string; color: string; points: number; sets: number };
  teamB: { name: string; color: string; points: number; sets: number };
  leftTeamKey: TeamKey; bestOf: number; setsToWin: number; currentSet: number; currentTarget: number;
  status: "live" | "complete"; version: number; updatedAt: string; expiresAt: string; sets: MatchSet[];
  state: Omit<ScoreState, "history">;
};
type StreamClient = { controller: ReadableStreamDefaultController<Uint8Array>; encoder: TextEncoder };
type MatchHub = { clients: Set<StreamClient>; lastVersion: number; timer: ReturnType<typeof setInterval> | null; env: MatchEnv };

const hubs = new Map<string, MatchHub>();
const createWindows = new Map<string, { count: number; resetAt: number }>();
let schemaReady: Promise<void> | null = null;

function ensureSchema(env: MatchEnv) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS matches (
        code text PRIMARY KEY NOT NULL, edit_token_hash text NOT NULL, sport text DEFAULT 'volleyball' NOT NULL,
        team_a_name text NOT NULL, team_a_color text NOT NULL, team_b_name text NOT NULL, team_b_color text NOT NULL,
        points_a integer DEFAULT 0 NOT NULL, points_b integer DEFAULT 0 NOT NULL, sets_a integer DEFAULT 0 NOT NULL,
        sets_b integer DEFAULT 0 NOT NULL, current_set integer DEFAULT 1 NOT NULL, best_of integer DEFAULT 3 NOT NULL,
        left_team text DEFAULT 'a' NOT NULL, status text DEFAULT 'live' NOT NULL, score_data text DEFAULT '{}' NOT NULL,
        version integer DEFAULT 1 NOT NULL, created_at text NOT NULL, updated_at text NOT NULL, expires_at text NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS match_sets (
        match_code text NOT NULL, set_number integer NOT NULL, team_a_score integer NOT NULL, team_b_score integer NOT NULL,
        winner text NOT NULL, created_at text NOT NULL, PRIMARY KEY(match_code, set_number),
        FOREIGN KEY (match_code) REFERENCES matches(code) ON DELETE cascade
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS public_match_listings (
        match_code text PRIMARY KEY NOT NULL, created_at text NOT NULL,
        FOREIGN KEY (match_code) REFERENCES matches(code) ON DELETE cascade
      )`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS public_match_listings_created_idx ON public_match_listings(created_at DESC)"),
      ]);
      const columns = await env.DB.prepare("PRAGMA table_info(matches)").all<{ name: string }>();
      if (!columns.results.some((column) => column.name === "score_data")) {
        await env.DB.prepare("ALTER TABLE matches ADD COLUMN score_data text DEFAULT '{}' NOT NULL").run();
      }
    })().catch((error) => { schemaReady = null; throw error; });
  }
  return schemaReady;
}

function corsHeaders(extra: HeadersInit = {}) { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS", "Access-Control-Expose-Headers": "ETag", "X-Content-Type-Options": "nosniff", ...extra }; }
function json(data: unknown, status = 200, extra: HeadersInit = {}) { return Response.json(data, { status, headers: corsHeaders(extra) }); }
function cleanName(value: unknown, fallback: string) { const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""; return (text || fallback).slice(0, 50); }
function cleanColor(value: unknown, fallback: string) { return typeof value === "string" && COLOR_PATTERN.test(value) ? value.toUpperCase() : fallback; }
function toInt(value: unknown) { return Number(value) || 0; }
function parseState(value: unknown): ScoreState { try { const parsed = JSON.parse(String(value || "{}")); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } }
async function readBody(request: Request) { const length = Number(request.headers.get("content-length") || 0); if (length > 16_384) throw new ApiError(413, "Request body is too large"); try { return (await request.json()) as Record<string, unknown>; } catch { throw new ApiError(400, "Invalid JSON body"); } }
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
function randomString(length: number, alphabet: string) { const bytes = crypto.getRandomValues(new Uint8Array(length)); return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(""); }
function randomToken() { const bytes = crypto.getRandomValues(new Uint8Array(24)); let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
async function sha256(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

function normalizeMatch(row: MatchRow, sets: MatchSet[]): PublicMatch {
  const sport = isSport(row.sport) ? row.sport : "volleyball";
  const bestOf = toInt(row.best_of) || SPORTS[sport].formatOptions[0].value;
  const currentSet = toInt(row.current_set) || 1;
  const rawState = parseState(row.score_data); const state = { ...rawState }; delete state.history;
  return {
    code: String(row.code), sport,
    teamA: { name: String(row.team_a_name), color: String(row.team_a_color), points: toInt(row.points_a), sets: toInt(row.sets_a) },
    teamB: { name: String(row.team_b_name), color: String(row.team_b_color), points: toInt(row.points_b), sets: toInt(row.sets_b) },
    leftTeamKey: row.left_team === "b" ? "b" : "a", bestOf, setsToWin: setsToWin(sport, bestOf), currentSet,
    currentTarget: targetFor(sport, currentSet, bestOf, state.target), status: row.status === "complete" ? "complete" : "live",
    version: toInt(row.version), updatedAt: String(row.updated_at), expiresAt: String(row.expires_at), sets, state,
  };
}
async function loadRow(env: MatchEnv, code: string) { return env.DB.prepare("SELECT * FROM matches WHERE code = ? AND expires_at > ?").bind(code, new Date().toISOString()).first<MatchRow>(); }
async function loadMatch(env: MatchEnv, code: string): Promise<PublicMatch | null> {
  const row = await loadRow(env, code); if (!row) return null;
  const result = await env.DB.prepare("SELECT set_number, team_a_score, team_b_score, winner FROM match_sets WHERE match_code = ? ORDER BY set_number").bind(code).all<Record<string, unknown>>();
  return normalizeMatch(row, result.results.map((set) => ({ setNumber: toInt(set.set_number), teamAScore: toInt(set.team_a_score), teamBScore: toInt(set.team_b_score), winner: set.winner === "b" ? "b" : "a" })));
}

function writeEvent(client: StreamClient, event: string, data: unknown) { client.controller.enqueue(client.encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); }
function broadcast(match: PublicMatch) { const hub = hubs.get(match.code); if (!hub) return; hub.lastVersion = match.version; for (const client of [...hub.clients]) { try { writeEvent(client, "score", { match }); } catch { hub.clients.delete(client); } } }
function stopEmptyHub(code: string, hub: MatchHub) { if (hub.clients.size) return; if (hub.timer) clearInterval(hub.timer); hubs.delete(code); }
function getHub(code: string, env: MatchEnv) {
  let hub = hubs.get(code); if (hub) return hub; hub = { clients: new Set(), lastVersion: 0, timer: null, env };
  hub.timer = setInterval(async () => { try { const match = await loadMatch(hub!.env, code); if (!match) { for (const client of hub!.clients) writeEvent(client, "expired", { code }); for (const client of [...hub!.clients]) client.controller.close(); hub!.clients.clear(); stopEmptyHub(code, hub!); return; } if (match.version !== hub!.lastVersion) broadcast(match); else for (const client of [...hub!.clients]) { try { client.controller.enqueue(client.encoder.encode(": keepalive\n\n")); } catch { hub!.clients.delete(client); } } stopEmptyHub(code, hub!); } catch { /* next poll recovers */ } }, 2000);
  hubs.set(code, hub); return hub;
}
async function streamMatch(request: Request, env: MatchEnv, code: string) {
  const initial = await loadMatch(env, code); if (!initial) return json({ error: "Match not found or expired" }, 404);
  const encoder = new TextEncoder(); let client: StreamClient; const hub = getHub(code, env);
  const stream = new ReadableStream<Uint8Array>({ start(controller) { client = { controller, encoder }; hub.clients.add(client); hub.lastVersion = Math.max(hub.lastVersion, initial.version); writeEvent(client, "score", { match: initial }); request.signal.addEventListener("abort", () => { hub.clients.delete(client); stopEmptyHub(code, hub); }, { once: true }); }, cancel() { if (client) hub.clients.delete(client); stopEmptyHub(code, hub); } });
  return new Response(stream, { headers: corsHeaders({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" }) });
}

function allowCreate(request: Request) { const ip = request.headers.get("cf-connecting-ip") || "local"; const now = Date.now(); const current = createWindows.get(ip); if (!current || current.resetAt < now) { createWindows.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 }); return true; } current.count += 1; return current.count <= 20; }
async function createMatch(request: Request, env: MatchEnv) {
  if (!allowCreate(request)) throw new ApiError(429, "Too many new matches. Try again later.");
  const body = await readBody(request); const sport: Sport = isSport(body.sport) ? body.sport : "volleyball"; const definition = SPORTS[sport]; const requestedFormat = toInt(body.bestOf);
  const bestOf = definition.formatOptions.some((option) => option.value === requestedFormat) ? requestedFormat : definition.formatOptions[0].value;
  const target = sport === "pickleball" && [11, 15, 21].includes(toInt(body.target)) ? toInt(body.target) : undefined;
  const scoreState: ScoreState = sport === "tennis" ? { gamesA: 0, gamesB: 0, tiebreak: false, history: [] } : target ? { target } : {};
  const token = randomToken(); const tokenHash = await sha256(token); let code = "";
  for (let attempt = 0; attempt < 16; attempt += 1) { const candidate = randomString(6, CODE_ALPHABET); if (!(await env.DB.prepare("SELECT 1 FROM matches WHERE code = ?").bind(candidate).first())) { code = candidate; break; } }
  if (!code) throw new ApiError(503, "Unable to create a share code"); const now = new Date(); const expires = new Date(now.getTime() + DAY_MS);
  const statements = [
    env.DB.prepare("DELETE FROM match_sets WHERE match_code IN (SELECT code FROM matches WHERE expires_at <= ?)").bind(now.toISOString()),
    env.DB.prepare("DELETE FROM public_match_listings WHERE match_code IN (SELECT code FROM matches WHERE expires_at <= ?)").bind(now.toISOString()),
    env.DB.prepare("DELETE FROM matches WHERE expires_at <= ?").bind(now.toISOString()),
    env.DB.prepare(`INSERT INTO matches (code, edit_token_hash, sport, team_a_name, team_a_color, team_b_name, team_b_color, points_a, points_b, sets_a, sets_b, current_set, best_of, left_team, status, score_data, version, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 1, ?, 'a', 'live', ?, 1, ?, ?, ?)`)
      .bind(code, tokenHash, sport, cleanName(body.teamAName, definition.sideNoun === "Player" ? "Player one" : "Home"), cleanColor(body.teamAColor, "#D84C3F"), cleanName(body.teamBName, definition.sideNoun === "Player" ? "Player two" : "Visitors"), cleanColor(body.teamBColor, "#3657B3"), bestOf, JSON.stringify(scoreState), now.toISOString(), now.toISOString(), expires.toISOString()),
  ];
  if (body.showOnHome !== false) statements.push(env.DB.prepare("INSERT INTO public_match_listings (match_code, created_at) VALUES (?, ?)").bind(code, now.toISOString()));
  await env.DB.batch(statements); return json({ match: await loadMatch(env, code), scorekeeperToken: token }, 201, { "Cache-Control": "no-store" });
}

async function loadRecentMatches(env: MatchEnv) { const result = await env.DB.prepare(`SELECT m.code FROM matches m INNER JOIN public_match_listings p ON p.match_code = m.code WHERE m.expires_at > ? ORDER BY m.updated_at DESC LIMIT 10`).bind(new Date().toISOString()).all<{ code: string }>(); const matches = await Promise.all(result.results.map((row) => loadMatch(env, row.code))); return matches.filter((match): match is PublicMatch => Boolean(match)); }
async function authorize(request: Request, env: MatchEnv, code: string) { const authorization = request.headers.get("authorization") || ""; const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""; if (!token || token.length > 100) throw new ApiError(401, "A scorekeeper key is required"); const row = await env.DB.prepare("SELECT edit_token_hash FROM matches WHERE code = ? AND expires_at > ?").bind(code, new Date().toISOString()).first<{ edit_token_hash: string }>(); if (!row || (await sha256(token)) !== row.edit_token_hash) throw new ApiError(403, "This scorekeeper key is not valid"); }
function sideToTeam(match: PublicMatch, side: Side): TeamKey { return side === "left" ? match.leftTeamKey : match.leftTeamKey === "a" ? "b" : "a"; }
function validSetWinner(match: PublicMatch, winner: TeamKey) { const winnerPoints = winner === "a" ? match.teamA.points : match.teamB.points; const loserPoints = winner === "a" ? match.teamB.points : match.teamA.points; if (match.sport === "badminton") return (winnerPoints >= 21 && winnerPoints - loserPoints >= 2) || winnerPoints === 30; return winnerPoints >= match.currentTarget && winnerPoints - loserPoints >= 2; }
function winnerOf(a: number, b: number): TeamKey { return a >= b ? "a" : "b"; }

function tennisNext(current: PublicMatch, rawState: ScoreState, team: TeamKey) {
  let pointsA = current.teamA.points; let pointsB = current.teamB.points; let setsA = current.teamA.sets; let setsB = current.teamB.sets; let currentSet = current.currentSet; let status = current.status;
  let gamesA = toInt(rawState.gamesA); let gamesB = toInt(rawState.gamesB); let tiebreak = Boolean(rawState.tiebreak); const history = [...(rawState.history || [])].slice(-79);
  history.push({ team, pointsA, pointsB, setsA, setsB, currentSet, status, gamesA, gamesB, tiebreak }); const setRows: { number: number; a: number; b: number; winner: TeamKey }[] = [];
  const winGame = () => { if (team === "a") gamesA += 1; else gamesB += 1; pointsA = 0; pointsB = 0; const setWon = (Math.max(gamesA, gamesB) >= 6 && Math.abs(gamesA - gamesB) >= 2) || Math.max(gamesA, gamesB) >= 7; if (setWon) { const winner = gamesA > gamesB ? "a" : "b"; setRows.push({ number: currentSet, a: gamesA, b: gamesB, winner }); if (winner === "a") setsA += 1; else setsB += 1; status = Math.max(setsA, setsB) >= Math.ceil(current.bestOf / 2) ? "complete" : "live"; if (status === "live") currentSet += 1; gamesA = 0; gamesB = 0; tiebreak = false; } else if (gamesA === 6 && gamesB === 6) tiebreak = true; };
  if (tiebreak) { if (team === "a") pointsA += 1; else pointsB += 1; if (Math.max(pointsA, pointsB) >= 7 && Math.abs(pointsA - pointsB) >= 2) winGame(); }
  else { const own = team === "a" ? pointsA : pointsB; const other = team === "a" ? pointsB : pointsA; if ((own >= 3 && own - other >= 1) || (own === 3 && other <= 2)) winGame(); else if (own === 3 && other === 3) { if (team === "a") pointsA = 4; else pointsB = 4; } else if (other === 4) { pointsA = 3; pointsB = 3; } else if (team === "a") pointsA += 1; else pointsB += 1; }
  return { pointsA, pointsB, setsA, setsB, currentSet, status, state: { gamesA, gamesB, tiebreak, history }, setRows };
}

async function updateMatch(request: Request, env: MatchEnv, code: string) {
  await authorize(request, env, code); const body = await readBody(request); const action = String(body.action || ""); const row = await loadRow(env, code); const current = await loadMatch(env, code); if (!row || !current) throw new ApiError(404, "Match not found or expired");
  const rawState = parseState(row.score_data); const now = new Date(); const expiresAt = new Date(now.getTime() + DAY_MS).toISOString(); const touch = `version = version + 1, updated_at = ?, expires_at = ?`;
  if (action === "point") {
    if (current.status === "complete") throw new ApiError(409, "This match is complete"); const side: Side = body.side === "right" ? "right" : "left"; const team = sideToTeam(current, side); const requested = Math.trunc(Number(body.amount) || 1);
    if (current.sport === "tennis") {
      if (requested < 0) {
        const history = [...(rawState.history || [])]; const snapshot = history.pop();
        if (snapshot) await env.DB.batch([
          env.DB.prepare(`UPDATE matches SET points_a = ?, points_b = ?, sets_a = ?, sets_b = ?, current_set = ?, status = ?, score_data = ?, ${touch} WHERE code = ?`).bind(snapshot.pointsA, snapshot.pointsB, snapshot.setsA, snapshot.setsB, snapshot.currentSet, snapshot.status, JSON.stringify({ gamesA: snapshot.gamesA || 0, gamesB: snapshot.gamesB || 0, tiebreak: Boolean(snapshot.tiebreak), history }), now.toISOString(), expiresAt, code),
          env.DB.prepare("DELETE FROM match_sets WHERE match_code = ? AND set_number >= ?").bind(code, snapshot.currentSet),
        ]);
      }
      else { const next = tennisNext(current, rawState, team); const statements = [env.DB.prepare(`UPDATE matches SET points_a = ?, points_b = ?, sets_a = ?, sets_b = ?, current_set = ?, status = ?, score_data = ?, ${touch} WHERE code = ?`).bind(next.pointsA, next.pointsB, next.setsA, next.setsB, next.currentSet, next.status, JSON.stringify(next.state), now.toISOString(), expiresAt, code)]; for (const set of next.setRows) statements.push(env.DB.prepare("INSERT OR REPLACE INTO match_sets (match_code, set_number, team_a_score, team_b_score, winner, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(code, set.number, set.a, set.b, set.winner, now.toISOString())); await env.DB.batch(statements); }
    } else { const allowed = SPORTS[current.sport].scoreButtons; const amount = requested < 0 ? -1 : allowed.includes(requested) ? requested : 1; const column = team === "a" ? "points_a" : "points_b"; await env.DB.prepare(`UPDATE matches SET ${column} = MAX(0, ${column} + ?), ${touch} WHERE code = ?`).bind(amount, now.toISOString(), expiresAt, code).run(); }
  } else if (action === "setCount") {
    const side: Side = body.side === "right" ? "right" : "left"; const team = sideToTeam(current, side); const amount = body.amount === -1 ? -1 : 1; const column = team === "a" ? "sets_a" : "sets_b"; const currentWins = team === "a" ? current.teamA.sets : current.teamB.sets; const nextWins = Math.max(0, Math.min(current.setsToWin, currentWins + amount)); const otherWins = team === "a" ? current.teamB.sets : current.teamA.sets; const status = SPORTS[current.sport].unit === "set" && Math.max(nextWins, otherWins) >= current.setsToWin ? "complete" : "live"; await env.DB.prepare(`UPDATE matches SET ${column} = ?, status = ?, ${touch} WHERE code = ?`).bind(nextWins, status, now.toISOString(), expiresAt, code).run();
  } else if (action === "swap") await env.DB.prepare(`UPDATE matches SET left_team = ?, ${touch} WHERE code = ?`).bind(current.leftTeamKey === "a" ? "b" : "a", now.toISOString(), expiresAt, code).run();
  else if (action === "edit") await env.DB.prepare(`UPDATE matches SET team_a_name = ?, team_a_color = ?, team_b_name = ?, team_b_color = ?, ${touch} WHERE code = ?`).bind(cleanName(body.teamAName, current.teamA.name), cleanColor(body.teamAColor, current.teamA.color), cleanName(body.teamBName, current.teamB.name), cleanColor(body.teamBColor, current.teamB.color), now.toISOString(), expiresAt, code).run();
  else if (action === "finishSet") {
    if (!["volleyball", "pickleball", "badminton"].includes(current.sport)) throw new ApiError(409, "This sport advances by period or inning"); const winner: TeamKey = body.winner === "b" ? "b" : "a"; if (!validSetWinner(current, winner)) throw new ApiError(409, `The game must reach ${current.currentTarget} with the required lead`); const nextSetsA = current.teamA.sets + (winner === "a" ? 1 : 0); const nextSetsB = current.teamB.sets + (winner === "b" ? 1 : 0); const complete = Math.max(nextSetsA, nextSetsB) >= current.setsToWin;
    await env.DB.batch([env.DB.prepare("INSERT OR REPLACE INTO match_sets (match_code, set_number, team_a_score, team_b_score, winner, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(code, current.currentSet, current.teamA.points, current.teamB.points, winner, now.toISOString()), env.DB.prepare(`UPDATE matches SET sets_a = ?, sets_b = ?, points_a = 0, points_b = 0, current_set = current_set + ?, status = ?, ${touch} WHERE code = ?`).bind(nextSetsA, nextSetsB, complete ? 0 : 1, complete ? "complete" : "live", now.toISOString(), expiresAt, code)]);
  } else if (action === "advance") {
    if (SPORTS[current.sport].unit === "set") throw new ApiError(409, "This sport advances by completed games"); const complete = current.currentSet >= current.bestOf; await env.DB.batch([env.DB.prepare("INSERT OR REPLACE INTO match_sets (match_code, set_number, team_a_score, team_b_score, winner, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(code, current.currentSet, current.teamA.points, current.teamB.points, winnerOf(current.teamA.points, current.teamB.points), now.toISOString()), env.DB.prepare(`UPDATE matches SET current_set = current_set + ?, status = ?, ${touch} WHERE code = ?`).bind(complete ? 0 : 1, complete ? "complete" : "live", now.toISOString(), expiresAt, code)]);
  } else if (action === "reset") {
    const state: ScoreState = current.sport === "tennis" ? { gamesA: 0, gamesB: 0, tiebreak: false, history: [] } : rawState.target ? { target: rawState.target } : {}; await env.DB.batch([env.DB.prepare("DELETE FROM match_sets WHERE match_code = ?").bind(code), env.DB.prepare(`UPDATE matches SET points_a = 0, points_b = 0, sets_a = 0, sets_b = 0, current_set = 1, status = 'live', score_data = ?, ${touch} WHERE code = ?`).bind(JSON.stringify(state), now.toISOString(), expiresAt, code)]);
  } else throw new ApiError(400, "Unknown scorekeeping action");
  const match = await loadMatch(env, code); if (!match) throw new ApiError(404, "Match not found"); broadcast(match); return json({ match }, 200, { "Cache-Control": "no-store" });
}

function openApi(request: Request) { const origin = new URL(request.url).origin; return json({ openapi: "3.1.0", info: { title: "Shared Scores Read API", version: "1.1.0", description: "Public, read-only live score feeds for sideline sports. Scorekeeper writes require a private bearer token." }, servers: [{ url: origin }], paths: { "/api/v1/matches/{code}": { get: { summary: "Get the current match state", responses: { "200": { description: "Current sport, score, sides, segment history, and match status" } } } }, "/api/v1/matches/{code}/events": { get: { summary: "Subscribe to live score events using Server-Sent Events", responses: { "200": { description: "A text/event-stream containing score events" } } } }, "/api/v1/matches/recent": { get: { summary: "List the 10 most recently updated public matches", responses: { "200": { description: "Public live scoreboards selected by their scorekeepers" } } } } } }, 200, { "Cache-Control": "public, max-age=3600" }); }

export async function handleMatchApi(request: Request, env: MatchEnv): Promise<Response | null> {
  const url = new URL(request.url); if (!url.pathname.startsWith("/api/v1/")) return null; if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  try {
    await ensureSchema(env); if (url.pathname === "/api/v1/openapi.json" && request.method === "GET") return openApi(request); if (url.pathname === "/api/v1/matches" && request.method === "POST") return createMatch(request, env); if (url.pathname === "/api/v1/matches/recent" && request.method === "GET") return json({ matches: await loadRecentMatches(env) }, 200, { "Cache-Control": "public, max-age=2, stale-while-revalidate=3" });
    const eventsMatch = url.pathname.match(/^\/api\/v1\/matches\/([A-HJ-NP-Z2-9]{6})\/events$/i); if (eventsMatch && request.method === "GET") return streamMatch(request, env, eventsMatch[1].toUpperCase()); const matchRoute = url.pathname.match(/^\/api\/v1\/matches\/([A-HJ-NP-Z2-9]{6})$/i); if (!matchRoute || !CODE_PATTERN.test(matchRoute[1].toUpperCase())) throw new ApiError(404, "API route not found"); const code = matchRoute[1].toUpperCase();
    if (request.method === "GET") { const match = await loadMatch(env, code); if (!match) throw new ApiError(404, "Match not found or expired"); const etag = `\"match-${code}-${match.version}\"`; if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: corsHeaders({ ETag: etag, "Cache-Control": "public, max-age=1, stale-while-revalidate=3" }) }); return json({ match }, 200, { ETag: etag, "Cache-Control": "public, max-age=1, stale-while-revalidate=3" }); }
    if (request.method === "PATCH") return updateMatch(request, env, code); throw new ApiError(405, "Method not allowed");
  } catch (error) { if (error instanceof ApiError) return json({ error: error.message }, error.status, { "Cache-Control": "no-store" }); console.error("match api", error); return json({ error: "Unable to process the score request" }, 500, { "Cache-Control": "no-store" }); }
}
