// Create New Listing wizard (business portal): steps, choices and the rules a
// listing must meet before it can be submitted. The rules mirror
// `public.listing_missing()` in supabase/migrations: change both together.

export type ListingKind = 'experience' | 'service';

export const WIZARD_STEPS = [
  'type',
  'basics',
  'category',
  'title',
  'photos',
  'details',
  'location',
  'provide',
  'requirements',
  'group',
  'staff',
  'availability',
  'booking',
  'pricing',
  'discount',
  'host',
  'review',
] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const isWizardStep = (value: unknown): value is WizardStep =>
  typeof value === 'string' && (WIZARD_STEPS as readonly string[]).includes(value);

/** Steps that only apply to one kind of listing. */
const ONLY: Partial<Record<WizardStep, ListingKind>> = {
  requirements: 'experience',
  group: 'experience',
  staff: 'service',
};

export interface WizardGroup {
  key: 'idea' | 'page' | 'settings' | 'submission';
  label: string;
  steps: WizardStep[];
}

/** Sidebar groups (Figma: Your Idea, Experience page, Settings, Your submission). */
export function wizardGroups(kind: ListingKind): WizardGroup[] {
  const keep = (steps: WizardStep[]) => steps.filter((s) => !ONLY[s] || ONLY[s] === kind);
  return [
    { key: 'idea', label: 'Your Idea', steps: keep(['type', 'basics', 'category']) },
    {
      key: 'page',
      label: kind === 'service' ? 'Service page' : 'Experience page',
      steps: keep(['title', 'photos', 'details', 'location', 'provide', 'requirements']),
    },
    { key: 'settings', label: 'Settings', steps: keep(['group', 'staff', 'availability', 'booking', 'pricing', 'discount']) },
    { key: 'submission', label: 'Your submission', steps: keep(['host', 'review']) },
  ];
}

export const wizardSteps = (kind: ListingKind): WizardStep[] => wizardGroups(kind).flatMap((g) => g.steps);

export function stepLabel(step: WizardStep, kind: ListingKind): string {
  const noun = kind === 'service' ? 'Service' : 'Experience';
  const labels: Record<WizardStep, string> = {
    type: `${noun} Type`,
    basics: 'Basics',
    category: 'Category',
    title: 'Title',
    photos: 'Photos',
    details: `${noun} Details`,
    location: 'Location',
    provide: 'What I’ll provide',
    requirements: 'Guest requirements',
    group: 'Group size',
    staff: 'Staff',
    availability: 'Availability',
    booking: 'Booking settings',
    pricing: 'Guest pricing',
    discount: 'Discount',
    host: 'Your information',
    review: 'Review & submit',
  };
  return labels[step];
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------
export const LISTING_TITLE_MAX = 60;
export const LISTING_TITLE_MIN = 10;
export const PUBLISH_MIN_PHOTOS = 5;
export const PUBLISH_MIN_DESCRIPTION = 100;
export const LISTING_DESCRIPTION_MAX = 2000;
export const LISTING_PHOTOS_MAX = 20;
export const LISTING_INCLUDES_MAX = 20;
/** Uploads are resized in the browser so the longest edge is at most this. */
export const LISTING_PHOTO_MAX_EDGE = 1600;

export interface MissingInput {
  type: ListingKind;
  booking_mode: 'slot' | 'appointment';
  title: string;
  description: string | null;
  category_id: string | null;
  photoCount: number;
  price_amount: number;
  hasLocation: boolean;
  hasAvailability: boolean;
  staffCount: number;
}

export interface MissingItem {
  key: 'title' | 'description' | 'category' | 'photos' | 'price' | 'location' | 'availability' | 'staff';
  label: string;
  step: WizardStep;
}

/** What still blocks "Submit for review" (same keys as `listing_missing`). */
export function listingMissing(l: MissingInput): MissingItem[] {
  const out: MissingItem[] = [];
  const title = l.title.trim();
  if (/^untitled /i.test(title) || title.length < LISTING_TITLE_MIN) out.push({ key: 'title', label: `A title (${LISTING_TITLE_MIN}+ characters)`, step: 'title' });
  if ((l.description?.trim().length ?? 0) < PUBLISH_MIN_DESCRIPTION)
    out.push({ key: 'description', label: `Description (${PUBLISH_MIN_DESCRIPTION}+ characters)`, step: 'details' });
  if (!l.category_id) out.push({ key: 'category', label: 'Category', step: 'category' });
  if (l.photoCount < PUBLISH_MIN_PHOTOS) out.push({ key: 'photos', label: `At least ${PUBLISH_MIN_PHOTOS} photos`, step: 'photos' });
  if (l.price_amount <= 0) out.push({ key: 'price', label: 'Price', step: 'pricing' });
  if (!l.hasLocation) out.push({ key: 'location', label: 'Location or meeting point', step: 'location' });
  if (!l.hasAvailability) out.push({ key: 'availability', label: 'Availability', step: 'availability' });
  if (l.type === 'service' && l.staffCount === 0) out.push({ key: 'staff', label: 'Staff who perform it', step: 'staff' });
  return out;
}

/** What the business keeps after Moment's commission (basis points, 1000 = 10%). */
export const afterCommission = (amount: number, bps: number) => Math.max(0, amount - Math.round((amount * bps) / 10_000));

// ---------------------------------------------------------------------------
// Choices
// ---------------------------------------------------------------------------
export const PK_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir',
] as const;
export type PkProvince = (typeof PK_PROVINCES)[number];

/** Cities hosts can pick, with a centre point for the map pin to start from. */
export const PK_CITIES: { name: string; province: PkProvince; lat: number; lng: number }[] = [
  { name: 'Islamabad', province: 'Islamabad Capital Territory', lat: 33.6844, lng: 73.0479 },
  { name: 'Lahore', province: 'Punjab', lat: 31.5204, lng: 74.3587 },
  { name: 'Karachi', province: 'Sindh', lat: 24.8607, lng: 67.0011 },
  { name: 'Rawalpindi', province: 'Punjab', lat: 33.5651, lng: 73.0169 },
  { name: 'Faisalabad', province: 'Punjab', lat: 31.4504, lng: 73.135 },
  { name: 'Multan', province: 'Punjab', lat: 30.1575, lng: 71.5249 },
  { name: 'Peshawar', province: 'Khyber Pakhtunkhwa', lat: 34.0151, lng: 71.5249 },
  { name: 'Quetta', province: 'Balochistan', lat: 30.1798, lng: 66.975 },
  { name: 'Hyderabad', province: 'Sindh', lat: 25.396, lng: 68.3578 },
  { name: 'Gujranwala', province: 'Punjab', lat: 32.1877, lng: 74.1945 },
  { name: 'Sialkot', province: 'Punjab', lat: 32.4945, lng: 74.5229 },
  { name: 'Bahawalpur', province: 'Punjab', lat: 29.3544, lng: 71.6911 },
  { name: 'Murree', province: 'Punjab', lat: 33.907, lng: 73.3943 },
  { name: 'Abbottabad', province: 'Khyber Pakhtunkhwa', lat: 34.1688, lng: 73.2215 },
  { name: 'Swat', province: 'Khyber Pakhtunkhwa', lat: 34.7717, lng: 72.36 },
  { name: 'Naran', province: 'Khyber Pakhtunkhwa', lat: 34.9089, lng: 73.6508 },
  { name: 'Chitral', province: 'Khyber Pakhtunkhwa', lat: 35.8518, lng: 71.7864 },
  { name: 'Gilgit', province: 'Gilgit-Baltistan', lat: 35.9208, lng: 74.3144 },
  { name: 'Hunza', province: 'Gilgit-Baltistan', lat: 36.3167, lng: 74.65 },
  { name: 'Skardu', province: 'Gilgit-Baltistan', lat: 35.2971, lng: 75.6333 },
  { name: 'Muzaffarabad', province: 'Azad Jammu and Kashmir', lat: 34.37, lng: 73.4711 },
  { name: 'Sukkur', province: 'Sindh', lat: 27.7052, lng: 68.8574 },
  { name: 'Thatta', province: 'Sindh', lat: 24.7461, lng: 67.9236 },
  { name: 'Gwadar', province: 'Balochistan', lat: 25.1264, lng: 62.3225 },
];

export const findCity = (name: string | null | undefined) => PK_CITIES.find((c) => c.name.toLowerCase() === name?.trim().toLowerCase());

/** Nearest listed city to a point (for "Use my current location"). */
export function nearestCity(lat: number, lng: number) {
  let best = PK_CITIES[0]!;
  let bestD = Infinity;
  for (const c of PK_CITIES) {
    const d = (c.lat - lat) ** 2 + ((c.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** Languages hosts speak (`listings.languages` and `staff_members.languages` codes). */
export const LISTING_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'Urdu' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'sd', label: 'Sindhi' },
  { code: 'ps', label: 'Pashto' },
  { code: 'bal', label: 'Balochi' },
  { code: 'skr', label: 'Saraiki' },
  { code: 'bsk', label: 'Burushaski' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
];

export const languageLabel = (code: string) => LISTING_LANGUAGES.find((l) => l.code === code)?.label ?? code;

/** "How long is your experience?" (minutes). */
export const DURATION_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480, 600, 720] as const;

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} minutes`;
  const hours = h === 1 ? '1 hour' : `${h} hours`;
  return m ? `${hours} ${m} minutes` : hours;
}

export const ACTIVITY_LEVELS = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'strenuous', label: 'Strenuous' },
  { value: 'extreme', label: 'Extreme' },
] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]['value'];

export const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number]['value'];

/** Minimum age choices (0 = all ages). */
export const MIN_AGE_OPTIONS = [0, 3, 6, 10, 12, 13, 16, 18, 21] as const;
export const minAgeLabel = (age: number) => (age === 0 ? 'All ages' : `${age}+`);

/** Quick picks on "What I'll provide". */
export const PROVIDE_SUGGESTIONS = ['Food', 'Drinks', 'Equipment', 'Transport', 'Entry tickets', 'Safety gear', 'Photos'] as const;

/** "Booking cut-off": how long before the start guests can still book (minutes). */
export const BOOKING_CUTOFFS = [
  { minutes: 0, label: 'Until it starts' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 120, label: '2 hours before' },
  { minutes: 360, label: '6 hours before' },
  { minutes: 1440, label: '24 hours before' },
  { minutes: 2880, label: '2 days before' },
  { minutes: 10080, label: '1 week before' },
] as const;

export const cutoffLabel = (minutes: number) =>
  BOOKING_CUTOFFS.find((c) => c.minutes === minutes)?.label ?? `${Math.round(minutes / 60)} hours before`;

/** Gap between appointments (services). */
export const BUFFER_OPTIONS = [0, 5, 10, 15, 30, 45, 60] as const;

/** ISO weekdays, Monday first (availability_rules.weekdays, staff_schedules.weekday). */
export const ISO_WEEKDAYS = [
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
  { value: 7, short: 'Sun', label: 'Sunday' },
] as const;
