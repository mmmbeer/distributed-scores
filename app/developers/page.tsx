import type { Metadata } from "next";
import { DevelopersView } from "../score-app";

const description = "Read live volleyball scores as JSON or subscribe to real-time score events with the Shared Scores public API.";

export const metadata: Metadata = {
  title: "Live Score API",
  description,
  alternates: { canonical: "/developers" },
  openGraph: {
    type: "website",
    url: "/developers",
    title: "Live Score API | Shared Scores",
    description,
  },
  twitter: { card: "summary", title: "Live Score API | Shared Scores", description },
};

export default function DevelopersPage() {
  return <DevelopersView />;
}
