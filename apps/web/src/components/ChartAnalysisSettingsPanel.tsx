"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisPreferences, AspectOrbKey } from "@/lib/chartPreferences";
import {
  ANGLE_ABBR,
  ASPECT_ORB_KEYS,
  ASPECT_ORB_META,
  defaultPreferencesForAvailableBodies,
  PLANET_SHORT_LABEL,
  POINT_GROUPS,
  POINT_GLYPH,
  POINT_LABEL,
} from "@/lib/chartPreferences";
import {
  formatOrbForInput,
  orbInputsFromDraft,
  parseAspectOrbInput,
} from "@/components/orbInput";
import { useI18n } from "@/lib/i18n";

const SAVE_DEBOUNCE_MS = 320;

/** 2×2 grid: Asc | Dsc, then MC | IC. */
const ANGLE_GRID_ORDER = [
  "Ascendant",
  "Descendant",
  "Medium_Coeli",
  "Imum_Coeli",
] as const;

function PointGlyphCell({ id }: { id: string }) {
  const ch = POINT_GLYPH[id];
  const badge = ANGLE_ABBR[id];
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-stone-200/90 bg-stone-100/90 text-stone-800"
      aria-hidden
    >
      {ch ? (
        <span
          className="select-none text-[1.12rem] leading-none"
          style={{ fontFamily: "Georgia, 'Palatino Linotype', 'Times New Roman', serif" }}
        >
          {ch}
        </span>
      ) : badge ? (
        <span className="text-[0.62rem] font-bold tabular-nums leading-none tracking-tight">
          {badge}
        </span>
      ) : (
        <span className="text-[10px] opacity-60">?</span>
      )}
    </span>
  );
}

function PointLabelText({
  id,
  compact,
  abbrev,
  tFn,
}: {
  id: string;
  compact?: boolean;
  abbrev?: boolean;
  tFn: (key: string) => string;
}) {
  const bodyKey = `body.${id}`;
  const localizedFull = tFn(bodyKey) !== bodyKey ? tFn(bodyKey) : (POINT_LABEL[id] ?? id);
  const text = abbrev && PLANET_SHORT_LABEL[id] != null ? PLANET_SHORT_LABEL[id]! : localizedFull;
  return (
    <span
      className={`font-medium leading-tight text-stone-900 ${compact ? "text-xs sm:text-sm" : "text-sm"}`}
    >
      {text}
    </span>
  );
}

export function ChartAnalysisSettingsPanel({
  open,
  onClose,
  draft,
  onChange,
  availableIds,
  onSavePreferences,
  saving,
  error,
}: {
  open: boolean;
  onClose: () => void;
  draft: AnalysisPreferences;
  onChange: (next: AnalysisPreferences) => void;
  availableIds: Set<string>;
  onSavePreferences: (prefs: AnalysisPreferences) => void;
  saving: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [orbText, setOrbText] = useState<Record<AspectOrbKey, string>>(() =>
    orbInputsFromDraft(draft.aspect_orbs, ASPECT_ORB_KEYS),
  );
  const [orbFieldErrors, setOrbFieldErrors] = useState<Partial<Record<AspectOrbKey, string>>>({});

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOpenRef = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setOrbText(orbInputsFromDraft(draft.aspect_orbs, ASPECT_ORB_KEYS));
      setOrbFieldErrors({});
    }
    wasOpenRef.current = open;
  }, [open, draft]);

  function scheduleSave(next: AnalysisPreferences) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      onSavePreferences(next);
    }, SAVE_DEBOUNCE_MS);
  }

  const included = new Set(draft.included_points);
  const count = included.size;

  function toggle(id: string) {
    const base = draftRef.current;
    const nextSet = new Set(base.included_points);
    if (nextSet.has(id)) {
      if (nextSet.size <= 1) return;
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    const next: AnalysisPreferences = { ...base, included_points: [...nextSet] };
    onChange(next);
    scheduleSave(next);
  }

  function commitOrbFromText(key: AspectOrbKey, raw: string) {
    const parsed = parseAspectOrbInput(raw);
    if (!parsed.ok) {
      setOrbFieldErrors((e) => ({ ...e, [key]: parsed.message }));
      return;
    }
    setOrbFieldErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
    setOrbText((t) => ({ ...t, [key]: formatOrbForInput(parsed.value) }));
    const base = draftRef.current;
    const next: AnalysisPreferences = {
      ...base,
      aspect_orbs: { ...base.aspect_orbs, [key]: parsed.value },
    };
    onChange(next);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    onSavePreferences(next);
  }

  function resetDefaults() {
    const next = defaultPreferencesForAvailableBodies(availableIds);
    onChange(next);
    setOrbText(orbInputsFromDraft(next.aspect_orbs, ASPECT_ORB_KEYS));
    setOrbFieldErrors({});
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    onSavePreferences(next);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-settings-title"
        className="flex max-h-[min(88vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid shrink-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-x-1 border-b border-stone-200/90 bg-[var(--surface)] px-3 py-2.5 sm:px-4">
          <div aria-hidden="true" />
          <div className="min-w-0 px-1 text-center">
            <h2
              id="chart-settings-title"
              className="text-lg font-semibold tracking-tight text-stone-900 sm:text-xl"
            >
              {t("settings.title")}
            </h2>
            {saving ? (
              <p className="mt-0.5 text-center text-xs text-stone-500">{t("settings.saving")}</p>
            ) : null}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xl font-light leading-none text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              onClick={onClose}
              aria-label={t("settings.close")}
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-stone-600">
            {t("settings.visiblePoints")}
          </p>
          <div className="mt-2.5 space-y-3.5">
            {POINT_GROUPS.map((g) => {
              const isAngles = g.title === "Angles";
              const isNodes = g.title === "Nodes";
              const ids = isAngles
                ? ANGLE_GRID_ORDER.filter((id) => availableIds.has(id))
                : g.ids.filter((id) => availableIds.has(id));
              if (ids.length === 0) return null;
              const gridClass =
                isAngles || isNodes || g.title === "Planets"
                  ? "grid grid-cols-2 gap-1.5"
                  : "grid grid-cols-2 gap-1.5 sm:grid-cols-3";
              const groupKey = `settings.group.${g.title}`;
              const groupLabel = t(groupKey) !== groupKey ? t(groupKey) : g.title;
              return (
                <div key={g.title}>
                  <p className="mb-1.5 text-sm font-semibold text-stone-700">{groupLabel}</p>
                  <div className={gridClass}>
                    {ids.map((id) => {
                      const on = included.has(id);
                      const disableOff = on && count <= 1;
                      const bk = `body.${id}`;
                      const plainLabel = t(bk) !== bk ? t(bk) : (POINT_LABEL[id] ?? id);
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={disableOff}
                          onClick={() => toggle(id)}
                          title={disableOff ? t("settings.keepOnePoint") : plainLabel}
                          className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                            on
                              ? "border-sky-600 bg-sky-50/70 shadow-sm shadow-sky-900/10"
                              : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/80"
                          } ${disableOff ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <PointGlyphCell id={id} />
                          <span className="min-w-0 flex-1">
                            <PointLabelText id={id} tFn={t} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 border-t border-stone-100 pt-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-stone-600">
            {t("settings.aspectOrbs")}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {t("settings.orbHelp")}
          </p>
          <ul className="mt-3 space-y-3">
            {ASPECT_ORB_KEYS.map((key) => {
              const meta = ASPECT_ORB_META[key];
              const err = orbFieldErrors[key];
              const orbKey = `orb.${key}`;
              const orbLabel = t(orbKey) !== orbKey ? t(orbKey) : meta.label;
              return (
                <li
                  key={key}
                  className="flex flex-row items-center justify-between gap-3"
                >
                  <span className="min-w-0 flex-1 text-sm text-stone-800">
                    {orbLabel}{" "}
                    <span className="text-stone-400">({meta.short})</span>
                  </span>
                  <div className="flex w-24 shrink-0 flex-col items-stretch sm:w-28">
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={saving}
                      aria-invalid={Boolean(err)}
                      aria-describedby={err ? `orb-err-${key}` : undefined}
                      value={orbText[key] ?? ""}
                      onChange={(e) => {
                        setOrbText((t) => ({ ...t, [key]: e.target.value }));
                        if (orbFieldErrors[key]) {
                          setOrbFieldErrors((o) => {
                            const n = { ...o };
                            delete n[key];
                            return n;
                          });
                        }
                      }}
                      onBlur={() => commitOrbFromText(key, orbText[key] ?? "")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className={`rounded-md border px-2 py-1.5 text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                        err
                          ? "border-red-400 bg-red-50/50 text-red-950"
                          : "border-stone-200 bg-white text-stone-900"
                      }`}
                    />
                    {err ? (
                      <span id={`orb-err-${key}`} className="mt-0.5 text-xs text-red-600">
                        {err}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

        <div className="mt-5 border-t border-stone-100 pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={resetDefaults}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            {t("settings.resetDefaults")}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
