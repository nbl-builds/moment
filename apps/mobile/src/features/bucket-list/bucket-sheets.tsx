import { colors, formatShortDateTime } from '@moment/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/bottom-sheet';
import { showToast } from '@/components/toast';
import { Button, Icon, Text } from '@/components/ui';
import { useLoginSheet } from '@/features/auth/login-sheet-provider';
import { GroupPickerSheet } from '@/features/groups/components/group-picker-sheet';
import { ListThumbnail } from './components/list-thumbnail';
import { NameSheet } from './components/name-sheet';
import { SheetOption } from './components/sheet-option';
import { BUCKET } from './layout';
import { useBucketLists, useBucketMutations, useSavedListings, type SaveTarget } from './queries';

// Saving from a heart (Figma 22:2487 -> 24:1225 -> 24:1444 -> 24:1667):
// actions sheet -> "Your Bucketlist" picker -> "Give it a name" -> first-save sheet.

type Step = 'actions' | 'picker' | 'name' | 'first' | 'groups' | null;

/** Shown once per device: the very first save gets the "Ohhh, your first item here!" sheet. */
const FIRST_SAVE_KEY = 'moment.bucketFirstSaveSeen';

interface BucketSheetsValue {
  /** Heart tapped on a listing: guests get the login sheet. */
  openForListing: (listingId: string) => void;
  /** Heart on a business page. */
  openForBusiness: (businessId: string) => void;
}

const Ctx = createContext<BucketSheetsValue | null>(null);

export function BucketSheetsProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { openLoginSheet } = useLoginSheet();
  const saved = useSavedListings();
  const lists = useBucketLists();
  const { addToList, removeFromList, createAndAdd } = useBucketMutations();

  const [step, setStep] = useState<Step>(null);
  const [target, setTarget] = useState<SaveTarget | null>(null);
  /** Opened straight on the picker (heart already filled): back closes instead of returning to actions. */
  const [pickerOnly, setPickerOnly] = useState(false);
  const [firstListId, setFirstListId] = useState<string | null>(null);

  const close = useCallback(() => setStep(null), []);

  const open = useCallback(
    (t: SaveTarget) => {
      if (!saved.signedIn) {
        openLoginSheet();
        return;
      }
      setTarget(t);
      const alreadySaved = saved.isTargetSaved(t);
      setPickerOnly(alreadySaved);
      setStep(alreadySaved ? 'picker' : 'actions');
    },
    [saved, openLoginSheet],
  );
  const value = useMemo(
    () => ({
      openForListing: (id: string) => open({ kind: 'listing', id }),
      openForBusiness: (id: string) => open({ kind: 'business', id }),
    }),
    [open],
  );

  const viewList = (listId: string) => router.push({ pathname: '/bucket-list/[id]', params: { id: listId } });

  /** After a save: the first one ever gets its own sheet, the rest a toast with "View". */
  const afterSave = async (listId: string, name: string, wasEmpty: boolean) => {
    let firstEver = false;
    if (wasEmpty) {
      try {
        firstEver = (await AsyncStorage.getItem(FIRST_SAVE_KEY)) === null;
        await AsyncStorage.setItem(FIRST_SAVE_KEY, '1');
      } catch {
        firstEver = false;
      }
    }
    if (firstEver) {
      setFirstListId(listId);
      setStep('first');
    } else {
      setStep(null);
      showToast(`Saved to ${name}`, { label: 'View', onPress: () => viewList(listId) });
    }
  };

  const toggleInList = (listId: string, name: string) => {
    if (!target) return;
    const inList = saved.listsForTarget(target).includes(listId);
    if (inList) {
      removeFromList.mutate({ listId, target });
      return;
    }
    const wasEmpty = !saved.hasAnySaved();
    addToList.mutate({ listId, target });
    // Saving from the actions sheet finishes the flow; with a filled heart the picker stays open for more ticks.
    if (!pickerOnly) void afterSave(listId, name, wasEmpty);
  };

  const create = (name: string) => {
    if (!target) return;
    const wasEmpty = !saved.hasAnySaved();
    createAndAdd.mutate(
      { name, target },
      { onSuccess: (list) => void afterSave(list.id, list.name, wasEmpty) },
    );
  };

  const ticked = target ? saved.listsForTarget(target) : [];
  const sheetBottom = insets.bottom + BUCKET.sheetBottom;

  return (
    <Ctx.Provider value={value}>
      {children}

      {/* Heart action sheet (22:2487) */}
      <BottomSheet visible={step === 'actions'} onRequestClose={close} accessibilityLabel="Save" backgroundColor={colors.backgroundMuted}>
        <View style={[styles.options, { paddingBottom: sheetBottom }]}>
          <SheetOption icon="heart-outline" title="Add to bucket list" subtitle="Save it for later" onPress={() => setStep('picker')} />
          <SheetOption
            icon="users"
            title="Add to Groups"
            subtitle="Plan with a team"
            onPress={() => setStep('groups')}
          />
        </View>
      </BottomSheet>

      {/* "Your Bucketlist" picker (24:1225) */}
      <BottomSheet
        visible={step === 'picker'}
        onRequestClose={close}
        accessibilityLabel="Your Bucketlist"
        backgroundColor={colors.backgroundMuted}
      >
        <View style={[styles.picker, { paddingBottom: sheetBottom + 16 }]}>
          <View style={styles.pickerHeader}>
            <Pressable
              onPress={() => (pickerOnly ? close() : setStep('actions'))}
              hitSlop={10}
              style={styles.pickerBack}
              accessibilityRole="button"
              accessibilityLabel={pickerOnly ? 'Close' : 'Back'}
            >
              <Icon name="chevron-left" size={28} color="black" />
            </Pressable>
            <Text variant="h4" color="secondary" align="center" accessibilityRole="header">
              Your Bucketlist
            </Text>
          </View>

          <Pressable
            onPress={() => setStep('name')}
            style={({ pressed }) => [styles.create, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Create a new bucketlist"
          >
            <Icon name="plus" size={28} color="secondary" />
            <Text variant="subText16" weight="bold" color="secondary">
              Create a new bucketlist
            </Text>
          </Pressable>

          <View style={styles.rows}>
            {lists.isPending && <ActivityIndicator color={colors.secondary} style={styles.loading} />}
            {(lists.data ?? []).map((list) => {
              const inList = ticked.includes(list.id);
              return (
                <Pressable
                  key={list.id}
                  onPress={() => toggleInList(list.id, list.name)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: inList }}
                  accessibilityLabel={list.name}
                >
                  <ListThumbnail url={list.thumbnailUrl} size={BUCKET.picker.thumb} radius={12} />
                  <View style={styles.rowText}>
                    <Text variant="body18" weight="bold" color="secondary" numberOfLines={1}>
                      {list.name}
                    </Text>
                    <Text variant="body12" weight="medium" color="secondaryTint2">
                      {formatShortDateTime(list.created_at)}
                    </Text>
                  </View>
                  {inList && (
                    <View style={styles.tick}>
                      <Icon name="check" size={18} color="secondary" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </BottomSheet>

      {/* "Add to Groups": pick or create a group */}
      <GroupPickerSheet
        target={step === 'groups' && target ? (target.kind === 'listing' ? { listingId: target.id } : { businessId: target.id }) : null}
        onBack={() => setStep('actions')}
        onClose={close}
      />

      {/* "Give it a name" (24:1444) */}
      <NameSheet
        visible={step === 'name'}
        title="Give it a name"
        placeholder="Enter your bucket name"
        submitLabel="Create Now"
        loading={createAndAdd.isPending}
        onSubmit={create}
        onClose={() => setStep('picker')}
      />

      {/* First save ever (24:1667) */}
      <BottomSheet visible={step === 'first'} onRequestClose={close} accessibilityLabel="Your first item" backgroundColor={colors.backgroundMuted}>
        <View style={[styles.first, { paddingBottom: insets.bottom + 18 }]}>
          <Image source={require('../../../assets/illustrations/bucket-list.svg')} style={styles.illustration} accessible={false} />
          <Text variant="h3" color="secondary" align="center" style={styles.firstTitle} accessibilityRole="header">
            Ohhh, your first item here!
          </Text>
          <Text variant="body15" weight="medium" color="secondaryTint2" align="center" style={styles.firstBody}>
            You can view the bucket list you save in your account.
          </Text>
          <Button
            label="View Bucketlist"
            onPress={() => {
              close();
              if (firstListId) viewList(firstListId);
            }}
            style={styles.firstButton}
          />
        </View>
      </BottomSheet>
    </Ctx.Provider>
  );
}

export function useBucketSheets(): BucketSheetsValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBucketSheets must be used inside BucketSheetsProvider');
  return ctx;
}

const P = BUCKET.picker;

const styles = StyleSheet.create({
  // Figma: options 38pt below the sheet top, 20pt apart.
  options: {
    paddingTop: BUCKET.sheetTop,
    paddingHorizontal: BUCKET.inset,
    gap: BUCKET.option.gap,
  },
  picker: {
    paddingTop: P.headerTop,
    paddingHorizontal: BUCKET.inset,
  },
  pickerHeader: {
    minHeight: 28,
    justifyContent: 'center',
  },
  pickerBack: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  // Figma: white 68pt card, plus 20pt in, label 20pt after it.
  create: {
    marginTop: P.headerToCreate,
    height: P.createHeight,
    borderRadius: 15,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    gap: 20,
  },
  pressed: {
    opacity: 0.7,
  },
  rows: {
    marginTop: P.createToRows,
    gap: P.rowGap,
  },
  loading: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: P.textGap,
    paddingLeft: 1,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  tick: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma 24:1667: icon 39pt below the top, title 20pt below it, button 84pt below the body.
  first: {
    paddingTop: 39,
    paddingHorizontal: BUCKET.inset,
    alignItems: 'center',
  },
  illustration: {
    width: BUCKET.illustration,
    height: BUCKET.illustration,
  },
  firstTitle: {
    marginTop: 20,
  },
  firstBody: {
    marginTop: 6,
    maxWidth: 267,
  },
  firstButton: {
    marginTop: 39,
    alignSelf: 'stretch',
  },
});
