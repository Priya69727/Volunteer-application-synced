import { useState } from "react";
import { api, type CommunityPerson, type CommunityPost } from "../api";
import { Button, FilterBar, Icon, PageHeader, SectionTitle } from "../components/shared";
import { PostViewer } from "../components/PostViewer";
import { usePortal } from "../components/portal";

type NetworkTab = "discover" | "requests" | "connections";

function handleFor(name: string) {
  return `@${name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, ".")}`;
}

function formatPostDate(post: CommunityPost) {
  const date = new Date(post.createdAt);
  return !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "Date unavailable";
}

export function NetworkingPage() {
  const { communityPeople, communityPosts, communityConnections, reloadCommunity, me } = usePortal();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");
  const [selected, setSelected] = useState<CommunityPerson | null>(null);
  const [openedPostId, setOpenedPostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NetworkTab>("discover");
  const [notice, setNotice] = useState("");
  const locations = [...new Set(communityPeople.map((person) => person.place).filter(Boolean))];
  const skills = [...new Set(communityPeople.flatMap((person) => person.skills))];
  const visible = communityPeople.filter((person) =>
    `${person.name} ${person.place} ${person.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase()) &&
    (!location || person.place === location) &&
    (!skill || person.skills.includes(skill)),
  );
  const openedPost = communityPosts.find((post) => post.id === openedPostId) ?? null;
  const selectedPerson = selected ? communityPeople.find((person) => person.id === selected.id) ?? selected : null;
  const selectedPosts = selectedPerson ? communityPosts.filter((post) => post.authorId === selectedPerson.id) : [];

  const requestConnection = async (person: CommunityPerson) => {
    try {
      await api.requestCommunityConnection(person.id);
      setNotice("Connection request sent.");
      await reloadCommunity();
      const current = communityPeople.find((item) => item.id === person.id);
      if (current) setSelected(current);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send the connection request.");
    }
  };

  const respondToConnection = async (id: string, action: "accept" | "decline") => {
    try {
      await api.decideCommunityConnection(id, action);
      setNotice(action === "accept" ? "Connection request accepted." : "Connection request declined.");
      await reloadCommunity();
      if (selected) {
        const current = communityPeople.find((person) => person.id === selected.id);
        if (current) setSelected(current);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update the connection request.");
    }
  };

  const toggleLike = async (post: CommunityPost) => {
    try {
      if (post.likedByMe) await api.unlikeCommunityPost(post.id);
      else await api.likeCommunityPost(post.id);
      await reloadCommunity();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update your like.");
    }
  };

  const addComment = async (postId: string, comment: string) => {
    try {
      await api.commentCommunityPost(postId, comment);
      await reloadCommunity();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not add your comment.");
    }
  };

  const reportPost = async (postId: string, reason: string) => {
    await api.reportCommunityPost(postId, reason);
    setNotice("Thanks. Your report was sent to the moderation team.");
    await reloadCommunity();
  };

  return (
    <div className="page networking-page">
      {!selected && <>
        <PageHeader title="Networking" description="Meet active volunteers, explore shared interests, and build your community." />
        <div className="network-tabs" role="tablist" aria-label="Volunteer network">
          <button role="tab" aria-selected={activeTab === "discover"} className={activeTab === "discover" ? "active" : ""} onClick={() => setActiveTab("discover")}>Discover people</button>
          <button role="tab" aria-selected={activeTab === "requests"} className={activeTab === "requests" ? "active" : ""} onClick={() => setActiveTab("requests")}>Requests <span>{communityConnections.incoming.length}</span></button>
          <button role="tab" aria-selected={activeTab === "connections"} className={activeTab === "connections" ? "active" : ""} onClick={() => setActiveTab("connections")}>My connections <span>{communityConnections.accepted.length}</span></button>
        </div>
        {activeTab === "discover" && <FilterBar placeholder="Search people or causes..." query={query} onQueryChange={setQuery} location={location} onLocationChange={setLocation} locations={locations} skill={skill} onSkillChange={setSkill} skills={skills} />}
      </>}

      {notice && <p role="status" className="toast">{notice}</p>}

      {selectedPerson ? (
        <section className="social-profile-detail panel">
          <button className="back-link" onClick={() => setSelected(null)}><Icon name="arrow" size={16} />Back to people</button>
          <div className="social-detail-main">
            <div className="person-avatar-ring person-avatar-ring-large"><div className={`person-avatar tone-${communityPeople.indexOf(selectedPerson) % 4}`}>{selectedPerson.initials}</div></div>
            <div className="social-detail-info">
              <span className="eyebrow">VOLUNTEER PROFILE</span>
              <h2>{selectedPerson.name}</h2>
              <p className="social-handle">{handleFor(selectedPerson.name)}</p>
              <div className="social-profile-stats">
                <span><strong>{selectedPosts.length}</strong> posts</span>
                <span><strong>{selectedPerson.skills.length}</strong> interests</span>
                <span><strong>{selectedPerson.mutualConnections}</strong> mutual connections</span>
              </div>
              <p className="social-bio">A Hope Foundation volunteer in {selectedPerson.place || "your community"}, interested in {selectedPerson.skills.join(" and ").toLowerCase() || "community service"}.</p>
              <p className="social-location"><Icon name="map" size={16} />{selectedPerson.place || "Location not provided"}</p>
              <div className="social-detail-actions">
                {selectedPerson.connectionStatus === "pending_received"
                  ? <Button onClick={() => selectedPerson.connectionId && void respondToConnection(selectedPerson.connectionId, "accept")}>Accept request</Button>
                  : <Button disabled={selectedPerson.connectionStatus !== "none"} onClick={() => void requestConnection(selectedPerson)}>{selectedPerson.connectionStatus === "connected" ? "Connected" : selectedPerson.connectionStatus === "pending_sent" ? "Request sent" : "Connect"}</Button>}
              </div>
            </div>
          </div>
          <div className="social-interests">
            <span className="eyebrow">CAUSES & INTERESTS</span>
            <div className="skill-row">{selectedPerson.skills.map((item) => <span key={item}>{item}</span>)}</div>
          </div>
          <div className="profile-posts-section">
            <div className="profile-posts-heading"><span className="eyebrow">COMMUNITY POSTS</span><strong>{selectedPosts.length}</strong></div>
            {selectedPosts.length ? (
              <div className="profile-posts-grid">
                {selectedPosts.map((post) => (
                  <button className="profile-post-tile" key={post.id} type="button" onClick={() => setOpenedPostId(post.id)} aria-label={`Open post by ${selectedPerson.name}`}>
                    {post.image
                      ? <img src={post.image} alt={`${selectedPerson.name}'s community post`} />
                      : <div className="profile-post-art"><Icon name="heart" size={25} /></div>}
                    <div className="profile-post-copy">
                      <time dateTime={post.createdAt}>{formatPostDate(post)}</time>
                      <p>{post.text}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="profile-posts-empty"><span><Icon name="message" size={22} /></span><strong>No posts yet</strong><p>When {selectedPerson.name.split(" ")[0]} shares with the community, their posts will appear here.</p></div>
            )}
          </div>
        </section>
      ) : activeTab === "discover" ? (
        <>
          <div className="networking-section-heading">
            <SectionTitle title="People to know" />
            <span>{visible.length} {visible.length === 1 ? "VOLUNTEER" : "VOLUNTEERS"}</span>
          </div>
          <div className="people-grid social-profile-grid">
            {visible.map((person, profileIndex) => (
              <article className={`panel social-profile-card profile-cover-${profileIndex % 4}`} key={person.id}>
                <div className="profile-cover">
                  <span className="profile-cover-mark">HOPE COMMUNITY</span>
                  <span className="profile-cover-orbit" aria-hidden="true" />
                  <span className="profile-cover-dot" aria-hidden="true" />
                </div>
                <div className="social-card-content">
                  <div className="social-card-top">
                    <div className="person-avatar-ring"><div className={`person-avatar tone-${profileIndex % 4}`}>{person.initials}</div></div>
                    <span className="profile-online"><i /> ACTIVE VOLUNTEER</span>
                  </div>
                  <h2>{person.name}</h2>
                  <p className="social-handle">{handleFor(person.name)}</p>
                  <p className="social-bio">A volunteer in {person.place || "your community"}{person.skills[0] ? `, passionate about ${person.skills[0].toLowerCase()}` : ""}.</p>
                  <div className="social-profile-stats">
                    <span><strong>{person.postCount}</strong> posts</span>
                    <span><strong>{person.skills.length}</strong> interests</span>
                    <span><strong>{person.mutualConnections}</strong> mutual connections</span>
                  </div>
                  <div className="social-card-interests">{person.skills.map((item) => <span key={item}>{item}</span>)}</div>
                  <div className="social-card-actions">
                    <Button variant="secondary" onClick={() => setSelected(person)}>View profile</Button>
                    {person.connectionStatus === "pending_received"
                      ? <Button onClick={() => person.connectionId && void respondToConnection(person.connectionId, "accept")}>Accept request</Button>
                      : <Button disabled={person.connectionStatus !== "none"} onClick={() => void requestConnection(person)}>{person.connectionStatus === "connected" ? "Connected" : person.connectionStatus === "pending_sent" ? "Requested" : "Connect"}</Button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {visible.length === 0 && <p className="networking-empty">{communityPeople.length ? "No volunteers match these filters." : "No active volunteer profiles are available yet."}</p>}
        </>
      ) : activeTab === "requests" ? (
        <section className="network-list panel">
          <SectionTitle title="Incoming requests" />
          {communityConnections.incoming.map((person) => <ConnectionRow key={person.id} person={person} action={<><Button variant="secondary" onClick={() => void respondToConnection(person.id, "decline")}>Decline</Button><Button onClick={() => void respondToConnection(person.id, "accept")}>Accept</Button></>} />)}
          {!communityConnections.incoming.length && <p className="networking-empty">You have no incoming requests.</p>}
          <SectionTitle title="Sent requests" />
          {communityConnections.outgoing.map((person) => <ConnectionRow key={person.id} person={person} action={<span className="connection-pending-label">Awaiting response</span>} />)}
          {!communityConnections.outgoing.length && <p className="networking-empty">You have no pending sent requests.</p>}
        </section>
      ) : (
        <section className="network-list panel">
          <SectionTitle title="My connections" />
          {communityConnections.accepted.map((person) => <ConnectionRow key={person.id} person={person} action={<Button variant="secondary" onClick={() => { const match = communityPeople.find((item) => item.id === person.profileId); if (match) setSelected(match); }}>View profile</Button>} />)}
          {!communityConnections.accepted.length && <p className="networking-empty">Accepted volunteer connections will appear here.</p>}
        </section>
      )}
      {openedPost && <PostViewer post={openedPost} location={openedPost.place || selectedPerson?.place || "Volunteer community"} currentProfileId={me?.profile.id ?? ""} onClose={() => setOpenedPostId(null)} onLike={() => toggleLike(openedPost)} onComment={(comment) => addComment(openedPost.id, comment)} onReport={(reason) => reportPost(openedPost.id, reason)} />}
    </div>
  );
}

function ConnectionRow({ person, action }: { person: { id: string; name: string; place: string; skills: string[] }; action: React.ReactNode }) {
  const initials = person.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="connection-row"><div className="person-avatar-ring"><div className="person-avatar tone-0">{initials}</div></div><span><strong>{person.name}</strong><small>{person.place || person.skills.join(" · ") || "Hope Foundation volunteer"}</small></span><div className="connection-row-actions">{action}</div></div>;
}
