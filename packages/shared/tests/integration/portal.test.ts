// Business portal API against local Supabase with the portal demo seed
// (supabase/seeds/portal_demo.sql). pnpm db:reset first.
import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { ApiError, createMomentApi, listingChecklist, RESERVATION_TABS, type MomentApi } from '../../src/api';
import type { Database } from '../../src/types';

const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';
const BIZ = '00000000-0000-4000-b000-000000000031';

async function signedIn(email: string): Promise<MomentApi> {
  const api = createMomentApi(createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
  await api.auth.signInWithPassword({ email, password: 'password123' });
  return api;
}

describe.skipIf(!url || !key)('portal API', () => {
  let owner: MomentApi;
  let manager: MomentApi;
  let guest: MomentApi;

  beforeAll(async () => {
    [owner, manager, guest] = await Promise.all([
      signedIn('portal@moment.test'),
      signedIn('manager.portal@moment.test'),
      signedIn('bilal@moment.test'),
    ]);
  });

  it('counts every dashboard tab and lists matching rows', async () => {
    const counts = await owner.portal.reservationCounts(BIZ);
    for (const tab of RESERVATION_TABS) expect(counts[tab]).toBeGreaterThan(0);
    const ongoing = await owner.portal.listReservations(BIZ, 'ongoing');
    expect(ongoing).toHaveLength(counts.ongoing);
    expect(ongoing.every((r) => r.status === 'confirmed')).toBe(true);
    expect(ongoing[0]?.guest?.display_name).toBeTruthy();
  });

  it('accepts a pending reservation and the guest sees it confirmed', async () => {
    const pending = await owner.portal.listReservations(BIZ, 'pending');
    const mine = pending[0];
    expect(mine).toBeTruthy();
    const before = await owner.portal.getReservation(mine!.id);
    const theGuest = await signedIn(before.contact_email!);
    await owner.portal.acceptReservation(mine!.id);
    const detail = await owner.portal.getReservation(mine!.id);
    expect(detail.status).toBe('confirmed');
    expect(detail.events[detail.events.length - 1]?.to_status).toBe('confirmed');
    const seenByGuest = await theGuest.bookings.get(mine!.id);
    expect(seenByGuest.status).toBe('confirmed');
    const notifications = await theGuest.db.from('notifications').select('type, data').order('created_at', { ascending: false }).limit(1);
    expect(JSON.stringify(notifications.data)).toContain(mine!.id);
  });

  it('opens a chat with the guest and lists it in the inbox', async () => {
    const upcoming = await owner.portal.listReservations(BIZ, 'upcoming');
    const conv = await owner.portal.startGuestConversation(upcoming[0]!.id);
    const sent = await owner.chat.send({ conversationId: conv.id, body: 'See you soon!', attachments: [] }, BIZ);
    expect(sent.sender_business_id).toBe(BIZ);
    const inbox = await owner.portal.inbox(BIZ);
    expect(inbox.some((c) => c.conversation_id === conv.id)).toBe(true);
    // The guest replies: unread for the owner until they open the thread.
    const detail = await owner.portal.getReservation(upcoming[0]!.id);
    const theGuest = await signedIn(detail.contact_email!);
    await theGuest.chat.send({ conversationId: conv.id, body: 'Great, thank you!', attachments: [] });
    const unread = await owner.portal.inbox(BIZ, { unreadOnly: true });
    expect(unread.find((c) => c.conversation_id === conv.id)?.unread).toBeGreaterThan(0);
    await owner.portal.markConversationRead(conv.id);
    const after = await owner.portal.inbox(BIZ, { unreadOnly: true });
    expect(after.some((c) => c.conversation_id === conv.id)).toBe(false);
  });

  it('lists listings by state and category group', async () => {
    const counts = await owner.portal.listingCounts(BIZ);
    // Drafts include the wizard demo drafts (339-342) and listings waiting for review.
    expect(counts).toMatchObject({ draft: 6, archived: 1 });
    const food = await owner.portal.listListings(BIZ, 'published', { groupSlug: 'food' });
    expect(food.map((l) => l.title)).toContain('Walled City Food Walk at Dusk');
    expect(food.every((l) => l.category?.parent?.slug === 'food' || l.category?.slug === 'food')).toBe(true);
  });

  it('reviews: summary and reply', async () => {
    const summary = await owner.portal.reviewSummary(BIZ);
    expect(summary.total).toBe(summary.distribution.reduce((s, d) => s + d.count, 0));
    const reviews = await owner.portal.listReviews(BIZ);
    const unanswered = reviews.find((r) => !r.business_reply)!;
    await owner.portal.replyToReview(unanswered.id, 'Thank you for coming!');
    const again = await owner.portal.listReviews(BIZ);
    expect(again.find((r) => r.id === unanswered.id)?.business_reply).toBe('Thank you for coming!');
  });

  it('insights: owners get revenue and wallet, managers do not', async () => {
    const mine = await owner.portal.insights(BIZ, 'weekly');
    expect(mine.bookings.series).toHaveLength(7);
    expect(mine.revenue?.series).toHaveLength(7);
    expect(mine.wallet?.balance).toBeGreaterThan(0);
    const theirs = await manager.portal.insights(BIZ, 'yearly');
    expect(theirs.revenue).toBeNull();
    expect(theirs.wallet).toBeNull();
    expect(theirs.views.series).toHaveLength(12);
  });

  it('listing details: detail, stats, sessions, blocks, pause, duplicate, publish checklist', async () => {
    const walk = '00000000-0000-4000-e000-000000000331';
    const l = (await owner.portal.getListing(walk))!;
    expect(l.title).toBe('Walled City Food Walk at Dusk');
    expect(l.media.length).toBeGreaterThanOrEqual(6);
    expect(l.itinerary.map((s) => s.position)).toEqual([0, 1, 2, 3]);
    expect(l.point?.lat).toBeGreaterThan(31);
    expect(listingChecklist(l).every((i) => i.done)).toBe(true);

    const stats = await owner.portal.listingStats(walk);
    expect(stats.series).toHaveLength(30);
    expect(stats.revenue).not.toBeNull();

    const slots = await owner.portal.listingSlots(walk, { limit: 5 });
    expect(slots.length).toBeGreaterThan(0);
    const blocks = await owner.portal.listingBlocks({ businessId: BIZ, listingId: walk, staffIds: l.staff.map((s) => s.id) });
    expect(blocks.some((b) => b.reason === 'Private event')).toBe(true);

    await owner.portal.setAcceptingBookings(walk, false);
    expect((await owner.portal.getListing(walk))!.accepting_bookings).toBe(false);
    await owner.portal.setAcceptingBookings(walk, true);

    const draft = (await owner.portal.getListing('00000000-0000-4000-e000-000000000335'))!;
    const missing = listingChecklist(draft).filter((i) => !i.done).map((i) => i.key);
    expect(missing).toEqual(expect.arrayContaining(['photos', 'availability']));
    expect(missing).not.toContain('description');

    const copyId = await manager.portal.duplicateListing(walk);
    const copy = (await manager.portal.getListing(copyId))!;
    expect(copy.status).toBe('draft');
    await manager.portal.deleteDraft(copyId);
    expect(await manager.portal.getListing(copyId)).toBeNull();
    await expect(manager.portal.deleteDraft(walk)).rejects.toBeInstanceOf(ApiError);
  });

  it('outsiders cannot read the business', async () => {
    await expect(guest.portal.insights(BIZ)).rejects.toBeInstanceOf(ApiError);
    // Guests only ever see their own reservations.
    const rows = await guest.portal.listReservations(BIZ, 'completed');
    expect(rows.every((r) => r.guest?.display_name === 'Bilal Hussain')).toBe(true);
  });
});
