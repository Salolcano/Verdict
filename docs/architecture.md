# Architecture

```
 wallet ──► frontend (React) ──genlayer-js──► Studio Next ──► Verdict.py (Intelligent Contract)
                  ▲                                              │ resolve()
                  └── reads: get_config / list_claims / get_claim │
                                                                  ▼
                                   every validator: web.get(evidence) + exec_prompt(judge)
                                   canonicalize_verdict() ──► verdicts_equivalent(leader, mine)
```

## Contract
- One class, `Verdict(gl.contract.Contract)`. State is `TreeMap[str, str]` (claim id to JSON record),
  `TreeMap[str, u256]` (ledger), and a few scalars.
- Writes: `post_claim` (payable), `challenge` (payable), `withdraw_claim`, `resolve`, `claim_funds`.
- Views: `get_config`, `list_claims`, `get_claim`, `get_claimable`.
- `resolve` is the only non-deterministic step. It uses `gl.vm.run_nondet(leader_fn, validator_fn)`.
  The validator re-runs `leader_fn` (its own fetches, its own prompt) and compares with
  `verdicts_equivalent`. Storage objects never cross into the non-deterministic closures.
- After consensus the agreed envelope is re-bound to *this* claim and its *locked* urls
  (`bind_envelope`), then re-canonicalized in deterministic code before any state changes.

## Safety properties (each is a test)
- Prompt injection in a fetched page, or in the challenge note, cannot force an outcome: the prompt
  marks both as untrusted data, and any non-conforming output collapses to `UNRESOLVABLE`.
- Dead evidence never reaches the LLM and refunds every bond.
- Validator disagreement leaves the claim `OPEN` and moves no money.
- Total paid out equals total bonded on every branch.
- Winnings are pulled by their owner; there is no push transfer to a hostile address.
- Private/loopback hosts and non-HTTPS urls are rejected at posting time.

## Bundling
Contract validation rejects sibling imports, so `scripts/build_bundle.py` inlines
`scripts/src/verdict_lib.py` into `scripts/src/verdict_template.py` and writes `contracts/Verdict.py`
(first line stays the bare `Depends` header). CI fails if the committed bundle is stale.

## Frontend
All reads go through `src/lib/chain.ts` and fail closed: no address, no code at the address, or an
unreachable RPC each render a distinct banner and an empty product, never fabricated data.
The liveness probe is `gen_getContractSchema`, not `eth_getCode`. Writes go through
`submitWrite`, which accepts only whitelisted receipt states, so an `UNDETERMINED` or `DISAGREE`
result is never shown as success. Charts are hand-built SVG: no chart library, no image assets.
