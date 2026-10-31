import { useState } from "react";
import { DashboardPage } from "../pages/DashboardPage.tsx";
import { ProfilePage } from "../pages/ProfilePage.tsx";
import { ProjectsPage } from "../pages/ProjectsPage.tsx";
import { ProjectDetailPage } from "../pages/ProjectDetailPage.tsx";
import { ApplicationsPage } from "../pages/ApplicationsPage.tsx";
import { ApplicationDetailPage } from "../pages/ApplicationDetailPage.tsx";
import { AssignmentsPage } from "../pages/AssignmentsPage.tsx";
import { AssignmentDetailPage } from "../pages/AssignmentDetailPage.tsx";
import { ContributionsPage } from "../pages/ContributionsPage.tsx";
import { PostsPage } from "../pages/PostsPage.tsx";
import { NetworkingPage } from "../pages/NetworkingPage.tsx";
import { SettingsPage } from "../pages/SettingsPage.tsx";
import { NotificationsPage } from "../pages/NotificationsPage.tsx";
import { useDemoStore } from "./demoStore";
import { usePortal } from "./portal";
import { ago } from "../api";
import { Avatar, Icon, Logo, NotificationItem, nav, pageTitles, type Page } from "./shared";
import { readNavigationState, updateNavigationState } from "./navigationState";

export function Sidebar({ page, setPage, open, close, logout }: { page: Page; setPage: (p: Page) => void; open: boolean; close: () => void; logout: () => void }) {
  const go = (p: Page) => { setPage(p); close(); };
  const { me } = usePortal();
  return (
    <>
      {open && <button className="sidebar-scrim" onClick={close} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-head"><Logo inverse /><button className="icon-btn sidebar-close" onClick={close}><Icon name="x" /></button></div>
        <nav className="nav-list" aria-label="Main navigation">
          {nav.map((item) => (
            <button key={item.id} className={`nav-item ${page === item.id || page.startsWith(item.id.slice(0, -1)) ? "active" : ""}`} onClick={() => go(item.id)}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className={`nav-item ${page === "settings" ? "active" : ""}`} onClick={() => go("settings")}><Icon name="settings" /><span>Settings</span></button>
          <button className="nav-item" onClick={logout}><Icon name="logout" /><span>Logout</span></button>
          <div className="impact-mini"><span className="impact-icon"><Icon name="heart" size={18} /></span><div><strong>{Math.round((me?.stats.hours ?? 0) * 10) / 10} hours</strong><small>of impact so far</small></div></div>
        </div>
      </aside>
    </>
  );
}

export function Topbar({ page, setPage, openMenu, searchQuery, onSearchChange }: { page: Page; setPage: (p: Page) => void; openMenu: () => void; searchQuery: string; onSearchChange: (query: string) => void }) {
  const { data } = useDemoStore();
  const { notifications, readIds, markRead, me } = usePortal();
  const [notes, setNotes] = useState(false);
  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;
  return (
    <header className="topbar">
      <div className="topbar-title">
        <button className="icon-btn mobile-menu" onClick={openMenu}><Icon name="menu" /></button>
        <span>Volunteer portal</span><Icon name="chevron" size={14} /><strong>{pageTitles[page]}</strong>
      </div>
      <div className="topbar-actions">
        <div className="top-search"><Icon name="search" size={18} /><input aria-label="Search opportunities" placeholder="Search opportunities..." value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setPage("projects"); }} /></div>
        <div className="notification-wrap">
          <button className="icon-btn notification-button" onClick={() => setNotes(!notes)} aria-label={`Notifications, ${unreadCount} unread`}><Icon name="bell" />{unreadCount > 0 && <span />}</button>
          {notes && (
            <div className="notification-popover">
              <div className="popover-head"><strong>Notifications</strong><button onClick={() => { setPage("notifications"); setNotes(false); }}>View all</button></div>
              {notifications.slice(0, 3).map((n) => <NotificationItem key={n.id} title={n.title} body={n.body} time={ago(n.at)} unread={!readIds.includes(n.id)} onClick={() => { markRead([n.id]); setPage("notifications"); setNotes(false); }} />)}
              {!notifications.length && <p style={{ padding: 16 }}>No notifications yet.</p>}
            </div>
          )}
        </div>
        <button className="profile-button" onClick={() => setPage("profile")}><Avatar name={data.profile.fullName} image={data.profile.avatar} /><span><strong>{data.profile.fullName}</strong><small>{me?.profile.status === "Active" ? "Active volunteer" : "Applicant"}</small></span><Icon name="chevron" size={15} /></button>
      </div>
    </header>
  );
}

export function AppShell({ logout }: { logout: () => void }) {
  const [navigation] = useState(readNavigationState);
  const [page, setPage] = useState<Page>(() => {
    if (navigation.page === "project-detail" && !navigation.selected) return "dashboard";
    if (navigation.page === "application-detail" && !navigation.selectedApplicationId) return "applications";
    if (navigation.page === "assignment-detail" && !navigation.selectedAssignmentId) return "assignments";
    return navigation.page;
  });
  const [menu, setMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState(navigation.searchQuery);
  const changePage = (nextPage: Page) => {
    updateNavigationState({ page: nextPage });
    setPage(nextPage);
  };
  const changeSearchQuery = (query: string) => {
    updateNavigationState({ searchQuery: query });
    setSearchQuery(query);
  };
  let content: React.ReactNode;
  switch (page) {
    case "dashboard": content = <DashboardPage go={changePage} />; break;
    case "profile": content = <ProfilePage go={changePage} />; break;
    case "projects": content = <ProjectsPage go={changePage} searchQuery={searchQuery} onSearchQueryChange={changeSearchQuery} />; break;
    case "project-detail": content = <ProjectDetailPage go={changePage} />; break;
    case "events": content = <ProjectsPage go={changePage} events searchQuery={searchQuery} onSearchQueryChange={changeSearchQuery} />; break;
    case "applications": content = <ApplicationsPage go={changePage} />; break;
    case "application-detail": content = <ApplicationDetailPage go={changePage} />; break;
    case "assignments": content = <AssignmentsPage go={changePage} />; break;
    case "assignment-detail": content = <AssignmentDetailPage go={changePage} />; break;
    case "contributions": content = <ContributionsPage />; break;
    case "posts": content = <PostsPage go={changePage} />; break;
    case "networking": content = <NetworkingPage />; break;
    case "settings": content = <SettingsPage />; break;
    case "notifications": content = <NotificationsPage />; break;
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={changePage} open={menu} close={() => setMenu(false)} logout={logout} />
      <div className="app-main">
        <Topbar page={page} setPage={changePage} openMenu={() => setMenu(true)} searchQuery={searchQuery} onSearchChange={changeSearchQuery} />
        {content}
      </div>
    </div>
  );
}
