/** Polar placement compatible with Kerykeion (offset = 360 − Descendant longitude). */

export function normalizeDeg(d: number): number {
  let x = d % 360;
  if (x < 0) x += 360;
  return x;
}

/** Radians from ecliptic longitude (0–360) on the wheel; seventh = 7th house cusp (Descendant). */
export function lonToRadial(lon: number, seventhHouseLon: number): number {
  const offset = 360 - normalizeDeg(seventhHouseLon);
  const slice = lon / 30;
  return (Math.PI / 6) * slice + (Math.PI * offset) / 180;
}

export function polarToXY(
  cx: number,
  cy: number,
  r: number,
  radial: number,
): { x: number; y: number } {
  return {
    x: cx + r * Math.cos(radial),
    y: cy - r * Math.sin(radial),
  };
}

export function lonToXY(
  lon: number,
  seventhHouseLon: number,
  cx: number,
  cy: number,
  r: number,
): { x: number; y: number } {
  return polarToXY(cx, cy, r, lonToRadial(lon, seventhHouseLon));
}

export function formatDmsWithinSign(position: number): string {
  const deg = Math.floor(position);
  const min = Math.floor((position - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}'`;
}
