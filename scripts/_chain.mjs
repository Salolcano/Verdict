// Shared helpers for deploy.mjs / smoke_test.mjs / e2e_check.mjs.
// genlayer-js is resolved from frontend/node_modules, so run `npm --prefix frontend ci` first.
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { URL } from "node:url";

export const ROOT = new URL("..", import.meta.url);
const req = createRequire(new URL("frontend/node_modules/", ROOT));
export const GEN = 10n ** 18n;
export const DEFAULTS = {
  rpc: "https://studio-next.genlayer.com/api",
  chain_id: 61997,
  explorer: "https://explorer-studio-dev.genlayer.com",
};

export const lib = () => ({ ...req("genlayer-js"), ...req("genlayer-js/chains") });
export const deployments = () => JSON.parse(readFileSync(new URL("deploy/deployments.json", ROOT), "utf8"));
export const bundle = () => {
  const p = new URL("contracts/Verdict.py", ROOT);
  if (!existsSync(p)) throw new Error("contracts/Verdict.py missing: run `python scripts/build_bundle.py`");
  return readFileSync(p, "utf8");
};

export async function rpc(url, method, params = []) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "verdict-scripts/1.0" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  return body.result;
}

export function makeClient(rpcUrl, chainId, account) {
  const { createClient, studioDevnet } = lib();
  const chain = { ...studioDevnet, id: chainId, rpcUrls: { default: { http: [rpcUrl] } } };
  return createClient({ chain, endpoint: rpcUrl, ...(account ? { account } : {}) });
}

export async function fund(rpcUrl, address, amount = 100n * GEN) {
  // Studio networks expose a faucet RPC. Failure is non-fatal: the account may already be funded.
  try { await rpc(rpcUrl, "sim_fundAccount", [address, Number(amount)]); }
  catch (e) { console.log(`  (sim_fundAccount: ${e.message})`); }
}

export async function waitOk(client, hash, what) {
  const r = await client.waitForTransactionReceipt({ hash, status: "ACCEPTED", retries: 120, interval: 5000 });
  const pick = (...k) => k.map((x) => r?.[x]).find((v) => typeof v === "string" && v)?.toUpperCase() ?? "";
  const status = pick("statusName", "status_name");
  const exec = pick("txExecutionResultName", "tx_execution_result_name");
  const result = pick("result_name", "resultName");
  const ok = ["ACCEPTED", "FINALIZED"].includes(status) && ["MAJORITY_AGREE", "AGREE"].includes(result) &&
    ["FINISHED_WITH_RETURN", "FINISHED_WITH_NO_RETURN"].includes(exec);
  console.log(`  ${ok ? "ok  " : "FAIL"} ${what}: ${status}/${result}/${exec}  ${hash}`);
  if (!ok) throw new Error(`${what} did not succeed (${status}/${result}/${exec})`);
  return r;
}

export async function withFees(client, args) {
  try {
    if (typeof client.estimateTransactionFeesForWrite !== "function") return {};
    const fees = await client.estimateTransactionFeesForWrite(args);
    return fees ? { fees } : {};
  } catch { return {}; }
}
