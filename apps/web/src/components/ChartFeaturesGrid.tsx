"use client";

import { createPortal } from "react-dom";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { NatalAspect } from "@/components/NatalWheel";
import { ZodiacGlyph } from "@/components/ZodiacGlyph";
import { zodiacSlot } from "@/lib/chartSign";
import { HOUSE_BLURBS, parseHouseNumber } from "@/lib/houseBlurbs";
import { useI18n } from "@/lib/i18n";

type Features = {
  stelliums: string[];
  aspects: string[];
  house_emphasis: string[];
  dominant_planets: string[];
};

const RING_ACCENT = {
  stellium: "from-amber-400/25 via-fuchsia-400/15 to-sky-400/20",
  houses: "from-violet-400/20 via-teal-400/15 to-amber-400/20",
  dominant: "from-orange-400/20 via-rose-400/15 to-indigo-400/20",
  aspects: "from-sky-400/20 via-lime-400/15 to-fuchsia-400/15",
} as const;

const ASPECT_HELP: Record<string, { title: string; text: string }> = {
  conjunction: {
    title: "Conjunction",
    text: "0° — merged themes, emphasis, and shared focus between the two bodies.",
  },
  opposition: {
    title: "Opposition",
    text: "180° — polarity and awareness through contrast; tension that clarifies balance.",
  },
  trine: {
    title: "Trine",
    text: "120° — harmonious flow, natural support, and ease between the two points.",
  },
  square: {
    title: "Square",
    text: "90° — friction and growth through challenge; energy that asks for adjustment.",
  },
  sextile: {
    title: "Sextile",
    text: "60° — opportunity and light cooperation; openings when you lean in.",
  },
};

const PLANET: Record<string, { glyph: string; color: string }> = {
  Sun: { glyph: "☉", color: "text-amber-600" },
  Moon: { glyph: "☽", color: "text-slate-500" },
  Mercury: { glyph: "☿", color: "text-amber-700" },
  Venus: { glyph: "♀", color: "text-rose-600" },
  Mars: { glyph: "♂", color: "text-red-600" },
  Jupiter: { glyph: "♃", color: "text-indigo-600" },
  Saturn: { glyph: "♄", color: "text-amber-900/80" },
  Uranus: { glyph: "♅", color: "text-cyan-600" },
  Neptune: { glyph: "♆", color: "text-blue-700" },
  Pluto: { glyph: "♇", color: "text-violet-800" },
  Chiron: { glyph: "⚷", color: "text-emerald-700" },
  Mean_Lilith: { glyph: "⚸", color: "text-fuchsia-700" },
  True_North_Lunar_Node: { glyph: "☊", color: "text-orange-700" },
  True_South_Lunar_Node: { glyph: "☋", color: "text-stone-500" },
  Ascendant: { glyph: "Asc", color: "text-violet-700" },
  Descendant: { glyph: "Dsc", color: "text-violet-600" },
  Medium_Coeli: { glyph: "MC", color: "text-stone-700" },
  Imum_Coeli: { glyph: "IC", color: "text-stone-600" },
};

/** Format decimal degrees as d° mm′ (astrological minute). */
function formatDegMin(decimalDeg: number): string {
  const neg = decimalDeg < 0;
  let x = Math.abs(decimalDeg);
  let d = Math.floor(x);
  let m = Math.round((x - d) * 60);
  if (m === 60) {
    d += 1;
    m = 0;
  }
  const core = `${d}°${String(m).padStart(2, "0")}′`;
  return neg ? `−${core}` : core;
}

function planetDiscButton(
  name: string,
  onClick: (e: MouseEvent<HTMLButtonElement>) => void,
  opts?: { selected?: boolean; label?: string },
) {
  const p = PLANET[name];
  const selected = opts?.selected ?? false;
  const srLabel = opts?.label ?? name;
  const base = "inline-flex h-8 items-center justify-center rounded-full shadow-sm transition-all active:scale-90";
  const ring = selected
    ? "ring-2 ring-teal-400 ring-offset-1 bg-white"
    : "ring-1 ring-stone-200/80 bg-white/80 hover:bg-white hover:ring-stone-300 hover:shadow-md hover:scale-110";
  if (p) {
    return (
      <button
        type="button"
        data-detail-trigger
        aria-pressed={selected}
        onClick={onClick}
        className={`${base} w-8 text-lg leading-none ${ring} ${p.color}`}
      >
        <span className="sr-only">{srLabel}</span>
        <span aria-hidden>{p.glyph}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      data-detail-trigger
      aria-pressed={selected}
      onClick={onClick}
      className={`${base} min-w-8 px-1.5 text-[10px] font-semibold uppercase tracking-tighter text-stone-700 ${ring}`}
    >
      {name.slice(0, 3)}
    </button>
  );
}

function planetGlyphButton(
  name: string,
  onClick: (e: MouseEvent<HTMLButtonElement>) => void,
  opts?: { selected?: boolean; label?: string },
) {
  const p = PLANET[name];
  const selected = opts?.selected ?? false;
  const srLabel = opts?.label ?? name;
  const base = "inline-flex h-8 items-center justify-center rounded-full shadow-sm transition-all active:scale-90";
  const ring = selected
    ? "ring-2 ring-violet-400 ring-offset-1 bg-white"
    : "ring-1 ring-stone-200/80 bg-white/80 hover:bg-white hover:ring-stone-300 hover:shadow-md hover:scale-110";
  if (p) {
    return (
      <button
        type="button"
        data-detail-trigger
        aria-pressed={selected}
        onClick={onClick}
        className={`${base} w-8 text-lg leading-none ${ring} ${p.color}`}
      >
        <span className="sr-only">{srLabel}</span>
        <span aria-hidden>{p.glyph}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      data-detail-trigger
      aria-pressed={selected}
      onClick={onClick}
      className={`${base} min-w-8 px-1.5 text-[10px] font-semibold uppercase tracking-tighter text-stone-700 ${ring}`}
    >
      {name.slice(0, 3)}
    </button>
  );
}

function aspectGlyph(kind: string): string {
  switch (kind.toLowerCase()) {
    case "conjunction":
      return "☌";
    case "opposition":
      return "☍";
    case "trine":
      return "△";
    case "square":
      return "□";
    case "sextile":
      return "⚹";
    default:
      return kind;
  }
}

function aspectTone(kind: string): string {
  const k = kind.toLowerCase();
  if (k === "opposition" || k === "square") return "text-red-600/90 bg-red-500/10 ring-red-300/40";
  if (k === "trine" || k === "sextile") return "text-teal-700 bg-teal-500/10 ring-teal-300/40";
  return "text-amber-800 bg-amber-500/10 ring-amber-300/40";
}

function parseAspectLine(line: string): { a: string; kind: string; b: string } | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const kind = parts[1]!;
  const a = parts[0]!;
  const b = parts.slice(2).join(" ");
  return { a, kind, b };
}

function findMatchingAspect(chartAspects: NatalAspect[], line: string): NatalAspect | null {
  const p = parseAspectLine(line);
  if (!p) return null;
  const k = p.kind.toLowerCase();
  return (
    chartAspects.find(
      (a) =>
        String(a.aspect).toLowerCase() === k &&
        ((a.p1 === p.a && a.p2 === p.b) || (a.p1 === p.b && a.p2 === p.a)),
    ) ?? null
  );
}

function parseStellium(line: string): { signRaw: string; count: string; planets: string } | null {
  const m = /^(.+?)\s+stellium\s+\((\d+)\s+planets?:\s*(.+)\)/i.exec(line);
  if (!m) return null;
  return { signRaw: m[1]!.trim(), count: m[2]!, planets: m[3]!.trim() };
}

const cardShell =
  "relative overflow-hidden rounded-2xl border border-stone-200/80 bg-[var(--surface)] p-3 shadow-sm shadow-stone-100/60";

/** Tighter padding + no min-height; for Stelliums / House emphasis until “Show more” expands. */
const cardShellCompact =
  "relative overflow-hidden rounded-2xl border border-stone-200/80 bg-[var(--surface)] px-2.5 py-2 shadow-sm shadow-stone-100/60";

function AccentWash({ variant }: { variant: keyof typeof RING_ACCENT }) {
  return (
    <div
      className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${RING_ACCENT[variant]} blur-2xl`}
      aria-hidden
    />
  );
}

const popoverBase =
  "max-w-[min(calc(100vw-1.5rem),16rem)] rounded-xl border border-stone-200/90 bg-[var(--surface)] p-2.5 text-left shadow-lg shadow-stone-200/50";

const labelPopoverClass =
  "fixed z-[80] whitespace-nowrap rounded-lg border border-stone-200/90 bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-stone-900 shadow-md";

type PopPos = { left: number; top: number };

function clampPopoverX(left: number, widthGuess = 260) {
  const pad = 8;
  return Math.max(pad, Math.min(left, window.innerWidth - widthGuess - pad));
}

/** Compute {left, top} for a popover centered directly below a rect. */
function posBelow(rect: DOMRect, widthGuess = 260): PopPos {
  return {
    left: clampPopoverX(rect.left + rect.width / 2 - widthGuess / 2, widthGuess),
    top: rect.bottom + 6,
  };
}

function AspectCell({
  line,
  orb,
  activePlanet,
  activeMiddle,
  onAspectMiddleClick,
  onEndPlanetClick,
  tFn,
}: {
  line: string;
  orb?: number;
  activePlanet?: string | null;
  activeMiddle?: boolean;
  onAspectMiddleClick: (line: string, rect: DOMRect) => void;
  onEndPlanetClick: (name: string, rect: DOMRect) => void;
  tFn: (key: string, params?: Record<string, string | number>) => string;
}) {
  const p = parseAspectLine(line);
  if (!p) {
    return (
      <div className="min-w-0 rounded-lg bg-stone-50/80 px-1.5 py-2 text-center text-[10px] leading-snug text-stone-700">
        {line}
      </div>
    );
  }
  const bodyLabel = (name: string) => {
    const k = `body.${name}`;
    return tFn(k) !== k ? tFn(k) : name;
  };
  const hasOrb = orb != null && Number.isFinite(orb);
  const midRingExtra = activeMiddle ? "ring-2 ring-offset-1 scale-105 shadow-md" : "";
  const aspectKey = `aspect.${p.kind.toLowerCase()}.title`;
  const aspectLabel = tFn(aspectKey) !== aspectKey ? tFn(aspectKey) : p.kind;
  return (
    <div className="flex min-w-0 items-center justify-center gap-0.5">
      {planetDiscButton(p.a, (e) => onEndPlanetClick(p.a, e.currentTarget.getBoundingClientRect()), { selected: activePlanet === p.a, label: bodyLabel(p.a) })}
      <button
        type="button"
        data-detail-trigger
        aria-pressed={activeMiddle}
        onClick={(e) => onAspectMiddleClick(line, e.currentTarget.getBoundingClientRect())}
        className={`inline-flex shrink-0 flex-col items-center justify-center rounded-md px-1.5 py-1 font-semibold ring-1 transition-all hover:scale-110 hover:shadow-md active:scale-90 ${aspectTone(p.kind)} ${midRingExtra}`}
        aria-label={aspectLabel}
      >
        <span className="text-sm leading-none">{aspectGlyph(p.kind)}</span>
        {hasOrb && activeMiddle ? (
          <span className="mt-0.5 text-[8px] font-normal tabular-nums leading-none opacity-90">
            {formatDegMin(Math.abs(orb!))}
          </span>
        ) : null}
      </button>
      {planetDiscButton(p.b, (e) => onEndPlanetClick(p.b, e.currentTarget.getBoundingClientRect()), { selected: activePlanet === p.b, label: bodyLabel(p.b) })}
    </div>
  );
}

export function ChartFeaturesGrid({
  features: f,
  chartAspects = [],
}: {
  features: Features;
  chartAspects?: NatalAspect[];
}) {
  const { t } = useI18n();
  const [morePlanets, setMorePlanets] = useState(false);
  const [moreAspects, setMoreAspects] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [nameTip, setNameTip] = useState<(PopPos & { text: string }) | null>(null);
  const [dominantTap, setDominantTap] = useState<string | null>(null);
  const [aspectEndTap, setAspectEndTap] = useState<string | null>(null);
  const [aspectTip, setAspectTip] = useState<
    (PopPos & {
      line: string;
      kind: string;
      orbit?: number;
      aspectDegrees?: number;
    }) | null
  >(null);
  const [houseTip, setHouseTip] = useState<{ n: number } & PopPos | null>(null);
  const [stelliumTip, setStelliumTip] = useState<(PopPos & { line: string }) | null>(null);
  const [moreHouses, setMoreHouses] = useState(false);
  const [moreStelliums, setMoreStelliums] = useState(false);

  const closeAllDetails = useCallback(() => {
    setNameTip(null);
    setDominantTap(null);
    setAspectEndTap(null);
    setAspectTip(null);
    setHouseTip(null);
    setStelliumTip(null);
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("[data-detail-panel]") || t.closest("[data-detail-trigger]")) return;
      closeAllDetails();
    };
    const onScroll = () => closeAllDetails();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAllDetails();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("touchmove", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("touchmove", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [closeAllDetails]);

  const houseSlots = useMemo(() => {
    return f.house_emphasis
      .map(parseHouseNumber)
      .filter((n): n is number => n != null && n >= 1 && n <= 12);
  }, [f.house_emphasis]);

  const openNameBelow = useCallback((text: string, rect: DOMRect) => {
    const { left, top } = posBelow(rect, 80);
    setAspectTip(null);
    setAspectEndTap(null);
    setHouseTip(null);
    setStelliumTip(null);
    setDominantTap(null);
    setNameTip((prev) => (prev?.text === text && dominantTap == null ? null : { text, left, top }));
  }, [dominantTap]);

  const openAspectEndPlanetBelow = useCallback((text: string, rect: DOMRect) => {
    const { left, top } = posBelow(rect, 80);
    setAspectTip(null);
    setHouseTip(null);
    setStelliumTip(null);
    setDominantTap(null);
    setAspectEndTap((prev) => (prev === text ? null : text));
    setNameTip((prev) => (prev?.text === text && aspectEndTap === text ? null : { text, left, top }));
  }, [aspectEndTap]);

  const onAspectMiddleClick = useCallback(
    (line: string, rect: DOMRect) => {
      const p = parseAspectLine(line);
      if (!p) return;
      const k = p.kind.toLowerCase();
      const row = findMatchingAspect(chartAspects, line);
      const { left, top } = posBelow(rect, 220);
      setNameTip(null);
      setHouseTip(null);
      setStelliumTip(null);
      setAspectEndTap(null);
      setAspectTip((prev) =>
        prev?.line === line
          ? null
          : {
              line,
              kind: k,
              left,
              top,
              orbit: row?.orbit,
              aspectDegrees: row?.aspect_degrees,
            },
      );
    },
    [chartAspects],
  );

  const { aspectOrbMap, sortedAspects } = useMemo(() => {
    const m = new Map<string, number>();
    for (const line of f.aspects) {
      const row = findMatchingAspect(chartAspects, line);
      if (row != null && Number.isFinite(row.orbit)) m.set(line, row.orbit);
    }
    const sorted = [...f.aspects].sort((a, b) => {
      const oa = Math.abs(m.get(a) ?? Infinity);
      const ob = Math.abs(m.get(b) ?? Infinity);
      return oa - ob;
    });
    return { aspectOrbMap: m, sortedAspects: sorted };
  }, [f.aspects, chartAspects]);

  const onAspectEndPlanetClick = useCallback(
    (name: string, rect: DOMRect) => {
      openAspectEndPlanetBelow(name, rect);
    },
    [openAspectEndPlanetBelow],
  );

  const stelliumTipParsed = stelliumTip ? parseStellium(stelliumTip.line) : null;
  const hasFloat = Boolean(aspectTip || houseTip || stelliumTip || nameTip);
  const floating =
    mounted &&
    hasFloat &&
    createPortal(
      <>
        {nameTip ? (
          <div
            data-detail-panel
            role="tooltip"
            className={labelPopoverClass}
            style={{ left: nameTip.left, top: nameTip.top }}
          >
            {(() => {
              const k = `body.${nameTip.text}`;
              return t(k) !== k ? t(k) : nameTip.text;
            })()}
          </div>
        ) : null}
        {aspectTip ? (
          <div
            data-detail-panel
            role="tooltip"
            className={`${popoverBase} fixed z-[80]`}
            style={{ left: aspectTip.left, top: aspectTip.top }}
          >
            {(() => {
              const titleKey = `aspect.${aspectTip.kind}.title`;
              const textKey = `aspect.${aspectTip.kind}.text`;
              const helpTitle = t(titleKey) !== titleKey ? t(titleKey) : (ASPECT_HELP[aspectTip.kind]?.title ?? aspectTip.kind);
              const helpText = t(textKey) !== textKey ? t(textKey) : (ASPECT_HELP[aspectTip.kind]?.text ?? t("features.majorAspectGeneric"));
              return (
                <>
                  <p className="text-[11px] font-semibold text-stone-900">{helpTitle}</p>
                  <p className="mt-1 text-[10px] leading-snug text-stone-600">{helpText}</p>
                </>
              );
            })()}
          </div>
        ) : null}
        {houseTip ? (
          <div
            data-detail-panel
            role="tooltip"
            className={`${popoverBase} fixed z-[80]`}
            style={{ left: houseTip.left, top: houseTip.top }}
          >
            {(() => {
              const houseTitle = t(`house.${houseTip.n}.title`);
              const houseText = t(`house.${houseTip.n}.text`);
              return (
                <>
                  <p className="text-[11px] font-semibold text-violet-950">{houseTitle}</p>
                  <p className="mt-1 text-[10px] leading-snug text-stone-600">{houseText}</p>
                </>
              );
            })()}
          </div>
        ) : null}
        {stelliumTip ? (
          <div
            data-detail-panel
            role="tooltip"
            className={`${popoverBase} fixed z-[80] w-40`}
            style={{ left: stelliumTip.left, top: stelliumTip.top }}
          >
            {stelliumTipParsed ? (
              <>
                <p className="text-[11px] font-semibold text-stone-900">
                  {t("stellium.label", { sign: (() => {
                    const idx = zodiacSlot(stelliumTipParsed.signRaw);
                    const zk = `zodiac.${idx}`;
                    return idx >= 0 && t(zk) !== zk ? t(zk) : stelliumTipParsed.signRaw;
                  })() })}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-stone-600">
                  {stelliumTipParsed.planets.split(",").map((s) => {
                    const name = s.trim();
                    const k = `body.${name}`;
                    return t(k) !== k ? t(k) : name;
                  }).join(" · ")}
                </p>
              </>
            ) : (
              <p className="text-[10px] leading-snug text-stone-700">{stelliumTip.line}</p>
            )}
          </div>
        ) : null}
      </>,
      document.body,
    );

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      {floating}

      {/* Stelliums */}
      <div className={`${cardShellCompact} relative`}>
        <AccentWash variant="stellium" />
        <h3 className="text-sm font-semibold leading-tight tracking-tight text-stone-900">{t("features.stelliums")}</h3>
        {f.stelliums.length > 0 ? (
          <>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              {(moreStelliums ? f.stelliums : f.stelliums.slice(0, 3)).map((line, idx) => {
                const sp = parseStellium(line);
                return (
                  <button
                    key={`stellium-${idx}`}
                    type="button"
                    data-detail-trigger
                    aria-pressed={stelliumTip?.line === line}
                    className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-0.5 transition-all hover:scale-110 hover:bg-amber-50/90 hover:shadow-md active:scale-95 ${stelliumTip?.line === line ? "ring-2 ring-amber-400 ring-offset-1 bg-amber-50/80" : ""}`}
                    onClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      const pos = { ...posBelow(r, 160), line };
                      setAspectTip(null);
                      setAspectEndTap(null);
                      setHouseTip(null);
                      setNameTip(null);
                      setStelliumTip((prev) => (prev?.line === line ? null : pos));
                    }}
                  >
                    {sp ? (
                      <>
                        <ZodiacGlyph sign={sp.signRaw} className="text-amber-800" />
                        {zodiacSlot(sp.signRaw) < 0 ? (
                          <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium text-stone-700">
                            {sp.signRaw}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="max-w-[5rem] text-center text-[10px] text-stone-600">{line}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {f.stelliums.length > 3 ? (
              <button
                type="button"
                onClick={() => setMoreStelliums((v) => !v)}
                className="mt-1.5 w-full text-center text-[10px] font-medium text-amber-800/90 hover:text-amber-950"
              >
                {moreStelliums ? t("features.showLess") : t("features.showMore", { count: f.stelliums.length - 3 })}
              </button>
            ) : null}
          </>
        ) : (
          <p className="mt-1 text-center text-[11px] leading-snug text-stone-500">
            {t("features.noStellium")}
          </p>
        )}
      </div>

      {/* House emphasis */}
      <div className={cardShellCompact}>
        <AccentWash variant="houses" />
        <div className="relative">
          <h3 className="text-sm font-semibold leading-tight tracking-tight text-stone-900">{t("features.houseEmphasis")}</h3>
          {houseSlots.length > 0 ? (
            <>
              <div
                className={`mt-2 grid gap-2.5 ${houseSlots.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
              >
                {houseSlots.slice(0, 2).map((n) => {
                  if (!HOUSE_BLURBS[n]) return null;
                  const isActive = houseTip?.n === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      data-detail-trigger
                      className={`flex w-full flex-col items-center justify-center rounded-xl border px-2 py-2 text-center shadow-sm transition-all active:scale-[0.97] ${isActive ? "scale-[1.02] ring-2 ring-violet-400 ring-offset-1 border-violet-400/80 bg-gradient-to-br from-violet-50 to-violet-100/60 shadow-violet-200/40" : "border-violet-200/60 bg-gradient-to-br from-white/90 to-violet-50/50 shadow-violet-100/30 hover:scale-[1.03] hover:border-violet-300/80 hover:from-violet-50/80 hover:to-violet-100/40 hover:shadow-md"}`}
                      onClick={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        const { left, top } = posBelow(r, 220);
                        setAspectTip(null);
                        setAspectEndTap(null);
                        setStelliumTip(null);
                        setNameTip(null);
                        setHouseTip((prev) => (prev?.n === n ? null : { n, left, top }));
                      }}
                    >
                      <p className="text-[11px] font-semibold text-violet-950">{t(`house.${n}.title`)}</p>
                    </button>
                  );
                })}
              </div>
              {houseSlots.length > 2 ? (
                <>
                  {moreHouses ? (
                    <div
                      className={`mt-1.5 grid max-h-40 gap-2.5 overflow-y-auto pr-0.5 ${houseSlots.length - 2 === 1 ? "grid-cols-1" : "grid-cols-2"}`}
                    >
                      {houseSlots.slice(2).map((n) => {
                        if (!HOUSE_BLURBS[n]) return null;
                        const isActive = houseTip?.n === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            data-detail-trigger
                            className={`flex w-full flex-col items-center justify-center rounded-xl border px-2 py-2 text-center shadow-sm transition-all active:scale-[0.97] ${isActive ? "scale-[1.02] ring-2 ring-violet-400 ring-offset-1 border-violet-400/80 bg-gradient-to-br from-violet-50 to-violet-100/60 shadow-violet-200/40" : "border-violet-200/60 bg-gradient-to-br from-white/90 to-violet-50/50 shadow-violet-100/30 hover:scale-[1.03] hover:border-violet-300/80 hover:from-violet-50/80 hover:to-violet-100/40 hover:shadow-md"}`}
                            onClick={(e) => {
                              const r = e.currentTarget.getBoundingClientRect();
                              const { left, top } = posBelow(r, 220);
                              setAspectTip(null);
                              setAspectEndTap(null);
                              setStelliumTip(null);
                              setNameTip(null);
                              setHouseTip((prev) => (prev?.n === n ? null : { n, left, top }));
                            }}
                          >
                            <p className="text-[11px] font-semibold text-violet-950">{t(`house.${n}.title`)}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setMoreHouses((v) => !v)}
                    className="mt-1.5 w-full text-center text-[10px] font-medium text-violet-700 hover:text-violet-900"
                  >
                    {moreHouses ? t("features.showLess") : t("features.showMore", { count: houseSlots.length - 2 })}
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-center text-[11px] text-stone-500">—</p>
          )}
        </div>
      </div>

      {/* Dominant planets */}
      <div className={cardShell}>
        <AccentWash variant="dominant" />
        <div className="relative">
          <h3 className="text-sm font-semibold tracking-tight text-stone-900">{t("features.dominantPlanets")}</h3>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {(morePlanets ? f.dominant_planets : f.dominant_planets.slice(0, 3)).map((name) => {
              const bodyKey = `body.${name}`;
              const bodyLabel = t(bodyKey) !== bodyKey ? t(bodyKey) : name;
              return (
              <div key={name}>
                {planetGlyphButton(
                  name,
                  (e) => {
                    if (dominantTap === name) {
                      setDominantTap(null);
                      setNameTip(null);
                      return;
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    const { left, top } = posBelow(rect, 80);
                    setAspectTip(null);
                    setHouseTip(null);
                    setStelliumTip(null);
                    setDominantTap(name);
                    setNameTip({ text: name, left, top });
                  },
                  { selected: dominantTap === name, label: bodyLabel },
                )}
              </div>
            );
            })}
          </div>
          {f.dominant_planets.length > 3 ? (
            <button
              type="button"
              onClick={() => setMorePlanets((v) => !v)}
              className="mt-2 text-[10px] font-medium text-violet-700 hover:text-violet-900"
            >
              {morePlanets ? t("features.showLess") : t("features.showMore", { count: f.dominant_planets.length - 3 })}
            </button>
          ) : null}
        </div>
      </div>

      {/* Major aspects */}
      <div className={cardShell}>
        <AccentWash variant="aspects" />
        <div className="relative">
          <h3 className="text-sm font-semibold tracking-tight text-stone-900">{t("features.majorAspects")}</h3>
          {sortedAspects.length > 0 ? (
            <>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {sortedAspects.slice(0, 2).map((line, i) => (
                  <AspectCell
                    key={`aspect-top-${i}`}
                    line={line}
                    orb={aspectOrbMap.get(line)}
                    activePlanet={aspectEndTap}
                    activeMiddle={aspectTip?.line === line}
                    onAspectMiddleClick={onAspectMiddleClick}
                    onEndPlanetClick={onAspectEndPlanetClick}
                    tFn={t}
                  />
                ))}
              </div>
              {sortedAspects.length > 2 ? (
                <>
                  {moreAspects ? (
                    <div className="mt-2 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto border-t border-stone-100/90 pt-2 pr-0.5">
                      {sortedAspects.slice(2).map((line, i) => (
                        <AspectCell
                          key={`aspect-more-${i}`}
                          line={line}
                          orb={aspectOrbMap.get(line)}
                          activePlanet={aspectEndTap}
                          activeMiddle={aspectTip?.line === line}
                          onAspectMiddleClick={onAspectMiddleClick}
                          onEndPlanetClick={onAspectEndPlanetClick}
                          tFn={t}
                        />
                      ))}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setMoreAspects((v) => !v)}
                    className="mt-2 text-[10px] font-medium text-teal-800 hover:text-teal-950"
                  >
                    {moreAspects ? t("features.showLess") : t("features.showMore", { count: sortedAspects.length - 2 })}
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-[11px] text-stone-500">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
