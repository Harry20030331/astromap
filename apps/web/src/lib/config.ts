/** Base URL for the FastAPI backend (browser + server components). */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const DEBUG_QUERY_STREAM_LS = "aiastro.debugQueryStream";

/**
 * Console diagnostics for `/query/stream` (no Vercel env required):
 * - Append `?debugStream=1` to the URL on your domain, reload, then open DevTools → Console; or
 * - In the console: `localStorage.setItem("aiastro.debugQueryStream", "1")` then reload; to turn off: removeItem or set "0".
 * Optional: `NEXT_PUBLIC_DEBUG_QUERY_STREAM=1` at build time (e.g. staging).
 *
 * With this on, the client sends `debug_pipeline: true`; the API attaches the same fields to SSE `complete.debug`
 * (system_prompt, user_json, raw_markdown, parsed_response). Optional: `DEBUG_QUERY_PIPELINE=1` on the API for Render logs.
 */
export function isQueryStreamDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_DEBUG_QUERY_STREAM === "1") return true;
  try {
    if (window.localStorage.getItem(DEBUG_QUERY_STREAM_LS) === "1") return true;
  } catch {
    /* storage blocked */
  }
  const q = new URLSearchParams(window.location.search).get("debugStream");
  return q === "1" || q === "true";
}
