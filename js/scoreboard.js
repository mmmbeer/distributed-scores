import { $ } from "./dom.js";

let editingTeamName = false;

export function render(game) {
  if (!game) return;
  document.documentElement.style.setProperty("--left-color", game.leftColor);
  document.documentElement.style.setProperty("--right-color", game.rightColor);
  if (document.activeElement !== $("leftTeam")) $("leftTeam").value = game.leftTeam;
  if (document.activeElement !== $("rightTeam")) $("rightTeam").value = game.rightTeam;
  $("leftTeamLabel").textContent = game.leftTeam;
  $("rightTeamLabel").textContent = game.rightTeam;
  $("leftScore").textContent = game.leftScore;
  $("rightScore").textContent = game.rightScore;
  $("leftGames").textContent = game.leftGames;
  $("rightGames").textContent = game.rightGames;
}

export function isEditingTeamName() {
  return editingTeamName;
}

export function bindTeamEditing(onChange) {
  for (const id of ["leftTeam", "rightTeam"]) {
    $(id).addEventListener("focus", () => { editingTeamName = true; });
    $(id).addEventListener("blur", () => { editingTeamName = false; });
  }
  $("leftTeam").addEventListener("change", e => onChange({ leftTeam: e.target.value || "Home" }));
  $("rightTeam").addEventListener("change", e => onChange({ rightTeam: e.target.value || "Away" }));
}

export function bindTouchZone(element, side, onScore) {
  let startX = 0;
  let startY = 0;
  let startedOnControl = false;
  element.addEventListener("pointerdown", event => {
    startedOnControl = Boolean(event.target.closest("button, input, a"));
    startX = event.clientX;
    startY = event.clientY;
  });
  element.addEventListener("pointerup", event => {
    if (startedOnControl) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    onScore(side, Math.abs(dy) > 48 && Math.abs(dy) > Math.abs(dx) && dy > 0 ? -1 : 1);
  });
}
