import { useState } from "react";
import { Button, Empty, Icon, PageHeader } from "../components/shared";
import { usePortal } from "../components/portal";
import { ago, fmtDate, fmtTime } from "../api";

export function NotificationsPage({ initialNotificationId }: { initialNotificationId?: string | null }) {
  const { notifications, readIds, markRead, markUnread } = usePortal();
  const [selectedId, setSelectedId] = useState(initialNotificationId ?? null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const selected = notifications.find((notification) => notification.id === selectedId);
  const unread = notifications.filter((notification) => !readIds.includes(notification.id));
  const visible = filter === "unread" ? unread : notifications;

  const openNotification = (id: string) => {
    setSelectedId(id);
    markRead([id]);
  };
  const toggleRead = (id: string, isUnread: boolean) => {
    if (isUnread) markRead([id]);
    else markUnread([id]);
  };

  return (
    <div className="page">
      <PageHeader
        title="Notifications"
        description="A private inbox for updates about your applications, assignments, and hours."
        action={<Button variant="secondary" disabled={unread.length === 0} onClick={() => markRead(unread.map((notification) => notification.id))}>Mark all as read</Button>}
      />
      <section className="notification-inbox" aria-label="Notification inbox">
        <div className="panel inbox-list">
          <div className="inbox-toolbar">
            <div><strong>INBOX</strong><span>{unread.length} UNREAD</span></div>
            <div className="inbox-filters" aria-label="Filter notifications">
              <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
              <button className={filter === "unread" ? "active" : ""} onClick={() => setFilter("unread")}>Unread</button>
            </div>
          </div>
          <div className="inbox-items">
            {visible.map((notification) => {
              const isUnread = !readIds.includes(notification.id);
              return (
                <article className={`inbox-row ${selectedId === notification.id ? "selected" : ""} ${isUnread ? "unread" : ""}`} key={notification.id}>
                  <button className="inbox-open" onClick={() => openNotification(notification.id)} aria-label={`Open notification: ${notification.title}`}>
                    <span className="notification-icon"><Icon name="bell" size={18} /></span>
                    <span className="inbox-copy"><strong>{notification.title}</strong><small>{ago(notification.at) || "Update"}</small></span>
                    {isUnread && <i aria-label="Unread" />}
                  </button>
                  <button className="inbox-toggle" onClick={() => toggleRead(notification.id, isUnread)} aria-label={isUnread ? "Mark as read" : "Mark as unread"}>
                    {isUnread ? "Mark read" : "Mark unread"}
                  </button>
                </article>
              );
            })}
            {!visible.length && <Empty title={filter === "unread" ? "No unread messages" : "Your inbox is quiet"} body={filter === "unread" ? "You’ve read every update." : "Updates from the Hope Foundation team will appear here."} />}
          </div>
        </div>
        <section className={`panel inbox-detail ${selected ? "has-selection" : ""}`} aria-live="polite">
          {selected ? <>
            <div className="message-detail-top"><span className="notification-icon"><Icon name="bell" size={20} /></span><span className="eyebrow">MESSAGE DETAILS</span></div>
            <h2>{selected.title}</h2>
            <time dateTime={selected.at ?? undefined}>{selected.at ? `${fmtDate(selected.at)}${fmtTime(selected.at) ? ` · ${fmtTime(selected.at)}` : ""}` : "Date not provided"}</time>
            <p className="message-body">{selected.body}</p>
            <div className="message-actions">
              <Button variant="secondary" onClick={() => toggleRead(selected.id, !readIds.includes(selected.id))}>
                {readIds.includes(selected.id) ? "Mark as unread" : "Mark as read"}
              </Button>
            </div>
          </> : <div className="inbox-placeholder"><span><Icon name="message" size={24} /></span><h2>YOUR UPDATES, IN ONE PLACE</h2><p>Select a notification to open and read the full message.</p></div>}
        </section>
      </section>
    </div>
  );
}
