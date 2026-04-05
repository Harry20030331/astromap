"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatDmsWithinSign,
  lonToRadial,
  lonToXY,
  normalizeDeg,
  polarToXY,
} from "@/components/natalWheelMath";

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
  | null;

const BODY_LABEL: Record<string, string> = {
  Sun: "Sun",
  Moon: "Mon",
  Mercury: "Mer",
  Venus: "Ven",
  Mars: "Mar",
  Jupiter: "Jup",
  Saturn: "Sat",
  Uranus: "Ura",
  Neptune: "Nep",
  Pluto: "Plu",
  True_North_Lunar_Node: "NN",
  True_South_Lunar_Node: "SN",
  Ascendant: "ASC",
  Descendant: "DES",
  Medium_Coeli: "MC",
  Imum_Coeli: "IC",
  Chiron: "Chi",
  Mean_Lilith: "Lil",
};

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

const SIGN_TO_RULER: Record<string, keyof typeof BODY_LABEL | null> = {
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

const PLANET_KEYWORDS: Record<string, string> = {
  Sun: "Vitality, identity, conscious will",
  Mon: "Emotions, needs, instinctive patterns",
  Mer: "Mind, speech, learning, curiosity",
  Ven: "Values, affection, harmony, pleasure",
  Mar: "Drive, assertion, courage, desire",
  Jup: "Growth, meaning, opportunity, faith",
  Sat: "Structure, limits, maturity, responsibility",
  Ura: "Freedom, innovation, disruption, truth",
  Nep: "Imagination, compassion, transcendence, blur",
  Plu: "Power, transformation, depth, letting go",
  NN: "Direction, growth edge, unfamiliar pull",
  SN: "Habit, release, familiar patterns",
  ASC: "Persona, approach to life, first impressions",
  DES: "Partnership, projection, one-to-one bonds",
  MC: "Calling, reputation, public path",
  IC: "Roots, private life, inner foundation",
  Chi: "Wound, healing, mentoring arc",
  Lil: "Wild instinct, taboo edge, raw desire",
};

const HOUSE_BLURBS: Record<number, { title: string; text: string }> = {
  1: { title: "1st house", text: "Self-presentation, body, beginnings" },
  2: { title: "2nd house", text: "Money, resources, values, security" },
  3: { title: "3rd house", text: "Learning, siblings, neighborhood, communication" },
  4: { title: "4th house", text: "Home, family, roots, private life" },
  5: { title: "5th house", text: "Creativity, romance, play, children" },
  6: { title: "6th house", text: "Work, health, habits, service" },
  7: { title: "7th house", text: "Partnership, contracts, open enemies" },
  8: { title: "8th house", text: "Shared resources, intimacy, change, crisis" },
  9: { title: "9th house", text: "Beliefs, travel, higher learning, meaning" },
  10: { title: "10th house", text: "Career, status, vocation, visibility" },
  11: { title: "11th house", text: "Friends, groups, hopes, networks" },
  12: { title: "12th house", text: "Solitude, subconscious, healing, closure" },
};

const NEON = ["#ff5c5c", "#5ce1e6", "#b8f25a", "#ffb84d", "#c792ff"];

const MAJOR_ASPECTS = new Set(["conjunction", "opposition", "trine", "square", "sextile"]);

function aspectColor(aspect: string): string {
  if (aspect === "opposition" || aspect === "square") return "rgba(255,92,92,0.55)";
  if (aspect === "trine" || aspect === "sextile") return "rgba(92,225,230,0.5)";
  return "rgba(184,242,90,0.45)";
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
  const wMin = 0.3;
  const wMax = 3.1;
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
  const [sel, setSel] = useState<Selection>(null);

  const close = useCallback(() => setSel(null), []);

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
      const lab = BODY_LABEL[b.name] ?? b.name;
      const hi = parseHouseIndex(b.house);
      const aspectsFor = aspects.filter(
        (a) =>
          MAJOR_ASPECTS.has(a.aspect) &&
          aspectWithinOrb(a.orbit, a.aspect, aspectOrbs) &&
          ((a.p1 === b.name && includedPoints.has(a.p2)) ||
            (a.p2 === b.name && includedPoints.has(a.p1))),
      );
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
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
              <p className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold leading-tight text-sky-700">
                <span>{lab}</span>
                {b.retrograde ? (
                  <span className="text-xs font-medium text-amber-700">[Retrograde]</span>
                ) : null}
              </p>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
                onClick={close}
              >
                ×
              </button>
            </div>
            <p className="mt-0.5 text-sm leading-snug text-stone-600">
              {PLANET_KEYWORDS[lab] ?? "—"}
            </p>
            <p className="mt-2 text-sm leading-snug">
              <span className="font-medium text-stone-800">Sign:</span>{" "}
              <span className="text-rose-700">{signTo3(b.sign)}</span>{" "}
              {formatDmsWithinSign(b.position)}
              <span className="mx-2 text-stone-300" aria-hidden>
                ·
              </span>
              <span className="font-medium text-stone-800">House:</span>{" "}
              {hi != null ? `${hi}${ordinalSuffix(hi)}` : "—"}
            </p>
            {aspectsFor.length > 0 ? (
              <div className="mt-2 border-t border-stone-100 pt-1.5">
                <ul className="grid list-none grid-cols-2 gap-x-2 gap-y-1 pl-0 text-sm leading-snug text-stone-700">
                  {aspectsFor.map((a) => {
                    const other = a.p1 === b.name ? a.p2 : a.p1;
                    const ol = BODY_LABEL[other] ?? other;
                    return (
                      <li key={`${a.p1}-${a.p2}-${a.aspect}`} className="min-w-0 leading-snug">
                        <span className="text-sky-800 underline decoration-sky-800/30">
                          {ol}
                        </span>{" "}
                        {a.aspect_degrees}° {aspectSymbol(a.aspect)} · orb {formatOrb(a.orbit)}
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
    const h = cuspByHouse.get(sel.number);
    if (!h) return null;
    const blurb = HOUSE_BLURBS[sel.number];
    const rulerName = SIGN_TO_RULER[h.sign] ?? null;
    const rulerBody = rulerName ? byName.get(rulerName) : null;
    const rulerHouse = rulerBody ? parseHouseIndex(rulerBody.house) : null;
    const rLab = rulerName ? (BODY_LABEL[rulerName] ?? rulerName) : null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
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
            <p className="text-lg font-semibold leading-tight text-violet-700">
              {sel.number}
              {ordinalSuffix(sel.number)} house
            </p>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
              onClick={close}
            >
              ×
            </button>
          </div>
          {blurb ? (
            <p className="mt-1.5 text-sm leading-snug text-stone-600">{blurb.text}</p>
          ) : null}
          <p className="mt-2 text-sm leading-snug">
            <span className="font-medium text-stone-800">Cusp:</span>{" "}
            <span className="text-rose-700">{signTo3(h.sign)}</span>{" "}
            {formatDmsWithinSign(h.cusp_longitude)}
          </p>
          {rLab ? (
            <p className="mt-1.5 text-sm leading-snug">
              <span className="font-medium text-stone-800">Traditional ruler:</span>{" "}
              <span className="text-rose-700">{rLab}</span>
              {rulerHouse != null ? (
                <>
                  {" "}
                  in the{" "}
                  <span className="text-sky-800 underline decoration-sky-800/30">
                    {rulerHouse}
                    {ordinalSuffix(rulerHouse)}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    );
  }, [sel, byName, aspects, cuspByHouse, close, includedPoints, aspectOrbs]);

  return (
    <div className="natal-wheel w-full">
      <div className="overflow-hidden rounded-xl border border-stone-700/80 bg-[#0a0a0a] shadow-lg shadow-black/40">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Natal chart wheel"
        >
          <rect width={VB} height={VB} fill="#080808" />
          {/* Zodiac ticks + labels */}
          {ZODIAC_3.map((abbr, i) => {
            const lon0 = i * 30;
            const lon1 = (i + 1) * 30;
            const mid = lon0 + 15;
            const c = NEON[i % NEON.length];
            const p0 = lonToXY(lon0, seventh, CX, CY, R_ZOD_OUT);
            const p1 = lonToXY(lon1, seventh, CX, CY, R_ZOD_OUT);
            const p0in = lonToXY(lon0, seventh, CX, CY, R_ZOD_IN);
            const p1in = lonToXY(lon1, seventh, CX, CY, R_ZOD_IN);
            const pm = lonToXY(mid, seventh, CX, CY, R_ZOD_MID);
            return (
              <g key={abbr}>
                <line
                  x1={p0in.x}
                  y1={p0in.y}
                  x2={p0.x}
                  y2={p0.y}
                  stroke="#3a3a3a"
                  strokeWidth={0.75}
                />
                <line
                  x1={p0in.x}
                  y1={p0in.y}
                  x2={p1in.x}
                  y2={p1in.y}
                  stroke="#2a2a2a"
                  strokeWidth={0.5}
                  opacity={0.85}
                />
                <text
                  x={pm.x}
                  y={pm.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={c}
                  style={{ fontSize: 11, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                  fontWeight={600}
                >
                  {abbr}
                </text>
              </g>
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
                  28,
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
                    <title>{`House ${h.number}`}</title>
                  </path>
                );
              })
            : null}
          {/* House division lines */}
          {houses.map((h) => {
            const pOut = lonToXY(h.abs_pos, seventh, CX, CY, R_ZOD_IN);
            const pIn = lonToXY(h.abs_pos, seventh, CX, CY, 26);
            const thick =
              h.number === 1 || h.number === 4 || h.number === 7 || h.number === 10;
            return (
              <line
                key={`hc-${h.number}`}
                x1={pIn.x}
                y1={pIn.y}
                x2={pOut.x}
                y2={pOut.y}
                stroke={thick ? "#8a8a8a" : "#4a4a4a"}
                strokeWidth={thick ? 1.35 : 0.65}
                opacity={thick ? 0.95 : 0.75}
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
            const col = NEON[(h.number - 1) % NEON.length];
            return (
              <text
                key={`hn-${h.number}`}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={col}
                style={{
                  fontSize: 12,
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                  cursor: "pointer",
                }}
                fontWeight={700}
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
            stroke="#333"
            strokeWidth={0.75}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R_INNER_GUIDE}
            fill="none"
            stroke="#2c2c2c"
            strokeWidth={0.5}
            opacity={0.45}
          />
          {/* Aspects */}
          <g opacity={0.9}>
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
              const rText = rDot - R_LABEL_INSET;
              const radial = lonToRadial(b.abs_pos, seventh);
              const dot = polarToXY(CX, CY, rDot, radial);
              const txt = polarToXY(CX, CY, rText, radial);
              const lab = BODY_LABEL[b.name] ?? b.name;
              const col = colorForBody(b.name);
              return (
                <g
                  key={b.name}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSel({ kind: "body", name: b.name })}
                >
                  <line
                    x1={dot.x}
                    y1={dot.y}
                    x2={txt.x}
                    y2={txt.y}
                    stroke={col}
                    strokeWidth={0.6}
                    opacity={0.85}
                  />
                  <circle cx={dot.x} cy={dot.y} r={8} fill="transparent" />
                  <circle cx={dot.x} cy={dot.y} r={3.2} fill={col} opacity={0.95} />
                  <text
                    x={txt.x}
                    y={txt.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={col}
                    style={{
                      fontSize: 10,
                      fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    }}
                    fontWeight={600}
                  >
                    {lab}
                  </text>
                  <rect
                    x={txt.x - 18}
                    y={txt.y - 10}
                    width={36}
                    height={20}
                    fill="transparent"
                  />
                </g>
              );
            }),
          )}
        </svg>
      </div>
      {modal}
    </div>
  );
}

const VB = 520;
const CX = VB / 2;
const CY = VB / 2;
const R_ZOD_OUT = 248;
const R_ZOD_IN = 210;
const R_ZOD_MID = 230;
const R_HOUSE_NUM = 188;
const R_HOUSE_HIT = 205;
/** Outermost planet dot radius (px); larger = bodies farther out, aspect chords miss chart center more. */
const R_PLANET_BASE = 154;
const R_PLANET_STACK_STEP = 11;
const R_LABEL_INSET = 24;
const R_INNER_GUIDE = 64;

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatOrb(o: number): string {
  const d = Math.floor(o);
  const m = Math.round((o - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}'`;
}

function colorForBody(name: string): string {
  const palette: Record<string, string> = {
    Sun: "#ffb84d",
    Moon: "#5ce1e6",
    Mercury: "#b8f25a",
    Venus: "#ff7eb3",
    Mars: "#ff5c5c",
    Jupiter: "#c792ff",
    Saturn: "#8ab4ff",
    Uranus: "#5ce1e6",
    Neptune: "#7ecbff",
    Pluto: "#dda0dd",
    True_North_Lunar_Node: "#f5f5a0",
    True_South_Lunar_Node: "#c4c4a8",
    Ascendant: "#ffffff",
    Descendant: "#e0e0e0",
    Medium_Coeli: "#ffffff",
    Imum_Coeli: "#c8c8c8",
    Chiron: "#a8d8ea",
    Mean_Lilith: "#e6a8d8",
  };
  return palette[name] ?? "#eaeaea";
}
