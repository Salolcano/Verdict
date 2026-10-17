import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction, useApp } from "../lib/app";
import { fmtGen, submitWrite, toWei } from "../lib/chain";
import { ActionNotice } from "../components/Actions";

export default function PostClaim() {
  const { account, connect, config, live, refresh } = useApp();
  const nav = useNavigate();
  const { state, run } = useAction();
  const min = config ? fmtGen(config.min_claim_bond, 2) : "1.00";
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [urls, setUrls] = useState("");
  const [bond, setBond] = useState("1");
  const [err, setErr] = useState("");

  const submit = () => {
    setErr("");
    const list = urls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (title.trim().length < 3) return setErr("Give the claim a title (3+ characters).");
    if (statement.trim().length < 10) return setErr("State the claim in at least 10 characters.");
    if (!list.length || list.length > 4) return setErr("Add 1 to 4 evidence links, one per line.");
    if (list.some((u) => !/^https:\/\/[^\s/]+\.[^\s/]+/i.test(u))) return setErr("Every evidence link must be a public https:// URL.");
    let wei: bigint;
    try { wei = toWei(bond); } catch { return setErr("Bond must be a number."); }
    if (config && wei < BigInt(config.min_claim_bond)) return setErr(`The minimum bond is ${min} GEN.`);
    if (!account) return setErr("Connect a wallet first.");
    void run("Submitting your claim. Confirm in your wallet…",
      () => submitWrite({ method: "post_claim", args: [title.trim(), statement.trim(), JSON.stringify(list)], value: wei, account }),
      () => { void refresh(); setTimeout(() => nav("/app/claims"), 1200); });
  };

  return (
    <>
      <div className="app-head"><div className="eyebrow">New claim</div><h1>Bond it, then prove it.</h1></div>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <label className="f"><span>Title</span><input value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="Arsenal beat Spurs on 2026-03-03" /></label>
          <label className="f"><span>Claim statement</span><textarea value={statement} maxLength={1200} onChange={(e) => setStatement(e.target.value)} placeholder="State a specific, checkable fact. Include the date and the numbers." /></label>
          <label className="f"><span>Evidence links (one per line, max 4)</span><textarea value={urls} onChange={(e) => setUrls(e.target.value)} placeholder={"https://www.bbc.com/sport/football/...\nhttps://..."} /></label>
          <label className="f"><span>Your bond (GEN, min {min})</span><input value={bond} inputMode="decimal" onChange={(e) => setBond(e.target.value)} /></label>
          {err && <div className="notice err" style={{ marginBottom: 16 }}>{err}</div>}
          <ActionNotice state={state} />
          <div style={{ marginTop: 16 }}>
            {account
              ? <button className="btn" disabled={state.kind === "busy" || live.kind !== "live"} onClick={submit}>Post claim &amp; lock bond</button>
              : <button className="btn" onClick={() => void connect().catch((e) => setErr(e instanceof Error ? e.message : String(e)))}>Connect wallet</button>}
          </div>
        </div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Write claims that can be settled</div>
          <ul className="muted" style={{ paddingLeft: 18, display: "grid", gap: 10, margin: 0 }}>
            <li>The evidence pages must state the answer in <b>readable text</b>. Pages that render only with JavaScript may come back empty.</li>
            <li>Prefer a primary source: an official page, a score site, a status page.</li>
            <li>Evidence is <b>locked</b> when you post. It can’t be swapped later.</li>
            <li>If the sources can’t settle it, the ruling is UNRESOLVABLE and every bond is refunded exactly.</li>
            <li>A <b>false</b> unchallenged claim forfeits its bond to the treasury.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
