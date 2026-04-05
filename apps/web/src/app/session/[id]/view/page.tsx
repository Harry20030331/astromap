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
import { ChartHeaderGlyphs } from "@/components/ChartHeaderGlyphs";
import { ElementsModalitiesRings } from "@/components/ElementsModalitiesRings";
import { ChartFeaturesGrid } from "@/components/ChartFeaturesGrid";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { AnalysisPreferences } from "@/lib/chartPreferences";
import { mergeAspectOrbs, sessionAnalysisPreferences } from "@/lib/chartPreferences";
import { useI18n } from "@/lib/i18n";

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

export default function ViewPage() {
  const { t } = useI18n();
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
        <p className="text-sm text-stone-500">{t("view.loading")}</p>
      </main>
    );
  }
  if (error || !data) {
    return (
      <main className="w-full min-w-0 p-4">
        <p className="text-sm text-red-700">{t("view.loadError")}</p>
        <Link
          href="/"
          className="mt-2 inline-block text-sm text-sky-800 underline decoration-sky-800/30 underline-offset-2 hover:text-sky-950"
        >
          {t("view.backHome")}
        </Link>
      </main>
    );
  }

  const f = data.features;
  const title = data.birth.label || data.birth.name || t("view.defaultTitle");
  const themesStatus = data.themes_status;
  const hasThemes = Boolean(data.themes?.themes && data.themes.themes.length > 0);
  const isGenerating = themesStatus === "generating";
  const isFailed = themesStatus === "failed";
  const legacyNoAuto =
    themesStatus == null && !hasThemes && data.themes == null;

  return (
    <main className="w-full min-w-0 px-4 py-6">
      <div className="mx-auto w-full max-w-[min(100%,480px)]">
        <header className="mb-4">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-stone-900">{title}</h1>
            <ChartHeaderGlyphs bodies={data.chart.bodies} />
            <button
              type="button"
              onClick={openSettings}
              className="ml-auto shrink-0 rounded-full p-1 transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500"
              aria-label="Birth chart analysis settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="36"
                height="36"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10.5" fill="white" stroke="#1c1917" strokeWidth="1.5" />
                <path
                  fill="white"
                  fillRule="evenodd"
                  stroke="#1c1917"
                  strokeWidth="1.5"
                  strokeLinejoin="miter"
                  d="M17.84 10.86L17.84 13.14L16.43 12.39A4.45 4.45 0 0 1 14.55 15.65L15.9 16.49L13.94 17.63L13.88 16.03A4.45 4.45 0 0 1 10.12 16.03L10.06 17.63L8.1 16.49L9.45 15.65A4.45 4.45 0 0 1 7.57 12.39L6.16 13.14L6.16 10.86L7.57 11.61A4.45 4.45 0 0 1 9.45 8.35L8.1 7.51L10.06 6.37L10.12 7.97A4.45 4.45 0 0 1 13.88 7.97L13.94 6.37L15.9 7.51L14.55 8.35A4.45 4.45 0 0 1 16.43 11.61ZM14.85 12A2.85 2.85 0 1 0 9.15 12A2.85 2.85 0 1 0 14.85 12"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="w-full">
          <NatalWheel
            bodies={data.chart.bodies}
            houses={data.chart.houses}
            aspects={data.chart.aspects ?? []}
            includedPoints={includedPointSet}
            aspectOrbs={analysisPrefs.aspect_orbs}
          />
        </div>
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
        <ChartFeaturesGrid features={f} chartAspects={data.chart.aspects ?? []} />
      </section>

      <details className="mt-6 rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 shadow-sm shadow-amber-100/40">
        <summary className="cursor-pointer text-sm font-medium text-amber-950">
          {t("view.themeHints")}
        </summary>
        <div className="mt-3 space-y-3 break-words text-sm">
          {isGenerating && !hasThemes ? (
            <p className="text-xs text-stone-600">
              {t("view.generatingThemes")}
            </p>
          ) : null}

          {isFailed && !hasThemes ? (
            <p className="text-xs text-amber-900/90">
              {t("view.themeFailed")}
            </p>
          ) : null}

          {(isFailed && !hasThemes) || legacyNoAuto ? (
          <div className="flex flex-wrap gap-2">
            {isFailed && !hasThemes ? (
              <button
                type="button"
                disabled={themesMut.isPending}
                onClick={() => themesMut.mutate({ force: false })}
                className="rounded-md border border-amber-800/50 bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-amber-950 shadow-sm transition-colors hover:bg-amber-100/60 disabled:opacity-50"
              >
                {themesMut.isPending ? t("view.retrying") : t("view.retry")}
              </button>
            ) : null}
            {legacyNoAuto ? (
              <button
                type="button"
                disabled={themesMut.isPending}
                onClick={() => themesMut.mutate({ force: false })}
                className="rounded-md bg-amber-800 px-3 py-1.5 text-xs font-medium text-amber-50 shadow-sm transition-colors hover:bg-amber-900 disabled:opacity-50"
              >
                {themesMut.isPending ? t("view.starting") : t("view.generateThemes")}
              </button>
            ) : null}
          </div>
          ) : null}

          {themeErr ? (
            <p className="text-xs text-red-700">{themeErr}</p>
          ) : null}

          {hasThemes ? (
            <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:gap-4">
              {data.themes!.themes!.map((themeItem, i) => (
                <li
                  key={`${themeItem.title}-${i}`}
                  className="rounded-xl border border-amber-200/90 bg-white p-4 shadow-sm shadow-amber-100/40 sm:p-5"
                >
                  <p className="text-sm font-semibold leading-snug text-stone-900">{themeItem.title}</p>
                  {themeItem.description ? (
                    <p className="mt-2 text-xs leading-relaxed text-stone-700">
                      {themeItem.description}
                    </p>
                  ) : null}
                  {themeItem.reading_priority ? (
                    <p className="mt-2 text-[11px] text-stone-600">
                      {t("view.priority")} {themeItem.reading_priority}
                    </p>
                  ) : null}
                  {!themeItem.description && themeItem.hints && themeItem.hints.length > 0 ? (
                    <ul className="mt-2 list-inside list-disc text-xs leading-relaxed text-stone-700">
                      {themeItem.hints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : !isGenerating && !isFailed && !legacyNoAuto ? (
            <p className="text-xs text-stone-500">
              {t("view.noThemes")}
            </p>
          ) : null}

          {data.themes?.suggested_reading_priorities &&
          data.themes.suggested_reading_priorities.length > 0 ? (
            <div className="text-xs text-stone-700">
              <p className="font-medium text-stone-900">{t("view.overallPriorities")}</p>
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
