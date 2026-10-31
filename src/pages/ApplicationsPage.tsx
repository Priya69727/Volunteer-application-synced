import { useState } from "react";
import { Button, Empty, Icon, PageHeader, Status, type Page } from "../components/shared";
import { usePortal } from "../components/portal";
import { fmtDate, toneFor } from "../api";

export function ApplicationsPage({ go }: { go: (p: Page) => void }) {
  const { applications, selectApplication } = usePortal();
  const [tab, setTab] = useState("All");
  const tabs = ["All", "Pending", "Under review", "Approved", "Rejected"];
  const visible = tab === "All" ? applications : applications.filter((a) => a.status === tab);
  return (
    <div className="page">
      <PageHeader title="My Applications" description="Track your applications and see what happens next." action={<Button onClick={() => go("projects")}>Find opportunities</Button>} />
      <div className="tabs">{tabs.map((t) => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}{t === "All" && <span>{applications.length}</span>}</button>)}</div>
      <div className="panel table-wrap">
        <table><thead><tr><th>Opportunity</th><th>Applied</th><th>Status</th><th>Last updated</th><th><span className="sr-only">Action</span></th></tr></thead>
        <tbody>{visible.map((a) => <tr key={a.id}><td><span className="table-icon"><Icon name={a.type === "Event" ? "calendar" : "folder"} /></span><span><strong>{a.name}</strong><small>{a.type}</small></span></td><td>{fmtDate(a.appliedOn)}</td><td><Status tone={toneFor(a.status)}>{a.status}</Status></td><td>{fmtDate(a.updatedAt, { day: "numeric", month: "short" })}</td><td><button onClick={() => { selectApplication(a.id); go("application-detail"); }}>View <Icon name="chevron" size={15} /></button></td></tr>)}</tbody></table>
        {visible.length === 0 && <Empty title={`No ${tab.toLowerCase()} applications`} body="Applications with this status will appear here." />}
      </div>
    </div>
  );
}
