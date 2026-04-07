"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatDmsWithinSign,
  lonToRadial,
  lonToXY,
  normalizeDeg,
  polarToXY,
} from "@/components/natalWheelMath";
import { ZodiacGlyph } from "@/components/ZodiacGlyph";
import { ANGLE_ABBR, POINT_GLYPH } from "@/lib/chartPreferences";
import { useI18n } from "@/lib/i18n";

function chartPointGlyph(name: string, color: string): ReactNode {
  const g = POINT_GLYPH[name];
  if (g) {
    return (
      <span style={{ color }} className="select-none pl-1 text-xl leading-none" aria-hidden>
        {g}
      </span>
    );
  }
  const a = ANGLE_ABBR[name as keyof typeof ANGLE_ABBR];
  if (a) {
    return (
      <span style={{ color }} className="select-none pl-1 text-base font-semibold leading-none" aria-hidden>
        {a}
      </span>
    );
  }
  return null;
}

export type NatalBody = {
  name: string;
  sign: string;
  position: number;
  abs_pos: number;
  house: string | null;
  house_raw?: string;
  retrograde?: boolean;
};

export type NatalHouse = {
  number: number;
  label: string;
  sign: string;
  cusp_longitude: number;
  abs_pos: number;
};

export type NatalAspect = {
  p1: string;
  p2: string;
  aspect: string;
  orbit: number;
  aspect_degrees: number;
};

type Selection =
  | { kind: "body"; name: string }
  | { kind: "house"; number: number }
  | { kind: "sign"; index: number }
  | null;

const ZODIAC_3: string[] = [
  "ARI",
  "TAU",
  "GEM",
  "CAN",
  "LEO",
  "VIR",
  "LIB",
  "SCO",
  "SAG",
  "CAP",
  "AQU",
  "PIS",
];

const SIGN_TO_RULER: Record<string, string | null> = {
  Ari: "Mars",
  Tau: "Venus",
  Gem: "Mercury",
  Can: "Moon",
  Leo: "Sun",
  Vir: "Mercury",
  Lib: "Venus",
  Sco: "Mars",
  Sag: "Jupiter",
  Cap: "Saturn",
  Aqu: "Saturn",
  Pis: "Jupiter",
};


/** Parchment-manuscript zodiac sign colors – rich pigment inks on aged vellum.
 *  fire=vermillion/orange-gold, earth=olive/ochre, air=yellow/teal, water=blue/deep-red */
const ZODIAC_SIGN_COLORS: string[] = [
  "#b83828", // Aries       – fire: vermillion red
  "#7a7830", // Taurus      – earth: olive ochre
  "#a08020", // Gemini      – air: saffron yellow
  "#5878a0", // Cancer      – water: steel blue (lunar silver-blue)
  "#c07818", // Leo         – fire: orange gold
  "#5a7028", // Virgo       – earth: sage olive
  "#b05878", // Libra       – air: rose pink (Venus rose)
  "#781828", // Scorpio     – water: deep crimson (Mars dark red)
  "#4848a0", // Sagittarius – fire: indigo violet (Jupiter purple-blue)
  "#707828", // Capricorn   – earth: dark ochre
  "#2868b0", // Aquarius    – air: cerulean blue (Uranus blue)
  "#4058a0", // Pisces      – water: lapis blue
];

const MAJOR_ASPECTS = new Set(["conjunction", "opposition", "trine", "square", "sextile"]);

function aspectColor(aspect: string): string {
  if (aspect === "opposition" || aspect === "square") return "rgba(170,48,38,0.52)";
  if (aspect === "trine" || aspect === "sextile") return "rgba(28,120,100,0.48)";
  return "rgba(60,70,150,0.44)";
}

function aspectWithinOrb(
  orbit: number,
  aspect: string,
  orbs: Readonly<Record<string, number>>,
): boolean {
  const max = orbs[aspect] ?? 6;
  return orbit <= max;
}

/** Thinner at max orb, thicker as the aspect approaches exact (orbit → 0). */
function aspectLineStrokeWidth(
  orbit: number,
  aspect: string,
  orbs: Readonly<Record<string, number>>,
): number {
  const maxOrb = orbs[aspect] ?? 6;
  const wMin = 0.6;
  const wMax = 3.6;
  if (maxOrb <= 0) return orbit <= 0 ? wMax : wMin;
  const tight = Math.max(0, Math.min(1, 1 - orbit / maxOrb));
  return wMin + tight * (wMax - wMin);
}

function aspectSymbol(aspect: string): string {
  switch (aspect) {
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
      return aspect;
  }
}

function parseHouseIndex(house: string | null | undefined): number | null {
  if (!house) return null;
  const m = /^(\d+)/.exec(house);
  return m ? Number(m[1]) : null;
}

function signTo3(apiSign: string): string {
  const u = apiSign.slice(0, 3).toUpperCase();
  const i = ZODIAC_3.indexOf(u);
  return i >= 0 ? ZODIAC_3[i] : u;
}

function houseWedgePath(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  lonStart: number,
  lonEnd: number,
  seventh: number,
  steps: number,
): string {
  let delta = normalizeDeg(lonEnd - lonStart);
  if (delta > 180) delta -= 360;
  const innerStart = lonToXY(lonStart, seventh, cx, cy, rIn);
  const outerStart = lonToXY(lonStart, seventh, cx, cy, rOut);
  const parts: string[] = [`M ${cx} ${cy} L ${innerStart.x} ${innerStart.y}`];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const lon = lonStart + t * delta;
    const p = lonToXY(lon, seventh, cx, cy, rOut);
    parts.push(`L ${p.x} ${p.y}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

/** Annular slice between rIn and rOut for zodiac band hit targets. */
function zodiacBandWedgePath(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  lonStart: number,
  lonEnd: number,
  seventh: number,
  steps: number,
): string {
  let delta = normalizeDeg(lonEnd - lonStart);
  if (delta > 180) delta -= 360;
  const o0 = lonToXY(lonStart, seventh, cx, cy, rOut);
  const parts: string[] = [`M ${o0.x} ${o0.y}`];
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const lon = lonStart + t * delta;
    const p = lonToXY(lon, seventh, cx, cy, rOut);
    parts.push(`L ${p.x} ${p.y}`);
  }
  const i1 = lonToXY(lonEnd, seventh, cx, cy, rIn);
  parts.push(`L ${i1.x} ${i1.y}`);
  for (let s = steps - 1; s >= 0; s--) {
    const t = s / steps;
    const lon = lonStart + t * delta;
    const p = lonToXY(lon, seventh, cx, cy, rIn);
    parts.push(`L ${p.x} ${p.y}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

function wheelAccentColor(index: number): string {
  return ZODIAC_SIGN_COLORS[((index % 12) + 12) % 12] ?? "#5a4830";
}

export function NatalWheel({
  bodies,
  houses,
  aspects,
  includedPoints,
  aspectOrbs,
}: {
  bodies: NatalBody[];
  houses: NatalHouse[];
  aspects: NatalAspect[];
  includedPoints: ReadonlySet<string>;
  aspectOrbs: Readonly<Record<string, number>>;
}) {
  const { t } = useI18n();
  const [sel, setSel] = useState<Selection>(null);

  const close = useCallback(() => setSel(null), []);

  const bodyShort = useCallback((name: string) => t(`body.short.${name}`) !== `body.short.${name}` ? t(`body.short.${name}`) : name.slice(0, 3), [t]);
  const bodyFull = useCallback((name: string) => t(`body.${name}`) !== `body.${name}` ? t(`body.${name}`) : name, [t]);
  const zodiacShort = useCallback((i: number) => t(`zodiac.short.${i}`), [t]);
  const zodiacFull = useCallback((i: number) => t(`zodiac.${i}`), [t]);

  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, close]);

  const { seventh, byName, cuspByHouse, displayBodies } = useMemo(() => {
    const byN = new Map<string, NatalBody>();
    for (const b of bodies) byN.set(b.name, b);
    const desc = byN.get("Descendant");
    const seventh = desc?.abs_pos ?? byN.get("Ascendant")?.abs_pos ?? 0;
    const cuspByHouse = new Map<number, NatalHouse>();
    for (const h of houses) cuspByHouse.set(h.number, h);
    const displayBodies = bodies.filter((b) => includedPoints.has(b.name));
    return { seventh, byName: byN, cuspByHouse, displayBodies };
  }, [bodies, houses, includedPoints]);

  const { planetStacks, planetRadiusByName } = useMemo(() => {
    const arr = [...displayBodies].sort((a, b) => a.abs_pos - b.abs_pos);
    const stacks: NatalBody[][] = [];
    for (const b of arr) {
      let placed = false;
      for (const st of stacks) {
        const ref = st[0];
        const diff = Math.abs(normalizeDeg(b.abs_pos - ref.abs_pos));
        const d = diff > 180 ? 360 - diff : diff;
        if (d < 6) {
          st.push(b);
          placed = true;
          break;
        }
      }
      if (!placed) stacks.push([b]);
    }
    const radiusByName = new Map<string, number>();
    for (const st of stacks) {
      st.forEach((b, j) => {
        radiusByName.set(b.name, R_PLANET_BASE - j * R_PLANET_STACK_STEP);
      });
    }
    return { planetStacks: stacks, planetRadiusByName: radiusByName };
  }, [displayBodies]);

  const aspectLines = useMemo(() => {
    const lines: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      strokeWidth: number;
      key: string;
    }[] = [];
    for (const a of aspects) {
      if (!MAJOR_ASPECTS.has(a.aspect)) continue;
      if (!includedPoints.has(a.p1) || !includedPoints.has(a.p2)) continue;
      if (!aspectWithinOrb(a.orbit, a.aspect, aspectOrbs)) continue;
      const b1 = byName.get(a.p1);
      const b2 = byName.get(a.p2);
      if (!b1 || !b2) continue;
      const r1 = planetRadiusByName.get(b1.name) ?? R_PLANET_BASE;
      const r2 = planetRadiusByName.get(b2.name) ?? R_PLANET_BASE;
      const p1 = lonToXY(b1.abs_pos, seventh, CX, CY, r1);
      const p2 = lonToXY(b2.abs_pos, seventh, CX, CY, r2);
      lines.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        stroke: aspectColor(a.aspect),
        strokeWidth: aspectLineStrokeWidth(a.orbit, a.aspect, aspectOrbs),
        key: `${a.p1}-${a.p2}-${a.aspect}`,
      });
    }
    return lines;
  }, [aspects, byName, seventh, planetRadiusByName, includedPoints, aspectOrbs]);

  const modal = useMemo(() => {
    if (!sel) return null;
    if (sel.kind === "body") {
      const b = byName.get(sel.name);
      if (!b) return null;
      const displayName = bodyFull(b.name);
      const titleColor = colorForBody(b.name);
      const hi = parseHouseIndex(b.house);
      const kwKey = `keyword.${b.name}`;
      const kw = t(kwKey) !== kwKey ? t(kwKey) : "—";
      const aspectsFor = aspects.filter(
        (a) =>
          MAJOR_ASPECTS.has(a.aspect) &&
          aspectWithinOrb(a.orbit, a.aspect, aspectOrbs) &&
          ((a.p1 === b.name && includedPoints.has(a.p2)) ||
            (a.p2 === b.name && includedPoints.has(a.p1))),
      );
      const signIdx = ZODIAC_3.indexOf(signTo3(b.sign));
      const signName =
        signIdx >= 0 ? zodiacFull(signIdx) : b.sign;
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
          role="presentation"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[min(80vh,520px)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-3 text-stone-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="flex flex-wrap items-baseline gap-x-2 text-xl font-semibold leading-tight">
                <span className="inline-flex items-baseline">
                  <span style={{ color: titleColor }}>{displayName}</span>
                  {chartPointGlyph(b.name, titleColor)}
                </span>
                {b.retrograde ? (
                  <span className="text-sm font-medium text-amber-700">[{t("wheel.retrograde")}]</span>
                ) : null}
              </p>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-base text-stone-500 hover:bg-stone-100"
                onClick={close}
              >
                ×
              </button>
            </div>
            <p className="mt-0.5 text-base leading-snug text-stone-600">
              {kw}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-base leading-snug">
              <span className="font-medium text-stone-800">{t("wheel.sign")}:</span>
              <span
                className="font-semibold"
                style={{
                  color: signIdx >= 0 ? ZODIAC_SIGN_COLORS[signIdx] : "#5a4830",
                }}
              >
                {signName}
              </span>
              <span className="text-stone-700"> {formatDmsWithinSign(b.position)}</span>
              <span className="mx-2 text-stone-300" aria-hidden>
                ·
              </span>
              <span className="font-medium text-stone-800">{t("wheel.house")}:</span>{" "}
              {hi != null ? t(`house.${hi}.title`) : "—"}
            </p>
            {aspectsFor.length > 0 ? (
              <div className="mt-2 border-t border-stone-100 pt-1.5">
                <ul className="grid list-none grid-cols-2 gap-x-2 gap-y-1 pl-0 text-base leading-snug text-stone-700">
                  {aspectsFor.map((a) => {
                    const other = a.p1 === b.name ? a.p2 : a.p1;
                    const ol = bodyShort(other);
                    return (
                      <li key={`${a.p1}-${a.p2}-${a.aspect}`} className="min-w-0 leading-snug">
                        <span
                          style={{ color: colorForBody(other) }}
                          className="underline underline-offset-2"
                        >
                          {ol}
                        </span>{" "}
                        {a.aspect_degrees}° {aspectSymbol(a.aspect)} · {formatOrb(a.orbit)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    if (sel.kind === "sign") {
      const idx = sel.index;
      if (idx < 0 || idx > 11) return null;
      const signName = zodiacFull(idx);
      const traitsKey = `zodiac.traits.${idx}`;
      const traitsText = t(traitsKey) !== traitsKey ? t(traitsKey) : "";
      const titleColor = wheelAccentColor(idx);
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
          role="presentation"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[min(80vh,520px)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-3 text-stone-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xl font-semibold leading-tight">
                <span
                  className="inline-flex items-center gap-2"
                  style={{ color: titleColor }}
                >
                  <span>{signName}</span>
                  <ZodiacGlyph sign={ZODIAC_3[idx]} className="shrink-0" />
                </span>
              </p>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-base text-stone-500 hover:bg-stone-100"
                onClick={close}
              >
                ×
              </button>
            </div>
            {traitsText ? (
              <p className="mt-2 text-base leading-snug text-stone-600">
                {traitsText}
              </p>
            ) : null}
          </div>
        </div>
      );
    }
    const h = cuspByHouse.get(sel.number);
    if (!h) return null;
    const houseTitle = t(`house.${sel.number}.title`);
    const houseText = t(`house.${sel.number}.text`);
    const rulerName = SIGN_TO_RULER[h.sign] ?? null;
    const rulerBody = rulerName ? byName.get(rulerName) : null;
    const rulerHouse = rulerBody ? parseHouseIndex(rulerBody.house) : null;
    const rLab = rulerName ? bodyShort(rulerName) : null;
    const houseTitleColor = wheelAccentColor(sel.number - 1);
    const signIdx = ZODIAC_3.indexOf(signTo3(h.sign));
    const cuspSignLabel = signIdx >= 0 ? zodiacShort(signIdx) : signTo3(h.sign);
    const cuspSignColor =
      signIdx >= 0 ? ZODIAC_SIGN_COLORS[signIdx] ?? "#5a4830" : "#5a4830";
    const rulerLabelColor = rulerName ? colorForBody(rulerName) : "#5a4830";
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
        role="presentation"
        onClick={close}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="max-h-[min(80vh,520px)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-3 text-stone-900 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xl font-semibold leading-tight">
              <span style={{ color: houseTitleColor }}>
                {houseTitle}
              </span>
            </p>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-base text-stone-500 hover:bg-stone-100"
              onClick={close}
            >
              ×
            </button>
          </div>
          {houseText !== `house.${sel.number}.text` ? (
            <p className="mt-1.5 text-base leading-snug text-stone-600">{houseText}</p>
          ) : null}
          <p className="mt-2 text-base leading-snug">
            <span className="font-medium text-stone-800">{t("wheel.cusp")}:</span>{" "}
            <span className="font-semibold" style={{ color: cuspSignColor }}>
              {cuspSignLabel}
            </span>{" "}
            {formatDmsWithinSign(h.cusp_longitude)}
          </p>
          {rLab ? (
            <p className="mt-1.5 text-base leading-snug">
              <span className="font-medium text-stone-800">{t("wheel.ruler")}:</span>{" "}
              <span className="font-semibold" style={{ color: rulerLabelColor }}>
                {rLab}
              </span>
              {rulerHouse != null ? (
                <>
                  {" "}
                  {t("wheel.inHouse", { n: t(`house.${rulerHouse}.title`) })}
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    );
  }, [
    sel,
    byName,
    aspects,
    cuspByHouse,
    close,
    includedPoints,
    aspectOrbs,
    t,
    bodyShort,
    bodyFull,
    zodiacShort,
    zodiacFull,
  ]);

  const signPalette = ZODIAC_SIGN_COLORS;
  const colors = {
    zodiacTickMajor: "#a89848",
    zodiacTickMinor: "#c4b068",
    houseDivAngular: "#7a6828",
    houseDivRegular: "#a89850",
    innerCircle: "#988838",
    innerGuide: "#c4b068",
    tickMajorWidth: 2.8,
    tickMinorWidth: 2.0,
    zodiacFontSize: 17,
    houseDivAngularWidth: 2.4,
    houseDivRegularWidth: 1.3,
    houseDivAngularOpacity: 0.95,
    houseDivRegularOpacity: 0.85,
    houseNumFontSize: 18,
    bodyLabelFontSize: 17,
    innerCircleWidth: 2.8,
    innerGuideWidth: 1.1,
    innerGuideOpacity: 0.5,
    aspectGroupOpacity: 1,
  };

  return (
    <div className="natal-wheel w-full overflow-visible">
      <div className="overflow-visible">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="block h-auto w-full overflow-visible"
          role="img"
          aria-label={t("wheel.ariaLabel")}
          overflow="visible"
          style={{
            overflow: "visible",
            filter: "drop-shadow(0 1px 4px rgba(90,70,30,0.12))",
          }}
        >
          <g
            transform={`translate(${CX} ${CY}) scale(${SUBSTRATE_TEXTURE_SCALE}) translate(${-CX} ${-CY})`}
          >
            <image
              href="/images/parchment_substrate.png"
              x="0"
              y="0"
              width={VB}
              height={VB}
              preserveAspectRatio="none"
            />
          </g>
          <g
            transform={`translate(${CX} ${CY}) scale(${WHEEL_CONTENT_SCALE}) translate(${-CX} ${-CY})`}
          >
          {/* Zodiac ticks + labels */}
          {ZODIAC_3.map((abbr, i) => {
            const lon0 = i * 30;
            const lon1 = (i + 1) * 30;
            const mid = lon0 + 15;
            const c = signPalette[i] ?? "#888";
            const p0 = lonToXY(lon0, seventh, CX, CY, R_ZOD_OUT);
            const p1 = lonToXY(lon1, seventh, CX, CY, R_ZOD_OUT);
            const p0in = lonToXY(lon0, seventh, CX, CY, R_ZOD_IN);
            const p1in = lonToXY(lon1, seventh, CX, CY, R_ZOD_IN);
            const pm = lonToXY(mid, seventh, CX, CY, R_ZOD_MID);
            const displayAbbr = zodiacShort(i);
            return (
              <g key={abbr}>
                <line
                  x1={p0in.x}
                  y1={p0in.y}
                  x2={p0.x}
                  y2={p0.y}
                  stroke={colors.zodiacTickMajor}
                  strokeWidth={colors.tickMajorWidth}
                />
                <text
                  x={pm.x}
                  y={pm.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={c}
                  style={{ fontSize: colors.zodiacFontSize, fontFamily: "Palatino, 'Palatino Linotype', Georgia, 'Book Antiqua', serif" }}
                  fontWeight={800}
                >
                  {displayAbbr}
                </text>
              </g>
            );
          })}
          {/* Zodiac band (click → sign traits) */}
          {ZODIAC_3.map((abbr, i) => {
            const lon0 = i * 30;
            const lon1 = (i + 1) * 30;
            const d = zodiacBandWedgePath(
              CX,
              CY,
              R_ZOD_IN,
              R_ZOD_OUT,
              lon0,
              lon1,
              seventh,
              24,
            );
            const signName = zodiacFull(i);
            return (
              <path
                key={`zs-${abbr}`}
                d={d}
                fill="transparent"
                stroke="none"
                style={{ cursor: "pointer" }}
                onClick={() => setSel({ kind: "sign", index: i })}
              >
                <title>{signName}</title>
              </path>
            );
          })}
          {/* House wedges (click) */}
          {houses.length >= 12
            ? houses.map((h) => {
                const nextN = h.number === 12 ? 1 : h.number + 1;
                const next = cuspByHouse.get(nextN);
                if (!next) return null;
                const d = houseWedgePath(
                  CX,
                  CY,
                  R_HOUSE_WEDGE_IN,
                  R_HOUSE_HIT,
                  h.abs_pos,
                  next.abs_pos,
                  seventh,
                  24,
                );
                return (
                  <path
                    key={`hw-${h.number}`}
                    d={d}
                    fill="transparent"
                    stroke="none"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSel({ kind: "house", number: h.number })}
                  >
                    <title>{t(`house.${h.number}.title`)}</title>
                  </path>
                );
              })
            : null}
          {/* House division lines */}
          {houses.map((h) => {
            const pOut = lonToXY(h.abs_pos, seventh, CX, CY, R_ZOD_IN);
            const pIn = lonToXY(h.abs_pos, seventh, CX, CY, R_HOUSE_CUSP_IN);
            const thick =
              h.number === 1 || h.number === 4 || h.number === 7 || h.number === 10;
            return (
              <line
                key={`hc-${h.number}`}
                x1={pIn.x}
                y1={pIn.y}
                x2={pOut.x}
                y2={pOut.y}
                stroke={thick ? colors.houseDivAngular : colors.houseDivRegular}
                strokeWidth={thick ? colors.houseDivAngularWidth : colors.houseDivRegularWidth}
                opacity={thick ? colors.houseDivAngularOpacity : colors.houseDivRegularOpacity}
              />
            );
          })}
          {/* House numbers */}
          {houses.map((h) => {
            const nextN = h.number === 12 ? 1 : h.number + 1;
            const next = cuspByHouse.get(nextN);
            if (!next) return null;
            let delta = normalizeDeg(next.abs_pos - h.abs_pos);
            if (delta > 180) delta -= 360;
            const midLon = h.abs_pos + delta / 2;
            const p = lonToXY(midLon, seventh, CX, CY, R_HOUSE_NUM);
            const col = signPalette[(h.number - 1) % 12] ?? "#888";
            return (
              <text
                key={`hn-${h.number}`}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={col}
                style={{
                  fontSize: colors.houseNumFontSize,
                  fontFamily: "Palatino, 'Palatino Linotype', Georgia, 'Book Antiqua', serif",
                  cursor: "pointer",
                }}
                fontWeight={900}
                onClick={() => setSel({ kind: "house", number: h.number })}
              >
                {h.number}
              </text>
            );
          })}
          <circle
            cx={CX}
            cy={CY}
            r={R_ZOD_IN}
            fill="none"
            stroke={colors.innerCircle}
            strokeWidth={colors.innerCircleWidth}
          />
          {/* Aspects */}
          <g opacity={colors.aspectGroupOpacity}>
            {aspectLines.map((ln) => (
              <line
                key={ln.key}
                x1={ln.x1}
                y1={ln.y1}
                x2={ln.x2}
                y2={ln.y2}
                stroke={ln.stroke}
                strokeWidth={ln.strokeWidth}
                strokeLinecap="round"
              />
            ))}
          </g>
          {/* Bodies */}
          {planetStacks.map((stack) =>
            stack.map((b, j) => {
              const rDot = R_PLANET_BASE - j * R_PLANET_STACK_STEP;
              const rText = Math.min(rDot + R_LABEL_OUTSET, R_ZOD_IN - 10);
              const radial = lonToRadial(b.abs_pos, seventh);
              const dot = polarToXY(CX, CY, rDot, radial);
              const txt = polarToXY(CX, CY, rText, radial);
              const lab = bodyShort(b.name);
              const col = colorForBody(b.name);
              return (
                <g
                  key={b.name}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSel({ kind: "body", name: b.name })}
                >
                  <circle cx={dot.x} cy={dot.y} r={10} fill="transparent" />
                  <circle cx={dot.x} cy={dot.y} r={4} fill={col} opacity={0.95} />
                  <text
                    x={txt.x}
                    y={txt.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={col}
                    style={{
                      fontSize: colors.bodyLabelFontSize,
                      fontFamily: "Palatino, 'Palatino Linotype', Georgia, 'Book Antiqua', serif",
                      fontWeight: 900,
                    }}
                  >
                    {lab}
                  </text>
                  <rect
                    x={txt.x - 20}
                    y={txt.y - 11}
                    width={40}
                    height={22}
                    fill="transparent"
                  />
                </g>
              );
            }),
          )}
          </g>
        </svg>
      </div>
      {modal}
    </div>
  );
}

/** Square viewBox side length; larger canvas lets the outer zodiac/house ring breathe. */
const VB = 540;
const CX = VB / 2;
const CY = VB / 2;
/** >1 zooms substrate bitmap only (center-fixed); wheel geometry unchanged.
 *  Requires `overflow: visible` on the SVG — otherwise the viewBox clips to a square and scaling only “hits” an invisible wall. */
const SUBSTRATE_TEXTURE_SCALE = 1.1;
/** Scale factor for wheel geometry only (substrate unchanged), centered on canvas. */
const WHEEL_CONTENT_SCALE = 1.08;
/** Outer zodiac band (ticks + sign labels), scaled up from the old 520 canvas. */
const R_ZOD_OUT = 257;
const R_ZOD_IN = 218;
const R_ZOD_MID = 239;
/** House numerals sit outside the planet label band to reduce overlap. */
const R_HOUSE_NUM = 196;
const R_HOUSE_HIT = 213;
/** Inner hub for house cusp lines and wedge paths (keeps proportions vs VB). */
const R_HOUSE_CUSP_IN = 27;
const R_HOUSE_WEDGE_IN = 29;
/** Outermost planet dot; pulled in so labels stay radially inside house numbers. */
const R_PLANET_BASE = 144;
const R_PLANET_STACK_STEP = 11;
/** Label sits outside the dot along the same radial so aspect chords (which pass inside the dots) rarely cross text. */
const R_LABEL_OUTSET = 15;
const R_INNER_GUIDE = 66;

function formatOrb(o: number): string {
  const d = Math.floor(o);
  const m = Math.round((o - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}'`;
}

/** Pigment-ink colors — saturated, manuscript-style. */
function colorForBody(name: string): string {
  const palette: Record<string, string> = {
    Sun: "#c08018",
    Moon: "#7898b0",
    Mercury: "#908020",
    Venus: "#b83060",
    Mars: "#b82820",
    Jupiter: "#6838a0",
    Saturn: "#584830",
    Uranus: "#108890",
    Neptune: "#2060b0",
    Pluto: "#803880",
    True_North_Lunar_Node: "#787020",
    True_South_Lunar_Node: "#686048",
    Ascendant: "#2a1810",
    Descendant: "#483828",
    Medium_Coeli: "#2a1810",
    Imum_Coeli: "#585040",
    Chiron: "#207858",
    Mean_Lilith: "#903878",
  };
  return palette[name] ?? "#5a4830";
}
