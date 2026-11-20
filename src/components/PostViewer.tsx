import { useEffect, useState } from "react";
import { Avatar, Icon } from "./shared";
import type { CommunityPost } from "../api";

function formatPostDate(post: CommunityPost) {
  const date = new Date(post.createdAt);
  return !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "Date unavailable";
}

export function PostViewer({ post, location, currentProfileId, onClose, onLike, onComment, onReport }: {
  post: CommunityPost;
  location: string;
  currentProfileId: string;
  onClose: () => void;
  onLike: () => Promise<void>;
  onComment: (comment: string) => Promise<void>;
  onReport: (reason: string) => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const createdAt = new Date(post.createdAt);
  const validDate = !Number.isNaN(createdAt.getTime());

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const submitComment = async () => {
    const value = comment.trim();
    if (!value) return;
    await onComment(value);
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

  return (
    <div className="post-viewer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="post-viewer" role="dialog" aria-modal="true" aria-label={`Post by ${post.name}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-btn post-viewer-close" aria-label="Close post" autoFocus onClick={onClose}><Icon name="x" /></button>
        <div className="post-viewer-media">
          {post.image ? <img src={post.image} alt="Volunteer community activity" /> : <div className="profile-post-art"><Icon name="heart" size={40} /></div>}
        </div>
        <div className="post-viewer-panel">
          <header className="post-viewer-author">
            <Avatar name={post.name} />
            <div><strong>{post.name}</strong><small>{location}</small></div>
          </header>
          <div className="post-viewer-copy">
            <p><strong>{post.name}</strong> {post.text}</p>
            <time dateTime={validDate ? createdAt.toISOString() : undefined}>{formatPostDate(post)}</time>
            <div className="post-viewer-comments">{post.comments.map((item) => <p key={item.id}><strong>{item.authorName}</strong> {item.body}</p>)}</div>
          </div>
          <footer className="post-viewer-footer">
            <button className={post.likedByMe ? "liked" : ""} aria-label={post.likedByMe ? "Unlike post" : "Like post"} onClick={() => void onLike()}><Icon name="heart" size={21} /></button>
            <span>{post.likesCount} {post.likesCount === 1 ? "like" : "likes"}</span>
            {post.authorId !== currentProfileId && <button className="post-viewer-report" disabled={post.reportedByMe} onClick={() => setReporting(!reporting)}><Icon name="shield" size={17} />{post.reportedByMe ? "Reported" : "Report"}</button>}
          </footer>
          {reporting && <div className="post-viewer-report-form"><label htmlFor={`viewer-report-${post.id}`}>Why are you reporting this post?</label><textarea id={`viewer-report-${post.id}`} value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} /><div><button type="button" onClick={() => setReporting(false)}>Cancel</button><button type="button" disabled={!reason.trim() || reportBusy} onClick={() => void submitReport()}>{reportBusy ? "Sending…" : "Submit report"}</button></div>{reportError && <p role="alert" className="form-error">{reportError}</p>}</div>}
          <form className="post-viewer-comment-form" onSubmit={(event) => { event.preventDefault(); void submitComment(); }}>
            <input aria-label="Add a comment" placeholder="Add a comment..." value={comment} onChange={(event) => setComment(event.target.value)} />
            <button type="submit" disabled={!comment.trim()}>Post</button>
          </form>
        </div>
      </section>
    </div>
  );
}
