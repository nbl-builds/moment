import {
  LISTING_TITLE_MAX,
  LISTING_TITLE_MIN,
  PUBLISH_MIN_DESCRIPTION,
  PUBLISH_MIN_PHOTOS,
  type EditorListing,
  type EditorStaffMember,
  type ListingKind,
  type WizardStep,
} from "@moment/shared";

/** Everything the server page hands the wizard. */
export interface WizardData {
  listing: EditorListing | null;
  business: { id: string; kind: "host" | "operator" | "venue"; status: string; timeZone: string; slug: string; groupSlug: string | null };
  categories: { id: string; slug: string; name: string; description: string | null; children: { id: string; slug: string; name: string }[] }[];
  staff: EditorStaffMember[];
  hostCard: EditorStaffMember | null;
  profile: { displayName: string; avatarUrl: string | null; bio: string | null };
  commissionBps: number;
  businessHours: { weekday: number; opens_at: string; closes_at: string }[];
}

export interface Draft {
  type: ListingKind;
  city: string;
  languages: string[];
  categoryId: string | null;
  title: string;
  description: string;
  duration: number;
  street: string;
  province: string;
  postalCode: string;
  notes: string;
  pin: { lat: number; lng: number } | null;
  includes: string[];
  minAge: number | null;
  activity: string | null;
  skill: string | null;
  maxGuests: number;
  privateMax: number;
  staffIds: string[];
  /** Experiences: weekly schedule. */
  weekdays: number[];
  times: string[];
  validFrom: string;
  validUntil: string;
  /** Services: weekly hours per staff member (ISO weekday, "HH:MM"). */
  staffHours: Record<string, { weekday: number; start: string; end: string }[]>;
  buffer: number;
  interval: number;
  instantBook: boolean;
  cutoff: number;
  policy: "flexible" | "moderate" | "strict" | "non_refundable";
  priceUnit: "per_person" | "per_booking";
  /** Typed in rupees (text), saved in minor units. */
  price: string;
  privatePrice: string;
  options: { id?: string; name: string; price: string; duration: number | null }[];
  groupOn: boolean;
  groupMin: number;
  groupPercent: number;
  earlyOn: boolean;
  earlyDays: number;
  earlyPercent: number;
  hostName: string;
  hostBio: string;
  hostLanguages: string[];
  hostAvatar: string | null;
}

const hhmm = (t: string) => t.slice(0, 5);
const rupees = (minor: number | null | undefined) => (minor ? String(Math.round(minor / 100)) : "");
export const toMinor = (text: string) => {
  const n = Number(text.replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

/** Experience or service, from the business (spas, salons and wellness are services). */
export function defaultKind(business: WizardData["business"]): ListingKind {
  return business.groupSlug === "beauty" || business.groupSlug === "health-wellness" ? "service" : "experience";
}

export function draftFrom(data: WizardData, today: string): Draft {
  const l = data.listing;
  const rules = l?.rules.filter((r) => r.is_active) ?? [];
  const host = data.hostCard;
  const staffHours: Draft["staffHours"] = {};
  for (const s of data.staff) {
    staffHours[s.id] = s.schedules.map((h) => ({ weekday: h.weekday, start: hhmm(h.start_time), end: hhmm(h.end_time) }));
  }
  return {
    type: l?.type ?? defaultKind(data.business),
    city: l?.city ?? "",
    languages: l?.languages ?? ["en"],
    categoryId: l?.category_id ?? null,
    title: l && !/^untitled /i.test(l.title) ? l.title : "",
    description: l?.description ?? "",
    duration: l?.duration_minutes ?? 120,
    street: l?.address_line1 ?? "",
    province: l?.province ?? "",
    postalCode: l?.postal_code ?? "",
    notes: l?.meeting_point_notes ?? "",
    pin: l?.pin ?? null,
    includes: l?.includes ?? [],
    minAge: l?.min_age ?? null,
    activity: l?.activity_level ?? null,
    skill: l?.skill_level ?? null,
    maxGuests: l?.max_guests ?? 10,
    privateMax: l?.private_max_guests ?? 0,
    staffIds: l?.staffIds ?? [],
    weekdays: rules[0]?.weekdays ?? [],
    times: [...new Set(rules.map((r) => hhmm(r.start_time)))].sort(),
    validFrom: rules[0]?.valid_from ?? today,
    validUntil: rules[0]?.valid_until ?? "",
    staffHours,
    buffer: l?.buffer_minutes ?? 0,
    interval: l?.slot_interval_minutes ?? 30,
    instantBook: l?.instant_book ?? true,
    cutoff: l?.booking_cutoff_minutes ?? 0,
    policy: l?.cancellation_policy ?? "flexible",
    priceUnit: l?.price_unit ?? (l?.type === "service" ? "per_booking" : "per_person"),
    price: rupees(l?.price_amount),
    privatePrice: rupees(l?.private_price_amount),
    options: (l?.options ?? []).filter((o) => o.is_active).map((o) => ({ id: o.id, name: o.name, price: rupees(o.price_amount), duration: o.duration_minutes })),
    groupOn: l?.group_discount_percent != null,
    groupMin: l?.group_discount_min_guests ?? 6,
    groupPercent: l?.group_discount_percent ?? 10,
    earlyOn: l?.early_bird_percent != null,
    earlyDays: l?.early_bird_days ?? 14,
    earlyPercent: l?.early_bird_percent ?? 10,
    hostName: host?.display_name ?? data.profile.displayName,
    hostBio: host?.bio ?? data.profile.bio ?? "",
    hostLanguages: host?.languages.length ? host.languages : (l?.languages ?? ["en"]),
    hostAvatar: host?.avatar_url ?? data.profile.avatarUrl,
  };
}

/** Which draft fields each step owns (for "unsaved changes"). */
export const STEP_FIELDS: Record<WizardStep, (keyof Draft)[]> = {
  type: ["type"],
  basics: ["city", "languages"],
  category: ["categoryId"],
  title: ["title"],
  photos: [],
  details: ["description", "duration"],
  location: ["street", "city", "province", "postalCode", "notes", "pin"],
  provide: ["includes"],
  requirements: ["minAge", "activity", "skill"],
  group: ["maxGuests", "privateMax"],
  staff: ["staffIds"],
  availability: ["weekdays", "times", "validFrom", "validUntil", "staffHours", "buffer", "interval"],
  booking: ["instantBook", "cutoff", "policy"],
  pricing: ["priceUnit", "price", "privatePrice", "options"],
  discount: ["groupOn", "groupMin", "groupPercent", "earlyOn", "earlyDays", "earlyPercent"],
  host: ["hostName", "hostBio", "hostLanguages", "hostAvatar"],
  review: [],
};

export function stepDirty(step: WizardStep, draft: Draft, saved: Draft) {
  return STEP_FIELDS[step].some((k) => JSON.stringify(draft[k]) !== JSON.stringify(saved[k]));
}

export interface Live {
  photoCount: number;
  oneOffCount: number;
}

/** Can the business press Next on this step? */
export function stepValid(step: WizardStep, d: Draft, live: Live): boolean {
  switch (step) {
    case "type":
      return Boolean(d.type);
    case "basics":
      return Boolean(d.city) && d.languages.length > 0;
    case "category":
      return Boolean(d.categoryId);
    case "title":
      return d.title.trim().length >= LISTING_TITLE_MIN && d.title.trim().length <= LISTING_TITLE_MAX;
    case "photos":
      return live.photoCount >= PUBLISH_MIN_PHOTOS;
    case "details":
      return d.description.trim().length >= PUBLISH_MIN_DESCRIPTION && d.duration > 0;
    case "location":
      return Boolean(d.street.trim() && d.city && d.province && d.pin) && (!d.postalCode || /^\d{5}$/.test(d.postalCode));
    case "provide":
      return d.includes.length > 0;
    case "requirements":
      return d.minAge !== null && Boolean(d.activity) && Boolean(d.skill);
    case "group":
      return d.maxGuests >= 1;
    case "staff":
      return d.staffIds.length > 0;
    case "availability":
      if (d.type === "service") return d.staffIds.some((id) => (d.staffHours[id] ?? []).some((h) => h.start < h.end));
      return (d.weekdays.length > 0 && d.times.length > 0) || live.oneOffCount > 0;
    case "booking":
      return true;
    case "pricing":
      return toMinor(d.price) > 0 && (d.privateMax === 0 || toMinor(d.privatePrice) > 0) && d.options.every((o) => o.name.trim() && toMinor(o.price) > 0);
    case "discount":
      return (!d.groupOn || (d.groupMin >= 2 && d.groupPercent >= 1 && d.groupPercent <= 90)) && (!d.earlyOn || (d.earlyDays >= 1 && d.earlyPercent >= 1 && d.earlyPercent <= 90));
    case "host":
      return d.hostName.trim().length >= 2;
    case "review":
      return true;
  }
}
