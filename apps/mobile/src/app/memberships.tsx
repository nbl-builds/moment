import { colors, formatDate, formatPrice, type ColorToken } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { useSession } from '@/features/auth/use-session';
import { Skeleton } from '@/features/home/components/skeleton';
import { PageHeader } from '@/features/profile/components/page-header';
import { profileKeys } from '@/features/profile/queries';
import { api } from '@/lib/api';

type Membership = Awaited<ReturnType<typeof api.account.memberships.listMine>>[number];

const STATUS: Record<Membership['status'], { label: string; color: ColorToken }> = {
  active: { label: 'Active', color: 'accepted' },
  past_due: { label: 'Payment due', color: 'debit' },
  cancelled: { label: 'Cancelled', color: 'blackTint3' },
  expired: { label: 'Expired', color: 'blackTint3' },
};

const INTERVAL: Record<Membership['plan']['interval'], string> = { month: 'month', year: 'year', one_time: '' };

function useMyMemberships() {
  const userId = useSession()?.user.id;
  return useQuery({
    queryKey: profileKeys.memberships(userId),
    queryFn: () => api.account.memberships.listMine(),
    enabled: Boolean(userId),
  });
}

/** "1 of 2 sessions left this month"; without the plan's total, "3 sessions left". */
function sessionsLine(m: Membership): string | null {
  if (m.sessions_remaining === null) return null;
  const plan = m.plan as Membership['plan'] & { included_sessions?: number | null };
  const left = m.sessions_remaining;
  const period = INTERVAL[m.plan.interval] ? ` this ${INTERVAL[m.plan.interval]}` : '';
  if (plan.included_sessions) return `${left} of ${plan.included_sessions} sessions left${period}`;
  return `${left} ${left === 1 ? 'session' : 'sessions'} left${period}`;
}

function periodLine(m: Membership): string | null {
  if (!m.current_period_end) return null;
  const date = formatDate(m.current_period_end, { style: 'medium' });
  if (m.status === 'expired' || m.status === 'cancelled') return `Ended ${date}`;
  return m.cancel_at_period_end || m.plan.interval === 'one_time' ? `Ends ${date}` : `Renews ${date}`;
}

/** Membership (not in Figma): the user's plans with sessions left and renewal date. */
export default function MembershipsScreen() {
  const insets = useSafeAreaInsets();
  const session = useSession();
  const list = useMyMemberships();

  const body =
    session === null ? (
      <State title="Sign in to see your memberships" />
    ) : list.isPending ? (
      <View style={styles.list}>
        {[0, 1].map((i) => (
          <Skeleton key={i} width="100%" height={130} radius={15} />
        ))}
      </View>
    ) : list.isError ? (
      <State title="Couldn’t load your memberships" action={{ label: 'Try again', onPress: () => void list.refetch() }} />
    ) : list.data.length === 0 ? (
      <State
        title="No memberships yet"
        body="Spas, salons and studios offer monthly plans with sessions included. Find one near you."
        action={{ label: 'Explore', onPress: () => router.push('/map') }}
      />
    ) : (
      <View style={styles.list}>
        {list.data.map((m) => (
          <MembershipCard key={m.id} membership={m} />
        ))}
      </View>
    );

  return (
    <View style={styles.screen}>
      <PageHeader title="Membership" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} />}
      >
        {body}
      </ScrollView>
    </View>
  );
}

function MembershipCard({ membership: m }: { membership: Membership }) {
  const status = STATUS[m.status];
  const businessName = m.business?.name ?? 'Moment';
  const logo = api.media.url(m.business?.logo_url ?? null);
  const sessions = sessionsLine(m);
  const period = periodLine(m);
  const slug = m.business?.slug;
  const price = `${formatPrice(m.plan.price_amount, { currency: m.plan.currency })}${INTERVAL[m.plan.interval] ? ` / ${INTERVAL[m.plan.interval]}` : ''}`;

  return (
    <Pressable
      onPress={slug ? () => router.push({ pathname: '/business/[slug]', params: { slug } }) : undefined}
      disabled={!slug}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole={slug ? 'button' : undefined}
      accessibilityLabel={[m.plan.name, businessName, status.label, sessions, period].filter(Boolean).join(', ')}
      accessibilityHint={slug ? `Opens ${businessName}` : undefined}
    >
      <View style={styles.cardTop}>
        <View style={styles.logo}>
          {logo ? (
            <Image source={logo} style={styles.logoImage} contentFit="cover" accessible={false} />
          ) : (
            <Icon name="award" size={24} color="black" />
          )}
        </View>
        <View style={styles.cardTitle}>
          <Text variant="subText16" weight="bold" color="black" numberOfLines={1}>
            {m.plan.name}
          </Text>
          <Text variant="subText12" color="blackTint3" numberOfLines={1}>
            {businessName} · {price}
          </Text>
        </View>
        <Text variant="subText12" weight="bold" color={status.color}>
          {status.label}
        </Text>
      </View>
      {(sessions || period) && <View style={styles.divider} />}
      {sessions && (
        <Text variant="subText14" weight="medium" color="black">
          {sessions}
        </Text>
      )}
      {period && (
        <Text variant="subText12" color="blackTint1" style={styles.period}>
          {period}
        </Text>
      )}
    </Pressable>
  );
}

function State({ title, body, action }: { title: string; body?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.state}>
      <Text variant="h4" color="black" align="center">
        {title}
      </Text>
      {body && (
        <Text variant="subText14" weight="medium" color="blackTint1" align="center" style={styles.stateBody}>
          {body}
        </Text>
      )}
      {action && <Button label={action.label} size="small" variant="dark" onPress={action.onPress} style={styles.stateButton} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  list: {
    paddingTop: 20,
    gap: 16,
  },
  card: {
    borderRadius: 15,
    backgroundColor: colors.white,
    padding: 15,
  },
  pressed: {
    opacity: 0.7,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  cardTitle: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 12,
  },
  period: {
    marginTop: 4,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 120,
    paddingHorizontal: 12,
  },
  stateBody: {
    marginTop: 12,
  },
  stateButton: {
    marginTop: 24,
  },
});
