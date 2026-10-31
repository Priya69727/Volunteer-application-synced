export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: "include",
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError(0, "The server is unavailable. Check that the Hope Foundation backend is running.");
  }
  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => ({}))) as { detail?: string | { msg?: string }[]; message?: string };
  if (!response.ok) {
    const detail = typeof payload.detail === "string" ? payload.detail : payload.detail?.map((i) => i.msg).filter(Boolean).join(" ");
    throw new ApiError(response.status, payload.message || detail || `Request failed (${response.status}).`);
  }
  return payload as T;
}

export type AuthUser = { id: string; fullName: string; email: string; role: string };
export type Profile = { id: string; fullName: string; email: string; phone: string; location: string; about: string; skills: string[]; unavailableDays: string[]; status: string; joinedOn: string | null; role: string };
export type Stats = { hours: number; days: number; events: number; projects: number; applications: number; activeApplications: number; assignments: number };
export type Me = { profile: Profile; stats: Stats };
export type Opportunity = {
  id: string; kind: "project" | "event"; title: string; type: string; location: string; summary: string; description: string;
  startsAt: string | null; endsAt: string | null; status: string; organiser: string; skills: string[]; capacity: number | null; registered: number | null;
  myApplication?: { id: string; status: string } | null;
};
export type Application = { id: string; name: string; type: string; targetKind: string; targetId: string | null; status: string; appliedOn: string; updatedAt: string; motivation: string };
export type Assignment = {
  id: string; title: string; kind: string; role: string; responsibilities: string; startsOn: string | null; endsOn: string | null; startsAt: string | null; endsAt: string | null;
  location: string; status: string; group: "Current" | "Upcoming" | "Completed"; contactName: string; contactEmail: string | null;
};
export type Contributions = {
  items: { date: string; name: string; kind: string; role: string; hours: number; status: string }[];
  monthly: { month: string; hours: number }[];
  byKind: { kind: string; hours: number }[];
};
export type PortalNotification = { id: string; title: string; body: string; at: string | null };

export const api = {
  me: () => request<{ user: AuthUser }>("/auth/me"),
  login: (email: string, password: string) => request<{ user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (fullName: string, email: string, password: string) => request<{ user: AuthUser }>("/auth/register", { method: "POST", body: JSON.stringify({ fullName, email, password }) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  portalMe: () => request<Me>("/portal/me"),
  updateProfile: (body: Partial<Pick<Profile, "fullName" | "phone" | "location" | "about" | "skills" | "unavailableDays">>) => request<Profile>("/portal/me", { method: "PATCH", body: JSON.stringify(body) }),
  opportunities: (kind: "project" | "event" | "all" = "all") => request<{ items: Opportunity[] }>(`/portal/opportunities?kind=${kind}`),
  opportunity: (kind: "project" | "event", id: string) => request<Opportunity>(`/portal/opportunities/${kind}/${id}`),
  apply: (kind: "project" | "event", targetId: string, motivation = "") => request<{ id: string; status: string }>("/portal/applications", { method: "POST", body: JSON.stringify({ kind, targetId, motivation }) }),
  applications: () => request<{ items: Application[] }>("/portal/applications"),
  withdraw: (id: string) => request<void>(`/portal/applications/${id}`, { method: "DELETE" }),
  assignments: () => request<{ items: Assignment[] }>("/portal/assignments"),
  contributions: () => request<Contributions>("/portal/contributions"),
  notifications: () => request<{ items: PortalNotification[] }>("/portal/notifications"),
};

export const tones = { Pending: "info", "Under review": "warning", Approved: "success", Rejected: "danger" } as const;
export const toneFor = (status: string) => (tones as Record<string, "info" | "warning" | "success" | "danger">)[status] ?? "neutral";

export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!iso) return "TBC";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? "TBC" : new Intl.DateTimeFormat("en-IN", opts).format(d);
}
export const fmtTime = (iso: string | null | undefined) => (iso && iso.length > 10 ? fmtDate(iso, { hour: "numeric", minute: "2-digit" }) : "");
export function ago(iso: string | null | undefined) {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return `${Math.round(mins / 1440)} d ago`;
}
