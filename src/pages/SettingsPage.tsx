import { useState } from "react";
import { Button, Detail, Icon, PageHeader, Toggle } from "../components/shared";
import { useDemoStore } from "../components/demoStore";
import { usePortal } from "../components/portal";

export function SettingsPage() {
  const { data, setData } = useDemoStore();
  const [activeTab, setActiveTab] = useState("Account");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { saveProfile } = usePortal();
  const updateProfile = (field: keyof typeof data.profile, value: string) => setData((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
  const save = async () => {
    try { await saveProfile(); setSaveError(""); setSaved(true); window.setTimeout(() => setSaved(false), 2200); } catch (e) { setSaveError(e instanceof Error ? e.message : "Could not save."); }
  };
  return (
    <div className="page settings-page"><PageHeader title="Settings" description="Manage your account, privacy, and volunteer notifications." action={<Button onClick={save}>Save changes</Button>} />
      {saveError && <p role="alert" className="form-error">{saveError}</p>}{saved && <div role="status" className="toast"><Icon name="check" />Settings saved.</div>}
      <div className="settings-layout"><aside className="panel settings-nav">{[["Account", "user"], ["Security", "shield"], ["Notifications", "bell"], ["Privacy", "users"]].map(([label, icon]) => <button key={label} className={activeTab === label ? "active" : ""} onClick={() => setActiveTab(label)}><Icon name={icon as "user" | "shield" | "bell" | "users"} />{label}</button>)}</aside><main>
        {activeTab === "Account" && <section className="panel settings-section"><h2>Account information</h2><p>Keep your personal and contact details up to date.</p><div className="details-grid"><Detail label="Full name" value={data.profile.fullName} editing onChange={(value) => updateProfile("fullName", value)} /><Detail label="Email address" value={data.profile.email} editing={false} type="email" /><Detail label="Phone number" value={data.profile.phone} editing onChange={(value) => updateProfile("phone", value)} type="tel" /><Detail label="Location" value={data.profile.location} editing onChange={(value) => updateProfile("location", value)} /></div></section>}
        {activeTab === "Security" && <section className="panel settings-section"><h2>Security</h2><p>Passwords are managed by the Hope Foundation team. Contact your volunteer coordinator or an administrator to change yours.</p></section>}
        {activeTab === "Notifications" && <section className="panel settings-section"><h2>Notifications</h2><p>Choose which updates you’d like to receive.</p>{["Application updates", "Assignment notifications", "Event reminders", "Community notifications"].map((label, index) => <Toggle key={label} label={label} detail={["Status changes and decisions", "Instructions and schedule reminders", "Reminders before your upcoming events", "Reactions, comments, and connection requests"][index]} checked={data.notificationPreferences[index]} onChange={(checked) => setData((current) => ({ ...current, notificationPreferences: current.notificationPreferences.map((value, itemIndex) => itemIndex === index ? checked : value) }))} />)}</section>}
        {activeTab === "Privacy" && <section className="panel settings-section"><h2>Privacy</h2><p>Control how your volunteer profile appears in this demo.</p><Toggle label="Show profile in volunteer search" detail="Let other volunteers find your profile" checked={data.privacyPreferences[0]} onChange={(checked) => setData((current) => ({ ...current, privacyPreferences: [checked, current.privacyPreferences[1]] }))} /><Toggle label="Share skills with organisers" detail="Include your skills when applying to an opportunity" checked={data.privacyPreferences[1]} onChange={(checked) => setData((current) => ({ ...current, privacyPreferences: [current.privacyPreferences[0], checked] }))} /></section>}
      </main></div>
    </div>
  );
}
