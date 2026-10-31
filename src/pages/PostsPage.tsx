import { useState } from "react";
import { Avatar, Button, Icon, PageHeader } from "../components/shared";
import { useDemoStore, type DemoPost } from "../components/demoStore";
import type { Page } from "../components/shared";

export function PostsPage({ go }: { go: (page: Page) => void }) {
  const { data, setData } = useDemoStore();
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [notice, setNotice] = useState("");
  const [showGuidelines, setShowGuidelines] = useState(false);

  const publish = () => {
    const text = draft.trim();
    if (!text) return;
    const post: DemoPost = { id: `post-${Date.now()}`, name: data.profile.fullName, time: "Just now", text, image, comments: [] };
    setData((current) => ({ ...current, posts: [post, ...current.posts] }));
    setDraft("");
    setImage(undefined);
    setCompose(false);
  };

  const toggleLike = (postId: string) => setData((current) => ({
    ...current,
    likedPosts: current.likedPosts.includes(postId) ? current.likedPosts.filter((id) => id !== postId) : [...current.likedPosts, postId],
  }));

  const addComment = (postId: string, comment: string) => setData((current) => ({
    ...current,
    posts: current.posts.map((post) => post.id === postId ? { ...post, comments: [...post.comments, comment] } : post),
  }));
  const sharePost = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Page link copied.");
    } catch {
      setNotice("Could not copy the link.");
    }
  };

  return (
    <div className="page community-page">
      <PageHeader title="Community" description="Stories, updates, and ideas from volunteers making a difference." action={<Button icon="plus" onClick={() => setCompose(true)}>Create post</Button>} />
      <div className="community-layout"><main>
        {notice && <p role="status" className="toast">{notice}</p>}
        {compose && <section className="panel composer"><div><Avatar name={data.profile.fullName} /><textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Share something with the community..." /></div>{image && <img className="post-image-preview" src={image} alt="Selected post attachment" />}<div><label className="btn btn-ghost"><Icon name="camera" size={18} /><span>Add image</span><input hidden type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2_000_000) { setNotice("Choose an image under 2 MB."); return; } const reader = new FileReader(); reader.onload = () => setImage(String(reader.result)); reader.readAsDataURL(file); }} /></label><span /><Button variant="secondary" onClick={() => { setCompose(false); setDraft(""); setImage(undefined); }}>Cancel</Button><Button disabled={!draft.trim()} onClick={publish}>Publish</Button></div></section>}
        {data.posts.map((post) => <Post key={post.id} post={post} liked={data.likedPosts.includes(post.id)} onLike={() => toggleLike(post.id)} onComment={(comment) => addComment(post.id, comment)} onShare={() => { navigator.clipboard?.writeText(window.location.href).then(() => setNotice("Page link copied."), () => setNotice("Could not copy the link.")); }} />)}
        {data.posts.map((post) => <Post key={post.id} post={post} liked={data.likedPosts.includes(post.id)} onLike={() => toggleLike(post.id)} onComment={(comment) => addComment(post.id, comment)} onShare={sharePost} />)}
      </main><aside><section className="panel community-side"><span className="eyebrow">COMMUNITY SPOTLIGHT</span><h3>Meet volunteers near you</h3><p>Connect with people who care about the same causes.</p><div className="avatar-stack"><Avatar name="Ravi Kumar" /><Avatar name="Neha Joshi" /><Avatar name="Sara Ali" /><span>+42</span></div><Button variant="secondary" onClick={() => go("networking")}>Explore network</Button></section><section className="panel community-side"><h3>Community guidelines</h3><p>Be kind, protect privacy, and keep every conversation focused on positive impact.</p><button onClick={() => setShowGuidelines(!showGuidelines)}>{showGuidelines ? "Hide guidelines" : "Read guidelines"} <Icon name="arrow" size={15} /></button>{showGuidelines && <ul><li>Respect every volunteer.</li><li>Do not post private contact details.</li><li>Keep posts relevant to community service.</li></ul>}</section></aside></div>
    </div>
  );
}

function Post({ post, liked, onLike, onComment, onShare }: { post: DemoPost; liked: boolean; onLike: () => void; onComment: (comment: string) => void; onShare: () => void }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const submitComment = () => {
    if (!comment.trim()) return;
    onComment(comment.trim());
    setComment("");
  };
  return <article className="panel post"><header><Avatar name={post.name} /><div><strong>{post.name}</strong><small>{post.time}</small></div></header><p>{post.text}</p>{post.image && <img src={post.image} alt="Volunteer community activity" />}<footer><button className={liked ? "liked" : ""} onClick={onLike}><Icon name="heart" size={18} />{liked ? "Liked" : "Like"}</button><button onClick={() => setShowComments(!showComments)}><Icon name="message" size={18} />Comment ({post.comments.length})</button><button onClick={onShare}><Icon name="share" size={18} />Share</button></footer>{showComments && <div className="post-comments">{post.comments.map((item, index) => <p key={`${post.id}-comment-${index}`}>{item}</p>)}<label><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment..." /><Button disabled={!comment.trim()} onClick={submitComment}>Send</Button></label></div>}</article>;
}
