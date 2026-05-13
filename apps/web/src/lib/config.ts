/** Base URL for the FastAPI backend (browser + server components). */
const raw =
  process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:8000";
/** Trailing slash + paths like `/geo/...` would produce `//geo/...` (404 on many hosts). */
export const API_URL = raw.replace(/\/+$/, "");
