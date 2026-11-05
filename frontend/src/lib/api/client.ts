const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body as BodyInit : JSON.stringify(body),
  });
  if (!response.ok) {
    let payload: { error?: string; message?: string; details?: unknown } | null = null;
    try { payload = await response.json(); } catch {}
    // Session expired / signed out elsewhere: tell the app so it can return to the login screen.
    if (response.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/login"))
      window.dispatchEvent(new Event("hrms:unauthorized"));
    throw new ApiError(response.status, payload?.error || payload?.message || `Request failed (${response.status})`, payload?.details);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function query(params: Record<string, string | number | boolean | undefined | null>) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== "") s.set(k, String(v)); });
  const q = s.toString();
  return q ? `?${q}` : "";
}
