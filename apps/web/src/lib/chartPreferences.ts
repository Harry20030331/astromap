/**
 * Chart analysis preferences (must stay aligned with API `analysis_preferences`).
 *
 * **App defaults** (new sessions / Reset): ten planets + true nodes + four angles, each major
 * aspect orb 6°. Mirrors `DEFAULT_ASPECT_ORBS` in `services/api/app/astro/features.py`.
 */

export type AspectOrbKey =
  | "conjunction"
  | "sextile"
  | "square"
  | "trine"
  | "opposition";

export type AnalysisPreferences = {
  included_points: string[];
  aspect_orbs: Record<AspectOrbKey, number>;
};

export const ASPECT_ORB_KEYS: AspectOrbKey[] = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
];

export const ASPECT_ORB_META: Record<
  AspectOrbKey,
  { angle: number; short: string; label: string }
> = {
  conjunction: { angle: 0, short: "0°", label: "Conjunction" },
  sextile: { angle: 60, short: "60°", label: "Sextile" },
  square: { angle: 90, short: "90°", label: "Square" },
  trine: { angle: 120, short: "120°", label: "Trine" },
  opposition: { angle: 180, short: "180°", label: "Opposition" },
};

/** Default set shown on the wheel and in features when the session has no saved prefs. */
export const DEFAULT_INCLUDED_POINTS: readonly string[] = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "True_North_Lunar_Node",
  "True_South_Lunar_Node",
  "Ascendant",
  "Descendant",
  "Medium_Coeli",
  "Imum_Coeli",
];

export const DEFAULT_ASPECT_ORBS: Record<AspectOrbKey, number> = {
  conjunction: 6,
  sextile: 6,
  square: 6,
  trine: 6,
  opposition: 6,
};

/** Single object for resets and docs; `included_points` must still be filtered by chart availability. */
export function defaultPreferencesForAvailableBodies(
  available: ReadonlySet<string>,
): AnalysisPreferences {
  return {
    included_points: DEFAULT_INCLUDED_POINTS.filter((id) => available.has(id)),
    aspect_orbs: { ...DEFAULT_ASPECT_ORBS },
  };
}

/** Astrological glyphs (Unicode); angles use empty string — render `ANGLE_ABBR` badge instead. */
export const POINT_GLYPH: Record<string, string> = {
  Sun: "\u2609",
  Moon: "\u263D",
  Mercury: "\u263F",
  Venus: "\u2640",
  Mars: "\u2642",
  Jupiter: "\u2643",
  Saturn: "\u2644",
  Uranus: "\u2645",
  Neptune: "\u2646",
  Pluto: "\u2647",
  True_North_Lunar_Node: "\u260A",
  True_South_Lunar_Node: "\u260B",
  Chiron: "\u26B7",
  Mean_Lilith: "\u26B8",
  Ascendant: "",
  Descendant: "",
  Medium_Coeli: "",
  Imum_Coeli: "",
};

export const ANGLE_ABBR: Record<string, string> = {
  Ascendant: "Asc",
  Descendant: "Dsc",
  Medium_Coeli: "MC",
  Imum_Coeli: "IC",
};

export const POINT_GROUPS: { title: string; ids: string[] }[] = [
  {
    title: "Planets",
    ids: [
      "Sun",
      "Moon",
      "Mercury",
      "Venus",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
      "Pluto",
    ],
  },
  {
    title: "Nodes",
    ids: ["True_North_Lunar_Node", "True_South_Lunar_Node"],
  },
  {
    title: "Angles",
    ids: ["Ascendant", "Descendant", "Medium_Coeli", "Imum_Coeli"],
  },
  {
    title: "Other",
    ids: ["Chiron", "Mean_Lilith"],
  },
];

export const POINT_LABEL: Record<string, string> = {
  Sun: "Sun",
  Moon: "Moon",
  Mercury: "Mercury",
  Venus: "Venus",
  Mars: "Mars",
  Jupiter: "Jupiter",
  Saturn: "Saturn",
  Uranus: "Uranus",
  Neptune: "Neptune",
  Pluto: "Pluto",
  True_North_Lunar_Node: "North Node",
  True_South_Lunar_Node: "South Node",
  Ascendant: "Ascendant",
  Descendant: "Descendant",
  Medium_Coeli: "Medium Coeli",
  Imum_Coeli: "Imum Coeli",
  Chiron: "Chiron",
  Mean_Lilith: "Lilith",
};

/** Three-letter / short labels for the ten planets (settings Planets row only). */
export const PLANET_SHORT_LABEL: Record<string, string> = {
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
};

export function mergeAspectOrbs(
  partial: Record<string, number> | undefined,
): Record<AspectOrbKey, number> {
  return { ...DEFAULT_ASPECT_ORBS, ...(partial as Partial<Record<AspectOrbKey, number>>) };
}

export function sessionAnalysisPreferences(
  raw: AnalysisPreferences | null | undefined,
  chartBodyNames: Set<string>,
): AnalysisPreferences {
  if (raw?.included_points?.length) {
    return {
      included_points: [...raw.included_points],
      aspect_orbs: mergeAspectOrbs(raw.aspect_orbs),
    };
  }
  return defaultPreferencesForAvailableBodies(chartBodyNames);
}

export function toIncludedSet(prefs: AnalysisPreferences): Set<string> {
  return new Set(prefs.included_points);
}
