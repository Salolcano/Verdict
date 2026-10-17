# Deploying the frontend to Vercel

The app is a static Vite build; the browser talks to GenLayer directly. There is no server to run.

## 0. Prerequisites
- The contract is deployed and `deploy/deployments.json` has its address (`node scripts/deploy.mjs`).
- The repo is on GitHub (the whole project, not just `frontend/`).

## 1. Push to GitHub
```bash
git init && git add -A && git commit -m "Verdict: bonded claim market on GenLayer"
git branch -M main
git remote add origin https://github.com/<you>/verdict.git
git push -u origin main
```
Commit `frontend/package-lock.json` after your first `npm install`.

## 2. Import the project
1. Open <https://vercel.com/new> and import the repository.
2. **Framework Preset:** Vite (auto-detected).
3. **Root Directory:** click *Edit* and choose `frontend`.
4. Build command `npm run build`, output directory `dist` (both are the defaults and are also in `frontend/vercel.json`).

## 3. Environment variables (Settings, Environment Variables, all environments)
| Name | Value |
| --- | --- |
| `VITE_CONTRACT_ADDRESS` | your deployed address from `deploy/deployments.json` |
| `VITE_GENLAYER_RPC_URL` | `https://studio-next.genlayer.com/api` |
| `VITE_GENLAYER_CHAIN_ID` | `61997` |
| `VITE_EXPLORER` | `https://explorer-studio-dev.genlayer.com` |

`VITE_*` values are inlined **at build time**. If you change one, **redeploy** (Deployments, Redeploy).

## 4. Deploy
Click **Deploy**. Every push to `main` redeploys automatically. The SPA rewrite in `vercel.json`
makes `/app/claims/VDT-000001` work on refresh.

## 5. After the deploy
- Put the Vercel URL in `deploy/deployments.json` under `studio_next.app`.
- Open the site, connect a wallet (it will offer to add Studio Next, chain 61997), post a claim.
- If the banner says *Nothing is deployed at that address*, Studio Next was reset: re-run
  `node scripts/deploy.mjs`, update `VITE_CONTRACT_ADDRESS` in Vercel, and redeploy.

## CLI alternative
```bash
npm i -g vercel
cd frontend && vercel --prod
```
