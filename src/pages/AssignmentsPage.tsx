import { useState } from "react";
import { Button, Empty, Icon, PageHeader, Status, type Page } from "../components/shared";
import { usePortal } from "../components/portal";
import { fmtDate, fmtTime, type Assignment } from "../api";

export function AssignmentsPage({ go }: { go: (p: Page) => void }) {
  const { assignments, selectAssignment } = usePortal();
  const [tab, setTab] = useState<Assignment["group"]>("Current");
  const visible = assignments.filter((a) => a.group === tab);
  return (
    <div className="page">
      <PageHeader title="My Assignments" description="Everything you need for your upcoming and completed activities." />
      <div className="tabs">{(["Current", "Upcoming", "Completed"] as const).map((name) => <button className={tab === name ? "active" : ""} key={name} onClick={() => setTab(name)}>{name}<span>{assignments.filter((a) => a.group === name).length}</span></button>)}</div>
      <div className="assignment-list">
        {visible.length ? visible.map((a) => <AssignmentCard key={a.id} a={a} open={() => { selectAssignment(a.id); go("assignment-detail"); }} />) : <Empty title={`No ${tab.toLowerCase()} assignments`} body="Assignments given to you by the team will appear here." />}
      </div>
    </div>
  );
}

function AssignmentCard({ a, open }: { a: Assignment; open: () => void }) {
  const d = a.startsAt ?? a.startsOn;
  return <article className="panel assignment-card"><div className="assignment-date"><strong>{fmtDate(d, { day: "numeric" })}</strong><span>{fmtDate(d, { month: "short" }).toUpperCase()}</span></div><div className="assignment-main"><div><span className="eyebrow">{a.kind.toUpperCase()} ASSIGNMENT</span><h3>{a.title}</h3><p><Icon name="briefcase" size={17} />{a.role}</p></div><Status tone={a.group === "Completed" ? "success" : a.group === "Upcoming" ? "info" : "warning"}>{a.group === "Current" ? "In progress" : a.group}</Status></div><div className="assignment-meta"><span><Icon name="calendar" size={17} />{fmtDate(d)} {fmtTime(a.startsAt)}</span><span><Icon name="map" size={17} />{a.location || "Location TBC"}</span></div><Button variant="secondary" onClick={open}>View assignment</Button></article>;
}
