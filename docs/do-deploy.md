# DigitalOcean App Platform Deployment

This deploys only the FastAPI backend in `services/api`.

## Cost target

- App Platform web service: `apps-s-1vcpu-0.5gb`
- Estimated monthly cost: `$5/month`
- No DigitalOcean database is created. The API continues using Supabase.

## Required runtime environment variables

Set these in DigitalOcean App Platform:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `CORS_ORIGINS`
- `GEONAMES_USERNAME`

Defaults included in `.do/app.yaml`:

- `PYTHON_VERSION=3.11.8`
- `OPENAI_MODEL=gpt-5.4`
- `OPENAI_WHISPER_MODEL=whisper-1`

## Commands

- Build command: `pip install -r requirements.txt`
- Run command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`
