import { useState } from "react";

export type Page =
  | "dashboard"
  | "profile"
  | "projects"
  | "project-detail"
  | "events"
  | "applications"
  | "application-detail"
  | "assignments"
  | "assignment-detail"
  | "contributions"
  | "posts"
  | "networking"
  | "settings"
  | "notifications";

export type IconName =
  | "home" | "user" | "folder" | "calendar" | "file" | "clipboard" | "clock"
  | "message" | "users" | "settings" | "logout" | "bell" | "search" | "menu"
  | "chevron" | "arrow" | "map" | "check" | "heart" | "share" | "plus"
  | "filter" | "briefcase" | "sparkle" | "x" | "edit" | "shield" | "camera";

export type AuthView = "login" | "register" | "forgot" | "reset";

export const photos = {
  volunteers:
    "https://images.unsplash.com/photo-1560220604-1985ebfe28b1?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200",
  cleanup:
    "https://images.unsplash.com/photo-1616680214429-d79397e56688?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200",
  community:
    "https://images.unsplash.com/photo-1680759291088-d3e935226178?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200",
  children:
    "https://images.unsplash.com/photo-1524069290683-0457abfe42c3?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200",
};

export const nav: { id: Page; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "profile", label: "My Profile", icon: "user" },
  { id: "projects", label: "Projects", icon: "folder" },
  { id: "events", label: "Events", icon: "calendar" },
  { id: "applications", label: "My Applications", icon: "file" },
  { id: "assignments", label: "My Assignments", icon: "clipboard" },
  { id: "contributions", label: "My Contributions", icon: "clock" },
  { id: "posts", label: "Posts", icon: "message" },
  { id: "networking", label: "Networking", icon: "users" },
];

export const pageTitles: Record<Page, string> = {
  dashboard: "Dashboard",
  profile: "My Profile",
  projects: "Projects",
  "project-detail": "Project Details",
  events: "Events",
  applications: "My Applications",
  "application-detail": "Application Details",
  assignments: "My Assignments",
  "assignment-detail": "Assignment Details",
  contributions: "My Contributions",
  posts: "Community",
  networking: "Networking",
  settings: "Settings",
  notifications: "Notifications",
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 10.8 12 3l9 7.8"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    folder: <><path d="M3 6h7l2 2h9v11H3z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    file: <><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    message: <><path d="M4 4h16v13H8l-4 4z"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M17 11a4 4 0 0 0 0-8M22 21v-2a4 4 0 0 0-3-3.7"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8V21h-3.6v-.2A2 2 0 0 0 9 19a2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1A2 2 0 0 0 4.6 15a2 2 0 0 0-1.8-1.2H3v-3.6h.2A2 2 0 0 0 5 9a2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1A2 2 0 0 0 9 4.6a2 2 0 0 0 1.2-1.8V3h3.6v.2A2 2 0 0 0 15 5a2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1a2 2 0 0 0-.4 1.8 2 2 0 0 0 1.8 1.2h.2v3.6h-.2A2 2 0 0 0 19.4 15Z"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M21 3v18h-7"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    arrow: <path d="m5 12 14 0m-5-5 5 5-5 5"/>,
    map: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
    share: <><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    filter: <path d="M4 6h16M7 12h10M10 18h4"/>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18"/></>,
    sparkle: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM19 16v5M16.5 18.5h5"/>,
    x: <path d="m6 6 12 12M18 6 6 18"/>,
    edit: <><path d="m14 5 5 5L8 21H3v-5zM16 3l5 5"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>,
    camera: <><path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="3"/></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Button({ children, variant = "primary", icon, onClick, type = "button", disabled = false }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: IconName;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button type={type} className={`btn btn-${variant}`} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
    </button>
  );
}

export function Status({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "success" | "warning" | "danger" | "neutral" }) {
  return <span className={`status status-${tone}`}><span className="status-dot" />{children}</span>;
}

export function StatCard({ icon, label, value, note, tone }: { icon: IconName; label: string; value: string; note: string; tone: string }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}><Icon name={icon} /></span><div><span className="stat-label">{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}

export function Avatar({ name = "Asha Sharma", large = false, image }: { name?: string; large?: boolean; image?: string }) {
  return <span className={`avatar ${large ? "avatar-large" : ""}`} aria-label={name}>{image ? <img src={image} alt="" /> : name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span>;
}

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={`brand ${inverse ? "brand-inverse" : ""}`}>
      <img src="/hope-foundation-logo.png" alt="Hope Foundation" />
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function SectionTitle({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) {
  return <div className="section-title"><h2>{title}</h2>{action && onClick && <button onClick={onClick}>{action}<Icon name="arrow" size={16} /></button>}</div>;
}

export function NotificationItem({ title, body, time, unread = false, onClick }: { title: string; body: string; time: string; unread?: boolean; onClick?: () => void }) {
  return <button className={`notification-item ${unread ? "unread" : ""}`} onClick={onClick}><span className="notification-icon"><Icon name="bell" size={18} /></span><span><strong>{title}</strong><p>{body}</p><small>{time}</small></span>{unread && <i />}</button>;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return <div className="empty"><span><Icon name="file" /></span><h3>{title}</h3><p>{body}</p></div>;
}

export function Detail({ label, value, editing, onChange, type = "text" }: { label: string; value: string; editing: boolean; onChange?: (value: string) => void; type?: string }) {
  return <label className="detail-field"><span>{label}</span>{editing ? <input type={type} value={value} onChange={(event) => onChange?.(event.target.value)} /> : <strong>{value}</strong>}</label>;
}

export function Toggle({ label, detail, initial = false, checked, onChange }: { label: string; detail: string; initial?: boolean; checked?: boolean; onChange?: (checked: boolean) => void }) {
  const [internal, setInternal] = useState(initial);
  const on = checked ?? internal;
  const toggle = () => {
    if (checked === undefined) setInternal(!internal);
    onChange?.(!on);
  };
  return <div className="toggle-row"><div><strong>{label}</strong><small>{detail}</small></div><button type="button" className={`toggle ${on ? "on" : ""}`} onClick={toggle} aria-label={`Toggle ${label}`} aria-pressed={on}><span /></button></div>;
}

export function AuthField({ label, placeholder, type = "text", action, name, minLength }: { label: string; placeholder: string; type?: string; action?: React.ReactNode; name?: string; minLength?: number }) {
  return <label className="auth-field"><span>{label}</span><div><input required name={name} type={type} minLength={minLength} placeholder={placeholder} autoComplete={type === "password" ? "current-password" : undefined} />{action}</div></label>;
}

export function FilterBar({
  placeholder = "Search projects...",
  query = "",
  onQueryChange,
  category = "",
  onCategoryChange,
  categories = [],
  location = "",
  onLocationChange,
  locations = [],
  skill = "",
  onSkillChange,
  skills = [],
}: {
  placeholder?: string;
  query?: string;
  onQueryChange?: (value: string) => void;
  category?: string;
  onCategoryChange?: (value: string) => void;
  categories?: string[];
  location?: string;
  onLocationChange?: (value: string) => void;
  locations?: string[];
  skill?: string;
  onSkillChange?: (value: string) => void;
  skills?: string[];
}) {
  return (
    <div className="filter-bar">
      <label className="search-field"><Icon name="search" size={18} /><input placeholder={placeholder} value={query} onChange={(event) => onQueryChange?.(event.target.value)} /></label>
      {categories.length > 0 && <label className="filter-select"><Icon name="filter" size={17} /><select aria-label="Category" value={category} onChange={(event) => onCategoryChange?.(event.target.value)}><option value="">Category</option>{categories.map((option) => <option key={option}>{option}</option>)}</select></label>}
      {locations.length > 0 && <label className="filter-select"><select aria-label="Location" value={location} onChange={(event) => onLocationChange?.(event.target.value)}><option value="">Location</option>{locations.map((option) => <option key={option}>{option}</option>)}</select></label>}
      {skills.length > 0 && <label className="filter-select"><select aria-label="Skills" value={skill} onChange={(event) => onSkillChange?.(event.target.value)}><option value="">Skills</option>{skills.map((option) => <option key={option}>{option}</option>)}</select></label>}
    </div>
  );
}

export const opportunities = [
  { title: "Food Distribution Program", type: "Community Care", date: "20 Oct", location: "Pune", spots: "10 volunteers", image: photos.volunteers, skills: ["Community service", "Coordination"], match: "98% match" },
  { title: "Clean Shores Initiative", type: "Environment", date: "27 Oct", location: "Mumbai", spots: "18 volunteers", image: photos.cleanup, skills: ["Teamwork", "Outdoors"], match: "91% match" },
  { title: "Learning Together", type: "Education", date: "2 Nov", location: "Pune", spots: "8 volunteers", image: photos.children, skills: ["Teaching", "Communication"], match: "87% match" },
];

export type CardItem = { title: string; type: string; date: string; location: string; spots: string; image: string; skills: string[]; match: string; summary?: string };

export function OpportunityCard({ item, compact = false, onView }: { item: CardItem; compact?: boolean; onView: () => void }) {
  return (
    <article className={`opportunity-card ${compact ? "compact" : ""}`}>
      <div className="opportunity-image"><img src={item.image} alt="Volunteers working together" /><span>{item.match}</span></div>
      <div className="opportunity-body">
        <span className="eyebrow">{item.type}</span><h3>{item.title}</h3>
        {!compact && <p>{item.summary || "Make a meaningful difference alongside local communities and other dedicated volunteers."}</p>}
        <div className="meta-row"><span><Icon name="calendar" size={16} />{item.date}</span><span><Icon name="map" size={16} />{item.location || "Location TBC"}</span></div>
        {item.skills.length > 0 && <div className="skill-row">{item.skills.map((s) => <span key={s}>{s}</span>)}</div>}
        <div className="card-footer"><span><Icon name="users" size={16} />{item.spots}</span><button onClick={onView}>View details <Icon name="arrow" size={16} /></button></div>
      </div>
    </article>
  );
}

export function cardFor(o: { title: string; type: string; kind: string; location: string; startsAt: string | null; capacity: number | null; registered: number | null; summary: string; skills: string[] }, fmt: (iso: string | null) => string): CardItem {
  const pool = [photos.volunteers, photos.cleanup, photos.community, photos.children];
  const image = pool[[...o.title].reduce((n, c) => n + c.charCodeAt(0), 0) % pool.length];
  const spots = o.capacity ? `${Math.max(o.capacity - (o.registered ?? 0), 0)} of ${o.capacity} spots left` : o.kind === "event" ? "Open to volunteers" : "Volunteers welcome";
  return { title: o.title, type: o.type, date: fmt(o.startsAt), location: o.location, spots, image, skills: o.skills, match: o.kind === "event" ? "Event" : "Project", summary: o.summary };
}

export const apps = [
  { name: "Blood Donation Camp", type: "Event", date: "2 Oct 2026", status: "Under review", tone: "warning" as const, updated: "Today" },
  { name: "Learning Together", type: "Project", date: "28 Sep 2026", status: "Approved", tone: "success" as const, updated: "Today" },
  { name: "Clean Shores Initiative", type: "Project", date: "24 Sep 2026", status: "Pending", tone: "info" as const, updated: "24 Sep" },
  { name: "Tree Plantation Drive", type: "Event", date: "10 Sep 2026", status: "Rejected", tone: "danger" as const, updated: "14 Sep" },
];

export const people = [
  { name: "Ravi Kumar", place: "Pune", skills: ["Environment", "Team leadership"], initials: "RK" },
  { name: "Neha Joshi", place: "Mumbai", skills: ["Teaching", "Community care"], initials: "NJ" },
  { name: "Sara Ali", place: "Pune", skills: ["Healthcare", "Event management"], initials: "SA" },
  { name: "John Dsouza", place: "Nashik", skills: ["Photography", "Social media"], initials: "JD" },
];

export function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <div><span><Icon name={icon} /></span><p>{label}</p><strong>{value}</strong></div>;
}
