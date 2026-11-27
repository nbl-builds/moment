"use client";

/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage */
import type { PortalReview } from "@moment/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lightbox } from "@/components/portal/lightbox";
import { useToast } from "@/components/portal/toast";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { Stars } from "./stars";
import styles from "./reviews.module.css";

const LIMIT = 1000;

function ago(iso: string, now: number) {
  const days = Math.floor((now - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months} ${months === 1 ? "month" : "months"} ago` : `${Math.floor(months / 12)} y ago`;
}

/** Figma 131:536: two columns of reviews with photos (lightbox) and a Reply (not in Figma). */
export function ReviewList({ reviews, canReply, now }: { reviews: PortalReview[]; canReply: boolean; now: number }) {
  const api = useBrowserApi();
  const [viewer, setViewer] = useState<{ photos: string[]; index: number } | null>(null);
  if (!reviews.length) return <p className={styles.none}>No reviews yet. Guests can review after a completed visit.</p>;
  return (
    <>
      <ul className={styles.list}>
        {reviews.map((r) => (
          <ReviewItem key={r.id} review={r} canReply={canReply} now={now} onPhoto={(photos, index) => setViewer({ photos, index })} mediaUrl={(p) => api.media.url(p) ?? p} />
        ))}
      </ul>
      {viewer ? <Lightbox photos={viewer.photos} index={viewer.index} onIndex={(index) => setViewer({ ...viewer, index })} onClose={() => setViewer(null)} /> : null}
    </>
  );
}

function ReviewItem({
  review: r,
  canReply,
  now,
  onPhoto,
  mediaUrl,
}: {
  review: PortalReview;
  canReply: boolean;
  now: number;
  onPhoto: (photos: string[], index: number) => void;
  mediaUrl: (p: string) => string;
}) {
  const api = useBrowserApi();
  const router = useRouter();
  const toast = useToast();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState(r.business_reply ?? "");
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState(r.business_reply);
  const photos = r.photos.map(mediaUrl);
  const avatar = r.author?.avatar_url ? mediaUrl(r.author.avatar_url) : null;

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.portal.replyToReview(r.id, text.trim());
      setReply(text.trim());
      setReplying(false);
      toast("Reply posted. The guest can see it in the app.");
      router.refresh();
    } catch (e) {
      toast(errorMessage(e));
    }
    setSaving(false);
  }

  return (
    <li className={styles.item}>
      <div className={styles.itemHead}>
        {avatar ? <img src={avatar} alt="" className={styles.avatar} /> : <span className={`${styles.avatar} ${styles.avatarFallback}`}>{(r.author?.display_name ?? "G").slice(0, 1)}</span>}
        <div className={styles.itemText}>
          <div className={styles.nameRow}>
            <p className={styles.name}>{r.author?.display_name ?? "Guest"}</p>
            <p className={styles.when}>{ago(r.created_at, now)}</p>
          </div>
          {r.listing ? <p className={styles.listing}>{r.listing.title}</p> : null}
          {r.body ? <p className={styles.body}>{r.body}</p> : null}
          <p className={styles.rating}>
            <Stars value={r.rating} />
            <span>{r.rating.toFixed(1)}</span>
          </p>
        </div>
      </div>
      {photos.length ? (
        <div className={styles.photos}>
          {photos.map((p, i) => (
            <button key={p + i} type="button" className={styles.photoButton} onClick={() => onPhoto(photos, i)} aria-label={`Open photo ${i + 1} of ${photos.length}`}>
              <img src={p} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      {reply && !replying ? (
        <div className={styles.reply}>
          <p className={styles.replyLabel}>Your reply</p>
          <p>{reply}</p>
          {canReply ? (
            <button type="button" className={styles.linkButton} onClick={() => setReplying(true)}>
              Edit reply
            </button>
          ) : null}
        </div>
      ) : null}
      {canReply && !reply && !replying ? (
        <button type="button" className={styles.replyButton} onClick={() => setReplying(true)}>
          Reply
        </button>
      ) : null}
      {replying ? (
        <form
          className={styles.replyForm}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className={styles.srOnly} htmlFor={`reply-${r.id}`}>
            Reply to {r.author?.display_name ?? "the guest"}
          </label>
          <textarea id={`reply-${r.id}`} value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={LIMIT} placeholder="Thank the guest or answer their feedback. Everyone can see your reply." autoFocus />
          <div className={styles.replyActions}>
            <button type="button" className={styles.linkButton} onClick={() => setReplying(false)}>
              Cancel
            </button>
            <button type="submit" className={styles.postButton} disabled={saving || !text.trim()}>
              {saving ? "Posting…" : "Post reply"}
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
