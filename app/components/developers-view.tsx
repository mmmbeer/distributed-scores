import Link from "next/link";
import { Brand } from "./ui";

export function DevelopersView() {
  return (
    <main className="developer-shell">
      <header><Brand /><Link className="button button-dark" href="/">Open the app</Link></header>
      <section className="developer-hero"><span className="eyebrow"><i /> Public read API</span><h1>Put the live score<br />anywhere.</h1><p>Read any supported sport as JSON or subscribe to the same live score events used by the viewer page. Public endpoints are read-only and support cross-origin requests.</p></section>
      <section className="api-grid">
        <article><span>Snapshot</span><h2>Get current score</h2><code>GET /api/v1/matches/{"{code}"}</code><p>Returns the sport, two sides, current score, segment history, match status, and a monotonically increasing version.</p></article>
        <article><span>Live stream</span><h2>Subscribe to changes</h2><code>GET /api/v1/matches/{"{code}"}/events</code><p>A Server-Sent Events stream. Listen for <b>score</b> events and read the match object from each event.</p></article>
      </section>
      <section className="code-example"><header><span>Browser example</span><a href="/api/v1/openapi.json">OpenAPI JSON</a></header><pre>{`const source = new EventSource(
  "https://scores.fairway3games.com/api/v1/matches/ABC123/events"
);

source.addEventListener("score", (event) => {
  const { match } = JSON.parse(event.data);
  renderScore(match);
});`}</pre></section>
      <aside className="api-note"><b>Writes stay private.</b><p>Creating a match returns a scorekeeper token. Score updates require that token as a bearer credential. Viewer links and public API responses never expose it.</p></aside>
    </main>
  );
}
