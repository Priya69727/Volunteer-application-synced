import { useEffect, useState } from "react";
import { Button, Fact, Icon, photos, type Page } from "../components/shared";
import { usePortal } from "../components/portal";
import { api, fmtDate, fmtTime, type Opportunity } from "../api";

export function ProjectDetailPage({ go }: { go: (p: Page) => void }) {
  const { selected, reload, selectApplication } = usePortal();
  const [item, setItem] = useState<Opportunity | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [motivation, setMotivation] = useState("");

  const load = () => { if (selected) api.opportunity(selected.kind, selected.id).then(setItem).catch((e: Error) => setError(e.message)); };
  useEffect(load, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = async () => {
    if (!item) return;
    setBusy(true); setError("");
    try { await api.apply(item.kind, item.id, motivation); await reload(); load(); } catch (e) { setError(e instanceof Error ? e.message : "Could not submit your application."); } finally { setBusy(false); }
  };

  if (!selected) return <div className="page"><button className="back-link" onClick={() => go("projects")}><Icon name="arrow" size={17} />Back to projects</button><h1>Choose an opportunity first</h1></div>;
  if (error && !item) return <div className="page"><button className="back-link" onClick={() => go("projects")}><Icon name="arrow" size={17} />Back to projects</button><p role="alert" className="form-error">{error}</p></div>;
  if (!item) return <div className="page"><p role="status">Loading…</p></div>;

  const when = [fmtDate(item.startsAt), item.endsAt ? `– ${fmtDate(item.endsAt)}` : ""].join(" ");
  const left = item.capacity ? Math.max(item.capacity - (item.registered ?? 0), 0) : null;
  const mine = item.myApplication;
  return (
    <div className="page detail-page">
      <button className="back-link" onClick={() => go(item.kind === "event" ? "events" : "projects")}><Icon name="arrow" size={17} />Back to {item.kind === "event" ? "events" : "projects"}</button>
      <div className="detail-hero"><img src={photos.volunteers} alt="Hope Foundation volunteers" /><div className="hero-overlay"><span className="eyebrow light">{item.type.toUpperCase()}</span><h1>{item.title}</h1><p>{item.summary}</p></div></div>
      <div className="detail-layout">
        <main className="detail-content">
          <section><h2>About this {item.kind}</h2><p>{item.description || item.summary || "Details will be shared by the organising team."}</p></section>
          <div className="detail-facts"><Fact icon="calendar" label="Date" value={when} />{fmtTime(item.startsAt) && <Fact icon="clock" label="Time" value={fmtTime(item.startsAt)} />}<Fact icon="map" label="Location" value={item.location || "To be confirmed"} />{item.capacity && <Fact icon="users" label="Team" value={`${item.capacity} volunteers needed`} />}</div>
        </main>
        <aside className="apply-card panel">
          {left !== null && <><span className="spots-label">{left} SPOTS LEFT</span><div className="spots-row"><strong>{item.registered} of {item.capacity}</strong><span>spots filled</span></div></>}
          {mine ? <><div className="success-box"><Icon name="check" /><div><strong>{mine.status === "Pending" ? "Application submitted" : `Application ${mine.status.toLowerCase()}`}</strong><p>Your application is listed in your tracker.</p></div></div><Button onClick={() => { selectApplication(mine.id); go("application-detail"); }}>Track application</Button></> : <>
            <label className="detail-field"><span>Why would you like to join? (optional)</span><textarea value={motivation} maxLength={1000} onChange={(e) => setMotivation(e.target.value)} /></label>
            {error && <p role="alert" className="form-error">{error}</p>}
            <Button onClick={apply} disabled={busy}>{busy ? "Submitting…" : `Apply for ${item.kind}`}</Button><p className="apply-note"><Icon name="shield" size={16} />Your application goes straight to the Hope Foundation volunteer team.</p>
          </>}
          <hr /><strong>Organised by</strong><div className="organiser"><span className="logo-mark small"><span>h</span></span><div><strong>{item.organiser}</strong><small>Hope Foundation</small></div></div>
        </aside>
      </div>
    </div>
  );
}
