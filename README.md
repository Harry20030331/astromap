# AstraMap

Mobile-first AI workspace for astrologers (MVP). See [docs/prd.md](docs/prd.md) and [docs/mvp.md](docs/mvp.md).

## License note (ephemeris)

Chart computation uses Swiss Ephemeris via **Kerykeion**. The dependency chain may be GPL/AGPL-adjacent; verify fit before commercial distribution.

## Prerequisites

- [Miniconda](https://docs.conda.io/en/latest/miniconda.html) or Anaconda (for the API environment below)
- Node.js 20+

## API (`services/api`)

```bash
cd services/api
conda env create -f environment.yml   # once: creates env `astramap-api` and pip-installs requirements.txt
conda activate astramap-api
# after editing requirements.txt: pip install -r requirements.txt
cp .env.example .env                    # add OPENAI_API_KEY (themes, query, Whisper STT)
# optional: export DATA_DIR=../../data
uvicorn app.main:app --reload --port 8000
```

## Web (`apps/web`)

Local API URL is set in `.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:8000`). If missing, copy from `.env.example`.

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000

## Deploy (Vercel + Render)

Repository root includes [`render.yaml`](render.yaml) for a **Render Blueprint** (API only).

### API (Render)

1. Push this repo to GitHub (include `render.yaml`).
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → connect the repo.
3. After the web service is created, open **Environment** and set (at minimum):
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   - `CORS_ORIGINS` — your Vercel URL(s), e.g. `https://astramap.app` (comma-separated if several)
4. Optional: **Custom Domains** → `api.astramap.app` (then add the CNAME Render shows in your DNS).

### Web (Vercel)

1. [Vercel](https://vercel.com) → **Add New Project** → import the GitHub repo.
2. Set **Root Directory** to `apps/web`.
3. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` — your Render API URL, e.g. `https://astramap-api.onrender.com` or `https://api.astramap.app`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `apps/web/.env.example`)
4. **Domains** → add `astramap.app` (DNS: Vercel will show A/CNAME records for Namecheap).

### CLI (optional)

From `apps/web`, after logging in: `npx vercel login` then `npx vercel --prod` (still set env vars in the Vercel project dashboard).
