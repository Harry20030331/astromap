"use client";

import type { NatalBody } from "@/components/NatalWheel";
import { ZodiacGlyphWithLocalizedName } from "@/components/ZodiacGlyph";
import { useI18n } from "@/lib/i18n";

export type BigThreeSigns = {
  sun?: string | null;
  moon?: string | null;
  asc?: string | null;
};

function syntheticBody(name: "Sun" | "Moon" | "Ascendant", sign: string): NatalBody {
  return { name, sign, position: 0, abs_pos: 0, house: null };
}

/** Sun / Moon / Ascendant: text labels + zodiac icons only (no ☉/☽/Asc abbrev). */
export function ChartHeaderGlyphs({
  bodies: bodiesProp,
  bigThreeSigns,
  variant = "default",
}: {
  bodies?: NatalBody[];
  bigThreeSigns?: BigThreeSigns;
  /** Narrow rows: smaller glyphs, tighter gaps, no wrap. */
  variant?: "default" | "inlineDense";
}) {
  const { t } = useI18n();
  const bodies = bodiesProp;
  const sun =
    bodies?.find((b) => b.name === "Sun") ??
    (bigThreeSigns?.sun ? syntheticBody("Sun", bigThreeSigns.sun) : undefined);
  const moon =
    bodies?.find((b) => b.name === "Moon") ??
    (bigThreeSigns?.moon ? syntheticBody("Moon", bigThreeSigns.moon) : undefined);
  const asc =
    bodies?.find((b) => b.name === "Ascendant") ??
    (bigThreeSigns?.asc ? syntheticBody("Ascendant", bigThreeSigns.asc) : undefined);
  if (!sun && !moon && !asc) return null;

  const dense = variant === "inlineDense";
  const glyphSize = dense ? "sm" : "md";
  const pairGap = dense ? "gap-x-0.5" : "gap-x-1";
  const rowClass = dense
    ? "inline-flex min-w-0 shrink-0 flex-nowrap items-center gap-x-1.5 text-stone-600"
    : "inline-flex min-w-0 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-stone-600";

  return (
    <span className={rowClass} aria-label={t("header.sunMoonAsc")}>
      {sun ? (
        <span
          className={`inline-flex items-center ${pairGap}`}
          title={t("header.sunIn", { sign: sun.sign })}
        >
          <span className="text-base font-semibold tracking-tight text-amber-800">
            {t("header.sun")}
          </span>
          <ZodiacGlyphWithLocalizedName
            sign={sun.sign}
            className="text-amber-800"
            size={glyphSize}
          />
        </span>
      ) : null}
      {moon ? (
        <span
          className={`inline-flex items-center ${pairGap}`}
          title={t("header.moonIn", { sign: moon.sign })}
        >
          <span className="text-base font-semibold tracking-tight text-sky-800">
            {t("header.moon")}
          </span>
          <ZodiacGlyphWithLocalizedName
            sign={moon.sign}
            className="text-sky-800"
            size={glyphSize}
          />
        </span>
      ) : null}
      {asc ? (
        <span
          className={`inline-flex items-center ${pairGap}`}
          title={t("header.ascIn", { sign: asc.sign })}
        >
          <span className="text-base font-semibold tracking-tight text-violet-800">
            {t("header.asc")}
          </span>
          <ZodiacGlyphWithLocalizedName
            sign={asc.sign}
            className="text-violet-800"
            size={glyphSize}
          />
        </span>
      ) : null}
    </span>
  );
}
