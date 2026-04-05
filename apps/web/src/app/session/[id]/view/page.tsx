"use client";

// Route: /session/[id]/view — client-facing chart wheel, facts, optional AI theme hints.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ChartAnalysisSettingsPanel } from "@/components/ChartAnalysisSettingsPanel";
import {
  NatalWheel,
  type NatalAspect,
  type NatalBody,
  type NatalHouse,
} from "@/components/NatalWheel";
import { ElementsModalitiesRings } from "@/components/ElementsModalitiesRings";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { AnalysisPreferences } from "@/lib/chartPreferences";
import { mergeAspectOrbs, sessionAnalysisPreferences } from "@/lib/chartPreferences";

type Features = {
  elements: Record<string, number>;
  modalities: Record<string, number>;
  stelliums: string[];
  aspects: string[];
  house_emphasis: string[];
  dominant_planets: string[];
};

type ThemeItem = {
  title: string;
  description?: string;
  hints?: string[];
  reading_priority?: string;
};

type ThemesPayload = {
  themes?: ThemeItem[];
  suggested_reading_priorities?: string[];
  generated_at?: string;
  generating?: boolean;
};

type ThemesStatus = "generating" | "ready" | "failed";

type SessionRecord = {
  id: string;
  birth: { label?: string; name?: string };
  chart: {
    svg_wheel: string;
    bodies: NatalBody[];
    houses: NatalHouse[];
    aspects: NatalAspect[];
    houses_system?: string;
  };
  features: Features;
  analysis_preferences?: AnalysisPreferences | null;
  themes: ThemesPayload | null;
  themes_status?: ThemesStatus | null;
};

const cardClass =
  "rounded-xl border border-stone-200/90 bg-[var(--surface)] p-3 shadow-sm shadow-stone-100/50";

export default function ViewPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();
  const [themeErr, setThemeErr] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftPrefs, setDraftPrefs] = useState<AnalysisPreferences | null>(null);
  const [prefErr, setPrefErr] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["session", id],
    queryFn: () => apiGet<SessionRecord>(`/sessions/${id}`),
    enabled: Boolean(id),
    refetchInterval: (q) =>
      q.state.data?.themes_status === "generating" ? 2500 : false,
  });

  const themesMut = useMutation({
    mutationFn: (opts: { force: boolean }) =>
      apiPost<ThemesPayload>(`/sessions/${id}/themes`, { force: opts.force }),
    onSuccess: () => {
      setThemeErr(null);
      qc.invalidateQueries({ queryKey: ["session", id] });
    },
    onError: (e: Error) => setThemeErr(e.message),
  });

  const prefsMut = useMutation({
    mutationFn: (p: AnalysisPreferences) =>
      apiPatch<{
        analysis_preferences: AnalysisPreferences;
        features: Features;
        themes_status: string;
      }>(`/sessions/${id}/analysis-preferences`, {
        included_points: p.included_points,
        aspect_orbs: p.aspect_orbs,
      }),
    onSuccess: (res) => {
      setPrefErr(null);
      if (res?.analysis_preferences) {
        setDraftPrefs({
          included_points: [...res.analysis_preferences.included_points],
          aspect_orbs: mergeAspectOrbs(res.analysis_preferences.aspect_orbs),
        });
      }
      qc.invalidateQueries({ queryKey: ["session", id] });
    },
    onError: (e: Error) => setPrefErr(e.message),
  });

  const chartBodyNames = useMemo(() => {
    if (!data?.chart?.bodies) return new Set<string>();
    return new Set(data.chart.bodies.map((b) => b.name));
  }, [data]);

  const analysisPrefs = useMemo(() => {
    return sessionAnalysisPreferences(data?.analysis_preferences, chartBodyNames);
  }, [data?.analysis_preferences, chartBodyNames]);

  const includedPointSet = useMemo(
    () => new Set(analysisPrefs.included_points),
    [analysisPrefs.included_points],
  );

  const openSettings = useCallback(() => {
    if (!data?.chart?.bodies) return;
    const names = new Set(data.chart.bodies.map((b) => b.name));
    setDraftPrefs(sessionAnalysisPreferences(data.analysis_preferences, names));
    setPrefErr(null);
    setSettingsOpen(true);
  }, [data]);

  if (isLoading) {
    return (
      <main className="w-full min-w-0 p-4">
        <p className="text-sm text-stone-500">Loading…</p>
      </main>
    );
  }
  if (error || !data) {
    return (
      <main className="w-full min-w-0 p-4">
        <p className="text-sm text-red-700">Could not load session</p>
        <Link
          href="/"
          className="mt-2 inline-block text-sm text-sky-800 underline decoration-sky-800/30 underline-offset-2 hover:text-sky-950"
        >
          Back to home
        </Link>
      </main>
    );
  }

  const f = data.features;
  const title = data.birth.label || data.birth.name || "Chart";
  const themesStatus = data.themes_status;
  const hasThemes = Boolean(data.themes?.themes && data.themes.themes.length > 0);
  const isGenerating = themesStatus === "generating";
  const isFailed = themesStatus === "failed";
  const legacyNoAuto =
    themesStatus == null && !hasThemes && data.themes == null;

  return (
    <main className="w-full min-w-0 px-4 py-6 pb-24">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
      </header>

      <div className="relative mx-auto max-w-[min(100%,480px)]">
        <button
          type="button"
          onClick={openSettings}
          className="absolute right-1 top-1 z-10 rounded-lg border border-stone-600/80 bg-stone-900/90 p-2 text-stone-200 shadow-md hover:bg-stone-800 hover:text-white"
          aria-label="Birth chart analysis settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <NatalWheel
          bodies={data.chart.bodies}
          houses={data.chart.houses}
          aspects={data.chart.aspects ?? []}
          includedPoints={includedPointSet}
          aspectOrbs={analysisPrefs.aspect_orbs}
        />
      </div>

      {settingsOpen && draftPrefs ? (
        <ChartAnalysisSettingsPanel
          open
          onClose={() => setSettingsOpen(false)}
          draft={draftPrefs}
          onChange={setDraftPrefs}
          availableIds={chartBodyNames}
          saving={prefsMut.isPending}
          error={prefErr}
          onSavePreferences={(p) => prefsMut.mutate(p)}
        />
      ) : null}

      <section className="mt-6 space-y-4">
        <ElementsModalitiesRings elements={f.elements} modalities={f.modalities} />
        {f.stelliums.length > 0 ? (
          <div className={cardClass}>
            <h2 className="text-sm font-medium text-stone-900">Stelliums</h2>
            <ul className="mt-2 list-inside list-disc text-sm text-stone-700">
              {f.stelliums.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className={cardClass}>
          <h2 className="text-sm font-medium text-stone-900">House emphasis</h2>
          <p className="mt-2 text-sm text-stone-700">
            {f.house_emphasis.join(" · ") || "—"}
          </p>
        </div>
        <div className={cardClass}>
          <h2 className="text-sm font-medium text-stone-900">Dominant planets</h2>
          <p className="mt-2 text-sm text-stone-700">
            {f.dominant_planets.slice(0, 3).join(", ") || "—"}
          </p>
          {f.dominant_planets.length > 3 ? (
            <details className="mt-2 border-t border-stone-100 pt-2">
              <summary className="cursor-pointer text-xs font-medium text-stone-600 hover:text-stone-800">
                Show {f.dominant_planets.length - 3} more
              </summary>
              <p className="mt-2 text-sm text-stone-700">
                {f.dominant_planets.slice(3).join(", ")}
              </p>
            </details>
          ) : null}
        </div>
        <div className={cardClass}>
          <h2 className="text-sm font-medium text-stone-900">Major aspects</h2>
          <ul className="mt-2 space-y-1 text-sm text-stone-700">
            {f.aspects.slice(0, 3).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          {f.aspects.length > 3 ? (
            <details className="mt-2 border-t border-stone-100 pt-2">
              <summary className="cursor-pointer text-xs font-medium text-stone-600 hover:text-stone-800">
                Show {f.aspects.length - 3} more
              </summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-stone-700">
                {f.aspects.slice(3).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </section>

      <details className="mt-6 rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 shadow-sm shadow-amber-100/40">
        <summary className="cursor-pointer text-sm font-medium text-amber-950">
          Theme hints
        </summary>
        <div className="mt-3 space-y-3 break-words text-sm">
          {isGenerating && !hasThemes ? (
            <p className="text-xs text-stone-600">
              Generating theme hints in the background… This page updates automatically.
            </p>
          ) : null}

          {isFailed && !hasThemes ? (
            <p className="text-xs text-amber-900/90">
              Theme generation did not complete. You can retry (still uses your saved chart
              features only).
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {hasThemes ? (
              <button
                type="button"
                disabled={themesMut.isPending}
                onClick={() => themesMut.mutate({ force: true })}
                className="rounded-md bg-amber-800 px-3 py-1.5 text-xs font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900 disabled:opacity-50"
              >
                {themesMut.isPending ? "Regenerating…" : "Regenerate"}
              </button>
            ) : null}
            {isFailed && !hasThemes ? (
              <button
                type="button"
                disabled={themesMut.isPending}
                onClick={() => themesMut.mutate({ force: false })}
                className="rounded-md border border-amber-800/50 bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-amber-950 shadow-sm transition-colors hover:bg-amber-100/60 disabled:opacity-50"
              >
                {themesMut.isPending ? "Retrying…" : "Retry"}
              </button>
            ) : null}
            {legacyNoAuto ? (
              <button
                type="button"
                disabled={themesMut.isPending}
                onClick={() => themesMut.mutate({ force: false })}
                className="rounded-md bg-amber-800 px-3 py-1.5 text-xs font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900 disabled:opacity-50"
              >
                {themesMut.isPending ? "Starting…" : "Generate themes"}
              </button>
            ) : null}
          </div>

          {themeErr ? (
            <p className="text-xs text-red-700">{themeErr}</p>
          ) : null}

          {hasThemes ? (
            <ul className="space-y-3">
              {data.themes!.themes!.map((t, i) => (
                <li
                  key={`${t.title}-${i}`}
                  className="rounded-lg border border-amber-200/70 bg-[var(--surface)]/90 p-2 shadow-sm shadow-stone-100/40"
                >
                  <p className="font-medium text-stone-900">{t.title}</p>
                  {t.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-stone-700">
                      {t.description}
                    </p>
                  ) : null}
                  {t.reading_priority ? (
                    <p className="mt-1 text-xs text-stone-600">
                      Priority: {t.reading_priority}
                    </p>
                  ) : null}
                  {!t.description && t.hints && t.hints.length > 0 ? (
                    <ul className="mt-1 list-inside list-disc text-xs text-stone-700">
                      {t.hints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : !isGenerating && !isFailed && !legacyNoAuto ? (
            <p className="text-xs text-stone-500">
              No themes yet; they should appear shortly after opening a new chart.
            </p>
          ) : null}

          {data.themes?.suggested_reading_priorities &&
          data.themes.suggested_reading_priorities.length > 0 ? (
            <div className="text-xs text-stone-700">
              <p className="font-medium text-stone-900">Overall priorities</p>
              <ul className="mt-1 list-inside list-disc">
                {data.themes.suggested_reading_priorities.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </details>
    </main>
  );
}
