-- AstraMap sessions table
-- Run this in Supabase SQL Editor before deploying.

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT,
    birth JSONB NOT NULL DEFAULT '{}'::jsonb,
    chart JSONB NOT NULL DEFAULT '{}'::jsonb,
    features JSONB,
    analysis_preferences JSONB,
    themes JSONB,
    themes_status TEXT DEFAULT 'generating',
    queries JSONB DEFAULT '[]'::jsonb,
    structure_interpretations JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_updated_at_idx ON public.sessions(updated_at DESC);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.sessions FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.sessions TO service_role;
GRANT ALL ON public.sessions TO authenticated;

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.handle_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sessions_updated_at ON public.sessions;
CREATE TRIGGER sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_sessions_updated_at();
