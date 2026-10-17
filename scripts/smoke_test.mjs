#!/usr/bin/env node
/**
 * REAL end-to-end proof on the live network: post a claim (alice), challenge it (bob),
 * let validators fetch the evidence and rule, then withdraw winnings.
 *
 *   node scripts/smoke_test.mjs
 *
 * Uses two ephemeral accounts funded via sim_fundAccount. The claim is about
 * https://example.com, a stable page whose text says "Example Domain".
 */
import { DEFAULTS, GEN, deployments, fund, lib, makeClient, waitOk, withFees } from "./_chain.mjs";

const net = { ...DEFAULTS, ...deployments().studio_next };
if (!net.address) throw new Error("no address in deploy/deployments.json: run scripts/deploy.mjs first");
const { createAccount, generatePrivateKey } = lib();
const alice = createAccount(generatePrivateKey());
const bob = createAccount(generatePrivateKey());
await fund(net.rpc, alice.address); await fund(net.rpc, bob.address);

const ca = makeClient(net.rpc, net.chain_id, alice);
const cb = makeClient(net.rpc, net.chain_id, bob);
const send = async (c, functionName, args, value = 0n) => {
  const base = { address: net.address, functionName, args, value };
  const hash = await c.writeContract({ ...base, ...(await withFees(c, base)) });
  return waitOk(c, hash, functionName);
};
const read = async (fn, args = []) => String(await ca.readContract({ address: net.address, functionName: fn, args }));
const fail = (m) => { console.error(`\nSMOKE FAILED: ${m}`); process.exit(1); };

console.log("\n1. alice posts a claim with a 1 GEN bond");
await send(ca, "post_claim", [
  "example.com is titled Example Domain",
  "The web page at https://example.com has the title 'Example Domain'.",
  JSON.stringify(["https://example.com"]),
], 1n * GEN);
const ids = JSON.parse(await read("list_claims"));
const id = ids[ids.length - 1];
console.log(`   claim ${id}`);

console.log("2. bob challenges with 1 GEN");
await send(cb, "challenge", [id, "I do not believe it."], 1n * GEN);

console.log("3. anyone resolves: every validator fetches the page and rules (can take minutes)");
await send(cb, "resolve", [id]);
const rec = JSON.parse(await read("get_claim", [id]));
console.log(`   outcome ${rec.outcome}  confidence ${rec.confidence}\n   reasoning: ${rec.reasoning}`);
if (rec.state !== "RESOLVED") fail("claim is not RESOLVED");
if (rec.outcome !== "TRUE") fail(`expected TRUE for example.com, got ${rec.outcome}`);

console.log("4. alice claims her winnings");
const owed = BigInt(await read("get_claimable", [alice.address]));
console.log(`   alice is owed ${Number(owed) / 1e18} GEN`);
if (owed <= GEN) fail("alice should be owed her bond plus the challenger's bond less the fee");
await send(ca, "claim_funds", []);
if (BigInt(await read("get_claimable", [alice.address])) !== 0n) fail("ledger not zeroed after claim");
console.log("\nSMOKE PASSED: post -> challenge -> consensus ruling -> payout all worked on-chain.\n");
