import { useState } from "react";
import { api, getProfileCompletion, type CommunityPost, fmtDate } from "../api";
import { Avatar, Button, Detail, Icon, SectionTitle, Status, type Page } from "../components/shared";
import { useDemoStore } from "../components/demoStore";
import { usePortal } from "../components/portal";
import { PostViewer } from "../components/PostViewer";

function formatPostDate(post: CommunityPost) {
  const date = new Date(post.createdAt);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function ProfilePage({ go }: { go: (page: Page) => void }) {
  const { data, setData } = useDemoStore();
  const [openedPostId, setOpenedPostId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const { me, contributions, saveProfile, communityPosts, communityConnections, reloadCommunity } = usePortal();
  const profileCompletion = me ? getProfileCompletion(me.profile) : 0;
  const profileSince = me?.profile.joinedOn
    ? `Volunteer since ${fmtDate(me.profile.joinedOn, { month: "long", year: "numeric" })}`
    : me?.profile.status === "Active"
      ? "Active Hope Foundation volunteer"
      : "Application in progress";
  const myPosts = communityPosts.filter((post) => post.authorId === me?.profile.id);
  const openedPost = myPosts.find((post) => post.id === openedPostId) ?? null;
  const updateProfile = (field: keyof typeof data.profile, value: string) => setData((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));

  const toggleLike = async (post: CommunityPost) => {
    try {
      if (post.likedByMe) await api.unlikeCommunityPost(post.id);
      else await api.likeCommunityPost(post.id);
      await reloadCommunity();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update your like.");
    }
  };
  const addComment = async (postId: string, comment: string) => {
    try {
      await api.commentCommunityPost(postId, comment);
      await reloadCommunity();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not add your comment.");
    }
  };
  const reportPost = async (postId: string, reason: string) => {
    await api.reportCommunityPost(postId, reason);
    setNotice("Thanks. Your report was sent to the moderation team.");
    setErr("");
    await reloadCommunity();
  };
  const addSkill = () => {
    const skill = newSkill.trim();
    if (!skill || data.profile.skills.includes(skill)) return;
    setData((current) => ({ ...current, profile: { ...current.profile, skills: [...current.profile.skills, skill] } }));
    setNewSkill("");
    setAddingSkill(false);
  };

  return (
    <div className="page">
      <section className="profile-hero panel">
        <div className="profile-avatar-wrap">
          <Avatar large name={data.profile.fullName} image={data.profile.avatar} />
          <label className="icon-btn" aria-label="Change photo"><Icon name="camera" size={17} /><input hidden type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2_000_000) { setErr("Choose a profile photo under 2 MB."); return; } const reader = new FileReader(); reader.onload = () => updateProfile("avatar", String(reader.result)); reader.onerror = () => setErr("Could not read the selected photo."); reader.readAsDataURL(file); }} /></label>
        </div>
        <div><div className="profile-name"><h1>{data.profile.fullName}</h1><Status tone={me?.profile.status === "Active" ? "success" : "info"}>{me?.profile.status === "Active" ? "Active volunteer" : "Applicant"}</Status></div><p><Icon name="map" size={16} /> {data.profile.location} · {profileSince}</p></div>
        <Button variant="secondary" icon="edit" onClick={async () => { if (editing) { try { await saveProfile(); setErr(""); setSaved(true); window.setTimeout(() => setSaved(false), 2500); } catch (error) { setErr(error instanceof Error ? error.message : "Could not save your profile."); return; } } setEditing(!editing); }}>{editing ? "Save profile" : "Edit profile"}</Button>
      </section>
      <section className="panel profile-completion-card">
        <div><span className="eyebrow">PROFILE COMPLETION</span><strong>{profileCompletion}%</strong></div>
        <div className="profile-progress-track" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileCompletion}><span style={{ width: `${profileCompletion}%` }} /></div>
        <p>{profileCompletion === 100 ? "Your profile is complete and ready to share with organisers." : "Add your contact details, a short introduction, and your skills to help organisers get to know you."}</p>
      </section>
      {saved && <p role="status" className="toast">Profile saved.</p>}{notice && <p role="status" className="toast">{notice}</p>}{err && <p role="alert" className="form-error">{err}</p>}
      <div className="profile-grid"><main>
        <section className="panel profile-section"><SectionTitle title="About me" />{editing ? <textarea value={data.profile.about} maxLength={1000} onChange={(event) => updateProfile("about", event.target.value)} /> : <p>{data.profile.about}</p>}</section>
        <section className="panel profile-section"><SectionTitle title="Personal details" /><div className="details-grid"><Detail label="Full name" value={data.profile.fullName} editing={editing} onChange={(value) => updateProfile("fullName", value)} /><Detail label="Email" value={data.profile.email} editing={false} type="email" /><Detail label="Phone" value={data.profile.phone} editing={editing} onChange={(value) => updateProfile("phone", value)} type="tel" /><Detail label="Location" value={data.profile.location} editing={editing} onChange={(value) => updateProfile("location", value)} /></div></section>
        <section className="panel profile-section my-posts-section">
          <SectionTitle title={`My Posts (${myPosts.length})`} action="Open community" onClick={() => go("posts")} />
          {myPosts.length ? <div className="profile-posts-grid">{myPosts.map((post) => <button className="profile-post-tile" key={post.id} type="button" onClick={() => setOpenedPostId(post.id)} aria-label="Open my post">{post.image ? <img src={post.image} alt="Your community post" /> : <div className="profile-post-art"><Icon name="heart" size={25} /></div>}<div className="profile-post-copy"><time dateTime={post.createdAt}>{formatPostDate(post)}</time><p>{post.text}</p></div></button>)}</div> : <div className="profile-posts-empty"><span><Icon name="message" size={22} /></span><strong>Your posts will appear here</strong><p>Share a story or update with the volunteer community.</p><Button variant="secondary" onClick={() => go("posts")}>Create a post</Button></div>}
        </section>
        <section className="panel profile-section"><SectionTitle title="Volunteer history" action="View all" onClick={() => go("contributions")} />{contributions.items.slice(0, 4).map((contribution, index) => <div className="history-item" key={`${contribution.date}-${index}`}><span className="history-icon"><Icon name={contribution.kind === "Event" ? "calendar" : "folder"} /></span><div><strong>{contribution.name}</strong><p>{contribution.role} · {fmtDate(contribution.date, { month: "short", year: "numeric" })}</p></div><strong>{contribution.hours} hrs</strong></div>)}{!contributions.items.length && <p>Your volunteering history will appear here.</p>}</section>
      </main><aside>
        <section className="panel profile-section connections-section"><SectionTitle title="My connections" action="Find volunteers" onClick={() => go("networking")} /><p className="connections-summary"><strong>{communityConnections.accepted.length}</strong> {communityConnections.accepted.length === 1 ? "volunteer in your community" : "volunteers in your community"}</p>{communityConnections.accepted.map((person) => <button className="connection-row" key={person.id} onClick={() => go("networking")}><Avatar name={person.name} /><span><strong>{person.name}</strong><small>{person.place || "Hope Foundation volunteer"}</small></span><Icon name="chevron" size={16} /></button>)}{!communityConnections.accepted.length && <div className="connections-empty"><span><Icon name="users" /></span><p>Your accepted connections will show up here.</p><Button variant="secondary" onClick={() => go("networking")}>Meet volunteers</Button></div>}</section>
        <section className="panel profile-section"><SectionTitle title="Skills" action={addingSkill ? "Cancel" : "+ Add"} onClick={() => setAddingSkill(!addingSkill)} />{addingSkill && <label className="search-field"><input aria-label="New skill" value={newSkill} onChange={(event) => setNewSkill(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSkill(); } }} placeholder="Add a skill" /><Button disabled={!newSkill.trim()} onClick={addSkill}>Add</Button></label>}<div className="skill-row">{data.profile.skills.map((skill) => <span key={skill}>{skill}{editing && <button aria-label={`Remove ${skill}`} onClick={() => setData((current) => ({ ...current, profile: { ...current.profile, skills: current.profile.skills.filter((item) => item !== skill) } }))}><Icon name="x" size={12} /></button>}</span>)}</div></section>
        <section className="panel profile-section"><SectionTitle title="Availability" />{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => { const unavailable = data.unavailableDays.includes(day); return <button className="availability" key={day} onClick={() => setData((current) => ({ ...current, unavailableDays: unavailable ? current.unavailableDays.filter((item) => item !== day) : [...current.unavailableDays, day] }))}><span>{day}</span>{unavailable ? <small>Not available</small> : <Status tone="success">Available</Status>}</button>; })}</section>
      </aside></div>
      {openedPost && <PostViewer post={openedPost} location={openedPost.place || data.profile.location || "Volunteer community"} currentProfileId={me?.profile.id ?? ""} onClose={() => setOpenedPostId(null)} onLike={() => toggleLike(openedPost)} onComment={(comment) => addComment(openedPost.id, comment)} onReport={(reason) => reportPost(openedPost.id, reason)} />}
    </div>
  );
}
