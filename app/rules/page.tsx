import type { Metadata } from "next";
import Link from "next/link";
import { RULE_SPORTS } from "../../lib/rules";
import { SPORTS } from "../../lib/sports";
import { RulesFooter, RulesHeader } from "./rules-brand";

const description = "Clear scoring guides for 17 team and head-to-head sports, with standard formats, scorekeeper tips, and official rule sources.";

export const metadata: Metadata = {
  title: "Sports Scoring Rules",
  description,
  alternates: { canonical: "/rules" },
  openGraph: { type: "website", url: "/rules", title: "Sports Scoring Rules | Shared Scores", description },
  twitter: { card: "summary", title: "Sports Scoring Rules | Shared Scores", description },
};

const siteUrl = "https://scores.fairway3games.com";

export default function RulesPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sports Scoring Rules",
    description,
    url: `${siteUrl}/rules`,
    hasPart: RULE_SPORTS.map((rules) => ({ "@type": "Article", name: rules.title, url: `${siteUrl}/rules/${rules.sport}` })),
  };

  return (
    <main className="rules-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <RulesHeader />
      <section className="rules-index-hero">
        <span className="section-kicker">Know the score</span>
        <h1>Sports scoring<br /><em>without the guesswork.</em></h1>
        <p>Fast, practical guides for scorekeepers and fans. Each page covers the standard format, common variants, sideline tips, and links to the governing body’s rules.</p>
      </section>
      <section className="rules-index-list" aria-label="Sports scoring guides">
        {RULE_SPORTS.map((rules, index) => (
          <Link key={rules.sport} href={`/rules/${rules.sport}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i>{SPORTS[rules.sport].icon}</i>
            <div><h2>{SPORTS[rules.sport].name}</h2><p>{rules.description}</p></div>
            <b aria-hidden="true">→</b>
          </Link>
        ))}
      </section>
      <section className="rules-index-cta">
        <div><span className="sport-label"><i /> Ready to keep score?</span><h2>Open a live scoreboard.</h2></div>
        <Link className="sport-button sport-button-primary" href="/?setup=1&sport=volleyball">Start scoring <span aria-hidden="true">→</span></Link>
      </section>
      <RulesFooter />
    </main>
  );
}
