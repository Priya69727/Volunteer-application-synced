import { useState } from "react";
import { Button, Icon, PageHeader, Status } from "../components/shared";
import { usePortal } from "../components/portal";
import { fmtDate, fmtTime } from "../api";

export function AssignmentDetailPage({ go }: { go: (p: "assignments") => void }) {
  const { assignments, selectedAssignmentId } = usePortal();
  const [showInstructions, setShowInstructions] = useState(false);
  const a = assignments.find((x) => x.id === selectedAssignmentId) ?? assignments[0];
  if (!a) return <div className="page"><button className="back-link" onClick={() => go("assignments")}><Icon name="arrow" size={17} />Back to assignments</button><h1>No assignment selected</h1></div>;
  const d = a.startsAt ?? a.startsOn;
  const lines = a.responsibilities.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div className="page">
      <button className="back-link" onClick={() => go("assignments")}><Icon name="arrow" size={17} />Back to assignments</button>
      <PageHeader title={a.title} description="Your assignment details and day-of instructions." action={<Status tone={a.group === "Completed" ? "success" : "info"}>{a.group === "Current" ? "In progress" : a.group}</Status>} />
      <div className="assignment-hero panel"><div className="assignment-date large"><strong>{fmtDate(d, { day: "numeric" })}</strong><span>{fmtDate(d, { month: "short" }).toUpperCase()}</span></div><div><span className="eyebrow">YOUR ROLE</span><h2>{a.role}</h2><p>{a.kind === "event" ? "Event" : "Project"} assignment{a.endsOn ? ` · until ${fmtDate(a.endsOn)}` : ""}</p></div>{lines.length > 0 && <Button onClick={() => setShowInstructions(!showInstructions)}>{showInstructions ? "Hide instructions" : "View instructions"}</Button>}</div>
      {showInstructions && <section className="panel profile-section"><h2>Day-of instructions</h2><ol>{lines.map((l, i) => <li key={i}>{l}</li>)}</ol></section>}
      <div className="detail-layout">
        <main className="panel detail-content padded"><h2>Schedule</h2><div className="detail-facts"><Fact icon="clock" label="Time" value={fmtTime(a.startsAt) || fmtDate(a.startsOn)} /><Fact icon="map" label="Location" value={a.location || "To be confirmed"} /></div>
          {lines.length > 0 && <><h2>Your responsibilities</h2><ul className="check-list">{lines.map((l, i) => <li key={i}><Icon name="check" />{l}</li>)}</ul></>}</main>
        <aside className="panel contact-card"><span className="eyebrow">YOUR CONTACT</span><div><Avatar name={a.contactName} /><span><strong>{a.contactName}</strong><small>Program Coordinator</small></span></div>{a.contactEmail && <a className="btn btn-secondary" href={`mailto:${a.contactEmail}?subject=${encodeURIComponent(a.title)}`}><Icon name="message" size={18} />Send message</a>}</aside>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: "clock" | "map"; label: string; value: string }) {
  return <div><span><Icon name={icon} /></span><p>{label}</p><strong>{value}</strong></div>;
}

function Avatar({ name }: { name: string }) {
  return <span className="avatar" aria-label={name}>{name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span>;
}
