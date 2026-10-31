import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, ApiError, type Application, type Assignment, type Contributions, type Me, type Opportunity, type PortalNotification } from "../api";
import { useDemoStore } from "./demoStore";
import { readNavigationState, updateNavigationState } from "./navigationState";

type Selected = { kind: "project" | "event"; id: string } | null;
type PortalValue = {
  me: Me | null;
  opportunities: Opportunity[];
  applications: Application[];
  assignments: Assignment[];
  contributions: Contributions;
  notifications: PortalNotification[];
  readIds: string[];
  markRead: (ids: string[]) => void;
  reload: () => Promise<void>;
  selected: Selected;
  select: (s: Selected) => void;
  selectedApplicationId: string;
  selectApplication: (id: string) => void;
  selectedAssignmentId: string;
  selectAssignment: (id: string) => void;
  saveProfile: () => Promise<void>;
};

const PortalContext = createContext<PortalValue | null>(null);
const READ_KEY = "volunteer-portal-read-notifications";
const emptyContrib: Contributions = { items: [], monthly: [], byKind: [] };

export function PortalProvider({ children, logout }: { children: React.ReactNode; logout: () => void }) {
  const { data, setData } = useDemoStore();
  const [me, setMe] = useState<Me | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [contributions, setContributions] = useState<Contributions>(emptyContrib);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(READ_KEY) || "[]"); } catch { return []; } });
  const [selected, setSelected] = useState<Selected>(() => readNavigationState().selected);
  const [selectedApplicationId, setSelectedApplicationId] = useState(() => readNavigationState().selectedApplicationId);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(() => readNavigationState().selectedAssignmentId);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const synced = useRef("");

  const select = useCallback((value: Selected) => {
    setSelected(value);
    updateNavigationState({ selected: value });
  }, []);
  const selectApplication = useCallback((id: string) => {
    setSelectedApplicationId(id);
    updateNavigationState({ selectedApplicationId: id });
  }, []);
  const selectAssignment = useCallback((id: string) => {
    setSelectedAssignmentId(id);
    updateNavigationState({ selectedAssignmentId: id });
  }, []);

  const snapshot = (p: { fullName: string; phone: string; location: string; about: string; skills: string[]; unavailableDays: string[] }) => JSON.stringify([p.fullName, p.phone, p.location, p.about, p.skills, p.unavailableDays]);

  const reload = useCallback(async () => {
    try {
      const [m, o, a, s, c, n] = await Promise.all([api.portalMe(), api.opportunities(), api.applications(), api.assignments(), api.contributions(), api.notifications()]);
      setMe(m); setOpportunities(o.items); setApplications(a.items); setAssignments(s.items); setContributions(c); setNotifications(n.items);
      const p = m.profile;
      const next = { fullName: p.fullName, phone: p.phone, location: p.location, about: p.about, skills: p.skills, unavailableDays: p.unavailableDays };
      synced.current = snapshot(next);
      setData((cur) => ({ ...cur, profile: { ...cur.profile, fullName: p.fullName, email: p.email, phone: p.phone, location: p.location, about: p.about, skills: p.skills }, unavailableDays: p.unavailableDays }));
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout();
      else setError(e instanceof Error ? e.message : "Could not load your portal.");
    } finally {
      setReady(true);
    }
  }, [logout, setData]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { const t = window.setInterval(() => void reload(), 60000); return () => window.clearInterval(t); }, [reload]);

  const saveProfile = useCallback(async () => {
    const next = { fullName: data.profile.fullName, phone: data.profile.phone, location: data.profile.location, about: data.profile.about, skills: data.profile.skills, unavailableDays: data.unavailableDays };
    if (snapshot(next) === synced.current || !ready) return;
    const saved = await api.updateProfile(next);
    synced.current = snapshot({ ...next, fullName: saved.fullName });
    setMe((cur) => (cur ? { ...cur, profile: saved } : cur));
  }, [data.profile, data.unavailableDays, ready]);

  // Skills and availability save automatically (debounced); text fields save via the Profile / Settings buttons.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => { void saveProfile().catch(() => undefined); }, 1200);
    return () => window.clearTimeout(t);
  }, [data.profile.skills, data.unavailableDays, ready, saveProfile]);

  const markRead = (ids: string[]) => setReadIds((cur) => {
    const next = [...new Set([...cur, ...ids])];
    try { localStorage.setItem(READ_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  if (!ready) return <div className="page"><p role="status">Loading your volunteer portal…</p></div>;
  if (error && !me) return <div className="page"><h1>We couldn’t open your portal</h1><p role="alert" className="form-error">{error}</p><button className="btn btn-secondary" onClick={logout}>Back to sign in</button></div>;

  return (
    <PortalContext.Provider value={{ me, opportunities, applications, assignments, contributions, notifications, readIds, markRead, reload, selected, select, selectedApplicationId, selectApplication, selectedAssignmentId, selectAssignment, saveProfile }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const v = useContext(PortalContext);
  if (!v) throw new Error("usePortal must be used within PortalProvider");
  return v;
}
