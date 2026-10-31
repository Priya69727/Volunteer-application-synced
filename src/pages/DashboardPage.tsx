import { Avatar, Button, Icon, OpportunityCard, SectionTitle, StatCard, Status, cardFor, type Page } from "../components/shared";
import { usePortal } from "../components/portal";
import { fmtDate, fmtTime, toneFor } from "../api";

function MiniApplication({ title, type, status, applied, onClick }: { title: string; type: string; status: string; applied: string; onClick: () => void }) {
  return <button className="mini-application" onClick={onClick}><span className="mini-icon"><Icon name={type === "Event" ? "calendar" : "folder"} /></span><span><strong>{title}</strong><small>{type} · Applied {applied}</small></span><Status tone={toneFor(status)}>{status}</Status><Icon name="chevron" size={16} /></button>;
}

export function DashboardPage({ go }: { go: (p: Page) => void }) {
  const { me, opportunities, applications, assignments, select, selectApplication, selectAssignment } = usePortal();
  const today = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const stats = me!.stats;
  const next = assignments.find((a) => a.group !== "Completed");
  const nextDate = next?.startsAt ?? next?.startsOn ?? null;
  const upcoming = assignments.filter((a) => a.group === "Upcoming").length;
  return (
    <div className="page">
      <section className="welcome-card">
        <div><span className="welcome-kicker"><Icon name="sparkle" size={16} /> {today}</span><h1>Welcome back, {me!.profile.fullName.split(" ")[0]}</h1><p>Here’s what’s happening in your volunteering journey.</p><Button onClick={() => go("projects")}>Explore opportunities</Button></div>
        <div className="next-up"><span className="next-label">UP NEXT</span>
          {next ? <><div className="date-tile"><strong>{fmtDate(nextDate, { day: "numeric" })}</strong><span>{fmtDate(nextDate, { month: "short" }).toUpperCase()}</span></div><div><strong>{next.title}</strong><p>{[fmtTime(next.startsAt), next.location].filter(Boolean).join(" · ") || next.role}</p><button onClick={() => { selectAssignment(next.id); go("assignment-detail"); }}>View assignment <Icon name="arrow" size={15} /></button></div></>
            : <div><strong>No assignments yet</strong><p>Apply for a project or event to get started.</p></div>}
        </div>
      </section>
      <div className="stats-grid">
        <StatCard icon="calendar" label="Upcoming assignments" value={String(upcoming)} note={upcoming ? "See My Assignments" : "Nothing scheduled"} tone="blue" />
        <StatCard icon="file" label="Active applications" value={String(stats.activeApplications)} note={`${stats.applications} submitted in total`} tone="amber" />
        <StatCard icon="briefcase" label="Current assignments" value={String(stats.assignments)} note="Pending or active" tone="violet" />
        <StatCard icon="clock" label="Volunteer hours" value={String(Math.round(stats.hours * 10) / 10)} note={`${stats.days} contribution days`} tone="green" />
      </div>
      <div className="dashboard-grid">
        <section>
          <SectionTitle title="Open opportunities" action="View all" onClick={() => go("projects")} />
          <div className="opportunity-grid dashboard-opportunities">{opportunities.length ? opportunities.slice(0, 2).map((o) => <OpportunityCard item={cardFor(o, (d) => fmtDate(d, { day: "numeric", month: "short" }))} compact key={`${o.kind}-${o.id}`} onView={() => { select({ kind: o.kind, id: o.id }); go("project-detail"); }} />) : <p>No open opportunities right now. Check back soon.</p>}</div>
        </section>
        <aside>
          <SectionTitle title="My applications" action="View all" onClick={() => go("applications")} />
          <div className="panel application-mini-list">
            {applications.slice(0, 3).map((a) => <MiniApplication key={a.id} title={a.name} type={a.type} status={a.status} applied={fmtDate(a.appliedOn, { day: "numeric", month: "short" })} onClick={() => { selectApplication(a.id); go("application-detail"); }} />)}
            {!applications.length && <p style={{ padding: 16 }}>You haven’t applied yet.</p>}
          </div>
        </aside>
      </div>
      <div className="bottom-grid">
        <section className="panel contribution-panel">
          <div><span className="eyebrow">YOUR IMPACT</span><h2>{Math.round(stats.hours * 10) / 10} hours of positive change</h2><p>You’ve contributed to {stats.projects} projects and {stats.events} community events.</p><Button variant="secondary" onClick={() => go("contributions")}>View contributions</Button></div>
          <div className="impact-ring"><div><strong>{Math.round(stats.hours)}</strong><span>hours</span></div></div>
        </section>
        <section className="panel community-callout">
          <div className="avatar-stack"><Avatar name={me!.profile.fullName} /></div>
          <div><h3>Your community</h3><p>Connect with volunteers who share your interests.</p></div>
          <Button variant="ghost" onClick={() => go("networking")}>Find people</Button>
        </section>
      </div>
    </div>
  );
}
