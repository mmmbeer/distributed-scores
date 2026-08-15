"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ConnectionState } from "../../lib/match";

export const COLORS = ["#D84C3F", "#3657B3", "#137B6C", "#E8902E", "#7048A8", "#202632", "#B52B63", "#7A8B36"];

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand ${compact ? "brand-compact" : ""}`} href="/" aria-label="Shared Scores home">
      <span className="brand-mark" aria-hidden="true">
        <Image src="/shared-scores-mark.png" alt="" width={42} height={42} priority unoptimized />
      </span>
      <span>Shared<strong>Scores</strong></span>
    </Link>
  );
}

export function ColorPicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <fieldset className="color-picker">
      <legend>{label}</legend>
      <div>{COLORS.map((color) => (
        <button
          key={color}
          type="button"
          style={{ backgroundColor: color }}
          className={value === color ? "selected" : ""}
          onClick={() => onChange(color)}
          aria-label={`Choose ${color}`}
          aria-pressed={value === color}
        />
      ))}</div>
    </fieldset>
  );
}

export function MatchLoading({ message = "Loading the live score" }: { message?: string }) {
  return <main className="match-message"><Brand /><div className="loader" /><h1>{message}</h1></main>;
}

export function MatchError({ message }: { message: string }) {
  return <main className="match-message"><Brand /><span className="error-mark">!</span><h1>{message}</h1><Link className="button button-dark" href="/">Return home</Link></main>;
}

function relativeTime(timestamp: number | null, now: number) {
  if (!timestamp) return "Waiting for the first update";
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 5) return "Received just now";
  if (seconds < 60) return `Received ${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  return `Received ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
}

const CONNECTION_LABELS: Record<ConnectionState, { title: string; detail: string }> = {
  live: { title: "Connected", detail: "Receiving live score updates." },
  connecting: { title: "Connecting", detail: "Opening the live score feed." },
  reconnecting: { title: "Updates delayed", detail: "Reconnecting while periodic score checks continue." },
  offline: { title: "Disconnected", detail: "The score may be out of date until the connection returns." },
};

export function ConnectionStatus({
  connection,
  lastReceivedAt,
  scoreUpdatedAt,
}: {
  connection: ConnectionState;
  lastReceivedAt: number | null;
  scoreUpdatedAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const label = CONNECTION_LABELS[connection];
  return (
    <div className={`connection-indicator ${connection} ${open ? "open" : ""}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <button type="button" aria-label={`${label.title}. ${relativeTime(lastReceivedAt, now)}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <i aria-hidden="true" />
      </button>
      <div className="connection-popover" role="status">
        <strong><i aria-hidden="true" />{label.title}</strong>
        <span>{label.detail}</span>
        <small>{relativeTime(lastReceivedAt, now)}</small>
        <small>Score changed {new Date(scoreUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
      </div>
    </div>
  );
}

export function Notification({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 4_000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;
  return <button className="notification-toast" type="button" role="status" onClick={onDismiss}>{message}</button>;
}
