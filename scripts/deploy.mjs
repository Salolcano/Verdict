#!/usr/bin/env node
/**
 * Deploys contracts/Verdict.py to Studio Next and records the address in
 * deploy/deployments.json -- but ONLY after gen_getContractSchema confirms it is live.
 *
 *   npm --prefix frontend ci
 *   python scripts/build_bundle.py
 *   DEPLOYER_PRIVATE_KEY=0x... TREASURY_ADDRESS=0x... node scripts/deploy.mjs
 *
 * With no DEPLOYER_PRIVATE_KEY an ephemeral key is generated and funded through
 * the network's sim_fundAccount faucet (fine on Studio; the key is printed once).
 * Optional: CHALLENGE_WINDOW_SECONDS (default 600).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { URL } from "node:url";
import { ROOT, DEFAULTS, GEN, bundle, deployments, fund, lib, makeClient, rpc, waitOk } from "./_chain.mjs";

const dep = deployments();
const net = { ...DEFAULTS, ...dep.studio_next };
const { createAccount, generatePrivateKey } = lib();

const key = process.env.DEPLOYER_PRIVATE_KEY || generatePrivateKey();
if (!process.env.DEPLOYER_PRIVATE_KEY) console.log(`Ephemeral deployer key (save it if you want ownership): ${key}`);
const account = createAccount(key);
const treasury = process.env.TREASURY_ADDRESS || account.address;
const windowSeconds = process.env.CHALLENGE_WINDOW_SECONDS || "600";

console.log(`\nDeploying Verdict\n  rpc       ${net.rpc}\n  chain     ${net.chain_id}\n  deployer  ${account.address}\n  treasury  ${treasury}\n  window    ${windowSeconds}s\n`);
if (!process.env.DEPLOYER_PRIVATE_KEY) await fund(net.rpc, account.address);

const client = makeClient(net.rpc, net.chain_id, account);
const code = bundle();
let fees = {};
try { if (typeof client.estimateTransactionFeesForDeploy === "function") fees = { fees: await client.estimateTransactionFeesForDeploy({ code, args: [treasury, windowSeconds] }) }; } catch { /* client derives defaults */ }

const hash = await client.deployContract({ code, args: [treasury, windowSeconds], ...fees });
console.log(`  submitted ${hash}`);
const receipt = await waitOk(client, hash, "deploy");

const address = receipt?.data?.contract_address ?? receipt?.txDataDecoded?.contractAddress ?? receipt?.to_address ?? receipt?.recipient;
if (!address) throw new Error("deploy succeeded but no contract address found in the receipt; find it in the explorer");

const schema = await rpc(net.rpc, "gen_getContractSchema", [address]);
const methods = Object.keys(schema.methods || {});
if (methods.length < 9) throw new Error(`schema at ${address} lists only ${methods.length} methods`);

dep.studio_next = {
  ...dep.studio_next,
  chain_id: net.chain_id, rpc: net.rpc, explorer: net.explorer,
  address, deploy_tx: hash, treasury,
  verified_live_at: new Date().toISOString().slice(0, 10),
  verified_by: `gen_getContractSchema returned ${methods.length} methods`,
};
writeFileSync(new URL("deploy/deployments.json", ROOT), JSON.stringify(dep, null, 2) + "\n");

// keep frontend/.env in step so `npm run dev` just works
const envPath = new URL("frontend/.env", ROOT);
let env = ""; try { env = readFileSync(envPath, "utf8"); } catch { env = readFileSync(new URL("frontend/.env.example", ROOT), "utf8"); }
env = env.match(/^VITE_CONTRACT_ADDRESS=.*$/m) ? env.replace(/^VITE_CONTRACT_ADDRESS=.*$/m, `VITE_CONTRACT_ADDRESS=${address}`) : env + `\nVITE_CONTRACT_ADDRESS=${address}\n`;
writeFileSync(envPath, env);

console.log(`\nLive at ${address}\n  explorer: ${net.explorer}/address/${address}\n  frontend/.env updated. Set the same VITE_CONTRACT_ADDRESS in Vercel.\n`);
