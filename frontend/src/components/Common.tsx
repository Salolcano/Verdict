import { Link } from "react-router-dom";
import { fmtGen, type ClaimRecord, type Stats } from "../lib/chain";
import { useApp } from "../lib/app";

export function outcomeBadge(c: Pick<ClaimRecord, "state" | "outcome" | "challenger">) {
  if (c.state === "RESOLVED") {
    if (c.outcome === "TRUE") return <span className="badge b-true">True</span>;
    if (c.outcome === "FALSE") return <span className="badge b-false">False</span>;
    return <span className="badge b-unres">Unresolvable</span>;
  }
  return c.challenger ? <span className="badge b-chal">Challenged</span> : <span className="badge b-open">Open</span>;
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card stat">
      <div className="eyebrow">{label}</div>
      <div className="num">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

/** Tells the truth about how the app is connected. Never shows invented data. */
export function LiveBanner() {
  const { live, error, loading } = useApp();
  if (loading || live.kind === "checking") return <div className="notice busy"><span className="spin" />Contacting GenLayer Studio Next…</div>;
  if (live.kind === "undeployed")
    return <div className="notice warn">No contract address is configured. Deploy <span className="mono">contracts/Verdict.py</span> and set <span className="mono">VITE_CONTRACT_ADDRESS</span>. Until then this app shows an empty state — it never invents claims.</div>;
  if (live.kind === "no-code")
    return <div className="notice warn">Nothing is deployed at <span className="mono">{live.address}</span> on this network (it may have been reset). Redeploy and update the address.</div>;
  if (live.kind === "rpc-down") return <div className="notice err">Could not reach the GenLayer RPC: {live.detail}</div>;
  if (error) return <div className="notice err">Read failed: {error}</div>;
  return null;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="card" style={{ textAlign: "center", padding: 56 }}><div className="display" style={{ fontSize: 44, marginBottom: 12 }}>Nothing here yet.</div><div className="muted">{children}</div></div>;
}

export function ClaimRow({ c }: { c: ClaimRecord }) {
  const total = BigInt(c.claimant_bond) + BigInt(c.challenger_bond || "0");
  return (
    <Link to={`/app/claims/${c.claim_id}`} className="row">
      <span className="mono id muted" style={{ fontSize: 12 }}>{c.claim_id}</span>
      <span className="t">{c.title}</span>
      <span className="mono bond muted" style={{ fontSize: 13 }}>{fmtGen(total)} GEN</span>
      {outcomeBadge(c)}
    </Link>
  );
}

/** Donut of resolved outcomes. Pure SVG, no chart library. */
export function Donut({ stats }: { stats: Stats }) {
  const parts = [
    { k: "TRUE", v: stats.byOutcome.TRUE, color: "var(--up)", label: "True" },
    { k: "FALSE", v: stats.byOutcome.FALSE, color: "var(--down)", label: "False" },
    { k: "UNRESOLVABLE", v: stats.byOutcome.UNRESOLVABLE, color: "var(--warn)", label: "Unresolvable" },
  ];
  const total = parts.reduce((a, p) => a + p.v, 0);
  const r = 62, C = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 160 160" width="170" height="170" role="img" aria-label="Resolved outcomes">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line)" strokeWidth="18" />
        {total > 0 && parts.map((p) => {
          const len = (p.v / total) * C;
          const el = <circle key={p.k} cx="80" cy="80" r={r} fill="none" stroke={p.color} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 80 80)" />;
          off += len;
          return el;
        })}
        <text x="80" y="82" textAnchor="middle" fontFamily="var(--serif)" fontSize="34" fill="var(--ink)">{total}</text>
        <text x="80" y="100" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" letterSpacing="1.5" fill="var(--mute)">RESOLVED</text>
      </svg>
      <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
        {parts.map((p) => (
          <div key={p.k} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <i className="dot" style={{ background: p.color }} />{p.label}<b className="mono" style={{ marginLeft: "auto", paddingLeft: 24 }}>{p.v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Claims opened per day. */
export function Bars({ data }: { data: { day: string; count: number }[] }) {
  if (!data.length) return <div className="muted" style={{ padding: "40px 0" }}>No claims opened yet.</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 440, h = 150, bw = Math.min(26, (w - 20) / data.length - 6);
  return (
    <svg viewBox={`0 0 ${w} ${h + 26}`} style={{ width: "100%" }} role="img" aria-label="Claims per day">
      {data.map((d, i) => {
        const bh = (d.count / max) * h;
        const x = 10 + i * ((w - 20) / data.length);
        return (
          <g key={d.day}>
            <rect x={x} y={h - bh} width={bw} height={bh} rx="5" fill="var(--ink)" />
            <text x={x + bw / 2} y={h - bh - 6} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--mute)">{d.count}</text>
            <text x={x + bw / 2} y={h + 16} textAnchor="middle" fontFamily="var(--mono)" fontSize="8.5" fill="var(--mute)">{d.day}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Confidence gauge, 0-100. */
export function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="split"><i style={{ width: `${v}%`, background: v >= 60 ? "var(--up)" : "var(--warn)" }} /></div>
      <div className="mono muted" style={{ fontSize: 12, marginTop: 6 }}>{v}% confidence</div>
    </div>
  );
}
