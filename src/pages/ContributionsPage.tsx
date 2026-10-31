import { Icon, PageHeader, SectionTitle, StatCard, Status } from "../components/shared";
import { usePortal } from "../components/portal";
import { fmtDate } from "../api";

export function ContributionsPage() {
  const { me, contributions } = usePortal();
  const s = me!.stats;
  const max = Math.max(1, ...contributions.monthly.map((m) => m.hours));
  const total = contributions.byKind.reduce((n, k) => n + k.hours, 0);
  const top = contributions.byKind[0];
  return (
    <div className="page">
      <PageHeader title="My Contributions" description="Celebrate the time and energy you’ve given to your community." />
      <div className="stats-grid"><StatCard icon="clock" label="Total volunteer hours" value={`${Math.round(s.hours * 10) / 10} hrs`} note="Present and late days" tone="green" /><StatCard icon="folder" label="Projects contributed to" value={String(s.projects)} note="Distinct projects" tone="blue" /><StatCard icon="calendar" label="Events participated" value={String(s.events)} note="Distinct events" tone="amber" /><StatCard icon="check" label="Contribution days" value={String(s.days)} note="Days with logged hours" tone="violet" /></div>
      <div className="contribution-grid"><section className="panel chart-card"><SectionTitle title="Volunteer hours" /><div className="chart">{contributions.monthly.length ? contributions.monthly.map((m) => <div key={m.month}><span className="chart-bar" style={{ height: `${Math.max(6, (m.hours / max) * 100)}%` }} /><small>{m.month}</small></div>) : <p>No hours logged yet.</p>}</div></section>
      <section className="panel cause-card"><span className="eyebrow">TOP ACTIVITY TYPE</span><span className="cause-icon"><Icon name="heart" /></span><h3>{top ? top.kind : "—"}</h3><strong>{top ? `${Math.round(top.hours * 10) / 10} hours` : "0 hours"}</strong><p>{top && total ? `${Math.round((top.hours / total) * 100)}% of your total contribution` : "Hours appear once staff log your attendance."}</p></section></div>
      <SectionTitle title="Contribution history" /><div className="panel table-wrap"><table><thead><tr><th>Date</th><th>Opportunity</th><th>Role</th><th>Hours</th><th>Attendance</th></tr></thead><tbody>
        {contributions.items.map((c, i) => <tr key={i}><td>{fmtDate(c.date)}</td><td><strong>{c.name}</strong><small>{c.kind}</small></td><td>{c.role}</td><td><strong>{c.hours} hrs</strong></td><td><Status tone={c.status === "Absent" ? "danger" : c.status === "Late" ? "warning" : "success"}>{c.status}</Status></td></tr>)}
      </tbody></table>{!contributions.items.length && <p style={{ padding: 16 }}>No attendance has been recorded for you yet.</p>}</div>
    </div>
  );
}
