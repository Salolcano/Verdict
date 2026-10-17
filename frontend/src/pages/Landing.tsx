import { Link } from "react-router-dom";
import { Brand, WalletButton } from "../components/AppShell";
import { HeroScale, ValidatorNet } from "../art/Art";
import { useApp } from "../lib/app";
import { computeStats, fmtGen } from "../lib/chain";

const TICKER = ["Bond a claim", "Fetch the evidence", "Five nodes, five fetches", "Outcome must match", "Confidence ±20", "Doubt refunds everyone", "2% fee on slashed bonds only"];

export default function Landing() {
  const { claims, live } = useApp();
  const s = computeStats(claims);
  return (
    <>
      <header className="nav dark" style={{ position: "absolute", left: 0, right: 0, background: "transparent", backdropFilter: "none" }}>
        <div className="shell nav-in">
          <Brand dark />
          <nav className="nav-links">
            <a href="#how">How it works</a><a href="#consensus">Consensus</a><a href="#money">The money</a>
            <Link to="/app" className="btn ghost sm" style={{ opacity: 1 }}>Open app</Link>
            <WalletButton />
          </nav>
        </div>
      </header>

      <section className="band hero" style={{ paddingTop: 120 }}>
        <div className="glow" style={{ top: -120, right: -120 }} />
        <div className="shell hero-grid">
          <div>
            <div className="eyebrow" style={{ marginBottom: 22 }}>A bonded claim market · GenLayer Studio Next</div>
            <h1 className="display">Put money<br />behind <em>the truth.</em></h1>
            <p className="lede" style={{ margin: "26px 0 34px" }}>
              Post a real-world claim with a GEN bond. Anyone can bond against it. Independent GenLayer validators each fetch the evidence themselves and rule — and the bonds move on the verdict.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/app/new" className="btn">Post a claim →</Link>
              <Link to="/app" className="btn ghost">View dashboard</Link>
            </div>
            {live.kind === "live" && (
              <div className="mono muted" style={{ marginTop: 30, fontSize: 12, letterSpacing: ".08em" }}>
                LIVE · {s.total} CLAIMS · {s.resolved} RULED · {fmtGen(s.settled)} GEN SETTLED
              </div>
            )}
          </div>
          <div style={{ display: "grid", placeItems: "center" }}><HeroScale /></div>
        </div>
        <div className="ticker-wrap" style={{ marginTop: 50 }}>
          <div className="ticker">{[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => <span key={i}>◆ {t}</span>)}</div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="shell">
          <div className="eyebrow">How it works</div>
          <h2>Three moves. One verdict.</h2>
          <p className="lede">A smart contract cannot read the web or weigh evidence. GenLayer can, and makes every validator do it independently.</p>
          <div className="grid g3" style={{ marginTop: 44 }}>
            {[
              ["01", "Claim", "Anyone posts a statement, up to four public HTTPS evidence links, and a bond of at least 1 GEN. The claim is public and the evidence is locked at that moment."],
              ["02", "Challenge", "Anyone can bond at least 1 GEN against it during the challenge window, optionally with a note on why the claim is wrong."],
              ["03", "Rule", "Anyone triggers resolution. Every validator fetches the evidence itself, judges the claim, and the network settles TRUE, FALSE or UNRESOLVABLE."],
            ].map(([n, t, d]) => (
              <div className="card" key={n}><div className="step-n">{n}</div><h3 style={{ fontSize: 30, marginBottom: 10 }}>{t}</h3><p className="muted" style={{ margin: 0 }}>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="band section" id="consensus">
        <div className="shell hero-grid">
          <div>
            <div className="eyebrow">The equivalence rule</div>
            <h2>The leader doesn’t get to be believed.</h2>
            <p className="lede">
              Each validator re-fetches the pages, re-runs the judgement and canonicalizes its own verdict through the same pure code. The leader’s result stands only if the two independent verdicts agree.
            </p>
            <table className="table" style={{ marginTop: 28 }}>
              <thead><tr><th>Field</th><th>Compared as</th></tr></thead>
              <tbody>
                <tr><td>outcome</td><td>exactly</td></tr>
                <tr><td>claim id</td><td>exactly</td></tr>
                <tr><td>confidence</td><td>within ±20 points</td></tr>
                <tr><td>reasoning prose</td><td className="muted">never — honest nodes never word things the same</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ display: "grid", placeItems: "center" }}><ValidatorNet /></div>
        </div>
      </section>

      <section className="section" id="money">
        <div className="shell">
          <div className="eyebrow">Who pays when the verdict is wrong</div>
          <h2>Doubt never takes money.</h2>
          <p className="lede">Anything unparseable, unreachable or under 60% confidence collapses to UNRESOLVABLE — and UNRESOLVABLE refunds every bond exactly.</p>
          <div className="card" style={{ marginTop: 36, overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>Verdict</th><th>No challenger</th><th>With a challenger</th></tr></thead>
              <tbody>
                <tr><td><span className="badge b-true">True</span></td><td>Claimant’s bond returned</td><td>Claimant wins the challenger’s bond, less a 2% fee on it</td></tr>
                <tr><td><span className="badge b-false">False</span></td><td>Bond forfeited to the treasury</td><td>Challenger wins the claimant’s bond, less a 2% fee on it</td></tr>
                <tr><td><span className="badge b-unres">Unresolvable</span></td><td>Bond returned, no fee</td><td>Every bond returned exactly, no fee</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="band section" style={{ textAlign: "center" }}>
        <div className="shell">
          <h2 className="display" style={{ fontSize: "clamp(44px,8vw,96px)" }}>Make it cost something<br />to be wrong.</h2>
          <div style={{ marginTop: 34 }}><Link to="/app/new" className="btn">Post your first claim →</Link></div>
        </div>
      </section>
      <footer className="shell">VERDICT · built on GenLayer · Studio Next · state may reset</footer>
    </>
  );
}
