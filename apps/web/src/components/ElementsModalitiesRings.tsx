"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

const ELEMENT_ORDER = ["fire", "earth", "air", "water"] as const;
const ELEMENT_COLORS: Record<string, string> = {
  fire: "#f2aaa4",
  earth: "#f8d3a7",
  air: "#85d3a5",
  water: "#bbe4fc",
};

const MODALITY_ORDER = ["cardinal", "fixed", "mutable"] as const;
const MODALITY_COLORS: Record<string, string> = {
  cardinal: "#c4b0f8",
  fixed: "#f8c8b0",
  mutable: "#b8e0d8",
};

const LABEL_KEYS: Record<string, string> = {
  fire: "ring.fire",
  earth: "ring.earth",
  air: "ring.air",
  water: "ring.water",
  cardinal: "ring.cardinal",
  fixed: "ring.fixed",
  mutable: "ring.mutable",
};

const DESC_KEYS: Record<string, string> = {
  fire: "ring.fire.desc",
  earth: "ring.earth.desc",
  air: "ring.air.desc",
  water: "ring.water.desc",
  cardinal: "ring.cardinal.desc",
  fixed: "ring.fixed.desc",
  mutable: "ring.mutable.desc",
};

type RingKind = "elements" | "modalities";

type LegendSelection = { ring: RingKind; key: string };

function normalizeRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).map(([k, v]) => [k.toLowerCase(), Number(v) || 0]),
  );
}

function buildSegments(
  record: Record<string, number>,
  order: readonly string[],
  colors: Record<string, string>,
): { key: string; value: number; color: string }[] {
  const n = normalizeRecord(record);
  const out: { key: string; value: number; color: string }[] = [];
  for (const k of order) {
    if (k in n) {
      out.push({
        key: k,
        value: n[k]!,
        color: colors[k] ?? "#71717a",
      });
    }
  }
  for (const k of Object.keys(n)) {
    if (!order.includes(k)) {
      out.push({ key: k, value: n[k]!, color: colors[k] ?? "#71717a" });
    }
  }
  return out;
}

function CategoryIcon({ name, color }: { name: string; color: string }) {
  const k = name.toLowerCase();
  const s = { color } as const;
  const box = "0 0 24 24";

  if (k === "fire") {
    /* Classical fire glyph: upward-pointing triangle (alchemical / elemental). */
    return (
      <svg width={22} height={22} viewBox={box} aria-hidden style={s}>
        <path
          fill="currentColor"
          d="M12 3.5 20.5 20.5H3.5L12 3.5Z"
        />
      </svg>
    );
  }
  if (k === "earth") {
    return (
      <svg width={22} height={22} viewBox={box} aria-hidden style={s}>
        <path
          fill="currentColor"
          d="M3 19h18v1H3v-1Zm1.5-2L8 9l3.5 3.5L15 7l4.5 10H4.5Z"
        />
      </svg>
    );
  }
  if (k === "air") {
    return (
      <svg width={22} height={22} viewBox={box} aria-hidden style={s}>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="M3 9h12a3 3 0 1 0-3-3M5 15h14a3 3 0 1 1-3 3M4 12h10"
        />
      </svg>
    );
  }
  if (k === "water") {
    return (
      <svg width={22} height={22} viewBox={box} aria-hidden style={s}>
        <path
          fill="currentColor"
          d="M12 22a5.5 5.5 0 0 0 5.1-7.7C14.8 9.2 12 4 12 4S9.2 9.2 6.9 14.3A5.5 5.5 0 0 0 12 22Z"
        />
      </svg>
    );
  }
  if (k === "cardinal") {
    return (
      <svg width={22} height={22} viewBox={box} aria-hidden style={s}>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="M12 4v5M12 15v5M4 12h5M15 12h5"
        />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  if (k === "fixed") {
    return (
      <svg width={22} height={22} viewBox={box} aria-hidden style={s}>
        <rect
          x="5.5"
          y="5.5"
          width="13"
          height="13"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (k === "mutable") {
    return (
      <svg width={22} height={22} viewBox={box} aria-hidden style={s}>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          d="M4 9c2.5 0 2.5-4 8-4s5.5 4 8 4M4 15c2.5 0 2.5 4 8 4s5.5-4 8-4"
        />
      </svg>
    );
  }
  return (
    <svg width={22} height={22} viewBox={box} aria-hidden style={s}>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

function DonutRing({
  title,
  segments,
  ring,
  selection,
  onLegendPointerDown,
  tFn,
}: {
  title: string;
  segments: { key: string; value: number; color: string }[];
  ring: RingKind;
  selection: LegendSelection | null;
  onLegendPointerDown: (ring: RingKind, key: string) => void;
  tFn: (key: string, params?: Record<string, string | number>) => string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const w = 144;
  const legendColGapPx = 28;
  const legendGridW = w + (legendColGapPx - 18);
  const h = 144;
  const cx = w / 2;
  const cy = h / 2;
  const r = 46;
  const strokeWidth = 20;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="flex min-w-0 flex-col items-center">
      <h3 className="mb-0.5 text-center text-lg font-semibold tracking-tight text-stone-900">
        {title}
      </h3>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="shrink-0 text-stone-300"
        role="img"
        aria-label={tFn("ring.distribution", { title })}
      >
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            opacity={0.4}
          />
          {total > 0
            ? segments
                .filter((seg) => seg.value > 0)
                .map((seg) => {
                  const len = (seg.value / total) * c;
                  const dash = `${len} ${c}`;
                  const off = acc;
                  acc += len;
                  return (
                    <circle
                      key={seg.key}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={dash}
                      strokeDashoffset={-off}
                      strokeLinecap="butt"
                    />
                  );
                })
            : null}
        </g>
      </svg>

      <ul
        className="mt-1 grid shrink-0 grid-cols-2 gap-y-0.5"
        style={{ width: legendGridW, columnGap: legendColGapPx }}
      >
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          const en = LABEL_KEYS[seg.key] ? tFn(LABEL_KEYS[seg.key]) : seg.key;
          const desc = DESC_KEYS[seg.key] ? tFn(DESC_KEYS[seg.key]) : undefined;
          const isOpen = selection?.ring === ring && selection.key === seg.key;
          // Determine vertical position: bottom row shows tooltip above
          const tipBelow =
            (ring === "elements" && (seg.key === "air" || seg.key === "water")) ||
            (ring === "modalities" && seg.key === "mutable");
          // Left column items align tooltip to their left edge to avoid viewport overflow;
          // right column items stay centered (the original default).
          const isLeftCol =
            (ring === "elements" && (seg.key === "fire" || seg.key === "air")) ||
            (ring === "modalities" && (seg.key === "cardinal" || seg.key === "mutable"));
          const tipHAlign = isLeftCol
            ? "left-0 translate-x-0"
            : "left-1/2 -translate-x-1/2";

          return (
            <li key={seg.key} className="relative min-w-0">
              <div className="flex items-center justify-center gap-1.5">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    data-legend-icon
                    aria-expanded={isOpen}
                    aria-describedby={isOpen ? `legend-tip-${ring}-${seg.key}` : undefined}
                    aria-label={`${en}, ${pct}%`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onLegendPointerDown(ring, seg.key);
                    }}
                    className="flex rounded-md p-0.5 text-stone-800 outline-none ring-stone-400 transition hover:bg-stone-100 focus-visible:ring-2"
                  >
                    <span className="flex" aria-hidden>
                      <CategoryIcon name={seg.key} color={seg.color} />
                    </span>
                  </button>
                  {isOpen ? (
                    <div
                      id={`legend-tip-${ring}-${seg.key}`}
                      role="tooltip"
                      className={`pointer-events-none absolute z-30 w-max max-w-[min(14rem,calc(100vw-2rem))] rounded-md border border-stone-200/90 bg-[var(--surface)] px-2.5 py-1.5 text-center text-sm font-medium leading-snug text-stone-900 shadow-lg shadow-stone-300/35 ${tipHAlign} ${tipBelow ? "top-full mt-1.5" : "bottom-full mb-1.5"}`}
                    >
                      {en}
                      {desc ? (
                        <span className="mt-0.5 block text-xs font-normal text-stone-500">
                          {desc}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <span className="text-base font-semibold tabular-nums text-stone-800">
                  {pct}%
                </span>
                <span className="sr-only">
                  {en}: {pct}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ElementsModalitiesRings({
  elements,
  modalities,
}: {
  elements: Record<string, number>;
  modalities: Record<string, number>;
}) {
  const { t } = useI18n();
  const elSegs = buildSegments(elements, ELEMENT_ORDER, ELEMENT_COLORS);
  const modSegs = buildSegments(modalities, MODALITY_ORDER, MODALITY_COLORS);
  const rootRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<LegendSelection | null>(null);

  const onLegendPointerDown = useCallback((ring: RingKind, key: string) => {
    setSelection((prev) =>
      prev?.ring === ring && prev.key === key ? null : { ring, key },
    );
  }, []);

  useEffect(() => {
    if (!selection) return;

    const clear = () => setSelection(null);

    const onDocPointerDown = (e: PointerEvent) => {
      const el = e.target;
      if (!(el instanceof Node)) return;
      if (rootRef.current?.contains(el)) {
        const t = e.target as Element;
        if (t.closest("[data-legend-icon]")) return;
      }
      clear();
    };

    window.addEventListener("scroll", clear, true);
    document.addEventListener("wheel", clear, { capture: true, passive: true });
    document.addEventListener("touchmove", clear, { capture: true, passive: true });
    document.addEventListener("pointerdown", onDocPointerDown, true);

    return () => {
      window.removeEventListener("scroll", clear, true);
      document.removeEventListener("wheel", clear, { capture: true });
      document.removeEventListener("touchmove", clear, { capture: true });
      document.removeEventListener("pointerdown", onDocPointerDown, true);
    };
  }, [selection]);

  return (
    <div
      ref={rootRef}
      className="overflow-visible rounded-xl border border-stone-200/90 bg-[var(--surface)] px-3 py-1.5 shadow-sm shadow-stone-100/50"
      role="group"
      aria-label={t("ring.ariaLabel")}
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <DonutRing
          title={t("ring.elements")}
          segments={elSegs}
          ring="elements"
          selection={selection}
          onLegendPointerDown={onLegendPointerDown}
          tFn={t}
        />
        <DonutRing
          title={t("ring.modalities")}
          segments={modSegs}
          ring="modalities"
          selection={selection}
          onLegendPointerDown={onLegendPointerDown}
          tFn={t}
        />
      </div>
    </div>
  );
}
