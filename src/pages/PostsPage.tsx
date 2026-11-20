import { useState } from "react";
import { api, type CommunityPost } from "../api";
import { Avatar, Button, Icon, PageHeader } from "../components/shared";
import { useDemoStore } from "../components/demoStore";
import { usePortal } from "../components/portal";
import { PostViewer } from "../components/PostViewer";
import type { Page } from "../components/shared";

export function PostsPage({ go }: { go: (page: Page) => void }) {
  const { data } = useDemoStore();
  const { communityPosts, reloadCommunity, me } = usePortal();
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [openedPostId, setOpenedPostId] = useState<string | null>(null);
  const openedPost = communityPosts.find((post) => post.id === openedPostId) ?? null;

  const showNotice = (message: string, isError = false) => {
    setNotice(message);
    setNoticeError(isError);
  };

  const publish = async () => {
    const text = draft.trim();
    if (!text) return;
    try {
      await api.createCommunityPost(text, image);
      setDraft("");
      setImage(undefined);
      setCompose(false);
      showNotice("Your post was published.");
      await reloadCommunity();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not publish your post.", true);
    }
  };

  const toggleLike = async (post: CommunityPost) => {
    try {
      if (post.likedByMe) await api.unlikeCommunityPost(post.id);
      else await api.likeCommunityPost(post.id);
      await reloadCommunity();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not update your like.", true);
    }
  };

  const addComment = async (postId: string, comment: string) => {
    try {
      await api.commentCommunityPost(postId, comment);
      await reloadCommunity();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not add your comment.", true);
    }
  };

  const reportPost = async (postId: string, reason: string) => {
    await api.reportCommunityPost(postId, reason);
    showNotice("Thanks. Your report was sent to the moderation team.");
    await reloadCommunity();
  };

  const sharePost = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(window.location.href);
      showNotice("Page link copied.");
    } catch {
      showNotice("Could not copy the link.", true);
    }
  };

  return (
    <div className="page community-page">
      <PageHeader title="Community" description="Stories, updates, and ideas from volunteers making a difference." action={<Button icon="plus" onClick={() => setCompose(true)}>Create post</Button>} />
      <div className="community-layout"><main>
        {notice && <p role={noticeError ? "alert" : "status"} className={noticeError ? "form-error" : "toast"}>{notice}</p>}
        {compose && <section className="panel composer"><div><Avatar name={data.profile.fullName} image={data.profile.avatar} /><textarea autoFocus value={draft} maxLength={3000} onChange={(event) => setDraft(event.target.value)} placeholder="Share something with the community..." /></div>{image && <img className="post-image-preview" src={image} alt="Selected post attachment" />}<div><label className="btn btn-ghost"><Icon name="camera" size={18} /><span>Add image</span><input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2_000_000) { showNotice("Choose an image under 2 MB.", true); return; } const reader = new FileReader(); reader.onload = () => setImage(String(reader.result)); reader.onerror = () => showNotice("Could not read the selected image.", true); reader.readAsDataURL(file); }} /></label><span /><Button variant="secondary" onClick={() => { setCompose(false); setDraft(""); setImage(undefined); }}>Cancel</Button><Button disabled={!draft.trim()} onClick={() => void publish()}>Publish</Button></div></section>}
        {communityPosts.map((post) => <Post key={post.id} post={post} currentProfileId={me?.profile.id ?? ""} onOpen={() => setOpenedPostId(post.id)} onLike={() => void toggleLike(post)} onComment={(comment) => addComment(post.id, comment)} onShare={sharePost} onReport={(reason) => reportPost(post.id, reason)} />)}
        {!communityPosts.length && <section className="panel profile-posts-empty"><span><Icon name="message" size={22} /></span><strong>No community posts yet</strong><p>Be the first to share a story with other volunteers.</p><Button variant="secondary" onClick={() => setCompose(true)}>Create a post</Button></section>}
      </main><aside><section className="panel community-side"><span className="eyebrow">COMMUNITY SPOTLIGHT</span><h3>Meet volunteers near you</h3><p>Connect with people who care about the same causes.</p><Button variant="secondary" onClick={() => go("networking")}>Explore network</Button></section><section className="panel community-side"><h3>Community guidelines</h3><p>Be kind, protect privacy, and keep every conversation focused on positive impact.</p><button onClick={() => setShowGuidelines(!showGuidelines)}>{showGuidelines ? "Hide guidelines" : "Read guidelines"} <Icon name="arrow" size={15} /></button>{showGuidelines && <ul><li>Respect every volunteer.</li><li>Do not post private contact details.</li><li>Keep posts relevant to community service.</li></ul>}</section></aside></div>
      {openedPost && <PostViewer post={openedPost} location={openedPost.place || "Volunteer community"} currentProfileId={me?.profile.id ?? ""} onClose={() => setOpenedPostId(null)} onLike={() => toggleLike(openedPost)} onComment={(comment) => addComment(openedPost.id, comment)} onReport={(reason) => reportPost(openedPost.id, reason)} />}
    </div>
  );
}

function Post({ post, currentProfileId, onOpen, onLike, onComment, onShare, onReport }: {
  post: CommunityPost;
  currentProfileId: string;
  onOpen: () => void;
  onLike: () => void;
  onComment: (comment: string) => Promise<void>;
  onShare: () => void;
  onReport: (reason: string) => Promise<void>;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const postDate = new Date(post.createdAt);
  const submitComment = async () => {
    if (!comment.trim()) return;
    await onComment(comment.trim());
    setComment("");
  };
  const submitReport = async () => {
    setReportBusy(true);
    setReportError("");
    try {
      await onReport(reason.trim());
      setReporting(false);
      setReason("");
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Could not submit this report.");
    } finally {
      setReportBusy(false);
    }
  };
  return <article className="panel post">
    <header><Avatar name={post.name} /><div><strong>{post.name}</strong><time dateTime={post.createdAt}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(postDate)}</time></div><button className="post-open-link" onClick={onOpen}>Open post</button></header>
    <p>{post.text}</p>{post.image && <img src={post.image} alt="Volunteer community activity" />}
    <footer><button className={post.likedByMe ? "liked" : ""} onClick={onLike}><Icon name="heart" size={18} />{post.likedByMe ? `Liked · ${post.likesCount}` : `Like · ${post.likesCount}`}</button><button onClick={() => setShowComments(!showComments)}><Icon name="message" size={18} />Comment ({post.comments.length})</button><button onClick={onShare}><Icon name="share" size={18} />Share</button>{post.authorId !== currentProfileId && <button disabled={post.reportedByMe} onClick={() => setReporting(!reporting)}><Icon name="shield" size={17} />{post.reportedByMe ? "Reported" : "Report"}</button>}</footer>
    {showComments && <div className="post-comments">{post.comments.map((item) => <p key={item.id}><strong>{item.authorName}</strong> {item.body}</p>)}<label><input maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment..." /><Button disabled={!comment.trim()} onClick={() => void submitComment()}>Send</Button></label></div>}
    {reporting && <div className="post-comments post-report-form"><label htmlFor={`report-${post.id}`}>Why are you reporting this post?</label><textarea id={`report-${post.id}`} value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} /><div><Button variant="secondary" onClick={() => setReporting(false)}>Cancel</Button><Button disabled={!reason.trim() || reportBusy} onClick={() => void submitReport()}>{reportBusy ? "Sending…" : "Submit report"}</Button></div>{reportError && <p role="alert" className="form-error">{reportError}</p>}</div>}
  </article>;
}
