"use client";

/* eslint-disable @next/next/no-img-element -- photos come from Supabase Storage */
import { formatDate, formatPrice, getZonedParts, type BusinessInsights, type InsightsPeriod, type ReservationTab } from "@moment/shared";
import type { ChartConfiguration, ScriptableContext, TooltipItem } from "chart.js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PortalIcon, type PortalIconName } from "@/components/portal/icon";
import { Sheet } from "@/components/portal/sheet";
import { useToast } from "@/components/portal/toast";
import { useBrowserApi } from "@/lib/api/use-browser-api";
import { errorMessage } from "@/lib/business/errors";
import { SideCards } from "../dashboard/side-cards";
import { ChartCanvas, token } from "./chart";
import { requestWithdrawal } from "./mock";
import styles from "./insights.module.css";

const PERIODS: { value: InsightsPeriod; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const STATS: { tab: ReservationTab; title: string; icon: PortalIconName; tone: string }[] = [
  { tab: "upcoming", title: "Incoming Bookings", icon: "download", tone: "incoming" },
  { tab: "ongoing", title: "Ongoing Bookings", icon: "upload", tone: "ongoing" },
  { tab: "pending", title: "Pending Bookings", icon: "clock-circle", tone: "pending" },
  { tab: "cancelled", title: "Cancelled Bookings", icon: "file-remove", tone: "cancelled" },
  { tab: "completed", title: "Completed Bookings", icon: "task-check", tone: "completed" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function bucketLabel(iso: string, period: InsightsPeriod, timeZone: string) {
  if (period === "weekly") return WEEKDAYS[getZonedParts(iso, timeZone).weekday] ?? "";
  if (period === "monthly") return formatDate(iso, { style: "short", timeZone });
  return formatDate(iso, { style: "short", timeZone }).split(" ")[0] ?? "";
}

function change(total: number, previous: number) {
  if (!previous) return total ? { text: "New", positive: true } : null;
  const pct = Math.round(((total - previous) / previous) * 100);
  return { text: `${pct >= 0 ? "+" : ""}${pct}%`, positive: pct >= 0 };
}

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

/** Figma tooltip card: BG 10% fill, Bold 14 title, Orange 12 value. */
function tooltip(label?: (c: TooltipItem<"bar" | "line">) => string): never {
  return {
    ...(label ? { callbacks: { label } } : {}),
    backgroundColor: token("chart-tooltip"),
    titleColor: token("black"),
    bodyColor: token("chart-value"),
    borderColor: token("chart-tooltip-shadow"),
    borderWidth: 1,
    padding: 12,
    cornerRadius: 6,
    displayColors: false,
    titleFont: { weight: "bold", size: 14 },
    bodyFont: { size: 12 },
  } as never;
}

function useInsights(businessId: string, initial: BusinessInsights) {
  const api = useBrowserApi();
  const cache = useRef(new Map<InsightsPeriod, BusinessInsights>([[initial.period, initial]]));
  return useCallback(
    async (period: InsightsPeriod) => {
      const hit = cache.current.get(period);
      if (hit) return hit;
      const data = await api.portal.insights(businessId, period);
      cache.current.set(period, data);
      return data;
    },
    [api, businessId],
  );
}

function PeriodSelect({ value, onChange, label }: { value: InsightsPeriod; onChange: (p: InsightsPeriod) => void; label: string }) {
  return (
    <label className={styles.period}>
      <span className={styles.srOnly}>{label} period</span>
      <select value={value} onChange={(e) => onChange(e.target.value as InsightsPeriod)}>
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <PortalIcon name="direction-down-20" />
    </label>
  );
}

/** One card's data for its own period (each chart card has its own Weekly / Monthly / Yearly). */
function usePeriodData(load: (p: InsightsPeriod) => Promise<BusinessInsights>, initial: BusinessInsights) {
  const [period, setPeriod] = useState<InsightsPeriod>(initial.period);
  const [data, setData] = useState(initial);
  const toast = useToast();
  useEffect(() => {
    let live = true;
    load(period)
      .then((d) => live && setData(d))
      .catch((e) => toast(errorMessage(e)));
    return () => {
      live = false;
    };
  }, [period, load, toast]);
  return { period, setPeriod, data };
}

export function InsightsView({
  businessId,
  timeZone,
  currency,
  initial,
  counts,
  canSeeMoney,
}: {
  businessId: string;
  timeZone: string;
  currency: string;
  initial: BusinessInsights;
  counts: Record<ReservationTab, number>;
  canSeeMoney: boolean;
}) {
  const api = useBrowserApi();
  const load = useInsights(businessId, initial);
  const bookings = usePeriodData(load, initial);
  const views = usePeriodData(load, initial);
  const revenue = usePeriodData(load, initial);
  const money = (n: number) => formatPrice(n, { currency });

  const bookingsChart = useMemo(() => {
    const s = bookings.data.bookings.series;
    return (): ChartConfiguration => ({
      type: "bar",
      data: {
        labels: s.map((p) => bucketLabel(p.start, bookings.period, timeZone)),
        datasets: [{ data: s.map((p) => p.value), backgroundColor: token("chart-bar"), borderRadius: 5, barPercentage: 0.55, categoryPercentage: 0.9 }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltip((c) => `${c.parsed.y} ${c.parsed.y === 1 ? "booking" : "bookings"}`) },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: token("chart-axis"), font: { size: 11 } } },
          y: { beginAtZero: true, grid: { display: false }, border: { display: false }, ticks: { color: token("chart-axis"), font: { size: 11 }, precision: 0, maxTicksLimit: 4 } },
        },
      },
    });
  }, [bookings.data, bookings.period, timeZone]);

  const viewsArea = useMemo(() => {
    const s = views.data.views.series;
    return (): ChartConfiguration => ({
      type: "line",
      data: {
        labels: s.map((p) => bucketLabel(p.start, views.period, timeZone)),
        datasets: [
          {
            data: s.map((p) => p.value),
            borderColor: token("chart-bar"),
            borderWidth: 2,
            tension: 0.45,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: token("white"),
            pointHoverBorderColor: token("chart-bar"),
            pointHoverBorderWidth: 3,
            fill: true,
            backgroundColor: (ctx: ScriptableContext<"line">) => {
              const { chartArea, ctx: c } = ctx.chart;
              if (!chartArea) return token("track");
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              g.addColorStop(0, token("divider"));
              g.addColorStop(1, token("white"));
              return g;
            },
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: { legend: { display: false }, tooltip: tooltip((c) => `${c.parsed.y} views`) },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: token("chart-axis"), font: { size: 11 } } },
          y: { beginAtZero: true, grid: { display: false }, border: { display: false }, ticks: { color: token("chart-axis"), font: { size: 11 }, precision: 0, maxTicksLimit: 4 } },
        },
      },
    });
  }, [views.data, views.period, timeZone]);

  const revenueBars = useMemo(() => {
    const s = revenue.data.revenue?.series ?? [];
    return (): ChartConfiguration => ({
      type: "bar",
      data: {
        labels: s.map((p) => bucketLabel(p.start, revenue.period, timeZone)),
        datasets: [{ data: s.map((p) => p.value), backgroundColor: token("chart-revenue"), borderRadius: { topLeft: 6, topRight: 6 }, borderSkipped: false, barPercentage: 0.7 }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltip((c) => money(c.parsed.y ?? 0)) },
        scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- money depends on currency only
  }, [revenue.data, revenue.period, timeZone, currency]);

  const viewsLine = useMemo(() => {
    const s = views.data.views.series;
    return (): ChartConfiguration => ({
      type: "line",
      data: {
        labels: s.map((p) => bucketLabel(p.start, views.period, timeZone)),
        datasets: [{ data: s.map((p) => p.value), borderColor: token("chart-views"), borderWidth: 2, pointRadius: 5, pointBackgroundColor: token("white"), pointBorderColor: token("chart-views"), pointBorderWidth: 2, tension: 0 }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltip((c) => `${c.parsed.y} views`) },
        scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
      },
    });
  }, [views.data, views.period, timeZone]);

  const ratingLine = useMemo(() => {
    const t = initial.rating.trend;
    return (): ChartConfiguration => ({
      type: "line",
      data: {
        labels: t.map((p) => formatDate(p.month, { style: "short", timeZone: "UTC" }).split(" ")[0]),
        datasets: [
          {
            data: t.map((p) => Number(p.average)),
            borderColor: token("chart-bar"),
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: token("white"),
            pointBorderColor: token("chart-bar"),
            pointBorderWidth: 2,
            fill: true,
            backgroundColor: token("track"),
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: tooltip((c) => `${c.parsed.y} average`) },
        scales: { x: { display: false }, y: { display: false, min: 0, max: 5.2 } },
      },
    });
  }, [initial.rating.trend]);

  const cats = initial.categories;
  const donut = useMemo(
    () => (): ChartConfiguration => ({
      type: "doughnut",
      data: {
        labels: cats.map((c) => c.name),
        datasets: [{ data: cats.map((c) => c.count), backgroundColor: cats.map((_, i) => token(`donut${(i % 6) + 1}`)), borderWidth: 0 }],
      },
      options: { maintainAspectRatio: false, cutout: "72%", plugins: { legend: { display: false }, tooltip: tooltip() } },
    }) as ChartConfiguration,
    [cats],
  );

  const viewsChange = change(views.data.views.total, views.data.views.previous);
  const revenueChange = revenue.data.revenue ? change(revenue.data.revenue.total, revenue.data.revenue.previous) : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Insights</h1>

      <ul className={styles.stats}>
        {STATS.map((s) => (
          <li key={s.tab} className={styles.stat}>
            <div className={styles.statTop}>
              <span className={styles.statIcon} data-tone={s.tone}>
                <PortalIcon name={s.icon} />
              </span>
              <span className={styles.statNumber} data-tone={s.tone}>
                {String(counts[s.tab]).padStart(2, "0")}
              </span>
            </div>
            <p className={styles.statTitle}>{s.title}</p>
            <Link href={`/business/dashboard?tab=${s.tab}`} className={styles.viewAll}>
              View All
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.rowTwo}>
        <section className={styles.card} aria-label="Incoming bookings chart">
          <header className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Incoming Bookings</h2>
            <PeriodSelect value={bookings.period} onChange={bookings.setPeriod} label="Incoming bookings" />
          </header>
          <p className={styles.chartNote}>
            {bookings.data.bookings.total} new {bookings.data.bookings.total === 1 ? "booking" : "bookings"} in this period
          </p>
          <ChartCanvas className={styles.chart} config={bookingsChart} label={`Bookings per ${bookings.period === "yearly" ? "month" : bookings.period === "monthly" ? "week" : "day"}`} />
        </section>
        <div className={styles.stack}>
          {canSeeMoney && initial.wallet ? <WalletCard businessId={businessId} balance={initial.wallet.balance} currency={initial.wallet.currency} /> : null}
          <section className={`${styles.card} ${styles.ratingCard}`} data-wide={!canSeeMoney ? "true" : undefined}>
            <header className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Rating</h2>
              <Link href="/business/reviews" className={styles.viewAll}>
                View all reviews
              </Link>
            </header>
            <div className={styles.ratingBody}>
              <p className={styles.figure}>
                <PortalIcon name="star" />
                <span>{initial.rating.count ? Number(initial.rating.average).toFixed(1) : "–"}</span>
              </p>
              {initial.rating.trend.length > 1 ? <ChartCanvas className={styles.ratingChart} config={ratingLine} label="Average rating by month" /> : <p className={styles.chartNote}>{initial.rating.count} reviews so far</p>}
            </div>
          </section>
        </div>
      </div>

      <div className={styles.rowThree} data-money={canSeeMoney ? "true" : undefined}>
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Listing statistics</h2>
            <PeriodSelect value={views.period} onChange={views.setPeriod} label="Listing statistics" />
          </header>
          <p className={styles.chartNote}>Views of your listings and business page</p>
          <ChartCanvas className={styles.chart} config={viewsArea} label="Listing views over time" />
        </section>
        {canSeeMoney && revenue.data.revenue ? (
          <section className={styles.card}>
            <header className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Revenue</h2>
              <PeriodSelect value={revenue.period} onChange={revenue.setPeriod} label="Revenue" />
            </header>
            <p className={styles.amount}>
              {money(revenue.data.revenue.total)}
              {revenueChange ? (
                <span className={styles.change} data-positive={revenueChange.positive ? "true" : "false"}>
                  {revenueChange.text}
                </span>
              ) : null}
            </p>
            <ChartCanvas className={styles.smallChart} config={revenueBars} label="Revenue over time" />
          </section>
        ) : null}
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Views</h2>
            {viewsChange ? (
              <span className={styles.change} data-positive={viewsChange.positive ? "true" : "false"}>
                {viewsChange.text}
              </span>
            ) : null}
          </header>
          <p className={styles.amount}>{compact(views.data.views.total)}</p>
          <ChartCanvas className={styles.smallChart} config={viewsLine} label="Views over time" />
        </section>
      </div>

      <div className={styles.rowFour}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Service Categories</h2>
          {cats.length ? (
            <div className={styles.donutRow}>
              <ChartCanvas className={styles.donut} config={donut} label="Bookings by category" />
              <ul className={styles.legend}>
                {cats.map((c, i) => (
                  <li key={c.slug}>
                    <span className={styles.swatch} style={{ background: `var(--color-donut${(i % 6) + 1})` }} aria-hidden />
                    <span>
                      <strong>{c.count}</strong>
                      <small>{c.name}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.chartNote}>Bookings by category show up after your first booking.</p>
          )}
        </section>
        <div className={styles.stack}>
          <ListingList title="Newly Added" items={initial.newly_added} mediaUrl={(p) => api.media.url(p)} />
          <ListingList title="Most viewed" items={initial.most_viewed} mediaUrl={(p) => api.media.url(p)} />
        </div>
      </div>

      <div className={styles.rowFive}>
        <SideCards layout="tile" />
      </div>
    </div>
  );
}

function ListingList({ title, items, mediaUrl }: { title: string; items: { id: string; title: string; city: string; views: number; cover: string | null }[]; mediaUrl: (p: string | null) => string | null }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{title}</h2>
      {items.length ? (
        <ul className={styles.listingRows}>
          {items.map((l) => (
            <li key={l.id}>
              <Link href={`/business/listings/${l.id}`} className={styles.listingRow}>
                {l.cover ? <img src={mediaUrl(l.cover) ?? ""} alt="" className={styles.listingPhoto} /> : <span className={styles.listingPhoto} aria-hidden />}
                <span className={styles.listingText}>
                  <strong>{l.title}</strong>
                  <small>{l.city}</small>
                </span>
                <span className={styles.views}>
                  <PortalIcon name="eye" size={18} />
                  {compact(l.views)} Views
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.chartNote}>Publish a listing to see it here.</p>
      )}
    </section>
  );
}

function WalletCard({ businessId, balance, currency }: { businessId: string; balance: number; currency: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string>();
  const toast = useToast();
  return (
    <section className={`${styles.card} ${styles.walletCard}`}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Wallet Amount</h2>
        <button type="button" className={styles.withdraw} onClick={() => setOpen(true)} disabled={balance <= 0}>
          Withdraw
        </button>
      </header>
      <p className={styles.figure}>
        <PortalIcon name="wallet" />
        <span>{formatPrice(balance, { currency })}</span>
      </p>
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setDone(undefined);
        }}
        title="Withdraw to your account"
        labelledBy="withdraw-title"
        footer={
          done ? null : (
            <button
              type="button"
              className={styles.withdrawConfirm}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await requestWithdrawal(businessId, balance, currency);
                  setDone(`Request ${r.id} sent. Moment pays out within 3 working days.`);
                  toast("Withdrawal requested");
                } catch (e) {
                  toast(errorMessage(e));
                }
                setBusy(false);
              }}
            >
              {busy ? "Requesting…" : `Withdraw ${formatPrice(balance, { currency })}`}
            </button>
          )
        }
      >
        {done ? (
          <p className={styles.chartNote}>{done}</p>
        ) : (
          <p className={styles.chartNote}>
            The full balance of {formatPrice(balance, { currency })} goes to the payout account on file. Payouts are not live yet, so this is a test request.
          </p>
        )}
      </Sheet>
    </section>
  );
}
