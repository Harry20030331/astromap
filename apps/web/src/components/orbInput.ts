import type { AspectOrbKey } from "@/lib/chartPreferences";

const ORB_MAX = 15;

/** Accepts decimal input with `.` or `,`; rejects empty, non-numeric, negative, or > 15°. */
export function parseAspectOrbInput(raw: string): { ok: true; value: number } | { ok: false; message: string } {
  const s = raw.trim().replace(",", ".");
  if (s === "") {
    return { ok: false, message: "Enter a number (0–15)." };
  }
  if (!/^\d+(\.\d*)?$/.test(s)) {
    return { ok: false, message: "Use digits only (e.g. 6 or 6.5)." };
  }
  const v = Number(s);
  if (!Number.isFinite(v)) {
    return { ok: false, message: "Invalid number." };
  }
  if (v < 0) {
    return { ok: false, message: "Orb cannot be negative." };
  }
  if (v > ORB_MAX) {
    return { ok: false, message: `Orb cannot exceed ${ORB_MAX}°.` };
  }
  return { ok: true, value: v };
}

export function formatOrbForInput(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  const t = rounded.toFixed(2).replace(/\.?0+$/, "");
  return t;
}

export function orbInputsFromDraft(
  orbs: Record<AspectOrbKey, number>,
  keys: readonly AspectOrbKey[],
): Record<AspectOrbKey, string> {
  const out = {} as Record<AspectOrbKey, string>;
  for (const k of keys) {
    out[k] = formatOrbForInput(orbs[k] ?? 0);
  }
  return out;
}
