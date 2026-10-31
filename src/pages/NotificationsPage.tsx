import { Button, Empty, NotificationItem, PageHeader } from "../components/shared";
import { usePortal } from "../components/portal";
import { ago } from "../api";

export function NotificationsPage() {
  const { notifications, readIds, markRead } = usePortal();
  const unread = notifications.filter((n) => !readIds.includes(n.id));
  return (
    <div className="page"><PageHeader title="Notifications" description="Updates about your applications, assignments, and hours." action={<Button variant="secondary" disabled={unread.length === 0} onClick={() => markRead(unread.map((n) => n.id))}>Mark all as read</Button>} /><div className="panel notifications-list">
      {notifications.map((n) => <NotificationItem key={n.id} title={n.title} body={n.body} time={ago(n.at)} unread={!readIds.includes(n.id)} onClick={() => markRead([n.id])} />)}
      {!notifications.length && <Empty title="You’re all caught up" body="Updates from the Hope Foundation team will appear here." />}
    </div></div>
  );
}
