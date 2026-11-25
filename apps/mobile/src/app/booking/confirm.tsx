import { CANCELLATION_POLICIES, colors, formatPkPhone, formatPrice, refundNote, type CancellationPolicyKey } from '@moment/shared';
import { useQueryClient } from '@tanstack/react-query';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { BackButton, Button, Icon, Text } from '@/components/ui';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { returnAfterSignIn } from '@/features/auth/sign-in-flow';
import { useMyProfile, useSession } from '@/features/auth/use-session';
import { BusinessCard } from '@/features/booking/components/business-card';
import { Card, Divider, Line, SectionHeader, TextLink } from '@/features/booking/components/card';
import { CouponSheet } from '@/features/booking/components/coupon-sheet';
import { DateSheet } from '@/features/booking/components/date-sheet';
import { GuestsSheet } from '@/features/booking/components/guests-sheet';
import { NotesSheet } from '@/features/booking/components/notes-sheet';
import { PAYMENT_ICONS, paymentLabel, PaymentSheet } from '@/features/booking/components/payment-sheet';
import { PhoneSheet } from '@/features/booking/components/phone-sheet';
import { PriceDetails } from '@/features/booking/components/price-details';
import { PromoRow, type PromoState } from '@/features/booking/components/promo-row';
import { SuccessSheet, type SuccessKind } from '@/features/booking/components/success-sheet';
import { TimeSheet, type StaffInfo } from '@/features/booking/components/time-sheet';
import { checkoutError, checkoutTotal, submitCheckout } from '@/features/booking/checkout';
import { bookingDraft, guestCount, guestsLabel, useBookingDraft, type BookingDraft, type DraftVisit } from '@/features/booking/draft';
import { appointmentLine } from '@/features/booking/format';
import { BOOK } from '@/features/booking/layout';
import { firstVisit, useListing, useQuote } from '@/features/booking/queries';
import type { ChainedVisit } from '@/features/booking/chain';
import { serviceCart } from '@/features/business/cart';
import { useBusiness, useBusinessLocation } from '@/features/business/queries';
import { ComingNext } from '@/features/placeholders/coming-next';
import { api } from '@/lib/api';

type SheetName = 'date' | 'time' | 'guests' | 'notes' | 'payment' | 'coupon' | 'phone';

const PAYMENT_NOTES: Record<string, string> = {
  card: 'Debit or credit card',
  jazzcash: 'JazzCash mobile account',
  easypaisa: 'Easypaisa mobile account',
};

/** Confirm Reservation (47:3637 / 47:5143, promo 48:7600 / 48:7743) with a pinned Confirm & Pay. */
export default function ConfirmReservationScreen() {
  const draft = useBookingDraft();
  // Keep showing the success sheet after the draft is cleared.
  const [success, setSuccess] = useState<SuccessKind | null>(null);
  if (!draft && !success) {
    return <ComingNext title="Confirm Reservation" note="Nothing to confirm. Pick a service or a session first." />;
  }
  return draft ? (
    <Confirm draft={draft} onSuccess={setSuccess} success={success} />
  ) : (
    <SuccessOnly kind={success ?? 'confirmed'} />
  );
}

function SuccessOnly({ kind }: { kind: SuccessKind }) {
  return (
    <View style={styles.screen}>
      <SuccessSheet visible kind={kind} onDone={goToBookings} />
    </View>
  );
}

function goToBookings() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/bookings');
}

function Confirm({ draft, success, onSuccess }: { draft: BookingDraft; success: SuccessKind | null; onSuccess: (k: SuccessKind) => void }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const session = useSession();
  const me = useMyProfile();
  const { openLoginSheet } = useLoginSheet();
  const { item } = draft;

  const business = useBusiness(item.businessId);
  const location = useBusinessLocation(item.businessId);
  const policyListing = useListing(item.kind === 'services' ? item.services[0]?.listingId : item.kind === 'slot' ? item.listingId : undefined);
  const quote = useQuote(draft);

  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [findingTime, setFindingTime] = useState(item.kind === 'services' && !item.visit);

  // A new cart starts on the first free visit; Edit changes it.
  const serviceIds = item.kind === 'services' ? item.services.map((s) => s.listingId) : [];
  const needsVisit = item.kind === 'services' && !item.visit;
  const serviceKey = serviceIds.join(',');
  useEffect(() => {
    if (!needsVisit) return;
    let active = true;
    firstVisit(serviceKey.split(','))
      .then((v) => {
        if (!active) return;
        const current = bookingDraft.get();
        if (v && current?.item.kind === 'services') bookingDraft.update({ item: { ...current.item, visit: toDraftVisit(v, serviceKey.split(',')) } });
      })
      .catch(() => undefined)
      .finally(() => active && setFindingTime(false));
    return () => {
      active = false;
    };
  }, [needsVisit, serviceKey]);

  const signedIn = Boolean(session);
  const phone = me.data?.private?.phone ?? null;
  const avatar = me.data?.profile.avatar_url ?? null;
  const phoneDone = signedIn && Boolean(phone);
  const photoDone = signedIn && Boolean(avatar);

  const staff = new Map<string, StaffInfo>((business.data?.staff ?? []).map((s) => [s.id, { name: s.display_name, avatarUrl: s.avatar_url }]));
  const visitPrice = item.kind === 'services' ? item.services.reduce((sum, s) => sum + s.price, 0) : 0;

  const promo: PromoState = !draft.couponCode
    ? { kind: 'none' }
    : quote.isFetching && quote.data?.couponError === undefined
      ? { kind: 'checking' }
      : quote.data?.couponError
        ? { kind: 'invalid', reason: quote.data.couponError }
        : { kind: 'applied', title: quote.data?.couponTitle ?? null };

  const total = quote.data ? checkoutTotal(quote.data.subtotal, quote.data.discount) : null;

  // Why Confirm & Pay is off, in the order the user can fix things.
  const blocker = !signedIn
    ? null
    : item.kind === 'services' && !item.visit
      ? findingTime
        ? 'Finding the first free time…'
        : 'Pick an appointment time.'
      : !phoneDone && !photoDone
        ? 'Add your phone number and profile photo to book.'
        : !phoneDone
          ? 'Add your phone number to book.'
          : !photoDone
            ? 'Add a profile photo to book.'
            : promo.kind === 'invalid'
              ? 'Change or remove the promo code to book.'
              : total === null
                ? 'Loading prices…'
                : null;

  const askToSignIn = () => {
    returnAfterSignIn('/booking/confirm');
    openLoginSheet();
  };

  const pickPhoto = async () => {
    if (!signedIn) return askToSignIn();
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setUploading(true);
    try {
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const body = await new File(asset.uri).arrayBuffer();
      await api.profile.uploadAvatar({ body, contentType: mimeType, extension: mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg' });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      showToast('Profile photo added');
    } catch (e) {
      Alert.alert('Couldn’t add the photo', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const confirmAndPay = async () => {
    if (!signedIn) return askToSignIn();
    if (blocker || total === null || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitCheckout(draft, total, phone);
      if (item.kind === 'services') serviceCart.clear(item.businessId);
      await queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onSuccess(result.kind);
    } catch (e) {
      const err = checkoutError(e, item.kind);
      queryClient.invalidateQueries({ queryKey: ['booking'] });
      Alert.alert(
        item.kind === 'membership' ? 'Couldn’t apply' : 'Couldn’t book',
        err.message,
        err.repick
          ? [
              { text: 'Cancel', style: 'cancel' },
              {
                text: item.kind === 'services' ? 'Pick another time' : 'Pick another session',
                onPress: () => (item.kind === 'services' ? setSheet('date') : router.back()),
              },
            ]
          : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const done = () => {
    bookingDraft.clear();
    goToBookings();
  };

  const saveVisit = (v: ChainedVisit) => {
    if (item.kind !== 'services') return;
    bookingDraft.update({ item: { ...item, visit: toDraftVisit(v, serviceIds) } });
    setSheet(null);
  };

  const policy = (policyListing.data?.cancellation_policy ?? null) as CancellationPolicyKey | null;
  const startsAt = item.kind === 'services' ? item.visit?.startsAt : item.kind === 'slot' ? item.startsAt : undefined;
  const primaryLocation = business.data?.locations.find((l) => l.is_primary) ?? business.data?.locations[0];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + BOOK.backTop, paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        <BackButton style={styles.back} />
        <Text variant="h3" color="secondary" style={styles.title}>
          Confirm Reservation
        </Text>
        <View style={styles.headerDivider} />

        <View style={styles.cards}>
          {business.data ? (
            <BusinessCard
              name={business.data.name}
              logoUrl={business.data.logo_url}
              verified={business.data.is_verified}
              distanceKm={location.distanceKm}
              area={primaryLocation ? [primaryLocation.area, primaryLocation.city].filter(Boolean).join(', ') : null}
              rating={Number(business.data.rating_avg)}
            />
          ) : (
            <View style={styles.businessPlaceholder} />
          )}

          <Card>
            <SectionHeader title="Your Reservation" link={item.kind === 'membership' ? undefined : { label: 'Edit', onPress: () => router.back(), accessibilityLabel: 'Edit reservation' }} />
            <View style={styles.rows}>
              {item.kind === 'services' &&
                item.services.map((s) => <Line key={s.listingId} label={`1x ${s.title}`} value={formatPrice(s.price)} />)}
              {item.kind === 'slot' && (
                <Line
                  label={item.private ? `Private group · ${item.title}` : `${guestCount(draft.guests)}x ${item.title}`}
                  value={quote.data ? formatPrice(quote.data.subtotal) : undefined}
                />
              )}
              {item.kind === 'membership' && <Line label={`${item.name} (${item.period})`} value={formatPrice(item.price)} />}
            </View>

            {item.kind !== 'membership' && (
              <>
                <SectionHeader
                  title="Appointment Time"
                  style={styles.section}
                  link={{
                    label: 'Edit',
                    accessibilityLabel: 'Edit appointment time',
                    onPress: () => (item.kind === 'services' ? setSheet('date') : router.back()),
                  }}
                />
                <View style={styles.rows}>
                  {item.kind === 'services' ? (
                    item.visit ? (
                      <Line label={appointmentLine(item.visit.startsAt, item.visit.endsAt)} />
                    ) : (
                      <Line label={findingTime ? 'Finding the first free time…' : 'No free time in the next two weeks. Tap Edit to pick a day.'} />
                    )
                  ) : (
                    <Line label={appointmentLine(item.startsAt, item.endsAt)} />
                  )}
                </View>
              </>
            )}

            {item.kind === 'slot' && (
              <>
                <SectionHeader
                  title="Guests"
                  style={styles.section}
                  link={{ label: 'Edit', accessibilityLabel: 'Edit guests', onPress: () => setSheet('guests') }}
                />
                <View style={styles.rows}>
                  <Line label={guestsLabel(draft.guests)} />
                </View>
              </>
            )}

            <SectionHeader
              title="Add Notes"
              suffix="(Optional)"
              style={styles.section}
              link={{ label: draft.notes ? 'Edit' : 'Add', accessibilityLabel: 'Add notes', onPress: () => setSheet('notes') }}
            />
            <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.notes} onPress={() => setSheet('notes')}>
              {draft.notes || 'Type here to add your notes....'}
            </Text>
            <Divider style={styles.notesLine} />
          </Card>

          {!(phoneDone && photoDone) && (
            <Card>
              <SectionHeader title="Required for your booking" />
              <Requirement
                title="Phone number"
                body={phoneDone && phone ? formatPkPhone(phone) : 'Add and confirm your phone number to get trip updates.'}
                done={phoneDone}
                onPress={() => (signedIn ? setSheet('phone') : askToSignIn())}
                first
              />
              <Requirement
                title="Profile photo"
                body={photoDone ? 'Added.' : 'Hosts want to know who’s coming.'}
                done={photoDone}
                busy={uploading}
                onPress={pickPhoto}
              />
            </Card>
          )}

          <PriceDetails
            itemsLabel={itemsLabel(draft)}
            subtotal={quote.data?.subtotal}
            discount={quote.data && !quote.data.couponError ? quote.data.discount : 0}
            loading={quote.isFetching}
            error={quote.isError}
          />

          <Card>
            <SectionHeader title="Payment Method" />
            <View style={styles.payment}>
              <Icon name={PAYMENT_ICONS[draft.paymentMethod as keyof typeof PAYMENT_ICONS] ?? 'creditcard'} size={24} color="black" />
              <View style={styles.paymentText}>
                <Text variant="body16" weight="bold" color="black">
                  {paymentLabel(draft.paymentMethod)}
                </Text>
                <Text variant="subText14" weight="medium" color="blackTint2">
                  {PAYMENT_NOTES[draft.paymentMethod] ?? ''}
                </Text>
              </View>
              <TextLinkChevron onPress={() => setSheet('payment')} />
            </View>
            {item.kind !== 'membership' && (
              <View style={styles.promo}>
                <PromoRow state={promo} onPress={() => setSheet('coupon')} />
              </View>
            )}
          </Card>

          <Card>
            <SectionHeader title="Cancellation" />
            <Text variant="body15" weight="medium" color="blackTint2" style={styles.cardBody}>
              {cancellationText(item.kind, policy, startsAt)}{' '}
              <Text
                variant="body15"
                weight="bold"
                color="black"
                style={styles.underline}
                onPress={() =>
                  Alert.alert(
                    'Cancellation policies',
                    Object.values(CANCELLATION_POLICIES)
                      .map((p) => `${p.label}: ${p.summary}`)
                      .join('\n\n'),
                  )
                }
              >
                Learn more
              </Text>
            </Text>
          </Card>

          <Card>
            <SectionHeader title="Get support anytime" />
            <Text variant="body15" weight="medium" color="blackTint2" style={styles.cardBody}>
              If you need help, we’re available 24/7 from anywhere in the world.
            </Text>
            <View style={styles.support}>
              <Icon name="moment-mark" size={28} color="black" />
              <Text
                variant="subText12"
                weight="bold"
                color="black"
                style={styles.supportLabel}
                onPress={() => router.push('/support')}
                accessibilityRole="button"
              >
                Contact Moment Support
              </Text>
              <TextLinkChevron onPress={() => router.push('/support')} label="Contact Moment Support" />
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + BOOK.buttonGap }]}>
        {blocker && (
          <Text variant="body12" weight="medium" color="secondaryTint2" align="center" style={styles.blocker} accessibilityLiveRegion="polite">
            {blocker}
          </Text>
        )}
        <Button
          label={signedIn ? 'Confirm & Pay' : 'Log in to book'}
          onPress={confirmAndPay}
          disabled={signedIn && Boolean(blocker)}
          loading={submitting}
        />
      </View>

      {item.kind === 'services' && (
        <>
          <DateSheet
            visible={sheet === 'date'}
            serviceIds={serviceIds}
            value={pickedDate ?? item.visit?.startsAt.slice(0, 10) ?? null}
            onSelect={(d) => {
              setPickedDate(d);
              setSheet('time');
            }}
            onClose={() => setSheet(null)}
          />
          <TimeSheet
            visible={sheet === 'time'}
            serviceIds={serviceIds}
            date={pickedDate}
            price={visitPrice}
            staff={staff}
            fallbackName={business.data?.name ?? ''}
            value={item.visit?.startsAt ?? null}
            onSave={saveVisit}
            onBack={() => setSheet('date')}
            onClose={() => setSheet(null)}
          />
        </>
      )}
      {item.kind === 'slot' && (
        <GuestsSheet
          visible={sheet === 'guests'}
          value={draft.guests}
          maxGuests={item.maxGuests}
          minGuests={item.private ? 1 : item.minGuests}
          petsAllowed={item.petsAllowed}
          onSave={(guests) => {
            bookingDraft.update({ guests });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      <NotesSheet
        visible={sheet === 'notes'}
        value={draft.notes}
        onSave={(notes) => {
          bookingDraft.update({ notes });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <PaymentSheet
        visible={sheet === 'payment'}
        value={draft.paymentMethod}
        onSelect={(paymentMethod) => {
          bookingDraft.update({ paymentMethod });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <CouponSheet
        visible={sheet === 'coupon'}
        businessId={item.businessId}
        value={draft.couponCode}
        onApply={(couponCode) => {
          bookingDraft.update({ couponCode });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <PhoneSheet visible={sheet === 'phone'} onClose={() => setSheet(null)} />
      <SuccessSheet visible={success !== null} kind={success ?? 'confirmed'} onDone={done} />
    </View>
  );
}

function Requirement({
  title,
  body,
  done,
  busy,
  first,
  onPress,
}: {
  title: string;
  body: string;
  done: boolean;
  busy?: boolean;
  first?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.requirement, first && styles.requirementFirst]}>
      <View style={styles.requirementTitle}>
        <View style={styles.requirementName}>
          <Text variant="body16" weight="bold" color="black">
            {title}
          </Text>
          {done && <Icon name="check-circle" size={18} />}
        </View>
        {busy ? (
          <Text variant="body14" weight="bold" color="secondaryTint3">
            Uploading…
          </Text>
        ) : (
          <TextLink label={done ? 'Change' : 'Add'} onPress={onPress} accessibilityLabel={`${done ? 'Change' : 'Add'} ${title.toLowerCase()}`} />
        )}
      </View>
      <Text variant="body15" weight="medium" color="secondaryTint2" style={styles.requirementBody}>
        {body}
      </Text>
    </View>
  );
}

/** The right-pointing chevron at the end of the payment and support rows. */
function TextLinkChevron({ onPress, label = 'Change payment method' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel={label} style={styles.chevron}>
      <Icon name="chevron-small" size={18} color="black" style={styles.chevronIcon} />
    </Pressable>
  );
}

function toDraftVisit(v: ChainedVisit, serviceIds: string[]): DraftVisit {
  return {
    startsAt: v.startsAt,
    endsAt: v.endsAt,
    times: v.times.map((t, i) => ({ listingId: serviceIds[i] ?? '', startsAt: t.starts_at, staffId: t.staff_id })),
  };
}

function itemsLabel(draft: BookingDraft): string {
  const { item } = draft;
  if (item.kind === 'services') return `${item.services.length} Service${item.services.length === 1 ? '' : 's'}`;
  if (item.kind === 'membership') return '1 Membership';
  if (item.private) return 'Private group';
  const n = guestCount(draft.guests);
  return `${n} Guest${n === 1 ? '' : 's'}`;
}

function cancellationText(kind: BookingDraft['item']['kind'], policy: CancellationPolicyKey | null, startsAt: string | undefined) {
  if (kind === 'membership') return 'Cancel any time before your next billing date.';
  if (!policy) return 'Loading the cancellation policy…';
  if (!startsAt || policy === 'non_refundable') return CANCELLATION_POLICIES[policy].summary;
  return refundNote(policy, startsAt);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundMuted,
  },
  back: {
    marginLeft: BOOK.inset,
  },
  title: {
    marginTop: BOOK.titleTop - 6,
    marginHorizontal: BOOK.inset,
  },
  headerDivider: {
    marginTop: BOOK.dividerTop - 6,
    marginHorizontal: BOOK.inset,
    height: 1,
    backgroundColor: colors.secondaryTint5,
  },
  cards: {
    marginTop: BOOK.afterDivider + 5,
    gap: BOOK.card.gap,
  },
  businessPlaceholder: {
    marginHorizontal: BOOK.inset,
    height: BOOK.business.height,
    borderRadius: BOOK.card.radius,
    backgroundColor: colors.surface,
  },
  rows: {
    marginTop: BOOK.titleToRow,
  },
  section: {
    marginTop: BOOK.sectionGap - (BOOK.rowPitch - 22.5),
  },
  notes: {
    marginTop: 10,
  },
  notesLine: {
    marginTop: 8,
    marginBottom: 2,
  },
  requirement: {
    marginTop: 20,
  },
  requirementFirst: {
    marginTop: 20,
  },
  requirementTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requirementName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requirementBody: {
    marginTop: 6,
    maxWidth: 260,
  },
  payment: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  paymentText: {
    flex: 1,
    gap: 2,
  },
  promo: {
    marginTop: 18,
  },
  cardBody: {
    marginTop: 12,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  support: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supportLabel: {
    flex: 1,
  },
  chevron: {
    alignSelf: 'center',
  },
  chevronIcon: {
    transform: [{ rotate: '-90deg' }],
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: BOOK.inset,
    paddingTop: 12,
    backgroundColor: colors.backgroundMuted,
  },
  blocker: {
    marginBottom: 8,
  },
});
