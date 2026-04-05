const ZODIAC_3 = [
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
] as const;

/** Index 0 = Aries … 11 = Pisces, or -1 if unknown. */
export function zodiacSlot(apiSign: string): number {
  const u = apiSign.slice(0, 3).toUpperCase();
  return ZODIAC_3.indexOf(u as (typeof ZODIAC_3)[number]);
}

/** 3-letter sign label consistent with the natal wheel (API signs are e.g. Ari, Tau). */
export function signAbbrev(apiSign: string): string {
  const i = zodiacSlot(apiSign);
  return i >= 0 ? ZODIAC_3[i] : apiSign.slice(0, 3).toUpperCase();
}
