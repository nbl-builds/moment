import { colors, formatDistanceKm, formatLocalDate, LIMITS, reviewSchema, toLocalDate } from '@moment/shared';
import { useQueryClient } from '@tanstack/react-query';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '@/components/toast';
import { Button, Icon, Text, textStyle } from '@/components/ui';
import { useBusiness, useBusinessLocation, useReviewableBookings } from '@/features/business/queries';
import { api } from '@/lib/api';

// Figma: "Write a review" (47:7344) and with media (47:7419).
const GAP = { top: 16, closeToTitle: 30, titleToRule: 5, block: 20, labelToField: 10 } as const;
const STAR = 53.58;

type Picked = { uri: string; mimeType: string };

/**
 * Write a review for the most recent visit to this business that has no
 * review yet: 1-5 stars (required), a comment and up to 6 photos (optional).
 * Photos upload to Supabase Storage on submit.
 */
export default function WriteReviewScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const business = useBusiness(slug);
  const biz = business.data;
  const location = useBusinessLocation(biz?.id);
  const reviewable = useReviewableBookings(biz?.id);
  const visit = reviewable.data?.[0];

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const addFrom = async (source: 'library' | 'camera') => {
    const room = LIMITS.reviewPhotos - photos.length;
    if (room <= 0) return;
    // The library picker needs no permission (the system picker only returns what you choose).
    if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
      showToast('Allow camera access in Settings');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: source === 'library', selectionLimit: room };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    setPhotos((prev) => [...prev, ...result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' }))].slice(0, LIMITS.reviewPhotos));
  };

  const browse = () =>
    Alert.alert('Add photos', undefined, [
      // iOS can't present the picker while the alert is still closing.
      { text: 'Choose from library', onPress: () => setTimeout(() => void addFrom('library'), 400) },
      { text: 'Take a photo', onPress: () => setTimeout(() => void addFrom('camera'), 400) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const submit = async () => {
    if (!visit || !biz) return;
    if (rating === 0) {
      setError('Tap the stars to rate your visit');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const urls: string[] = [];
      for (const p of photos) {
        const bytes = await new File(p.uri).arrayBuffer();
        const extension = p.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
        urls.push(await api.reviews.uploadPhoto({ body: bytes, contentType: p.mimeType, extension }));
      }
      const form = reviewSchema.parse({ bookingId: visit.booking_id, rating, body, photos: urls });
      await api.reviews.create(form);
      await queryClient.invalidateQueries({ queryKey: ['business'] });
      showToast('Thanks! Your review is live');
      router.back();
    } catch {
      setError('We couldn’t post your review. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const logo = api.media.url(biz?.logo_url);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + GAP.top, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={28} color="secondary" />
        </Pressable>
        <Text variant="h3" color="secondary" style={styles.title} accessibilityRole="header">
          Write a review
        </Text>
        <View style={styles.rule} />

        {biz && (
          <View style={styles.bizCard}>
            <View style={styles.logo}>{logo && <Image source={{ uri: logo }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />}</View>
            <View style={styles.bizText}>
              <View style={styles.nameRow}>
                <Text variant="h4" color="secondary" numberOfLines={2} style={styles.flexShrink}>
                  {biz.name}
                </Text>
                {biz.is_verified && <Icon name="verified" size={14.6} accessibilityLabel="Verified" />}
              </View>
              {location.distanceKm !== null && (
                <View style={styles.distance}>
                  <Icon name="location-fill" size={20} color="secondary" />
                  <Text variant="body12" weight="medium" color="secondaryTint2">
                    {formatDistanceKm(location.distanceKm)}
                  </Text>
                </View>
              )}
              {biz.rating_count > 0 && (
                <View style={styles.ratingPill}>
                  <Icon name="star" size={14} />
                  <Text variant="subText12" weight="semibold" color="secondaryTint2">
                    {Number(biz.rating_avg).toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        {visit && (
          <Text variant="body12" color="secondaryTint2" style={styles.visit}>
            Your visit: {visit.listing_title}, {formatLocalDate(toLocalDate(visit.starts_at))}
          </Text>
        )}

        <Text variant="body18" weight="bold" color="secondary" style={styles.label}>
          How was your experience?
        </Text>
        <View style={styles.starsCard} accessibilityRole="adjustable" accessible accessibilityLabel="Rating" accessibilityValue={{ text: rating ? `${rating} of 5 stars` : 'Not rated' }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={(e) => setRating((r) => Math.min(5, Math.max(1, r + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={4} accessible={false}>
              <Icon name={n <= rating ? 'star-rate' : 'star-rate-empty'} size={STAR} />
            </Pressable>
          ))}
        </View>

        <Text variant="body18" weight="bold" color="secondary" style={styles.label}>
          Leave a comment{' '}
          <Text variant="body10" color="secondary">
            (Optional)
          </Text>
        </Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Let us know your feedback…"
          placeholderTextColor={colors.secondaryTint3}
          multiline
          maxLength={LIMITS.reviewBody}
          style={styles.comment}
          accessibilityLabel="Comment (optional)"
        />

        <Text variant="body16" weight="bold" color="secondary" style={styles.label}>
          Add Media{' '}
          <Text variant="body10" color="secondary">
            (Optional)
          </Text>
        </Text>
        <View style={styles.dropzone}>
          <View style={styles.dropRow}>
            <Icon name="upload-cloud" size={32} />
            <Pressable onPress={browse} disabled={photos.length >= LIMITS.reviewPhotos} style={styles.browse} accessibilityRole="button" accessibilityLabel="Browse photos">
              <Text variant="subText12" weight="medium" color="secondary">
                Browse
              </Text>
            </Pressable>
          </View>
          {photos.length > 0 && (
            <View style={styles.thumbs}>
              {photos.map((p, i) => (
                <View key={p.uri} style={styles.thumbWrap}>
                  <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" accessibilityLabel={`Photo ${i + 1}`} />
                  <Pressable
                    onPress={() => setPhotos((prev) => prev.filter((x) => x.uri !== p.uri))}
                    hitSlop={8}
                    style={styles.remove}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${i + 1}`}
                  >
                    <Icon name="close" size={12} color="black" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {error && (
          <Text variant="body14" color="error" style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <Button label="Submit Review" onPress={() => void submit()} loading={submitting} disabled={!visit} style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  // Figma: white 120pt card, 100pt logo (radius 20), name 20 bold.
  bizCard: {
    marginTop: GAP.block,
    height: 120,
    borderRadius: 15,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 16,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.secondaryTint6,
  },
  bizText: {
    flex: 1,
    alignSelf: 'stretch',
    paddingTop: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flexShrink: {
    flexShrink: 1,
  },
  distance: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingPill: {
    marginTop: 'auto',
    marginBottom: 3,
    width: 50,
    height: 24,
    borderRadius: 30,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  visit: {
    marginTop: 8,
  },
  label: {
    marginTop: GAP.block,
  },
  starsCard: {
    marginTop: GAP.labelToField,
    height: 92,
    borderRadius: 15,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  comment: {
    ...textStyle('body14', 'medium'),
    marginTop: GAP.labelToField,
    height: 120,
    borderRadius: 15,
    backgroundColor: colors.white,
    padding: 16,
    paddingTop: 16,
    color: colors.secondary,
    textAlignVertical: 'top',
  },
  // Figma: 1pt dashed Black Tint 6 border, radius 15; grows to show the thumbnails.
  dropzone: {
    marginTop: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.chipBorder,
    paddingHorizontal: 19,
    paddingVertical: 17,
  },
  dropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  browse: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  thumbs: {
    marginTop: 33,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  thumbWrap: {
    paddingTop: 10,
  },
  thumb: {
    width: 56,
    height: 64,
    borderRadius: 8,
  },
  remove: {
    position: 'absolute',
    top: 0,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    marginTop: 16,
  },
  submit: {
    marginTop: 31,
  },
});
