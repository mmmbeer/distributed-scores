"use client";

import { useEffect, useState } from "react";
import { DevelopersView } from "./components/developers-view";
import { HomeView } from "./components/home-view";
import { KeepView } from "./components/keep-view";
import { SetupModal } from "./components/setup-modal";
import { WatchView } from "./components/watch-view";
import { routeFromLocation, type ViewMode } from "./match-client";

export default function ScoreApp() {
  const [route, setRoute] = useState<{ mode: ViewMode; code: string }>({ mode: "home", code: "" });
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => {
    const syncRoute = () => {
      const next = routeFromLocation();
      if (next.mode !== "keep" && document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => undefined);
      }
      setRoute(next);
    };
    const timer = window.setTimeout(syncRoute, 0);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  function navigate(mode: "home" | "watch" | "keep", code = "") {
    window.history.pushState({}, "", mode === "home" ? "/" : `/${mode}/${code}`);
    if (mode !== "keep" && document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => undefined);
    }
    setRoute({ mode, code });
  }

  if (route.mode === "watch") return <WatchView code={route.code} />;
  if (route.mode === "keep") return <KeepView code={route.code} onHome={() => navigate("home")} />;
  if (route.mode === "developers") return <DevelopersView />;
  return <>
    <HomeView
      onSetup={() => setSetupOpen(true)}
      onWatch={(code) => navigate("watch", code)}
      onResume={(code, token) => {
        sessionStorage.setItem(`scorekeeper:${code}`, token);
        navigate("keep", code);
      }}
    />
    {setupOpen && <SetupModal
      onCancel={() => setSetupOpen(false)}
      onCreated={(code) => {
        setSetupOpen(false);
        navigate("keep", code);
      }}
    />}
  </>;
}
