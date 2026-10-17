import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../lib/app";
import { ClaimRow, EmptyState } from "../components/Common";

const TABS = ["All", "Open", "Challenged", "Resolved"] as const;

export default function Claims() {
  const { claims, loading } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");
  const list = useMemo(() => claims.filter((c) => {
    if (tab === "Open" && !(c.state === "OPEN" && !c.challenger)) return false;
    if (tab === "Challenged" && !(c.state === "OPEN" && c.challenger)) return false;
    if (tab === "Resolved" && c.state !== "RESOLVED") return false;
    const n = q.trim().toLowerCase();
    return !n || c.title.toLowerCase().includes(n) || c.statement.toLowerCase().includes(n) || c.claim_id.toLowerCase().includes(n);
  }), [claims, tab, q]);
  return (
    <>
      <div className="app-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20, flexWrap: "wrap" }}>
        <div><div className="eyebrow">Claims</div><h1>Every claim on the record.</h1></div>
        <Link to="/app/new" className="btn">Post a claim →</Link>
      </div>
      <div className="tabs">{TABS.map((t) => <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div>
      <input placeholder="Search title, statement or id…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 18 }} />
      <div className="card" style={{ padding: "8px 24px" }}>
        {list.length ? list.map((c) => <ClaimRow key={c.claim_id} c={c} />) : loading ? <div className="muted" style={{ padding: 30 }}>Loading…</div> : <div style={{ padding: 20 }}><EmptyState>{claims.length ? "No claim matches that filter." : "No claims have been posted."}</EmptyState></div>}
      </div>
    </>
  );
}
