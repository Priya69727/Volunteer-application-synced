import { Button, Icon, PageHeader, Status } from "../components/shared";
import { useState } from "react";
import { usePortal } from "../components/portal";
import { api, fmtDate, toneFor } from "../api";

function TimelineItem({ title, text, date, done, current }: { title: string; text: string; date: string; done?: boolean; current?: boolean }) {
  return <div className={`timeline-item ${done ? "done" : ""} ${current ? "current" : ""}`}><span>{done ? <Icon name="check" size={15} /> : current ? <span /> : ""}</span><div><strong>{title}</strong><p>{text}</p></div><small>{date}</small></div>;
}

export function ApplicationDetailPage({ go }: { go: (p: "applications") => void }) {
  const { applications, selectedApplicationId, reload } = usePortal();
  const [error, setError] = useState("");
  const application = applications.find((item) => item.id === selectedApplicationId) ?? applications[0];
  const withdraw = async () => { try { await api.withdraw(application!.id); await reload(); go("applications"); } catch (e) { setError(e instanceof Error ? e.message : "Could not withdraw."); } };
  if (!application) return <div className="page"><Button onClick={() => go("applications")}>Back to applications</Button><h1>No application selected</h1></div>;
  const isApproved = application.status === "Approved";
  return (
    <div className="page">
      <button className="back-link" onClick={() => go("applications")}><Icon name="arrow" size={17} />Back to applications</button>
      <PageHeader title={application.name} description={`Application submitted on ${fmtDate(application.appliedOn)}`} action={<Status tone={toneFor(application.status)}>{application.status}</Status>} />
      <div className="detail-layout">
        <main className="panel timeline-card"><h2>Application progress</h2><p>We’ll keep this timeline updated as your application moves forward.</p>
          <div className="timeline"><TimelineItem title="Application submitted" text="Your profile and availability were shared." date={fmtDate(application.appliedOn)} done /><TimelineItem title={application.status} text={isApproved ? "The organising team approved your application." : "The organising team is reviewing your application."} date={fmtDate(application.updatedAt, { day: "numeric", month: "short" })} current /><TimelineItem title="Decision" text="You’ll receive a notification when a decision is made." date={isApproved ? "Complete" : "Next step"} done={isApproved} /></div>
        </main>
        <aside className="panel next-steps"><span className="eyebrow">WHAT’S NEXT?</span><h3>{isApproved ? "You’re approved" : "No action needed right now"}</h3><p>{isApproved ? "Your next steps will be shared by the organising team." : "Most applications are reviewed within 3–5 days. We’ll notify you as soon as there’s an update."}</p><hr /><strong>Opportunity details</strong><p><Icon name="calendar" size={17} />{application.type} · {fmtDate(application.appliedOn)}</p>{error && <p role="alert" className="form-error">{error}</p>}{application.status === "Pending" && <Button variant="danger" onClick={withdraw}>Withdraw application</Button>}</aside>
      </div>
    </div>
  );
}
