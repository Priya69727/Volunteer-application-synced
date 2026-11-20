import { useState } from "react";
import { Button, Detail, Icon, Toggle } from "../components/shared";
import { useDemoStore } from "../components/demoStore";
import { usePortal } from "../components/portal";

const settingsTabs = [
  { label: "Account", icon: "user" },
  { label: "Security", icon: "shield" },
  { label: "Notifications", icon: "bell" },
  { label: "Privacy", icon: "users" },
] as const;

export function SettingsPage() {
  const { data, setData } = useDemoStore();
  const [activeTab, setActiveTab] = useState("Account");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { me, saveProfile, updateCommunityVisibility } = usePortal();
  const updateProfile = (field: keyof typeof data.profile, value: string) => setData((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
  const save = async () => {
    try {
      await saveProfile();
      setEditing(false);
      setSaveError("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save your settings.");
    }
  };

  return (
    <div className="page settings-page">
      <div className="settings-title-row">
        <span className="settings-title-icon"><Icon name="settings" size={38} /></span>
        <div><h1>Settings</h1><p>Manage your account, privacy, and volunteer notifications.</p></div>
        <Button icon="check" onClick={save}>Save changes</Button>
      </div>
      {saveError && <p role="alert" className="form-error">{saveError}</p>}
      {saved && <div role="status" className="toast"><Icon name="check" />Settings saved.</div>}

      <section className="panel settings-overview">
        <span className="settings-overview-icon"><Icon name="sparkle" size={27} /></span>
        <div className="settings-overview-copy">
          <span className="eyebrow">YOUR VOLUNTEER SPACE</span>
          <h2>A better fit, for you</h2>
          <p>Keep your details current and choose how you stay connected to the causes you care about.</p>
        </div>
        <button className="settings-preferences-link" onClick={() => setActiveTab("Notifications")}>Update your preferences <Icon name="arrow" size={17} /></button>
      </section>

      <div className="settings-layout">
        <aside className="panel settings-nav">
          <div className="settings-nav-heading"><span><Icon name="settings" size={19} /></span><div><strong>Navigation</strong><small>Quick access to your account sections</small></div></div>
          <nav aria-label="Settings sections">
            {settingsTabs.map(({ label, icon }) => (
              <button key={label} className={activeTab === label ? "active" : ""} onClick={() => setActiveTab(label)} aria-current={activeTab === label ? "page" : undefined}>
                <Icon name={icon} /><span>{label}</span><Icon name="chevron" size={15} />
              </button>
            ))}
          </nav>
          <div className="settings-help-card"><span><Icon name="heart" size={19} /></span><div><strong>Need help?</strong><small>Reach out to your volunteer coordinator for support.</small></div></div>
        </aside>

        <main className="settings-main">
          {activeTab === "Account" && (
            <section className="panel settings-section">
              <div className="settings-section-heading">
                <span className="settings-section-icon"><Icon name="user" size={23} /></span>
                <div><h2>Account information</h2><p>Your personal and contact details.</p></div>
                <Button variant="secondary" icon={editing ? "check" : "edit"} onClick={() => setEditing(!editing)}>{editing ? "Done" : "Edit"}</Button>
              </div>
              <div className="details-grid">
                <Detail label="Full name" value={data.profile.fullName} editing={editing} onChange={(value) => updateProfile("fullName", value)} />
                <Detail label="Email address" value={data.profile.email} editing={false} type="email" />
                <Detail label="Phone number" value={data.profile.phone} editing={editing} onChange={(value) => updateProfile("phone", value)} type="tel" />
                <Detail label="Location" value={data.profile.location} editing={editing} onChange={(value) => updateProfile("location", value)} />
              </div>
            </section>
          )}
          {activeTab === "Security" && (
            <section className="panel settings-section">
              <div className="settings-section-heading"><span className="settings-section-icon"><Icon name="shield" size={23} /></span><div><h2>Security</h2><p>Keep your account safe.</p></div></div>
              <p>Passwords are managed by the Hope Foundation team. Contact your volunteer coordinator or an administrator to change yours.</p>
            </section>
          )}
          {activeTab === "Notifications" && (
            <section className="panel settings-section">
              <div className="settings-section-heading"><span className="settings-section-icon"><Icon name="bell" size={23} /></span><div><h2>Notifications</h2><p>Choose which updates you’d like to receive.</p></div></div>
              {["Application updates", "Assignment notifications", "Event reminders", "Community notifications"].map((label, index) => (
                <Toggle key={label} label={label} detail={["Status changes and decisions", "Instructions and schedule reminders", "Reminders before your upcoming events", "Reactions, comments, and connection requests"][index]} checked={data.notificationPreferences[index]} onChange={(checked) => setData((current) => ({ ...current, notificationPreferences: current.notificationPreferences.map((value, itemIndex) => itemIndex === index ? checked : value) }))} />
              ))}
            </section>
          )}
          {activeTab === "Privacy" && (
            <section className="panel settings-section">
              <div className="settings-section-heading"><span className="settings-section-icon"><Icon name="users" size={23} /></span><div><h2>Privacy</h2><p>Choose how your volunteer profile is shared.</p></div></div>
              <Toggle
                label="Show profile in volunteer search"
                detail="Let other volunteers find your active volunteer profile"
                checked={me?.profile.communityVisible ?? true}
                onChange={(checked) => {
                  void updateCommunityVisibility(checked).catch((error: unknown) => {
                    setSaveError(error instanceof Error ? error.message : "Could not update your profile visibility.");
                  });
                }}
              />
              <Toggle label="Share skills with organisers" detail="Include your skills when applying to an opportunity" checked={data.privacyPreferences[1]} onChange={(checked) => setData((current) => ({ ...current, privacyPreferences: [current.privacyPreferences[0], checked] }))} />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
