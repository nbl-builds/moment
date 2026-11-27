"use client";

/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage */
import { formatDate, formatTime, toLocalDate, type Message, type PortalInboxRow } from "@moment/shared";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Lightbox } from "@/components/portal/lightbox";
import { PortalIcon } from "@/components/portal/icon";
import { useToast } from "@/components/portal/toast";
import { QUICK_REPLIES } from "@/config/quick-replies";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { useReservationPanel } from "../reservations/reservation-panel";
import { uploadVoiceNote } from "./mock";
import styles from "./inbox.module.css";

type Item = {
  id: string;
  mine: boolean;
  body: string | null;
  createdAt: string;
  photos: string[];
  voice?: { url: string; durationMs: number };
  pending?: boolean;
  failed?: boolean;
};

const TYPING_SHOWN_MS = 4000;
const TYPING_SEND_EVERY_MS = 2500;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // chat-attachments bucket limit

function toItem(m: Message, businessId: string): Item {
  return {
    id: m.id,
    mine: m.sender_business_id === businessId,
    body: m.body,
    createdAt: m.created_at,
    photos: ((m.attachments ?? []) as { path?: string; mimeType?: string }[])
      .filter((a) => a.path && (!a.mimeType || a.mimeType.startsWith("image/")))
      .map((a) => a.path as string),
  };
}

export function Thread({
  conversationId,
  row,
  businessId,
  businessLogo,
  userId,
  timeZone,
  onBack,
  onActivity,
}: {
  conversationId: string;
  row: PortalInboxRow | null;
  businessId: string;
  businessLogo: string | null;
  userId: string;
  timeZone: string;
  onBack: () => void;
  onActivity: () => void;
}) {
  const api = useBrowserApi();
  const toast = useToast();
  const { openReservation } = useReservationPanel();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [guestTyping, setGuestTyping] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [viewer, setViewer] = useState<{ photos: string[]; index: number } | null>(null);
  const [recording, setRecording] = useState<{ since: number } | null>(null);
  const channel = useRef<{ typing: () => void; leave: () => void } | null>(null);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const markRead = useCallback(() => {
    void api.portal.markConversationRead(conversationId).then(onActivity, () => undefined);
  }, [api, conversationId, onActivity]);

  // Load, mark read, and go live.
  useEffect(() => {
    let live = true;
    api.chat
      .listMessages(conversationId, { limit: 100 })
      .then((rows) => {
        if (!live) return;
        setItems(rows.map((m) => toItem(m, businessId)).reverse());
        setLoading(false);
      })
      .catch((e) => {
        toast(errorMessage(e, "We couldn't load this conversation."));
        setLoading(false);
      });
    markRead();
    channel.current = api.chat.join(
      conversationId,
      {
        message: ({ type, message }) => {
          const item = toItem(message, businessId);
          setItems((current) => {
            if (type === "UPDATE") return current.map((i) => (i.id === item.id ? { ...i, body: item.body } : i));
            if (current.some((i) => i.id === item.id)) return current;
            return [...current.filter((i) => !(i.pending && i.mine && i.body === item.body)), item];
          });
          if (!item.mine) {
            setGuestTyping(false);
            markRead();
          }
        },
        typing: ({ userId: who }) => {
          if (who === userId) return;
          setGuestTyping(true);
          if (typingTimer.current) clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setGuestTyping(false), TYPING_SHOWN_MS);
        },
      },
      userId,
    );
    return () => {
      live = false;
      channel.current?.leave();
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [api, conversationId, businessId, userId, markRead, toast]);

  // Signed URLs for photos (the bucket is private).
  useEffect(() => {
    const missing = items.flatMap((i) => i.photos).filter((p) => !photoUrls[p] && !p.startsWith("blob:"));
    if (!missing.length) return;
    let live = true;
    void Promise.all(missing.map(async (p) => [p, await api.chat.attachmentUrl(p).catch(() => "")] as const)).then((pairs) => {
      if (live) setPhotoUrls((u) => ({ ...u, ...Object.fromEntries(pairs) }));
    });
    return () => {
      live = false;
    };
  }, [items, photoUrls, api]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [items.length, guestTyping]);

  async function send(body: string, attachments: { path: string; mimeType?: string }[] = [], localPhotos: string[] = []) {
    const draft: Item = { id: `local-${Date.now()}`, mine: true, body: body || null, createdAt: new Date().toISOString(), photos: localPhotos, pending: true };
    setItems((i) => [...i, draft]);
    try {
      const sent = await api.chat.send({ conversationId, body: body || undefined, attachments }, businessId);
      setItems((i) => (i.some((x) => x.id === sent.id) ? i.filter((x) => x.id !== draft.id) : i.map((x) => (x.id === draft.id ? toItem(sent, businessId) : x))));
      onActivity();
    } catch (e) {
      setItems((i) => i.map((x) => (x.id === draft.id ? { ...x, pending: false, failed: true } : x)));
      toast(errorMessage(e, "Message not sent. Check your connection and try again."));
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    void send(body);
  }

  function onType(value: string) {
    setText(value);
    if (Date.now() - lastTypingSent.current > TYPING_SEND_EVERY_MS) {
      lastTypingSent.current = Date.now();
      channel.current?.typing();
    }
  }

  async function onPhoto(file: File) {
    if (!PHOTO_TYPES.includes(file.type)) return toast("Send a JPG, PNG, WebP or HEIC photo.");
    if (file.size > MAX_PHOTO_BYTES) return toast("Photos can be up to 10 MB.");
    const local = URL.createObjectURL(file);
    try {
      const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      const uploaded = await api.chat.uploadAttachment(conversationId, { body: await file.arrayBuffer(), contentType: file.type, extension: ext });
      setPhotoUrls((u) => ({ ...u, [uploaded.path]: local }));
      await send("", [uploaded], [uploaded.path]);
    } catch (e) {
      toast(errorMessage(e, "Photo not sent. Please try again."));
    }
  }

  async function toggleRecording() {
    if (recording && recorder.current) {
      recorder.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      const since = Date.now();
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(null);
        const durationMs = Date.now() - since;
        if (durationMs < 500) return;
        const saved = await uploadVoiceNote({ conversationId, blob: new Blob(chunks, { type: rec.mimeType }), durationMs });
        setItems((i) => [...i, { id: `voice-${Date.now()}`, mine: true, body: null, createdAt: new Date().toISOString(), photos: [], voice: { url: saved.localUrl, durationMs } }]);
        toast("Voice notes stay on this device for now. They aren't sent yet.");
      };
      recorder.current = rec;
      rec.start();
      setRecording({ since });
    } catch {
      toast("Allow microphone access to record a voice note.");
    }
  }

  const cover = row?.listing_cover ? api.media.url(row.listing_cover) : null;
  const guestAvatar = row?.guest_avatar_url ? api.media.url(row.guest_avatar_url) : null;

  return (
    <div className={styles.thread}>
      <header className={styles.threadHead}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Back to conversations">
          ‹
        </button>
        {cover ? <img src={cover} alt="" className={styles.threadPhoto} /> : <span className={styles.threadPhoto} aria-hidden />}
        <div className={styles.threadTitles}>
          <h2 className={styles.threadTitle}>{row?.listing_title ?? "General enquiry"}</h2>
          <p className={styles.threadName}>{row?.guest_name ?? "Guest"}</p>
        </div>
        {row?.booking_id ? (
          <button type="button" className={styles.headButton} onClick={() => openReservation(row.booking_id!)}>
            View reservation
          </button>
        ) : row?.listing_id ? (
          <Link href={`/business/listings/${row.listing_id}`} className={styles.headButton}>
            See Listing Details
          </Link>
        ) : null}
      </header>

      <div className={styles.messages} ref={scroller} aria-live="polite">
        {loading ? <p className={styles.none}>Loading messages…</p> : null}
        {!loading && !items.length ? <p className={styles.none}>No messages yet. Say hello!</p> : null}
        {items.map((m, idx) => {
          const prev = items[idx - 1];
          const showMeta = !prev || prev.mine !== m.mine || new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60000;
          const day = toLocalDate(m.createdAt, timeZone);
          const newDay = !prev || toLocalDate(prev.createdAt, timeZone) !== day;
          return (
            <div key={m.id} className={styles.messageGroup}>
            {newDay ? <p className={styles.day}>{formatDate(m.createdAt, { style: "long", timeZone })}</p> : null}
            <div className={styles.message} data-mine={m.mine ? "true" : undefined}>
              <div className={styles.meta} data-hidden={showMeta ? undefined : "true"}>
                {m.mine ? (businessLogo ? <img src={businessLogo} alt="" className={styles.chatAvatar} /> : <span className={`${styles.chatAvatar} ${styles.businessAvatar}`}>M</span>) : guestAvatar ? <img src={guestAvatar} alt="" className={styles.chatAvatar} /> : <span className={styles.chatAvatar} />}
                <time className={styles.msgTime}>{formatTime(m.createdAt, timeZone)}</time>
              </div>
              <div className={styles.bubbleCol}>
                {m.body ? (
                  <p className={styles.bubble} data-pending={m.pending ? "true" : undefined} data-failed={m.failed ? "true" : undefined}>
                    {m.body}
                  </p>
                ) : null}
                {m.photos.length ? (
                  <div className={styles.photoGrid}>
                    {m.photos.map((p, i) => (
                      <button key={p} type="button" className={styles.photoButton} onClick={() => setViewer({ photos: m.photos.map((x) => photoUrls[x] ?? ""), index: i })} aria-label="Open photo">
                        {photoUrls[p] ? <img src={photoUrls[p]} alt="" /> : <span />}
                      </button>
                    ))}
                  </div>
                ) : null}
                {m.voice ? (
                  <div className={styles.voice}>
                    <audio controls src={m.voice.url} />
                    <span>Not sent (saved on this device)</span>
                  </div>
                ) : null}
                {m.failed ? <span className={styles.failed}>Not sent</span> : null}
              </div>
            </div>
            </div>
          );
        })}
        {guestTyping ? (
          <div className={styles.message}>
            <div className={styles.meta}>{guestAvatar ? <img src={guestAvatar} alt="" className={styles.chatAvatar} /> : <span className={styles.chatAvatar} />}</div>
            <span className={styles.typing} aria-label={`${row?.guest_name ?? "Guest"} is typing`}>
              <PortalIcon name="is-typing" />
            </span>
          </div>
        ) : null}
      </div>

      <div className={styles.suggestions}>
        <p className={styles.suggestionsLabel}>Suggestions</p>
        <div className={styles.chips}>
          {QUICK_REPLIES.map((q) => (
            <button key={q} type="button" className={styles.chip} onClick={() => setText((t) => (t ? `${t} ${q}` : q))}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <form className={styles.composer} onSubmit={onSubmit}>
        <label className={styles.srOnly} htmlFor="composer">
          Write a message
        </label>
        <input id="composer" className={styles.input} placeholder={recording ? "Recording… tap the mic to stop" : "Write a message"} value={text} onChange={(e) => onType(e.target.value)} autoComplete="off" maxLength={4000} />
        <input
          ref={fileInput}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onPhoto(f);
          }}
        />
        <button type="button" className={styles.tool} onClick={() => fileInput.current?.click()} aria-label="Send a photo">
          <PortalIcon name="image-add" />
        </button>
        <button type="button" className={styles.tool} data-recording={recording ? "true" : undefined} onClick={() => void toggleRecording()} aria-label={recording ? "Stop recording" : "Record a voice note"}>
          <PortalIcon name="mic" />
        </button>
        <button type="submit" className={styles.send} disabled={!text.trim()} aria-label="Send">
          <PortalIcon name="sent" />
        </button>
      </form>
      {viewer ? <Lightbox photos={viewer.photos} index={viewer.index} onIndex={(index) => setViewer({ ...viewer, index })} onClose={() => setViewer(null)} /> : null}
    </div>
  );
}
