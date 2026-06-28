export function route() {
  const [, mode = "", id = ""] = window.location.pathname.split("/");
  return { mode: mode.toLowerCase(), id: id.toUpperCase() };
}

export function goHome() {
  history.pushState({}, "", "/");
  location.reload();
}

export function goScorekeeper(id) {
  history.pushState({}, "", `/sk/${id}`);
}

export function goViewer(id) {
  location.href = `/viewer/${id}`;
}

export function viewerUrl(id) {
  return `${location.origin}/viewer/${id}`;
}
