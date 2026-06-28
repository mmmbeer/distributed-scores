import { createGame, getGame, updateGame } from "./api.js";
import { $, hide, show, toast } from "./dom.js";
import { GamePoller } from "./poller.js";
import { goHome, goScorekeeper, goViewer, route, viewerUrl } from "./routes.js";
import { bindTeamEditing, bindTouchZone, isEditingTeamName, render } from "./scoreboard.js";

let game = null;
let mode = "landing";
let saveTimer = null;
let saving = false;
let poller = null;

function setStatus(message) {
  $("syncStatus").textContent = message;
}

function showBoard(nextMode) {
  mode = nextMode;
  document.body.className = `${mode}-mode`;
  $("scoreboard").hidden = false;
  hide($("homeModal"));
  hide($("setupModal"));
  hide($("joinModal"));
}

async function savePatch(patch) {
  if (mode !== "scorekeeper" || !game) return;
  game = { ...game, ...patch };
  render(game);
  saving = true;
  setStatus("Saving...");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      game = await updateGame(game);
      render(game);
      setStatus("Live sync");
    } catch {
      setStatus("Save failed");
    } finally {
      saving = false;
    }
  }, 80);
}

function bindControls() {
  bindTeamEditing(savePatch);
  bindTouchZone($("leftSide"), "left", changeScore);
  bindTouchZone($("rightSide"), "right", changeScore);
  $("leftGame").addEventListener("click", e => addGameWin(e, "leftGames"));
  $("rightGame").addEventListener("click", e => addGameWin(e, "rightGames"));
  $("newSet").addEventListener("click", () => savePatch({ leftScore: 0, rightScore: 0, setNumber: game.setNumber + 1 }));
  $("resetMatch").addEventListener("click", () => savePatch({ leftScore: 0, rightScore: 0, leftGames: 0, rightGames: 0, setNumber: 1 }));
  $("shareGame").addEventListener("click", shareGame);
  $("homeButton").addEventListener("click", goHome);
}

function addGameWin(event, key) {
  event.stopPropagation();
  if (!game || mode !== "scorekeeper") return;
  savePatch({ [key]: Number(game[key]) + 1 });
}

function changeScore(side, amount) {
  if (!game || mode !== "scorekeeper") return;
  const key = side === "left" ? "leftScore" : "rightScore";
  savePatch({ [key]: Math.max(0, Number(game[key]) + amount) });
}

async function shareGame() {
  const url = viewerUrl(game.gameId);
  if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    await navigator.share({ title: "Volleyball score", url }).catch(() => {});
    return;
  }
  await navigator.clipboard.writeText(url);
  toast("Viewer link copied");
}

async function startGame(id, nextMode) {
  game = await getGame(id, 0, 0);
  showBoard(nextMode);
  render(game);
  poller?.stop();
  poller = new GamePoller({
    load: (since, wait) => getGame(game.gameId, since, wait),
    apply: next => { game = next; render(game); },
    status: setStatus,
    canApply: () => !saving && !isEditingTeamName()
  });
  poller.start(game.version);
}

function bindModals() {
  $("chooseScorekeeper").addEventListener("click", () => { hide($("homeModal")); show($("setupModal")); });
  $("chooseViewer").addEventListener("click", () => { hide($("homeModal")); show($("joinModal")); $("joinKey").focus(); });
  document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => { hide($("setupModal")); hide($("joinModal")); show($("homeModal")); }));
  document.addEventListener("keydown", event => { if (event.key === "Escape") goHome(); });
  $("setupForm").addEventListener("submit", createFromForm);
  $("joinForm").addEventListener("submit", event => { event.preventDefault(); goViewer($("joinKey").value.trim().toUpperCase()); });
}

async function createFromForm(event) {
  event.preventDefault();
  setStatus("Creating...");
  const created = await createGame({
    leftTeam: $("setupTeam").value,
    leftColor: $("setupTeamColor").value,
    rightTeam: $("setupOpponent").value || "Opponent",
    rightColor: $("setupOpponentColor").value
  });
  goScorekeeper(created.gameId);
  await startGame(created.gameId, "scorekeeper");
}

async function boot() {
  bindModals();
  bindControls();
  const current = route();
  if (current.mode === "viewer" && current.id) return startGame(current.id, "viewer");
  if (current.mode === "sk" && current.id) return startGame(current.id, "scorekeeper");
  show($("homeModal"));
}

boot().catch(error => {
  toast(error.message || "Unable to load game");
  show($("homeModal"));
});
