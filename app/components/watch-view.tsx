"use client";

import { useCallback, useState } from "react";
import { matchStatusLine } from "../../lib/match";
import { shareMatch } from "../match-client";
import { useLiveMatch } from "../hooks/use-live-match";
import { LiveBoard, SetHistory } from "./live-board";
import { Brand, ConnectionStatus, MatchError, MatchLoading, Notification } from "./ui";

export function WatchView({ code }: { code: string }) {
  const { match, connection, lastReceivedAt, error } = useLiveMatch(code);
  const [notice, setNotice] = useState("");
  const dismissNotice = useCallback(() => setNotice(""), []);

  if (error) return <MatchError message={error} />;
  if (!match) return <MatchLoading />;
  return (
    <main className="match-shell watch-shell">
      <header className="match-header">
        <Brand compact />
        <div className="match-meta"><ConnectionStatus connection={connection} lastReceivedAt={lastReceivedAt} scoreUpdatedAt={match.updatedAt} /><b>CODE {match.code}</b></div>
        <button className="header-action" onClick={async () => {
          await shareMatch(match);
          setNotice("Viewer link copied");
        }}>Share</button>
      </header>
      <LiveBoard match={match} scorekeeper={false} />
      <footer className="viewer-footer"><SetHistory match={match} /><span>{matchStatusLine(match)}</span></footer>
      <Notification message={notice} onDismiss={dismissNotice} />
    </main>
  );
}
