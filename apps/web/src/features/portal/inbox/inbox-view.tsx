"use client";

/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage */
import { formatDate, formatTime, toLocalDate, addDaysToLocalDate, type PortalInboxRow } from "@moment/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PortalIcon } from "@/components/portal/icon";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { Thread } from "./thread";
import styles from "./inbox.module.css";

export const TIME_FILTERS = [
  { value: "all", label: "All time", days: null },
  { value: "yesterday", label: "Yesterday", days: 1 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "1m", label: "1 month", days: 30 },
  { value: "1y", label: "1 year", days: 365 },
] as const;
type TimeFilter = (typeof TIME_FILTERS)[number]["value"];

/** List refresh while the Inbox is open (threads themselves are live over Realtime). */
const REFRESH_MS = 15000;

/** "11:12 AM" today, "Yesterday", weekday this week, else "2 w" (Figma 476:1898). */
export function inboxTime(iso: string, timeZone: string, now: Date) {
  const day = toLocalDate(iso, timeZone);
  const today = toLocalDate(now, timeZone);
  if (day === today) return formatTime(iso, timeZone);
  if (day === addDaysToLocalDate(today, -1)) return "Yesterday";
  const diff = Math.round((new Date(today).getTime() - new Date(day).getTime()) / 86400000);
  if (diff < 7) return formatDate(iso, { style: "long", timeZone }).split(",")[0] ?? "";
  if (diff < 60) return `${Math.floor(diff / 7)} w`;
  return formatDate(iso, { style: "short", timeZone });
}

export function InboxView({
  businessId,
  businessLogo,
  userId,
  timeZone,
  initialRows,
  initialSelected,
}: {
  businessId: string;
  businessLogo: string | null;
  userId: string;
  timeZone: string;
  initialRows: PortalInboxRow[];
  initialSelected: string | null;
}) {
  const api = useBrowserApi();
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [selected, setSelected] = useState<string | null>(initialSelected ?? null);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [time, setTime] = useState<TimeFilter>("all");
  const [timeOpen, setTimeOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const timeRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    const days = TIME_FILTERS.find((t) => t.value === time)?.days;
    const since = days ? new Date(Date.now() - days * 86400000).toISOString() : undefined;
    const next = await api.portal.inbox(businessId, { search: search.trim() || undefined, unreadOnly, since }).catch(() => null);
    if (next) setRows(next);
    setNow(new Date());
  }, [api, businessId, search, unreadOnly, time]);

  // Filters (search is debounced).
  useEffect(() => {
    const t = setTimeout(() => void reload(), search ? 250 : 0);
    return () => clearTimeout(t);
  }, [reload, search]);

  useEffect(() => {
    const t = setInterval(() => void reload(), REFRESH_MS);
    const onFocus = () => void reload();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [reload]);

  useEffect(() => {
    if (!timeOpen) return;
    const close = (e: MouseEvent) => !timeRef.current?.contains(e.target as Node) && setTimeOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [timeOpen]);

  function open(id: string) {
    setSelected(id);
    setRows((r) => r.map((x) => (x.conversation_id === id ? { ...x, unread: 0 } : x)));
    router.replace(`/business/inbox?c=${id}`, { scroll: false });
  }

  const current = rows.find((r) => r.conversation_id === selected) ?? null;

  return (
    <div className={styles.card} data-thread={selected ? "open" : undefined}>
      <aside className={styles.listPane} aria-label="Conversations">
        <div className={styles.listHead}>
          <h1 className={styles.title}>Inbox</h1>
          <div className={styles.filters}>
            <button type="button" className={styles.filterButton} aria-pressed={unreadOnly} onClick={() => setUnreadOnly((u) => !u)}>
              Unread
            </button>
            <div className={styles.timeWrap} ref={timeRef}>
              <button type="button" className={styles.filterButton} aria-haspopup="menu" aria-expanded={timeOpen} onClick={() => setTimeOpen((o) => !o)}>
                {TIME_FILTERS.find((t) => t.value === time)?.label}
                <PortalIcon name="direction-down-20" />
              </button>
              {timeOpen ? (
                <div className={styles.timeMenu} role="menu">
                  {TIME_FILTERS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={t.value === time}
                      className={styles.timeItem}
                      data-current={t.value === time ? "true" : undefined}
                      onClick={() => {
                        setTime(t.value);
                        setTimeOpen(false);
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <label className={styles.search}>
          <PortalIcon name="search" />
          <span className={styles.srOnly}>Search conversations</span>
          <input type="search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        {rows.length ? (
          <ul className={styles.rows}>
            {rows.map((r) => (
              <li key={r.conversation_id}>
                <button
                  type="button"
                  className={styles.row}
                  data-selected={r.conversation_id === selected ? "true" : undefined}
                  data-unread={r.unread > 0 ? "true" : undefined}
                  onClick={() => open(r.conversation_id)}
                >
                  {r.listing_cover || r.guest_avatar_url ? (
                    <img src={api.media.url(r.listing_cover ?? r.guest_avatar_url) ?? ""} alt="" className={styles.rowPhoto} />
                  ) : (
                    <span className={styles.rowPhoto} aria-hidden />
                  )}
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{r.listing_title ?? "General enquiry"}</span>
                    <span className={styles.rowName}>{r.guest_name ?? "Guest"}</span>
                    <span className={styles.rowPreview}>
                      {r.last_message_body ?? (r.last_message_has_attachment ? "Photo" : r.guest_city ?? "")}
                    </span>
                  </span>
                  <span className={styles.rowSide}>
                    {r.unread > 0 ? (
                      <span className={styles.badge} aria-label={`${r.unread} unread`}>
                        {r.unread}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className={styles.rowTime}>{r.last_message_at ? inboxTime(r.last_message_at, timeZone, now) : ""}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.none}>{search || unreadOnly || time !== "all" ? "No conversations match." : "No messages yet. Guests can message you from your listings in the app."}</p>
        )}
      </aside>
      <section className={styles.threadPane} aria-label="Conversation">
        {current || selected ? (
          <Thread
            key={selected ?? ""}
            conversationId={selected!}
            row={current}
            businessId={businessId}
            businessLogo={businessLogo}
            userId={userId}
            timeZone={timeZone}
            onBack={() => {
              setSelected(null);
              router.replace("/business/inbox", { scroll: false });
            }}
            onActivity={() => void reload()}
          />
        ) : (
          <div className={styles.pick}>
            <PortalIcon name="empty-envelope" />
            <p>Pick a conversation to read and reply.</p>
          </div>
        )}
      </section>
    </div>
  );
}
