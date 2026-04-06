/**
 * Thin fetch wrappers for the AstraMap API (JSON only).
 * Errors surface as thrown Error with status and body text.
 * Every request automatically carries the Supabase Bearer token when available.
 */
import { API_URL } from "./config";
import { supabase } from "./supabaseClient";

export async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const r = await fetch(`${API_URL}${path}`, { cache: "no-store", headers });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const headers = await authHeaders();
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const headers = await authHeaders();
  const r = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await authHeaders();
  const r = await fetch(`${API_URL}${path}`, { method: "DELETE", headers });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

/** Multipart POST (e.g. audio upload for Whisper). Do not set Content-Type; browser sets boundary. */
export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const headers = await authHeaders();
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}
