import { Link } from "react-router-dom";
import { useApp } from "../lib/app";
import { computeStats, fmtGen, shortAddr } from "../lib/chain";
import { Bars, ClaimRow, Donut, EmptyState, Stat } from "../components/Common";

export default function Dashboard() {
  const { claims, config, live, loading } = useApp();
  const s = computeStats(claims);
  const decided = s.byOutcome.TRUE + s.byOutcome.FALSE;
  return (
    <>
      <div className="app-head">
        <div className="eyebrow">Dashboard</div>
        <h1>The state of every claim.</h1>
      </div>
      <div className="grid g4">
        <Stat label="Claims" value={String(s.total)} sub={`${s.open} open · ${s.challenged} challenged`} />
        <Stat label="Locked in bonds" value={`${fmtGen(s.bonded)}`} sub="GEN in open claims" />
        <Stat label="Settled" value={`${fmtGen(s.settled)}`} sub={`GEN across ${s.resolved} rulings`} />
        <Stat label="Avg confidence" value={s.avgConfidence ? `${s.avgConfidence}%` : "—"} sub={decided ? `${decided} decisive of ${s.resolved}` : "no rulings yet"} />
      </div>

      <div className="dash-grid" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 16 }}>Claims opened per day</div>
          <Bars data={s.perDay} />
        </div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 16 }}>Outcomes</div>
          <Donut stats={s} />
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: 20 }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div className="eyebrow">Latest claims</div>
            <Link to="/app/claims" className="muted mono" style={{ fontSize: 12 }}>ALL →</Link>
          </div>
          {claims.length === 0 && !loading ? (
            <div style={{ marginTop: 18 }}><EmptyState>{live.kind === "live" ? <>Be first. <Link to="/app/new"><u>Post a claim</u></Link>.</> : "Connect a deployed contract to see claims."}</EmptyState></div>
          ) : claims.slice(0, 6).map((c) => <ClaimRow key={c.claim_id} c={c} />)}
        </div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 16 }}>Protocol parameters</div>
          {config ? (
            <dl className="kv">
              <dt>Claim bond</dt><dd className="mono">≥ {fmtGen(config.min_claim_bond)} GEN</dd>
              <dt>Challenge bond</dt><dd className="mono">≥ {fmtGen(config.min_challenge_bond)} GEN</dd>
              <dt>Fee</dt><dd className="mono">{config.protocol_fee_bps / 100}% of slashed bond</dd>
              <dt>Window</dt><dd className="mono">{Math.round(config.challenge_window_seconds / 60)} min</dd>
              <dt>Min confidence</dt><dd className="mono">{config.min_confidence}%</dd>
              <dt>Tolerance</dt><dd className="mono">±{config.confidence_tolerance}</dd>
              <dt>Treasury</dt><dd className="mono">{shortAddr(config.treasury)}</dd>
            </dl>
          ) : <div className="muted">Not connected.</div>}
        </div>
      </div>
    </>
  );
}
