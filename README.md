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
