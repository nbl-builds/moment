"use client";

import { Sheet } from "@/components/portal/sheet";
import { siteConfig } from "@/config/site";
import styles from "./help-sheet.module.css";

const FAQ = [
  { q: "How do I accept a booking request?", a: "Open the reservation from the Dashboard (Pending tab), Calendar or Inbox and choose Accept. The guest is notified in the Moment app straight away." },
  { q: "When do I get paid?", a: "Moment collects the payment when a guest books and pays out completed bookings to your account. Owners can see the wallet on Insights." },
  { q: "How do I pause a listing?", a: "Edit the listing and unpublish it, or archive it from Listings. Existing reservations stay on your calendar." },
  { q: "A guest didn't show up. What now?", a: "After the start time, open the reservation and mark it completed or as a no-show." },
];

/** "Get Help" / "Contact Support": answers and a way to reach Moment support. */
export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Get help"
      labelledBy="help-sheet-title"
      footer={
        <a className={styles.contact} href={`mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent("Help with my Moment business")}`}>
          Contact Moment Support
        </a>
      }
    >
      <p className={styles.intro}>Moment support is here 24/7. Most questions are answered below.</p>
      <div className={styles.faq}>
        {FAQ.map((item) => (
          <details key={item.q} className={styles.item}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </Sheet>
  );
}

const WHATS_NEW = [
  { title: "Your business portal", body: "Dashboard, calendar, inbox, listings and insights in one place on the web.", when: "This month" },
  { title: "Live guest chat", body: "Reply to guests from the Inbox; they see your messages instantly in the Moment app.", when: "This month" },
  { title: "Listing insights", body: "See how many people view your listings and how many book.", when: "This month" },
  { title: "Coming next: the listing editor", body: "Create and edit listings, photos, prices and availability right here.", when: "Soon" },
];

export function WhatsNewSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="What's new on Moment" labelledBy="whats-new-title">
      <ul className={styles.news}>
        {WHATS_NEW.map((n) => (
          <li key={n.title}>
            <span className={styles.when}>{n.when}</span>
            <strong>{n.title}</strong>
            <p>{n.body}</p>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
