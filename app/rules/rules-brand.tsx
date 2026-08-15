import Image from "next/image";
import Link from "next/link";

export function RulesBrand() {
  return (
    <Link className="brand" href="/" aria-label="Shared Scores home">
      <span className="brand-mark" aria-hidden="true"><Image src="/shared-scores-mark.png" alt="" width={42} height={42} unoptimized /></span>
      <span>Shared<strong>Scores</strong></span>
    </Link>
  );
}

export function RulesHeader() {
  return (
    <header className="rules-header">
      <RulesBrand />
      <nav aria-label="Rules navigation"><Link href="/rules">All scoring rules</Link><Link href="/developers">Score API</Link></nav>
      <Link className="nav-start" href="/?setup=1&sport=volleyball">Start scoring <span aria-hidden="true">↗</span></Link>
    </header>
  );
}

export function RulesFooter() {
  return (
    <footer className="rules-footer">
      <RulesBrand />
      <p>Rules change by level and competition. Confirm the current rules for your event.</p>
      <nav><Link href="/rules">Scoring rules</Link><Link href="/developers">Score API</Link><Link href="/">Live scores</Link></nav>
    </footer>
  );
}

