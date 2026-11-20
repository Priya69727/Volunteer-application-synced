import { useCallback, useEffect, useState } from "react";
import { api, type CommunityReport } from "../api";
import { Button, Icon, Logo } from "../components/shared";

export function AdminModerationPage({ logout }: { logout: () => void }) {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.moderationReports();
      setReports(response.items);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load reported posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadReports(); }, [loadReports]);

  const decide = async (report: CommunityReport, action: "dismiss" | "remove") => {
    setBusyId(report.id);
    setError("");
    setNotice("");
    try {
      await api.decideCommunityReport(report.id, action);
      setReports((current) => current.filter((item) => item.id !== report.id));
      setNotice(action === "remove" ? "Post removed from the community feed." : "Report dismissed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not resolve this report.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="moderation-page">
      <header className="moderation-header">
        <Logo />
        <div><span className="eyebrow">ADMINISTRATION</span><h1>Community moderation</h1><p>Review reports submitted by volunteers.</p></div>
        <Button variant="secondary" icon="logout" onClick={logout}>Sign out</Button>
      </header>
      <main className="moderation-content">
        <div className="moderation-summary"><div><span className="eyebrow">OPEN REPORTS</span><strong>{reports.length}</strong></div><p>Review the reported content and choose whether to remove the post or dismiss the report.</p><Button variant="secondary" icon="arrow" onClick={() => void loadReports()}>Refresh</Button></div>
        {error && <p role="alert" className="form-error">{error}</p>}
        {notice && <p role="status" className="toast">{notice}</p>}
        {loading ? <p role="status">Loading reports…</p> : reports.length ? <div className="moderation-report-list">
          {reports.map((report) => <article className="panel moderation-report" key={report.id}>
            <header><span className="notification-icon"><Icon name="shield" /></span><div><strong>Reported by {report.reporterName}</strong><time dateTime={report.createdAt}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))}</time></div></header>
            <div className="moderation-reason"><span className="eyebrow">REPORT REASON</span><p>{report.reason}</p></div>
            <section className="moderation-post"><div><strong>{report.post.name}</strong><time dateTime={report.post.createdAt}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.post.createdAt))}</time></div><p>{report.post.text}</p>{report.post.image && <img src={report.post.image} alt="Reported community post attachment" />}</section>
            <footer><Button variant="secondary" disabled={busyId === report.id} onClick={() => void decide(report, "dismiss")}>Dismiss report</Button><Button disabled={busyId === report.id} onClick={() => void decide(report, "remove")}>{busyId === report.id ? "Saving…" : "Remove post"}</Button></footer>
          </article>)}
        </div> : <section className="panel moderation-empty"><span><Icon name="check" size={28} /></span><h2>No open reports</h2><p>New volunteer reports will appear here.</p></section>}
      </main>
    </div>
  );
}
