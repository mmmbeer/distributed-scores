import { createGame, getGame, updateGame } from "./api.js";
import { $, hide, show, toast } from "./dom.js";
import { GamePoller } from "./poller.js";
import { goHome, goScorekeeper, goViewer, route, viewerUrl } from "./routes.js";
import { bindGameTracker, bindTeamEditing, bindTouchZone, isEditingTeamName, render } from "./scoreboard.js";

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
  bindGameTracker($("leftGamesBar"), "leftGames", changeGames);
  bindGameTracker($("rightGamesBar"), "rightGames", changeGames);
  $("newSet").addEventListener("click", () => confirmAction({
    title: "Start new match?",
    message: "This will clear the current scores and advance the match count.",
    confirmLabel: "Start New Match",
    onConfirm: () => savePatch({ leftScore: 0, rightScore: 0, setNumber: game.setNumber + 1 })
  }));
  $("resetMatch").addEventListener("click", () => confirmAction({
    title: "Reset score?",
    message: "This will clear scores, games won, and return the match count to 1.",
    confirmLabel: "Reset Score",
    onConfirm: () => savePatch({ leftScore: 0, rightScore: 0, leftGames: 0, rightGames: 0, setNumber: 1 })
  }));
  $("shareGame").addEventListener("click", shareGame);
  $("homeButton").addEventListener("click", goHome);
}

function changeGames(key, amount) {
  if (!game || mode !== "scorekeeper") return;
  savePatch({ [key]: Math.max(0, Number(game[key]) + amount) });
}

function changeScore(side, amount) {
  if (!game || mode !== "scorekeeper") return;
  const key = side === "left" ? "leftScore" : "rightScore";
  savePatch({ [key]: Math.max(0, Number(game[key]) + amount) });
}

async function shareGame() {
  const url = viewerUrl(game.gameId);
  if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    await navigator.share({ title: "Keep Score", url }).catch(() => {});
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

function confirmAction({ title, message, confirmLabel, onConfirm }) {
  $("confirmTitle").textContent = title;
  $("confirmMessage").textContent = message;
  $("confirmAccept").textContent = confirmLabel;
  show($("confirmModal"));
  $("confirmAccept").focus();
  const cleanup = () => {
    $("confirmAccept").removeEventListener("click", accept);
    $("confirmCancel").removeEventListener("click", cancel);
  };
  const close = () => {
    cleanup();
    hide($("confirmModal"));
  };
  const accept = () => {
    close();
    onConfirm();
  };
  const cancel = () => close();
  $("confirmAccept").addEventListener("click", accept);
  $("confirmCancel").addEventListener("click", cancel);
}

function closeActiveModal() {
  if (!$("confirmModal").classList.contains("hidden")) {
    $("confirmCancel").click();
    return;
  }
  goHome();
}

function bindColorPresets() {
  let activeColorInput = $("setupTeamColor");
  for (const input of [$("setupTeamColor"), $("setupOpponentColor")]) {
    input.addEventListener("focus", () => { activeColorInput = input; });
    input.addEventListener("click", () => { activeColorInput = input; });
  }
  document.querySelectorAll("[data-color-preset]").forEach(button => {
    button.addEventListener("click", () => {
      activeColorInput.value = button.dataset.colorPreset;
      activeColorInput.focus();
    });
  });
}

function bindModals() {
  bindColorPresets();
  $("chooseScorekeeper").addEventListener("click", () => { hide($("homeModal")); show($("setupModal")); });
  $("chooseViewer").addEventListener("click", () => { hide($("homeModal")); show($("joinModal")); $("joinKey").focus(); });
  document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => { hide($("setupModal")); hide($("joinModal")); show($("homeModal")); }));
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeActiveModal(); });
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
