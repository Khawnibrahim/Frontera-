import { supabase } from "@/integrations/supabase/client";

/** Nest API base — local dev default; override via `VITE_FRONTERA_API_URL`. */
export const FRONTERA_API_BASE =
  (import.meta.env.VITE_FRONTERA_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3000";

async function authHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(extra);
  headers.set("accept", "application/json");
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function fronteraGetJson<T>(path: string): Promise<T> {
  const res = await fetch(`${FRONTERA_API_BASE}${path}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `API ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fronteraPostJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${FRONTERA_API_BASE}${path}`, {
    method: "POST",
    headers: await authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(res, path);
}

export async function fronteraPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${FRONTERA_API_BASE}${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: formData,
  });
  return parseJsonResponse<T>(res, path);
}

export function buildQuery(
  params: Record<string, string | number | boolean | string[] | undefined | null>,
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((item) => sp.append(key, item));
    } else {
      sp.append(key, String(value));
    }
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

/** Download a binary response (Excel export) and trigger browser save. */
export async function fronteraDownload(path: string, fallbackFilename: string): Promise<void> {
  const res = await fetch(`${FRONTERA_API_BASE}${path}`, {
    headers: await authHeaders({ accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Download ${path} → ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function parseJsonResponse<T>(res: Response, path: string): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const record = parsed as { message?: string | string[]; error?: string } | null;
    const msg = record?.message || record?.error || text || `API ${path} → ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join("; ") : String(msg));
  }
  return parsed as T;
}
