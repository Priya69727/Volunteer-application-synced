import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, ApiError, type Application, type Assignment, type CommunityConnections, type CommunityPerson, type CommunityPost, type Contributions, type Me, type Opportunity, type PortalNotification } from "../api";
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
  communityPosts: CommunityPost[];
  communityPeople: CommunityPerson[];
  communityConnections: CommunityConnections;
  reloadCommunity: () => Promise<void>;
  readIds: string[];
  markRead: (ids: string[]) => void;
  markUnread: (ids: string[]) => void;
  reload: () => Promise<void>;
  selected: Selected;
  select: (s: Selected) => void;
  selectedApplicationId: string;
  selectApplication: (id: string) => void;
  selectedAssignmentId: string;
  selectAssignment: (id: string) => void;
  updateCommunityVisibility: (visible: boolean) => Promise<void>;
  saveProfile: () => Promise<void>;
};

const PortalContext = createContext<PortalValue | null>(null);
const READ_KEY = "volunteer-portal-read-notifications";
const emptyContrib: Contributions = {
  items: [],
  monthly: [],
  byKind: [],
  summary: { currentMonth: 0, previousMonth: 0, currentYear: 0, previousYear: 0, attendanceRate: 0 },
  recognitions: [],
};
const emptyConnections: CommunityConnections = { incoming: [], outgoing: [], accepted: [] };

export function PortalProvider({ children, logout }: { children: React.ReactNode; logout: () => void }) {
  const { data, setData } = useDemoStore();
  const [me, setMe] = useState<Me | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [contributions, setContributions] = useState<Contributions>(emptyContrib);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communityPeople, setCommunityPeople] = useState<CommunityPerson[]>([]);
  const [communityConnections, setCommunityConnections] = useState<CommunityConnections>(emptyConnections);
  const [readIds, setReadIds] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(READ_KEY) || "[]"); } catch { return []; } });
  const [selected, setSelected] = useState<Selected>(() => readNavigationState().selected);
  const [selectedApplicationId, setSelectedApplicationId] = useState(() => readNavigationState().selectedApplicationId);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(() => readNavigationState().selectedAssignmentId);
  const [error, setError] = useState("");
  const [communityError, setCommunityError] = useState("");
  const [notificationError, setNotificationError] = useState("");
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

  const reloadCommunity = useCallback(async () => {
    try {
      const [posts, people, connections] = await Promise.all([api.communityPosts(), api.communityPeople(), api.communityConnections()]);
      setCommunityPosts(posts.items);
      setCommunityPeople(people.items);
      setCommunityConnections(connections);
      setCommunityError("");
    } catch (e) {
      setCommunityError(e instanceof Error ? e.message : "Could not load the volunteer community.");
    }
  }, []);

  const reload = useCallback(async () => {
    try {
      const [m, o, a, s, c, n] = await Promise.all([api.portalMe(), api.opportunities(), api.applications(), api.assignments(), api.contributions(), api.notifications()]);
      setMe(m); setOpportunities(o.items); setApplications(a.items); setAssignments(s.items); setContributions(c); setNotifications(n.items);
      const communityReadStates = new Map(n.items.filter((item) => item.id.startsWith("community-")).map((item) => [item.id, Boolean(item.read)]));
      setReadIds((current) => {
        const next = current.filter((id) => !communityReadStates.has(id));
        n.items.forEach((item) => { if (item.id.startsWith("community-") && item.read) next.push(item.id); });
        try { localStorage.setItem(READ_KEY, JSON.stringify(next)); } catch { /* browser storage is optional */ }
        return next;
      });
      const p = m.profile;
      const next = { fullName: p.fullName, phone: p.phone, location: p.location, about: p.about, skills: p.skills, unavailableDays: p.unavailableDays };
      synced.current = snapshot(next);
      setData((cur) => ({ ...cur, profile: { ...cur.profile, fullName: p.fullName, email: p.email, phone: p.phone, location: p.location, about: p.about, skills: p.skills }, unavailableDays: p.unavailableDays }));
      setError("");
      await reloadCommunity();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout();
      else setError(e instanceof Error ? e.message : "Could not load your portal.");
    } finally {
      setReady(true);
    }
  }, [logout, reloadCommunity, setData]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { const t = window.setInterval(() => void reload(), 60000); return () => window.clearInterval(t); }, [reload]);

  const saveProfile = useCallback(async () => {
    const next = { fullName: data.profile.fullName, phone: data.profile.phone, location: data.profile.location, about: data.profile.about, skills: data.profile.skills, unavailableDays: data.unavailableDays };
    if (snapshot(next) === synced.current || !ready) return;
    const saved = await api.updateProfile(next);
    synced.current = snapshot({ ...next, fullName: saved.fullName });
    setMe((cur) => (cur ? { ...cur, profile: saved } : cur));
  }, [data.profile, data.unavailableDays, ready]);
  const updateCommunityVisibility = useCallback(async (visible: boolean) => {
    const saved = await api.updateProfile({ communityVisible: visible });
    if (saved.communityVisible !== visible) {
      throw new Error("The Hope Foundation backend needs to be restarted to update profile visibility.");
    }
    setMe((current) => (current ? { ...current, profile: saved } : current));
  }, []);

  // Skills and availability save automatically (debounced); text fields save via the Profile / Settings buttons.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => { void saveProfile().catch(() => undefined); }, 1200);
    return () => window.clearTimeout(t);
  }, [data.profile.skills, data.unavailableDays, ready, saveProfile]);

  const persistReadState = (ids: string[], isRead: boolean) => {
    const communityIds = ids.filter((id) => id.startsWith("community-"));
    if (!communityIds.length) return;
    void api.markCommunityNotifications(communityIds, isRead).then(() => setNotificationError("")).catch((e) => {
      setNotificationError(e instanceof Error ? e.message : "Could not update notification status.");
    });
  };
  const markRead = (ids: string[]) => {
    setReadIds((cur) => {
      const next = [...new Set([...cur, ...ids])];
      try { localStorage.setItem(READ_KEY, JSON.stringify(next)); } catch { /* browser storage is optional */ }
      return next;
    });
    persistReadState(ids, true);
  };
  const markUnread = (ids: string[]) => {
    setReadIds((cur) => {
      const unread = new Set(ids);
      const next = cur.filter((id) => !unread.has(id));
      try { localStorage.setItem(READ_KEY, JSON.stringify(next)); } catch { /* browser storage is optional */ }
      return next;
    });
    persistReadState(ids, false);
  };

  if (!ready) return <div className="page"><p role="status">Loading your volunteer portal…</p></div>;
  if (error && !me) return <div className="page"><h1>We couldn’t open your portal</h1><p role="alert" className="form-error">{error}</p><button className="btn btn-secondary" onClick={logout}>Back to sign in</button></div>;

  return (
    <PortalContext.Provider value={{ me, opportunities, applications, assignments, contributions, notifications, communityPosts, communityPeople, communityConnections, reloadCommunity, readIds, markRead, markUnread, reload, selected, select, selectedApplicationId, selectApplication, selectedAssignmentId, selectAssignment, updateCommunityVisibility, saveProfile }}>
      {children}
      {communityError && <p role="alert" className="toast">{communityError}</p>}
      {notificationError && <p role="alert" className="toast">{notificationError}</p>}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const v = useContext(PortalContext);
  if (!v) throw new Error("usePortal must be used within PortalProvider");
  return v;
}
