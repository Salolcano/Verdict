import { explorerTx } from "../lib/chain";

export type ActionState = { kind: "idle" | "busy" | "ok" | "err"; msg: string; hash?: string };

export function ActionNotice({ state }: { state: ActionState }) {
  if (state.kind === "idle") return null;
  const cls = state.kind === "busy" ? "busy" : state.kind;
  return (
    <div className={`notice ${cls}`}>
      {state.kind === "busy" && <span className="spin" />}
      {state.msg}
      {state.hash && <> <a className="mono" style={{ fontSize: 12 }} href={explorerTx(state.hash)} target="_blank" rel="noreferrer">view tx ↗</a></>}
    </div>
  );
}
