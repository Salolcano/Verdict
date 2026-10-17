/**
 * Chain access for Verdict. Every read goes through here and can fail closed:
 * there is no fixture data and no "demo mode". If the address is unset, nothing
 * is deployed at it, or the RPC is unreachable, the UI renders an empty product
 * and says which of those is true.
 */

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim();
export const RPC_URL = (import.meta.env.VITE_GENLAYER_RPC_URL ?? "https://studio-next.genlayer.com/api").trim();
export const CHAIN_ID = Number(import.meta.env.VITE_GENLAYER_CHAIN_ID ?? 61997);
export const EXPLORER = (import.meta.env.VITE_EXPLORER ?? "https://explorer-studio-dev.genlayer.com").trim();
export const CHAIN_ID_HEX = "0x" + CHAIN_ID.toString(16);
export const NETWORK_LABEL = "Studio Next";

export type Liveness =
  | { kind: "checking" }
  | { kind: "undeployed" }
  | { kind: "no-code"; address: string }
  | { kind: "rpc-down"; detail: string }
  | { kind: "live"; address: string };

let rpcId = 1;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const body = await res.json();
  if (body.error) {
    const err = new Error(body.error.message ?? "rpc error");
    (err as { code?: number }).code = body.error.code;
    throw err;
  }
  return body.result as T;
}

/**
 * Liveness probe. NOT eth_getCode: a GenLayer Intelligent Contract is not an EVM
 * contract, so eth_getCode returns "0x" for a healthy deployed one.
 * gen_getContractSchema returns a schema for a live contract and error -32001
 * for an address with nothing at it.
 */
export async function probeLiveness(): Promise<Liveness> {
  if (!CONTRACT_ADDRESS) return { kind: "undeployed" };
  try {
    await rpc<unknown>("gen_getContractSchema", [CONTRACT_ADDRESS]);
    return { kind: "live", address: CONTRACT_ADDRESS };
  } catch (err) {
    const code = (err as { code?: number }).code;
    const message = err instanceof Error ? err.message : String(err);
    if (code === -32001 || /not found/i.test(message)) return { kind: "no-code", address: CONTRACT_ADDRESS };
    return { kind: "rpc-down", detail: message };
  }
}

let readClientPromise: Promise<unknown> | null = null;

async function readClient(): Promise<unknown> {
  if (!readClientPromise) {
    readClientPromise = (async () => {
      const [{ createClient }, { studioDevnet }] = await Promise.all([import("genlayer-js"), import("genlayer-js/chains")]);
      const chain = { ...studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC_URL] } } };
      return createClient({ chain: chain as never });
    })();
  }
  return readClientPromise;
}

export async function callView(method: string, args: unknown[] = []): Promise<string> {
  if (!CONTRACT_ADDRESS) throw new Error("no contract address configured");
  const client = (await readClient()) as { readContract: (a: unknown) => Promise<unknown> };
  const raw = await client.readContract({ address: CONTRACT_ADDRESS, functionName: method, args });
  return String(raw);
}

// ---------------------------------------------------------------------------
// Shapes returned by the contract's views
// ---------------------------------------------------------------------------

export type Outcome = "TRUE" | "FALSE" | "UNRESOLVABLE" | "";

export type Config = {
  treasury: string;
  min_claim_bond: string;
  min_challenge_bond: string;
  protocol_fee_bps: number;
  challenge_window_seconds: number;
  max_evidence_urls: number;
  min_confidence: number;
  confidence_tolerance: number;
  claim_count: number;
};

export type EvidenceRow = { url: string; status: number; ok: boolean; title: string; limitations: string };

export type ClaimRecord = {
  claim_id: string;
  claimant: string;
  title: string;
  statement: string;
  evidence_urls: string[];
  state: "OPEN" | "RESOLVED";
  opened_at: number;
  resolved_at: number;
  challenge_deadline: number;
  claimant_bond: string;
  challenger: string;
  challenger_bond: string;
  challenge_note: string;
  outcome: Outcome;
  confidence: number;
  reasoning: string;
  key_facts: string[];
  evidence_report: EvidenceRow[];
  fee: string;
};

export const getConfig = async (): Promise<Config> => JSON.parse(await callView("get_config"));
export const listClaims = async (): Promise<string[]> => JSON.parse(await callView("list_claims"));
export const getClaim = async (id: string): Promise<ClaimRecord> => JSON.parse(await callView("get_claim", [id]));
export const getClaimable = async (address: string): Promise<bigint> => BigInt(await callView("get_claimable", [address]));

export async function loadAllClaims(): Promise<ClaimRecord[]> {
  const ids = await listClaims();
  const settled = await Promise.allSettled(ids.map((id) => getClaim(id)));
  return settled
    .filter((r): r is PromiseFulfilledResult<ClaimRecord> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => b.opened_at - a.opened_at);
}

// ---------------------------------------------------------------------------
// Dashboard statistics, derived only from real claims
// ---------------------------------------------------------------------------

export type Stats = {
  total: number;
  open: number;
  challenged: number;
  resolved: number;
  byOutcome: Record<"TRUE" | "FALSE" | "UNRESOLVABLE", number>;
  bonded: bigint; // currently locked in OPEN claims
  settled: bigint; // total bonds that went through a resolution
  fees: bigint;
  avgConfidence: number;
  perDay: { day: string; count: number }[];
};

export function computeStats(claims: ClaimRecord[]): Stats {
  const s: Stats = {
    total: claims.length, open: 0, challenged: 0, resolved: 0,
    byOutcome: { TRUE: 0, FALSE: 0, UNRESOLVABLE: 0 },
    bonded: 0n, settled: 0n, fees: 0n, avgConfidence: 0, perDay: [],
  };
  let confSum = 0, confN = 0;
  const days = new Map<string, number>();
  for (const c of claims) {
    const bonds = BigInt(c.claimant_bond || "0") + BigInt(c.challenger_bond || "0");
    const day = new Date(c.opened_at * 1000).toISOString().slice(5, 10);
    days.set(day, (days.get(day) ?? 0) + 1);
    if (c.state === "OPEN") {
      s.open++;
      s.bonded += bonds;
      if (c.challenger) s.challenged++;
    } else {
      s.resolved++;
      s.settled += bonds;
      s.fees += BigInt(c.fee || "0");
      if (c.outcome === "TRUE" || c.outcome === "FALSE" || c.outcome === "UNRESOLVABLE") s.byOutcome[c.outcome]++;
      if (c.confidence > 0) { confSum += c.confidence; confN++; }
    }
  }
  s.avgConfidence = confN ? Math.round(confSum / confN) : 0;
  s.perDay = [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).slice(-14).map(([day, count]) => ({ day, count }));
  return s;
}

// ---------------------------------------------------------------------------
// Wallet (EIP-6963 discovery with window.ethereum fallback)
// ---------------------------------------------------------------------------

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
type Eip6963Detail = { info: { uuid: string; name: string }; provider: Eip1193 };

const discovered = new Map<string, Eip1193>();
const walletListeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", ((event: CustomEvent<Eip6963Detail>) => {
    const { info, provider } = event.detail ?? ({} as Eip6963Detail);
    if (!info?.uuid || !provider) return;
    const isNew = !discovered.has(info.uuid);
    discovered.set(info.uuid, provider);
    if (isNew) walletListeners.forEach((fn) => fn());
  }) as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function onWalletDiscovered(fn: () => void): () => void {
  walletListeners.add(fn);
  return () => { walletListeners.delete(fn); };
}

export function injectedProvider(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  const first = discovered.values().next();
  if (!first.done) return first.value;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

export const hasWallet = () => injectedProvider() !== null;

export async function ensureChain(): Promise<void> {
  const provider = injectedProvider();
  if (!provider) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
  } catch (err) {
    if ((err as { code?: number }).code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_ID_HEX,
          chainName: `GenLayer ${NETWORK_LABEL}`,
          nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
          rpcUrls: [RPC_URL],
          blockExplorerUrls: [EXPLORER],
        }],
      });
      return;
    }
    throw err;
  }
}

export async function connectWallet(): Promise<string> {
  const provider = injectedProvider();
  if (!provider) throw new Error("No injected wallet found in this browser.");
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) throw new Error("Wallet returned no account.");
  await ensureChain();
  return accounts[0];
}

export async function currentAccount(): Promise<string | null> {
  const provider = injectedProvider();
  if (!provider) return null;
  try {
    return ((await provider.request({ method: "eth_accounts" })) as string[])?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function getBalance(address: string): Promise<bigint> {
  const provider = injectedProvider();
  if (!provider) return 0n;
  try {
    return BigInt((await provider.request({ method: "eth_getBalance", params: [address, "latest"] })) as string);
  } catch {
    return 0n;
  }
}

// ---------------------------------------------------------------------------
// Writes. A returned hash proves submission, not success: every caller goes
// through submitWrite, which re-checks the receipt against whitelists.
// ---------------------------------------------------------------------------

export type WriteArgs = { method: string; args: unknown[]; value?: bigint; account: string };

const OK_STATUS = new Set(["ACCEPTED", "FINALIZED"]);
const OK_EXECUTION = new Set(["FINISHED_WITH_RETURN", "FINISHED_WITH_NO_RETURN"]);
const OK_RESULT = new Set(["MAJORITY_AGREE", "AGREE"]);

export type TxOutcome = { hash: string; status: string; execution: string; result: string; ok: boolean; reason: string };

function readStatus(receipt: unknown) {
  const r = (receipt ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = r[k];
      if (typeof v === "string" && v) return v.toUpperCase();
    }
    return "";
  };
  return {
    status: pick("statusName", "status_name"),
    execution: pick("txExecutionResultName", "tx_execution_result_name"),
    result: pick("result_name", "resultName"),
  };
}

export async function waitForOutcome(hash: string): Promise<TxOutcome> {
  const client = (await readClient()) as { waitForTransactionReceipt: (a: unknown) => Promise<unknown> };
  let receipt: unknown;
  try {
    receipt = await client.waitForTransactionReceipt({ hash, status: "ACCEPTED", retries: 100, interval: 5000 });
  } catch (err) {
    return { hash, status: "", execution: "", result: "", ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
  const { status, execution, result } = readStatus(receipt);
  const fail = (reason: string): TxOutcome => ({ hash, status, execution, result, ok: false, reason });
  if (!OK_STATUS.has(status))
    return fail(status === "UNDETERMINED" ? "Validators could not agree, so nothing was recorded. Try again." : `Transaction ended as ${status || "an unreported state"}.`);
  if (!OK_RESULT.has(result))
    return fail(result === "DISAGREE" ? "Validators re-ran this independently and disagreed, so nothing was recorded. Try again." : `Consensus result was ${result || "not reported"}.`);
  if (!OK_EXECUTION.has(execution))
    return fail(execution === "FINISHED_WITH_ERROR" ? "The contract rejected this call." : `Execution result was ${execution || "not reported"}.`);
  return { hash, status, execution, result, ok: true, reason: "" };
}

export async function writeContract({ method, args, value, account }: WriteArgs): Promise<string> {
  if (!CONTRACT_ADDRESS) throw new Error("no contract address configured");
  const provider = injectedProvider();
  if (!provider) throw new Error("No injected wallet found in this browser.");
  await ensureChain();

  const [{ createClient }, { studioDevnet }] = await Promise.all([import("genlayer-js"), import("genlayer-js/chains")]);
  const chain = { ...studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC_URL] } } };
  const client = createClient({ chain: chain as never, account: account as never, provider: provider as never });

  // Consensus v0.6 requires an explicit fee on every write. Let the client
  // simulate this exact call to derive one rather than guessing.
  let fees: unknown;
  try {
    fees = await (client as never as { estimateTransactionFeesForWrite: (a: unknown) => Promise<unknown> })
      .estimateTransactionFeesForWrite({ address: CONTRACT_ADDRESS, functionName: method, args, value: value ?? 0n });
  } catch {
    fees = undefined;
  }
  return (client as never as { writeContract: (a: unknown) => Promise<string> }).writeContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
    value: value ?? 0n,
    ...(fees ? { fees } : {}),
  });
}

export async function submitWrite(args: WriteArgs): Promise<TxOutcome> {
  return waitForOutcome(await writeContract(args));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function fmtGen(wei: string | bigint, decimals = 2): string {
  const v = typeof wei === "bigint" ? wei : BigInt(wei || "0");
  const whole = v / 10n ** 18n;
  const frac = ((v % 10n ** 18n) * 10n ** BigInt(decimals)) / 10n ** 18n;
  return decimals === 0 ? whole.toString() : `${whole}.${frac.toString().padStart(decimals, "0")}`;
}

export function toWei(amount: string): bigint {
  const t = (amount || "0").trim();
  if (!/^\d+(\.\d+)?$/.test(t)) throw new Error("amount must be a number");
  const [whole, frac = ""] = t.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt((frac + "0".repeat(18)).slice(0, 18) || "0");
}

export const shortAddr = (a: string) => (!a || a.length < 12 ? a || "—" : `${a.slice(0, 6)}…${a.slice(-4)}`);

export function fmtTime(ts: number): string {
  return ts ? new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 16) + "Z" : "—";
}

export function countdown(deadline: number, now = Date.now() / 1000): string {
  const left = Math.floor(deadline - now);
  if (left <= 0) return "open for resolution";
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export const explorerAddress = (a: string) => `${EXPLORER.replace(/\/$/, "")}/address/${a}`;
export const explorerTx = (h: string) => `${EXPLORER.replace(/\/$/, "")}/transactions/${h}`;
