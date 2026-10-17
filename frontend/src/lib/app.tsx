import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  connectWallet, currentAccount, getConfig, loadAllClaims, onWalletDiscovered, probeLiveness,
  type ClaimRecord, type Config, type Liveness,
} from "./chain";

type Ctx = {
  live: Liveness;
  account: string | null;
  connect: () => Promise<void>;
  claims: ClaimRecord[];
  config: Config | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<Liveness>({ kind: "checking" });
  const [account, setAccount] = useState<string | null>(null);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const l = await probeLiveness();
    if (!alive.current) return;
    setLive(l);
    if (l.kind !== "live") {
      setClaims([]); setConfig(null); setLoading(false);
      setError(l.kind === "rpc-down" ? l.detail : "");
      return;
    }
    try {
      const [cfg, all] = await Promise.all([getConfig(), loadAllClaims()]);
      if (!alive.current) return;
      setConfig(cfg); setClaims(all); setError("");
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void refresh();
    const t = setInterval(() => void refresh(), 20000);
    return () => { alive.current = false; clearInterval(t); };
  }, [refresh]);

  useEffect(() => {
    const sync = () => void currentAccount().then(setAccount);
    sync();
    return onWalletDiscovered(sync);
  }, []);

  const connect = useCallback(async () => setAccount(await connectWallet()), []);
  const value = useMemo(() => ({ live, account, connect, claims, config, loading, error, refresh }), [live, account, connect, claims, config, loading, error, refresh]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("AppProvider missing");
  return c;
}

/** Runs one wallet action and tracks its state for the UI. */
export function useAction() {
  const [state, setState] = useState<{ kind: "idle" | "busy" | "ok" | "err"; msg: string; hash?: string }>({ kind: "idle", msg: "" });
  const run = useCallback(async (label: string, fn: () => Promise<{ ok: boolean; reason: string; hash: string }>, after?: () => void) => {
    setState({ kind: "busy", msg: label });
    try {
      const out = await fn();
      if (out.ok) { setState({ kind: "ok", msg: "Confirmed on chain.", hash: out.hash }); after?.(); }
      else setState({ kind: "err", msg: out.reason, hash: out.hash });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setState({ kind: "err", msg: /user rejected|denied/i.test(m) ? "Cancelled in wallet." : m });
    }
  }, []);
  return { state, run };
}
