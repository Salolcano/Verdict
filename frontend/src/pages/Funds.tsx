import { useCallback, useEffect, useState } from "react";
import { useAction, useApp } from "../lib/app";
import { fmtGen, getBalance, getClaimable, submitWrite } from "../lib/chain";
import { ActionNotice } from "../components/Actions";

export default function Funds() {
  const { account, connect, live } = useApp();
  const { state, run } = useAction();
  const [owed, setOwed] = useState<bigint | null>(null);
  const [bal, setBal] = useState<bigint | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!account || live.kind !== "live") return;
    try { setOwed(await getClaimable(account)); setBal(await getBalance(account)); setErr(""); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }, [account, live.kind]);
  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <div className="app-head"><div className="eyebrow">Funds</div><h1>What you’re owed.</h1></div>
      {!account ? (
        <div className="card"><p className="muted">Connect a wallet to see winnings and refunds from resolved claims.</p><button className="btn" onClick={() => void connect().catch(() => undefined)}>Connect wallet</button></div>
      ) : (
        <div className="grid g2">
          <div className="card stat"><div className="eyebrow">Claimable from Verdict</div><div className="num">{owed === null ? "…" : fmtGen(owed, 4)} GEN</div>
            <div style={{ marginTop: 22 }}>
              <button className="btn" disabled={!owed || owed === 0n || state.kind === "busy"} onClick={() => void run("Claiming. Confirm in your wallet…", () => submitWrite({ method: "claim_funds", args: [], account }), () => void load())}>Claim funds</button>
            </div>
            <div style={{ marginTop: 16 }}><ActionNotice state={state} /></div>
            {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}
          </div>
          <div className="card stat"><div className="eyebrow">Wallet balance</div><div className="num">{bal === null ? "…" : fmtGen(bal, 4)} GEN</div><div className="sub">winnings are pulled, never pushed: only you can move them</div></div>
        </div>
      )}
    </>
  );
}
