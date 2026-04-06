# AstraMap

Mobile-first AI workspace for astrologers (MVP). Product notes: [docs/prd.md](docs/prd.md), [docs/mvp.md](docs/mvp.md).

## Repository layout

| Path | Role |
|------|------|
| `apps/web` | Next.js frontend (Vercel) |
| `services/api` | FastAPI backend (Render or local) |
| `docs/` | PRD, MVP, rules, and research notes |

**Sessions and chart data** are read/written at runtime through **Supabase** via the API. User JSON is not stored in the repo. Any legacy `services/data/sessions/` folder can be ignored or removed locally.

## Ephemeris / licensing

Chart computation uses Swiss Ephemeris via **Kerykeion**. The dependency chain may be GPL/AGPL-adjacent; verify fit before commercial distribution.

## Prerequisites

- Node.js 20+
- Python 3.11+ for the API (optional Conda: `services/api/environment.yml`)

## Local development

### 1. API (`services/api`)

```bash
cd services/api
python -m venv .venv && source .venv/bin/activate   # or: conda env create -f environment.yml && conda activate astramap-api
pip install -r requirements.txt
cp .env.example .env
# Fill .env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY (required); optional GEONAMES_USERNAME, CORS_ORIGINS
uvicorn app.main:app --reload --port 8000
```

`app.main` persists sessions with **`supabase_store`**. **`local_json`** is only for test fixtures; use Supabase in day-to-day dev to match production.

### 2. Web (`apps/web`)

```bash
cd apps/web
npm install
cp .env.example .env.local
# .env.local: NEXT_PUBLIC_API_URL (default http://localhost:8000), NEXT_PUBLIC_SUPABASE_*
npm run dev
```

Open http://localhost:3000

## Deploy (Vercel + Render)

[`render.yaml`](render.yaml) at the repo root is a **Render Blueprint** (API only). Connect the **same** GitHub repo to Vercel for the frontend.

### API (Render)

1. Push the repo to GitHub (include `render.yaml`).
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → select the repo.
3. After the service is created, set **Environment** at minimum: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CORS_ORIGINS` (your Vercel production origin(s), comma-separated).
4. Optional: custom host e.g. `api.astramap.app` — add the CNAME Render shows in DNS (e.g. Namecheap).

### Web (Vercel)

1. [Vercel](https://vercel.com) → **Add New Project** → import the GitHub repo.
2. Set **Root Directory** to `apps/web`.
3. **Environment variables**: `NEXT_PUBLIC_API_URL` (Render API URL), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `apps/web/.env.example`).
4. **Domains**: attach your site hostname; point DNS at Vercel’s A/CNAME records at the registrar.

[`apps/web/vercel.json`](apps/web/vercel.json) includes `ignoreCommand` so a deploy is **skipped** when the latest commit did not change anything under `apps/web`. Remove that field if you want every push to build the web app.

### Automatic deploys

Pushes to the default production branch (usually `main`) trigger Vercel production and (if connected) Render builds. Other branches / PRs typically get Vercel preview URLs.

## Pre-launch checklist

- [ ] Render: API env vars set; `/health` passes.
- [ ] Vercel: frontend env vars point at production API and Supabase.
- [ ] Supabase: project and RLS/policies match what the app expects (service role only on the backend).
- [ ] `CORS_ORIGINS` includes every browser origin users hit.
- [ ] (Optional) Google Search Console: keep `apps/web/public/google*.html` if used for verification.
- [ ] Favicons: `apps/web/src/app/icon.png` and `apple-icon.png` committed and redeployed.

## Optional: Vercel CLI

From `apps/web`, after `npx vercel login`, you can run `npx vercel --prod`. Prefer Git-based deploys to avoid double-deploying the same commit.
