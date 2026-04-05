/**
 * Thin fetch wrappers for the AstraMap API (JSON only).
 * Errors surface as thrown Error with status and body text.
 */
import { API_URL } from "./config";

export async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const r = await fetch(`${API_URL}${path}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

/** Multipart POST (e.g. audio upload for Whisper). Do not set Content-Type; browser sets boundary. */
export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    body: formData,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}
