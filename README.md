# Verdict

**A bonded claim-resolution market on GenLayer.**

Post a real-world claim with a GEN bond and public evidence links. Anyone can bond against it.
Independent GenLayer validators each fetch the evidence themselves, judge the claim, and the bonds
move on the verdict: `TRUE`, `FALSE` or `UNRESOLVABLE`.

> Network: **Studio Next** · RPC `https://studio-next.genlayer.com/api` · Chain ID `61997`
> Explorer `https://explorer-studio-dev.genlayer.com/`

## What GenLayer decides

A chain cannot read a web page or weigh evidence. Verdict needs both:

1. **Evidence retrieval**: every validator fetches each locked HTTPS url for itself (`gl.nondet.web.get`).
2. **Judgement**: every validator asks an LLM whether the sources settle the claim (`gl.nondet.exec_prompt`).

The leader does not get to be believed. Each validator re-does the whole job and canonicalizes its own
verdict through the same pure code (`contracts/verdict_lib.py`). The leader's result stands only when:

| Field | Compared as |
| --- | --- |
| `outcome` | exactly |
| `claim_id` | exactly |
| `confidence` | within ±20 points |
| reasoning prose | never compared |

Anything unparseable, unreachable, injected, or under 60% confidence collapses to `UNRESOLVABLE`.

## Who loses money if the verdict is wrong

| Verdict | No challenger | Challenger bonded |
| --- | --- | --- |
| **TRUE** | Claimant's bond returned | Claimant wins the challenger's bond, less 2% of it |
| **FALSE** | Bond forfeited to the treasury | Challenger wins the claimant's bond, less 2% of it |
| **UNRESOLVABLE** | Bond returned, no fee | Every bond returned exactly, no fee |

Minimum bonds: 1 GEN each. An unchallenged claim can only be resolved after a challenge window
(default 10 minutes, set at deploy). A challenged claim can be resolved at once. Winnings are pulled
with `claim_funds`, never pushed. Money is conserved on every branch (tested).

## Repository

```
contracts/   Verdict.py: the complete contract, the ONE file you deploy (generated; commit it)
deploy/      deployments.json: address recorded only after the network confirms it is live
frontend/    React + Vite + TypeScript: landing, dashboard, claims, claim detail, post, funds
scripts/     deploy.mjs, smoke_test.mjs, e2e_check.mjs, build_bundle.py, and src/ (the two
             source pieces the bundler merges into contracts/Verdict.py)
tests/       unit/ (pure logic) and contract/ (the deployable contract on an SDK stand-in)
docs/        architecture.md, STATUS.md (what is and is not verified), VERCEL.md
```

## Quick start

```bash
# 1. contract: regenerate contracts/Verdict.py from scripts/src, then test (Python 3.12, no dependencies)
python scripts/build_bundle.py
python -m unittest discover -s tests/unit -p "test_*.py"
python -m unittest discover -s tests/contract -p "test_*.py"

# 2. install the toolchain used by the scripts and the app
npm --prefix frontend install

# 3. deploy to Studio Next (writes deploy/deployments.json and frontend/.env)
TREASURY_ADDRESS=0xYourAddress node scripts/deploy.mjs

# 4. prove it works on-chain: post -> challenge -> consensus ruling -> payout
node scripts/smoke_test.mjs
node scripts/e2e_check.mjs

# 5. run the app
npm --prefix frontend run dev
```

## Deploy the frontend to Vercel

See [docs/VERCEL.md](docs/VERCEL.md). In short: push to GitHub, import the repo in Vercel, set
**Root Directory = `frontend`**, add the four `VITE_*` environment variables, deploy.

## Honest status

See [docs/STATUS.md](docs/STATUS.md). The contract logic and ledger are tested locally. Real consensus,
the LLM ruling and the wallet flow can only be proven on the live network, which is what
`scripts/smoke_test.mjs` does for you.

## License

MIT
