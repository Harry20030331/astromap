# AstraMap — MVP Code Design

Concise technical plan for an empty repo. Aligns with [prd.md](../prd.md).

## Goals

- **Deterministic** natal chart + structured features (Python, pip libraries).
- **LLM** only for theme hints and query-time assistance; chart facts never come from the model.
- **Mobile-first** web UI: **View** (client-safe facts + chart) and **Query** (private exploration).
- **No auth**, **local JSON** persistence for MVP.

## Repository Layout

```
apps/web/                 # Next.js (App Router), TypeScript
services/api/             # FastAPI, Python 3.11+
packages/shared-types/    # optional: JSON schemas / OpenAPI-generated TS types (defer if heavy)
data/                     # gitignored: chart sessions JSON (local only)
```

Single git repo; deploy later as two processes (API + static/SSR web).

## Backend (`services/api`)

| Module | Responsibility |
|--------|----------------|
| `astro/compute.py` | Birth data → raw chart model (bodies, houses, cusps, aspects, orbs) via **Kerykeion** or **Immanuel** (pick one; both use Swiss Ephemeris). |
| `astro/features.py` | Deterministic **structured features** (elements, modalities, stellium-like clusters, house emphasis, aspect shortlist, dominant planets — rules owned by us). |
| `llm/themes.py` | Input: feature JSON → output: 3–5 themes + short non-authoritative hints via **OpenAI** API only (MVP). |
| `llm/query.py` | Same stack: **OpenAI** only; input user query + feature JSON (+ optional raw aspect list) → relevant structures, hints, suggested questions. Server passes precomputed JSON; no model-side ephemeris. |
| `storage/local_json.py` | CRUD for sessions: `data/sessions/{id}.json`. |
| `main.py` | FastAPI routes, CORS for `apps/web` origin. |

**API (minimal)**

- `POST /sessions` — create session from birth data; compute chart + features; persist; return `session_id` + chart payload + `features`.
- `GET /sessions/{id}` — load session.
- `POST /sessions/{id}/themes` — run theme LLM; store result; return themes.
- `POST /sessions/{id}/query` — body: `{ "text": "..." }`; return structured query response.

**Dependencies (indicative)**  
`fastapi`, `uvicorn`, `kerykeion` *or* `immanuel`, `pydantic`, `openai` (official SDK), `python-dotenv`.

**License note**  
Kerykeion / Immanuel / Swiss Ephemeris chain is often **GPL/AGPL-adjacent**. Confirm fit before commercial closure; alternative lower-level path: `pysweph` + more custom code.

## Frontend (`apps/web`)

| Area | MVP scope |
|------|-----------|
| **Routing** | `/` session list + create; `/session/[id]/view`; `/session/[id]/query`. |
| **View** | Natal wheel: consume server-provided geometry or **pre-rendered SVG** from API in MVP (simplest: return SVG string or path data from Python); tap targets for bodies/houses deferred to **phase 2** if needed — MVP can show wheel + side panel lists (placements, aspects, elements). |
| **Query** | Text field + optional Web Speech API; same `POST .../query`; show blocks: relevant structures / hints / suggested questions (not a tiny sidebar — primary workspace on this route). |
| **State** | React Query or SWR fetching API; no global auth. |

**Dependencies (indicative)**  
`next`, `react`, Tailwind (or CSS modules), `zod` for client validation of API shapes.

## Data Shapes (contract sketch)

Server is source of truth for:

- `birth`: date, time, timezone or offset, lat/lng, label.
- `chart`: serializable positions, houses, aspects (with orbs), settings used (house system, orb table).
- `features`: PRD-style JSON (elements, modalities, stelliums[], aspects[], house_emphasis[], dominant_planets[]).
- `themes`: LLM output, versioned prompt id optional.
- `queries[]`: append-only log of `{ text, response, ts }` for MVP replay.

## Configuration

- `API`: `.env` — `OPENAI_API_KEY`, `OPENAI_MODEL` (e.g. `gpt-4o-mini`), `DATA_DIR=./data`. **MVP:** OpenAI only; no `LLM_PROVIDER` switch.
- `WEB`: `.env.local` — `NEXT_PUBLIC_API_URL`.

## Out of Scope (MVP code)

- Postgres, OAuth, multi-tenant hosting hardening.
- Synastry, returns, progressions.
- Fine-grained chart display toggles (minor bodies, multiple orb sets) — stub API fields only if cheap.

## Implementation Order

1. API: compute + features + `POST/GET sessions` (no LLM).
2. Web: create session, View page with chart + feature summary.
3. API + Web: themes endpoint + collapsible section on View.
4. Query route + LLM query endpoint + voice optional.

## Testing (lightweight)

- **API**: pytest with fixed birth data; snapshot JSON for `features` shape.
- **Web**: smoke E2E optional for MVP (Playwright later).

---

*This document is the MVP scaffold; PRD remains the product source of truth.*
