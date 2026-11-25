// MOCK: referrals. There is no referrals backend yet; replace these with the
// real API (a per-user code plus invite rows) and keep the signatures.
// See docs/ROADMAP.md "To wire after UI".

export interface MyReferral {
  code: string;
  link: string;
}

export interface ReferralInvite {
  id: string;
  /** Invitee's name, or their phone number until they sign up. */
  name: string;
  status: 'pending' | 'accepted';
  /** Reward in minor units (PKR). */
  reward: number;
  invited_at: string;
}

const DAY_MS = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY_MS - hours * 3_600_000).toISOString();

export const referralLink = (code: string) => `https://moment.pk/r/${code}`;

export async function getMyReferral(displayName = ''): Promise<MyReferral> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  // MOCK: a code from the first name; the real one is unique and stored on the server.
  const first = displayName.split(/\s+/)[0]?.replace(/[^a-z]/gi, '').toUpperCase() || 'MOMENT';
  const code = `${first.slice(0, 8)}25`;
  return { code, link: referralLink(code) };
}

export async function listMyInvites(): Promise<ReferralInvite[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return [
    { id: 'inv-1', name: 'Hamza Qureshi', status: 'pending', reward: 50000, invited_at: ago(1, 0) },
    { id: 'inv-2', name: 'Fatima Malik', status: 'accepted', reward: 50000, invited_at: ago(4, 4) },
    { id: 'inv-3', name: '+92 300 ••• 4512', status: 'pending', reward: 50000, invited_at: ago(9, 5) },
    { id: 'inv-4', name: 'Bilal Ahmed', status: 'accepted', reward: 50000, invited_at: ago(23, 6) },
    { id: 'inv-5', name: 'Zainab Raza', status: 'accepted', reward: 50000, invited_at: ago(41, 2) },
  ];
}
