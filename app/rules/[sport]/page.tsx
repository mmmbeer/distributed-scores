import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RULE_SPORTS, SPORT_RULES } from "../../../lib/rules";
import { isSport, SPORTS } from "../../../lib/sports";
import { RulesFooter, RulesHeader } from "../rules-brand";

const siteUrl = "https://scores.fairway3games.com";

type PageProps = { params: Promise<{ sport: string }> };

export function generateStaticParams() {
  return RULE_SPORTS.map((rules) => ({ sport: rules.sport }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sport } = await params;
  if (!isSport(sport)) return {};
  const rules = SPORT_RULES[sport];
  return {
    title: rules.title,
    description: rules.description,
    keywords: [`${sport} scoring rules`, `how to keep score in ${sport}`, `${sport} scorekeeper`, `${sport} scoreboard`],
    alternates: { canonical: `/rules/${sport}` },
    openGraph: { type: "article", url: `/rules/${sport}`, title: `${rules.title} | Shared Scores`, description: rules.description },
    twitter: { card: "summary", title: `${rules.title} | Shared Scores`, description: rules.description },
  };
}

export default async function SportRulesPage({ params }: PageProps) {
  const { sport } = await params;
  if (!isSport(sport)) notFound();
  const rules = SPORT_RULES[sport];
  const sportName = SPORTS[sport].name;
  const related = RULE_SPORTS.filter((item) => item.sport !== sport).slice(0, 4);
  const setupUrl = `/?setup=1&sport=${sport}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: rules.title,
        description: rules.description,
        url: `${siteUrl}/rules/${sport}`,
        dateModified: "2026-08-14",
        author: { "@type": "Organization", name: "Shared Scores" },
        publisher: { "@type": "Organization", name: "Shared Scores", logo: { "@type": "ImageObject", url: `${siteUrl}/shared-scores-mark.png` } },
        about: { "@type": "Thing", name: `${sportName} scoring rules` },
        citation: rules.sources.map((source) => source.url),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Scoring rules", item: `${siteUrl}/rules` },
          { "@type": "ListItem", position: 3, name: sportName, item: `${siteUrl}/rules/${sport}` },
        ],
      },
    ],
  };

  return (
    <main className="rules-shell sport-rules-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <RulesHeader />
      <div className="rules-breadcrumb"><Link href="/rules">Scoring rules</Link><span>/</span><span>{sportName}</span></div>
      <article>
        <header className="sport-rules-hero">
          <div>
            <span className="sport-label"><i /> {sportName} scorekeeping guide</span>
            <h1>{rules.title}</h1>
            <p>{rules.intro}</p>
            <Link className="sport-button sport-button-primary" href={setupUrl}>Start a {sportName.toLowerCase()} scoreboard <span aria-hidden="true">→</span></Link>
          </div>
          <dl>{rules.quickFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
        </header>

        <section className="rules-section rules-how">
          <header><span className="section-kicker">The basics</span><h2>How {sportName.toLowerCase()} scoring works</h2></header>
          <ol>{rules.scoring.map((step, index) => <li key={step}><b>{String(index + 1).padStart(2, "0")}</b><p>{step}</p></li>)}</ol>
        </section>

        <section className="rules-section rules-variants">
          <header><span className="section-kicker">Formats and variants</span><h2>Choose the rules your event uses</h2><p>Governing bodies, age groups, and tournament directors can use different formats. Confirm the format before play.</p></header>
          <div className="rules-variant-table" role="table" aria-label={`${sportName} scoring variants`}>
            <div className="rules-variant-head" role="row"><span role="columnheader">Format</span><span role="columnheader">Scoring</span><span role="columnheader">When it applies</span></div>
            {rules.variants.map((variant) => <div key={variant.name} role="row"><b role="cell">{variant.name}</b><strong role="cell">{variant.scoring}</strong><p role="cell">{variant.note}</p></div>)}
          </div>
        </section>

        <section className="rules-section rules-keeper">
          <div><span className="section-kicker">Courtside checklist</span><h2>Keep the scoreboard clean</h2></div>
          <ul>{rules.scorekeeperTips.map((tip) => <li key={tip}><i aria-hidden="true">✓</i><span>{tip}</span></li>)}</ul>
          <Link className="sport-link" href={setupUrl}>Open {sportName} setup <span aria-hidden="true">↗</span></Link>
        </section>

        <section className="rules-section official-sources">
          <header><span className="section-kicker">Official sources</span><h2>Read the complete rules</h2><p>This guide covers scoreboard essentials, not every playing rule. Local competition rules take precedence.</p></header>
          <div>{rules.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.organization}</span><b>{source.label}</b><i aria-hidden="true">↗</i></a>)}</div>
        </section>
      </article>

      <aside className="related-rules" aria-labelledby="related-rules-title">
        <header><span className="section-kicker">Keep reading</span><h2 id="related-rules-title">More scoring guides</h2></header>
        <div>{related.map((item) => <Link key={item.sport} href={`/rules/${item.sport}`}><span>{SPORTS[item.sport].icon}</span><b>{SPORTS[item.sport].name}</b><i aria-hidden="true">→</i></Link>)}</div>
      </aside>
      <RulesFooter />
    </main>
  );
}

