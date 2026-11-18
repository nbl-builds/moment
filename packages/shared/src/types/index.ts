// Friendly aliases over the generated Supabase types.
// Regenerate the source with `pnpm db:types` after every migration.
import type { Database, Enums, Tables, TablesInsert, TablesUpdate } from './database.types';

export type { Database, Enums, Json, Tables, TablesInsert, TablesUpdate } from './database.types';
export { Constants } from './database.types';

type Functions = Database['public']['Functions'];
export type RpcArgs<Name extends keyof Functions> = Functions[Name]['Args'];
export type RpcReturns<Name extends keyof Functions> = Functions[Name]['Returns'];

// Identity
export type Profile = Tables<'profiles'>;
export type ProfilePrivate = Tables<'profile_private'>;

// Businesses and team
export type Business = Tables<'businesses'>;
export type BusinessPrivate = Tables<'business_private'>;
export type BusinessLocation = Tables<'business_locations'>;
export type BusinessMember = Tables<'business_members'>;
export type StaffMember = Tables<'staff_members'>;
export type StaffSchedule = Tables<'staff_schedules'>;

// Catalog
export type Category = Tables<'categories'>;
export type Tag = Tables<'tags'>;
export type Listing = Tables<'listings'>;
export type ListingInsert = TablesInsert<'listings'>;
export type ListingUpdate = TablesUpdate<'listings'>;
export type ListingOption = Tables<'listing_options'>;
export type ListingMedia = Tables<'listing_media'>;

// Availability and bookings
export type AvailabilityRule = Tables<'availability_rules'>;
export type AvailabilityException = Tables<'availability_exceptions'>;
export type Slot = Tables<'slots'>;
export type Booking = Tables<'bookings'>;
export type BookingItem = Tables<'booking_items'>;
export type BookingEvent = Tables<'booking_events'>;
export type AvailableTime = RpcReturns<'get_available_times'>[number];
export type CreateBookingArgs = RpcArgs<'create_booking'>;

// Payments
export type Payment = Tables<'payments'>;
export type Refund = Tables<'refunds'>;
export type PayoutAccount = Tables<'payout_accounts'>;
export type Payout = Tables<'payouts'>;
export type WalletTransaction = Tables<'wallet_transactions'>;
export type WalletBalance = Database['public']['Views']['wallet_balances']['Row'];

// Engagement
export type Review = Tables<'reviews'>;
export type BucketListItem = Tables<'bucket_list_items'>;
export type PlaceRecommendation = Tables<'place_recommendations'>;
export type Badge = Tables<'badges'>;
export type QuizQuestion = Tables<'quiz_questions'>;
export type QuizAnswer = Tables<'quiz_answers'>;
export type QuizResult = Tables<'quiz_results'>;
export type UserBadge = Tables<'user_badges'>;

// Groups and chat
export type Group = Tables<'groups'>;
export type GroupMember = Tables<'group_members'>;
export type Conversation = Tables<'conversations'>;
export type ConversationParticipant = Tables<'conversation_participants'>;
export type Message = Tables<'messages'>;

// Memberships and coupons
export type MembershipPlan = Tables<'membership_plans'>;
export type Membership = Tables<'memberships'>;
export type Coupon = Tables<'coupons'>;
export type CouponRedemption = Tables<'coupon_redemptions'>;

// Profile, support, platform
export type Notification = Tables<'notifications'>;
export type PushToken = Tables<'push_tokens'>;
export type SupportTicket = Tables<'support_tickets'>;
export type SupportMessage = Tables<'support_messages'>;
export type LegalDocument = Tables<'legal_documents'>;
export type PlatformSetting = Tables<'platform_settings'>;
export type BusinessApiKey = Tables<'business_api_keys'>;

// Enums
export type BusinessRole = Enums<'business_role'>;
export type BusinessStatus = Enums<'business_status'>;
export type BookingStatus = Enums<'booking_status'>;
export type BookingPaymentStatus = Enums<'booking_payment_status'>;
export type BookingMode = Enums<'booking_mode'>;
export type ListingType = Enums<'listing_type'>;
export type PayoutModel = Enums<'payout_model'>;
export type PaymentStatus = Enums<'payment_status'>;

/**
 * Payment provider slug stored in `payments.provider` and friends.
 * Free text in the database so new providers need no migration.
 */
export type PaymentProvider =
  | 'jazzcash'
  | 'easypaisa'
  | 'safepay'
  | 'payfast'
  | 'bank_transfer'
  | 'cash'
  | 'manual'
  | (string & {});

/**
 * PostGIS columns (`geo`, `meeting_point`, `destination_geo`) are typed
 * `unknown` by the generator. Write them as EWKT strings with this helper.
 */
export const toGeoPoint = (lat: number, lng: number): string => `SRID=4326;POINT(${lng} ${lat})`;
