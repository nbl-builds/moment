import { useBucketSheets } from '@/features/bucket-list/bucket-sheets';
import { useSavedListings } from '@/features/bucket-list/queries';

/**
 * Hearts on listing and business cards: filled while the listing is in any bucket list.
 * Tapping opens the save sheets (guests get the login sheet).
 */
export function useBucketList() {
  const saved = useSavedListings();
  const { openForListing, openForBusiness } = useBucketSheets();
  return {
    isSaved: saved.isSaved,
    toggle: openForListing,
    /** Business cards ("Services near you"). */
    isBusinessSaved: (businessId: string) => saved.isTargetSaved({ kind: 'business', id: businessId }),
    toggleBusiness: openForBusiness,
  };
}
