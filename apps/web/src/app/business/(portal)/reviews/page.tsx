import type { Metadata } from "next";
import { getPortalContext } from "@/features/portal/context";
import { requestTime } from "@/lib/business/clock";
import { ReviewList } from "@/features/portal/reviews/review-list";
import { ReviewSummary } from "@/features/portal/reviews/review-summary";
import styles from "@/features/portal/reviews/reviews.module.css";

export const metadata: Metadata = { title: "Reviews" };

/** Figma 513:2725. */
export default async function ReviewsPage() {
  const ctx = await getPortalContext();
  const [summary, reviews] = await Promise.all([ctx.api.portal.reviewSummary(ctx.business.id), ctx.api.portal.listReviews(ctx.business.id)]);
  return (
    <div>
      <h1 className={styles.title}>Reviews</h1>
      <ReviewSummary {...summary} />
      <section className={styles.listCard} aria-label="Reviews">
        <ReviewList reviews={reviews} canReply={ctx.permissions.replyToReviews} now={requestTime()} />
      </section>
    </div>
  );
}
