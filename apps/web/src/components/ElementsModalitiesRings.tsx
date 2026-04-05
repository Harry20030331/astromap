"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ELEMENT_ORDER = ["fire", "earth", "air", "water"] as const;
const ELEMENT_COLORS: Record<string, string> = {
  fire: "#f97316",
  earth: "#65a30d",
  air: "#38bdf8",
  water: "#2563eb",
};

const MODALITY_ORDER = ["cardinal", "fixed", "mutable"] as const;
const MODALITY_COLORS: Record<string, string> = {
  cardinal: "#a78bfa",
  fixed: "#f59e0b",
  mutable: "#14b8a6",
};

const LABEL: Record<string, string> = {
  fire: "Fire",
  earth: "Earth",
  air: "Air",
  water: "Water",
  cardinal: "Cardinal",
  fixed: "Fixed",
  mutable: "Mutable",
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
    return (
      <svg width={22} height={22} viewBox={box} aria-hidden style={s}>
        <path
          fill="currentColor"
          d="M12 3c-2.5 3.5-5 7-5 11.5 0 3.5 2 6.5 5 6.5s5-3 5-6.5c0-4.5-2.5-8-5-11.5Z"
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
}: {
  title: string;
  segments: { key: string; value: number; color: string }[];
  ring: RingKind;
  selection: LegendSelection | null;
  onLegendPointerDown: (ring: RingKind, key: string) => void;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const w = 144;
  const h = 144;
  const cx = w / 2;
  const cy = h / 2;
  const r = 46;
  const strokeWidth = 20;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="flex min-w-0 flex-col items-center">
      <h3 className="mb-2 text-center text-base font-semibold tracking-tight text-stone-900">
        {title}
      </h3>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="shrink-0 text-stone-300"
        role="img"
        aria-label={`${title} distribution`}
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

      <ul className="mt-3 grid w-full max-w-[11rem] grid-cols-2 gap-x-2 gap-y-2 sm:max-w-none">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          const en = LABEL[seg.key] ?? seg.key;
          const isOpen = selection?.ring === ring && selection.key === seg.key;

          return (
            <li key={seg.key} className="relative min-w-0">
              <div className="flex items-center justify-center gap-1.5 sm:justify-start">
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
                      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-max max-w-[min(14rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-stone-200/90 bg-[var(--surface)] px-2.5 py-1.5 text-center text-xs font-medium leading-snug text-stone-900 shadow-lg shadow-stone-300/35"
                    >
                      {en}
                    </div>
                  ) : null}
                </div>
                <span className="text-sm font-semibold tabular-nums text-stone-800">
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
      className="overflow-visible rounded-xl border border-stone-200/90 bg-[var(--surface)] p-3 shadow-sm shadow-stone-100/50"
      role="group"
      aria-label="Elements and modalities distribution"
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <DonutRing
          title="Elements"
          segments={elSegs}
          ring="elements"
          selection={selection}
          onLegendPointerDown={onLegendPointerDown}
        />
        <DonutRing
          title="Modalities"
          segments={modSegs}
          ring="modalities"
          selection={selection}
          onLegendPointerDown={onLegendPointerDown}
        />
      </div>
    </div>
  );
}
