#!/usr/bin/env node
/**
 * Read-only health check: bundle is sound, contract is live, config is as designed.
 *   node scripts/e2e_check.mjs        exits 0 only if every check passes
 */
import { DEFAULTS, GEN, bundle, deployments, lib, makeClient, rpc } from "./_chain.mjs";

const net = { ...DEFAULTS, ...deployments().studio_next };
const failures = [];
const check = (label, ok, detail = "") => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
};

console.log("\nBuild");
const text = bundle();
check("bundle starts with the bare Depends header", text.startsWith('# { "Depends"'));
check("bundle is LF-only", !text.includes("\r\n"));
const methods = (text.match(/@gl\.public\.[a-z_.]+/g) || []).length;
check("bundle declares 9 public methods", methods === 9, `found ${methods}`);

console.log("\nNetwork");
const { studioDevnet } = lib();
check("RPC reports the expected chain", parseInt(await rpc(net.rpc, "eth_chainId"), 16) === net.chain_id);
check("genlayer-js preset matches", studioDevnet.id === net.chain_id);

console.log("\nContract");
if (!net.address) check("an address is recorded in deploy/deployments.json", false, "run scripts/deploy.mjs");
else {
  const schema = await rpc(net.rpc, "gen_getContractSchema", [net.address]);
  const names = Object.keys(schema.methods || {});
  check("schema lists 9 methods", names.length === 9, names.join(", "));
  const client = makeClient(net.rpc, net.chain_id);
  const cfg = JSON.parse(String(await client.readContract({ address: net.address, functionName: "get_config", args: [] })));
  check("claim bond is 1 GEN", BigInt(cfg.min_claim_bond) === GEN);
  check("challenge bond is 1 GEN", BigInt(cfg.min_challenge_bond) === GEN);
  check("fee is 200 bps", cfg.protocol_fee_bps === 200);
  check("treasury is a clean 42-char address", (cfg.treasury || "").length === 42, cfg.treasury);
  console.log(`  claims on chain: ${cfg.claim_count}`);
}
if (failures.length) { console.log(`\n${failures.length} check(s) failed\n`); process.exit(1); }
console.log("\nAll checks passed\n");
