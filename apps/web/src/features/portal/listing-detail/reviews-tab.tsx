import { requestTime } from "@/lib/business/clock";
import { getPortalContext } from "../context";
import { ReviewList } from "../reviews/review-list";
import { ReviewSummary } from "../reviews/review-summary";
import styles from "./listing-detail.module.css";

/** This listing's rating summary and reviews, with Reply (Reviews page components). */
export async function ReviewsTab({ listingId, canReply }: { listingId: string; canReply: boolean }) {
  const ctx = await getPortalContext();
  const [summary, reviews] = await Promise.all([ctx.api.portal.reviewSummary(ctx.business.id, { listingId }), ctx.api.portal.listReviews(ctx.business.id, { listingId })]);
  return (
    <div className={styles.tabBody}>
      <ReviewSummary {...summary} />
      <div className={styles.section}>
        <ReviewList reviews={reviews} canReply={canReply} now={requestTime()} />
      </div>
    </div>
  );
}
