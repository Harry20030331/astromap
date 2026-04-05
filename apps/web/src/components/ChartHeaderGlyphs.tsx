"use client";

import type { NatalBody } from "@/components/NatalWheel";
import { ZodiacGlyph } from "@/components/ZodiacGlyph";
import { useI18n } from "@/lib/i18n";

export function ChartHeaderGlyphs({ bodies }: { bodies: NatalBody[] }) {
  const { t } = useI18n();
  const sun = bodies.find((b) => b.name === "Sun");
  const moon = bodies.find((b) => b.name === "Moon");
  const asc = bodies.find((b) => b.name === "Ascendant");
  if (!sun && !moon && !asc) return null;

  return (
    <>
      <span className="select-none px-1 text-lg font-semibold leading-none text-stone-900" aria-hidden>
        ·
      </span>
      <div
        className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-stone-600"
        aria-label={t("header.sunMoonAsc")}
      >
        {sun ? (
          <span
            className="inline-flex items-center gap-1"
            title={t("header.sunIn", { sign: sun.sign })}
          >
            <span className="text-sm font-semibold tracking-tight text-amber-800">{t("header.sun")}</span>
            <ZodiacGlyph sign={sun.sign} className="text-amber-800" />
          </span>
        ) : null}
        {moon ? (
          <span
            className="inline-flex items-center gap-1"
            title={t("header.moonIn", { sign: moon.sign })}
          >
            <span className="text-sm font-semibold tracking-tight text-sky-800">{t("header.moon")}</span>
            <ZodiacGlyph sign={moon.sign} className="text-sky-800" />
          </span>
        ) : null}
        {asc ? (
          <span
            className="inline-flex items-center gap-1"
            title={t("header.ascIn", { sign: asc.sign })}
          >
            <span className="text-sm font-semibold tracking-tight text-violet-800">{t("header.asc")}</span>
            <ZodiacGlyph sign={asc.sign} className="text-violet-800" />
          </span>
        ) : null}
      </div>
    </>
  );
}
