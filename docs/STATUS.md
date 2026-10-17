# Status: what is verified, and what is not

## Verified locally (reproducible with the commands in the README)
- 22 pure-logic tests: validation, evidence normalization, verdict canonicalization, equivalence,
  envelope binding, and money conservation on every settlement branch.
- 19 contract-flow tests that execute the **deployable contract** (`contracts/Verdict.py`) against an
  in-memory stand-in for the genlayer SDK: posting, challenge rules, the challenge window, all three
  outcomes, dead evidence, fetch exceptions, validator disagreement, prompt injection, withdraw,
  pull-payment, and total-paid-equals-total-bonded.
- The bundle parses, fits the deploy size ceiling, starts with the bare `Depends` header, is LF-only.
- All `.mjs` scripts pass `node --check`.

## NOT verified here: you must run these
The authoring environment had **no network**. So these were written but never executed:
1. `genvm-lint check contracts/Verdict.py`: the real SDK validation.
2. `npm install`, `npm run build`, `tsc -b`: the frontend was only checked for syntax-level errors.
   No `package-lock.json` exists yet; `npm install` will create it.
3. `scripts/deploy.mjs`: the genlayer-js 2.0.0-rc.1 deploy call and receipt shape follow the reference
   project's conventions but were not exercised. If the contract address is not found in the receipt,
   the script says so; take it from the explorer.
4. `scripts/smoke_test.mjs`: the real proof of consensus, the LLM ruling and payouts.
5. The wallet flow in a browser.

Treat `node scripts/smoke_test.mjs` printing `SMOKE PASSED` as the definition of "it works".

## Known limits
- Pages that render only with JavaScript can fetch as empty text and resolve `UNRESOLVABLE`.
- One challenger per claim; no appeal round.
- Studio Next state may reset; the app says so rather than inventing data.
