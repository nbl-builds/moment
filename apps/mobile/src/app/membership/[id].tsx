import { colors, formatPrice, PAYMENT_METHODS } from '@moment/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Icon, Text } from '@/components/ui';
import { planPeriodLabel } from '@/features/business/components/plan-card';
import { Skeleton } from '@/features/home/components/skeleton';
import { api } from '@/lib/api';

// Figma: "Membership Details" (47:3101).
const GAP = { top: 16, closeToTitle: 30, titleToRule: 5, ruleToName: 37, section: 44, headingToValue: 10, card: 16 } as const;

type Plan = Awaited<ReturnType<typeof api.catalog.getMembershipPlan>>;

/** What the plan includes, from `benefits.perks` (or its sessions and discount). */
function planServices(plan: Plan): { title: string; subtitle: string }[] {
  const perks = (plan.benefits as { perks?: unknown } | null)?.perks;
  const list = Array.isArray(perks) ? perks.filter((p): p is string => typeof p === 'string') : [];
  const per = plan.interval === 'year' ? 'per year' : plan.interval === 'month' ? 'per month' : 'in total';
  const rows = list.map((p) => {
    const m = /^(\d+)\s*x\s*(.+)$/i.exec(p);
    return m ? { title: m[2] ?? p, subtitle: `${m[1]} session${m[1] === '1' ? '' : 's'} ${per}` } : { title: p, subtitle: 'Included' };
  });
  if (rows.length === 0 && plan.included_sessions) rows.push({ title: 'Sessions', subtitle: `${plan.included_sessions} ${per}` });
  if (plan.discount_percent && !list.some((p) => p.includes('%'))) {
    rows.push({ title: `${plan.discount_percent}% off`, subtitle: 'On everything else you book here' });
  }
  return rows;
}

/** Membership Details: what's included, duration, price, how to pay, terms, and "Apply Membership". */
export default function MembershipDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const plan = useQuery({ queryKey: ['membership-plan', id], queryFn: () => api.catalog.getMembershipPlan(id), enabled: Boolean(id) });
  const p = plan.data;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + GAP.top, paddingBottom: insets.bottom + 110 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={28} color="secondary" />
        </Pressable>
        <Text variant="h3" color="secondary" style={styles.title} accessibilityRole="header">
          Membership Details
        </Text>
        <View style={styles.rule} />

        {plan.isPending ? (
          <View style={styles.loading}>
            <Skeleton width={220} height={36} radius={8} />
            <Skeleton width="100%" height={80} radius={8} />
            <Skeleton width="100%" height={68} radius={15} />
          </View>
        ) : plan.isError || !p ? (
          <View style={styles.loading}>
            <Text variant="h4" color="secondary">
              Couldn’t load this membership
            </Text>
            <Button label="Try again" size="small" variant="dark" onPress={() => void plan.refetch()} style={styles.retry} />
          </View>
        ) : (
          <>
            <Text variant="h1" color="black" style={styles.name}>
              {p.name}
            </Text>
            {p.description && (
              <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.description}>
                {p.description}
              </Text>
            )}

            <Section title="Services and sessions">
              <View style={styles.cards}>
                {planServices(p).map((s) => (
                  <View key={s.title} style={styles.card}>
                    <Icon name="file-signature" size={28} color="black" />
                    <View style={styles.cardText}>
                      <Text variant="subText16" weight="bold" color="black" numberOfLines={1}>
                        {s.title}
                      </Text>
                      <Text variant="subText12" weight="medium" color="blackTint2">
                        {s.subtitle}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Section>
            <Section title="Duration">
              <Value>{planPeriodLabel(p.interval)}</Value>
            </Section>
            <Section title="Price">
              <Value>{formatPrice(p.price_amount, { currency: p.currency })}</Value>
            </Section>
            <Section title="Payment Method">
              <View style={styles.methods}>
                {PAYMENT_METHODS.map((m) => (
                  <Value key={m.key}>{`•  ${m.label}`}</Value>
                ))}
              </View>
            </Section>
            <Section title="Terms & Conditions">
              <Value>
                {p.interval === 'one_time'
                  ? 'Valid for the season from your first visit. Sessions can’t be carried over or refunded once used.'
                  : `Renews every ${p.interval}. Cancel any time before the next renewal; unused sessions don’t roll over.`}
              </Value>
            </Section>
          </>
        )}
      </ScrollView>

      {p && (
        <Button
          label="Apply Membership"
          onPress={() => router.push({ pathname: '/booking/new', params: { businessId: p.business_id ?? '', planId: p.id } })}
          style={[styles.apply, { bottom: insets.bottom + 13 }]}
        />
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="h4" color="black" accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Value({ children }: { children: string }) {
  return (
    <Text variant="body15" weight="medium" color="secondaryTint2">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  content: {
    paddingHorizontal: 20,
  },
  close: {
    alignSelf: 'flex-start',
  },
  title: {
    marginTop: GAP.closeToTitle,
  },
  rule: {
    marginTop: GAP.titleToRule,
    height: 1,
    backgroundColor: colors.secondaryTint5,
  },
  loading: {
    marginTop: 30,
    gap: 16,
  },
  retry: {
    alignSelf: 'flex-start',
  },
  name: {
    marginTop: GAP.ruleToName,
  },
  description: {
    marginTop: 8,
  },
  section: {
    marginTop: GAP.section,
  },
  sectionBody: {
    marginTop: GAP.headingToValue,
  },
  cards: {
    marginTop: 8,
    gap: GAP.card,
  },
  // Figma: white 68pt rows, radius 15, icon 18pt in, text 20pt after it.
  card: {
    height: 68,
    borderRadius: 15,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    gap: 20,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  methods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 24,
  },
  apply: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
});
