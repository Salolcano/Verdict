import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAction, useApp } from "../lib/app";
import { countdown, fmtGen, fmtTime, shortAddr, submitWrite, toWei, explorerAddress } from "../lib/chain";
import { ActionNotice } from "../components/Actions";
import { Gauge, outcomeBadge } from "../components/Common";

export default function ClaimDetail() {
  const { claimId = "" } = useParams();
  const { claims, config, account, connect, refresh, loading } = useApp();
  const c = claims.find((x) => x.claim_id.toLowerCase() === claimId.toLowerCase());
  const [now, setNow] = useState(Date.now() / 1000);
  const [note, setNote] = useState("");
  const [bond, setBond] = useState("1");
  const [formErr, setFormErr] = useState("");
  const act = useAction();

  useEffect(() => { const t = setInterval(() => setNow(Date.now() / 1000), 1000); return () => clearInterval(t); }, []);

  if (!c) return <div className="app-head"><h1>{loading ? "Loading…" : "Claim not found."}</h1><p className="muted"><Link to="/app/claims"><u>Back to all claims</u></Link></p></div>;

  const me = (account ?? "").toLowerCase();
  const isClaimant = me !== "" && me === c.claimant.toLowerCase();
  const open = c.state === "OPEN";
  const cb = BigInt(c.claimant_bond), hb = BigInt(c.challenger_bond || "0");
  const total = cb + hb;
  const windowOpen = open && !c.challenger && now < c.challenge_deadline;
  const canResolve = open && !windowOpen;
  const pct = total > 0n ? Number((cb * 100n) / total) : 100;

  const need = () => { if (!account) { void connect().catch(() => undefined); return false; } return true; };
  const send = (label: string, method: string, args: unknown[], value?: bigint) => {
    if (!need()) return;
    void act.run(label, () => submitWrite({ method, args, value, account: account! }), () => void refresh());
  };
  const challenge = () => {
    setFormErr("");
    let wei: bigint;
    try { wei = toWei(bond); } catch { return setFormErr("Bond must be a number."); }
    if (config && wei < BigInt(config.min_challenge_bond)) return setFormErr(`The minimum challenge bond is ${fmtGen(config.min_challenge_bond)} GEN.`);
    send("Posting your challenge. Confirm in your wallet…", "challenge", [c.claim_id, note.trim()], wei);
  };

  return (
    <>
      <div className="app-head">
        <div className="eyebrow"><Link to="/app/claims">← Claims</Link> · <span className="mono">{c.claim_id}</span></div>
        <h1 style={{ margin: "14px 0 16px" }}>{c.title}</h1>
        {outcomeBadge(c)}
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="grid">
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 10 }}>The claim</div>
            <p style={{ fontSize: 19, margin: "0 0 22px" }}>{c.statement}</p>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Locked evidence</div>
            {c.evidence_urls.map((u) => {
              const r = c.evidence_report.find((e) => e.url === u);
              return (
                <div className="ev" key={u}>
                  <i className="dot" style={{ background: !r ? "var(--line-strong)" : r.ok ? "var(--up)" : "var(--down)" }} />
                  <div style={{ minWidth: 0 }}>
                    <a href={u} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 12, wordBreak: "break-all" }}>{u}</a>
                    {r && <div className="muted" style={{ fontSize: 12 }}>{r.title || "untitled"}{r.limitations ? ` · ${r.limitations}` : ""}</div>}
                  </div>
                  <span className="mono muted" style={{ fontSize: 12 }}>{r ? (r.status || "ERR") : "—"}</span>
                </div>
              );
            })}
          </div>

          {c.state === "RESOLVED" && (
            <div className="card" style={{ background: "var(--ink)", color: "var(--band-text)" }}>
              <div className="eyebrow" style={{ color: "var(--band-mute)", marginBottom: 12 }}>Ruling</div>
              <div className="display" style={{ fontSize: 56, color: c.outcome === "TRUE" ? "#3fb37b" : c.outcome === "FALSE" ? "#e0625f" : "var(--gold)" }}>{c.outcome}</div>
              <div style={{ margin: "18px 0" }}><Gauge value={c.confidence} /></div>
              <p style={{ margin: "0 0 14px" }}>{c.reasoning || "—"}</p>
              {c.key_facts.length > 0 && <ul style={{ paddingLeft: 18, margin: 0, opacity: 0.8 }}>{c.key_facts.map((f, i) => <li key={i}>{f}</li>)}</ul>}
              <div className="mono" style={{ fontSize: 12, opacity: 0.6, marginTop: 16 }}>resolved {fmtTime(c.resolved_at)}{BigInt(c.fee) > 0n ? ` · fee ${fmtGen(c.fee)} GEN` : ""}</div>
            </div>
          )}
        </div>

        <div className="grid">
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 14 }}>Bonds</div>
            <div className="split"><i style={{ width: `${pct}%`, background: "var(--ink)" }} /><i style={{ width: `${100 - pct}%`, background: "var(--down)" }} /></div>
            <dl className="kv" style={{ marginTop: 18 }}>
              <dt>Claimant</dt><dd><a className="mono" href={explorerAddress(c.claimant)} target="_blank" rel="noreferrer">{shortAddr(c.claimant)}</a> · {fmtGen(cb)} GEN</dd>
              <dt>Challenger</dt><dd>{c.challenger ? <><a className="mono" href={explorerAddress(c.challenger)} target="_blank" rel="noreferrer">{shortAddr(c.challenger)}</a> · {fmtGen(hb)} GEN</> : <span className="muted">none yet</span>}</dd>
              {c.challenge_note && <><dt>Their note</dt><dd>{c.challenge_note}</dd></>}
              <dt>Opened</dt><dd className="mono">{fmtTime(c.opened_at)}</dd>
              <dt>Total at stake</dt><dd className="mono">{fmtGen(total)} GEN</dd>
            </dl>
          </div>

          {open && (
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 14 }}>Actions</div>
              <div style={{ display: "grid", gap: 20 }}>
                {!c.challenger && !isClaimant && (
                  <div>
                    <label className="f"><span>Why is this wrong? (optional)</span><textarea value={note} maxLength={600} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 80 }} /></label>
                    <label className="f"><span>Your bond (GEN)</span><input value={bond} inputMode="decimal" onChange={(e) => setBond(e.target.value)} /></label>
                    {formErr && <div className="notice err" style={{ marginBottom: 12 }}>{formErr}</div>}
                    <button className="btn danger" disabled={act.state.kind === "busy"} onClick={challenge}>{account ? "Challenge this claim" : "Connect to challenge"}</button>
                  </div>
                )}
                <div>
                  <button className="btn" disabled={!canResolve || act.state.kind === "busy"} onClick={() => send("Validators are fetching the evidence and ruling. This can take a minute or two…", "resolve", [c.claim_id])}>Resolve now</button>
                  <div className="muted mono" style={{ fontSize: 12, marginTop: 8 }}>{windowOpen ? `challenge window: ${countdown(c.challenge_deadline, now)} left` : "anyone may trigger resolution"}</div>
                </div>
                {isClaimant && !c.challenger && (
                  <button className="btn ghost" disabled={act.state.kind === "busy"} onClick={() => send("Withdrawing your claim…", "withdraw_claim", [c.claim_id])}>Withdraw claim &amp; bond</button>
                )}
                <ActionNotice state={act.state} />
              </div>
            </div>
          )}
          {!open && <ActionNotice state={act.state} />}
        </div>
      </div>
    </>
  );
}
