import type { ImageSource } from 'expo-image';

export interface IconDefinition {
  source: ImageSource | number;
  /** Size of the drawn glyph when the icon box is 24pt. Defaults to the full box. */
  glyph?: { width: number; height: number };
  /** Multi-colour marks (brand logos) keep their own colours and ignore `color`. */
  multicolor?: boolean;
}

/**
 * Every icon the app uses, exported from Figma as SVG (assets/icons).
 *
 * The Figma "Icons" page is the "Huge Icons" set (huge-icon/<category>/<outline|solid|bulk>/<name>),
 * but it is not the npm Hugeicons library: names and shapes differ, and screens also use
 * icons from other sets (the login sheet's mail is Iconsax, the chevron is Feather). So we
 * export exactly what each screen uses. To add one: download the node as SVG from Figma
 * into assets/icons, register it here under the Figma layer name, and note the node.
 */
export const icons = {
  /** Figma: "Apple" on the login sheet (1825:2884). */
  apple: { source: require('../../../assets/icons/apple.svg') },
  /** Figma: "Huge-icon/time and date/outline/calendar 01" on Finish signing up (12:1059). */
  calendar: { source: require('../../../assets/icons/calendar.svg') },
  /** Figma: "chevron-down" in the phone field (1825:2869). */
  'chevron-down': { source: require('../../../assets/icons/chevron-down.svg') },
  /** Figma: "chevron-left" back button (7:396). */
  'chevron-left': { source: require('../../../assets/icons/chevron-left.svg') },
  /** Figma: "Huge-icon/interface/outline/eye" (12:1045): password visible. */
  eye: { source: require('../../../assets/icons/eye.svg') },
  /** Figma: "Huge-icon/interface/outline/eye-disable" on Enter Password (12:1043): password hidden. */
  'eye-disable': { source: require('../../../assets/icons/eye-disable.svg') },
  /** Figma: Facebook logo component (7:335) on Sign in with email. */
  facebook: { source: require('../../../assets/icons/facebook.svg'), multicolor: true },
  /** Figma: Google logo component (7:308). 39.2 x 40 mark drawn 24pt tall. */
  google: {
    source: require('../../../assets/icons/google.svg'),
    glyph: { width: 23.52, height: 24 },
    multicolor: true,
  },
  /** Figma: "house-door" in the Button component (6:1740). */
  'house-door': { source: require('../../../assets/icons/house-door.svg') },
  /** Figma: "Icon/Fill/Mail" on the login sheet (1825:2881). */
  mail: { source: require('../../../assets/icons/mail.svg') },
  /** Figma: "Icon/Solid/Padlock" on Enter verification code (7:1080). 48pt, P Shade 2 stroke. */
  padlock: { source: require('../../../assets/icons/padlock.svg'), multicolor: true },
  /** Figma: "mobile" on the email login sheet. 14 x 20 glyph in a 24pt box. */
  mobile: { source: require('../../../assets/icons/mobile.svg'), glyph: { width: 14, height: 20 } },
  /** Figma: Button loading state ("Frame 15", 6:1702). */
  spinner: { source: require('../../../assets/icons/spinner.svg') },

  // Home (Figma 13:1487, 17:1027)
  /** "arrow-right" on section headers (15:1049). The glyph points up; draw it rotated 90°. */
  'arrow-up': { source: require('../../../assets/icons/arrow-right.svg'), glyph: { width: 9.5, height: 13.5 } }, // 11.08 x 15.75 in Figma's 28pt box
  /** "Huge-icon/interface/outline/search 03" in the search bar (52:9618). */
  search: { source: require('../../../assets/icons/search.svg') },
  /** "Icon/Solid/Filter" in the search bar (52:9619). */
  filter: { source: require('../../../assets/icons/filter.svg') },
  /** "huge-icon/health/outline/heart" next to the search bar (52:9621). */
  heart: { source: require('../../../assets/icons/heart.svg') },
  /** "vuesax/linear/heart" on card photos: white outline over a 50% black fill (13:1551). */
  'heart-on-photo': { source: require('../../../assets/icons/heart-on-photo.svg'), multicolor: true },
  /** "Huge-icon/health/solid/heart" (4:31324): a saved listing. */
  'heart-solid': { source: require('../../../assets/icons/heart-solid.svg') },
  /** Rating star on cards (13:1540), 14pt, its own amber. */
  star: { source: require('../../../assets/icons/star.svg'), multicolor: true },
  /** "location.fill" next to the distance on card photos (13:1544), 20pt white. */
  'location-fill': { source: require('../../../assets/icons/location-fill.svg') },
  /** "person.crop.circle.badge.questionmark" on the Adventure Quiz card (13:1499), 40pt. */
  'quiz-badge': { source: require('../../../assets/icons/quiz-badge.svg') },
  /** "Huge-icon/navigation maps/outline/location-add" on the Recommend button (18:1062), 16pt. */
  'location-add': { source: require('../../../assets/icons/location-add.svg') },
  /** More to explore chips (17:1261 ...). Figma draws four; the rest come from the Icons page. */
  'category-adventure': { source: require('../../../assets/icons/category-adventure.svg'), glyph: { width: 24, height: 21 } },
  'category-tours': { source: require('../../../assets/icons/category-tours.svg'), multicolor: true },
  'category-food': { source: require('../../../assets/icons/category-food.svg') },
  'category-wellness': { source: require('../../../assets/icons/category-wellness.svg') },
  'category-arts': { source: require('../../../assets/icons/category-arts.svg') },
  'category-day-trips': { source: require('../../../assets/icons/category-day-trips.svg') },
  'category-water': { source: require('../../../assets/icons/category-water.svg') },

  // Search Filter (Figma 22:1336)
  /** "Huge-icon/interface/solid/remove": the close cross on Filters / Search Results (22:1366); 11.65pt glyph in 28pt. */
  close: { source: require('../../../assets/icons/close.svg'), glyph: { width: 10, height: 10 } },
  /** "x" closing bottom sheets (22:1611), 28pt. */
  x: { source: require('../../../assets/icons/x.svg') },
  /** "Icon/Solid/Search" in sheet search fields (22:1598). */
  'search-solid': { source: require('../../../assets/icons/search-solid.svg') },
  /** Unselected radio in pickers (22:1612), 20pt. */
  radio: { source: require('../../../assets/icons/radio.svg') },
  /** Filters "Pick Category" chips (22:1372 ...). */
  'category-art': { source: require('../../../assets/icons/category-art.svg'), glyph: { width: 19.2, height: 19.2 } },
  'category-beauty': { source: require('../../../assets/icons/category-beauty.svg') },
  'category-entertainment': { source: require('../../../assets/icons/category-entertainment.svg') },
  'category-tours-solid': { source: require('../../../assets/icons/category-tours-solid.svg'), glyph: { width: 22, height: 22 } },

  // Tab bar (outline, tinted: lime when active)
  /** Figma "home" (13:1583), as an outline. */
  'tab-home': { source: require('../../../assets/icons/tab-home.svg') },
  /** Figma "moment" (13:1588): the Moment mark, for Bookings. */
  'tab-bookings': { source: require('../../../assets/icons/tab-bookings.svg'), glyph: { width: 20.21, height: 17.82 } },
  /** Figma "users" (13:1595). */
  'tab-groups': { source: require('../../../assets/icons/tab-groups.svg') },
  /** Figma Explore compass (13:1603), 30pt in the raised circle. */
  'tab-explore': { source: require('../../../assets/icons/tab-explore.svg') },
  /** "Huge-icon/user/outline/user" (4:14358): Profile for guests. */
  'tab-profile': { source: require('../../../assets/icons/tab-profile.svg') },

  // Bucket List (Figma 22:2329 ... 25:1723)
  /** "heart" on the save sheet (23:1230), 28pt. */
  'heart-outline': { source: require('../../../assets/icons/heart-outline-28.svg') },
  /** Saved listing on card photos: 50% red fill, white outline (24:2189). */
  'heart-saved': { source: require('../../../assets/icons/heart-saved.svg'), multicolor: true },
  /** "users" on "Add to Groups" (23:1236), 28pt. */
  users: { source: require('../../../assets/icons/users.svg') },
  /** "plus" on "Create a new bucketlist" (24:1429), 28pt. */
  plus: { source: require('../../../assets/icons/plus.svg') },
  /** "share" next to a list's title (24:2161): 21pt glyph in a 28pt box. */
  share: { source: require('../../../assets/icons/share.svg'), glyph: { width: 18, height: 18 } },
  /** "•••" next to a list's title (24:2167): 24 x 6 in a 28pt box. */
  more: { source: require('../../../assets/icons/more.svg'), glyph: { width: 20.6, height: 5.1 } },
  /** "share-2" on "Share a link" (24:2458), 28pt. */
  'share-link': { source: require('../../../assets/icons/share-2.svg') },
  /** Two users and a plus on "Invite others" (24:2459), 28pt. */
  'user-add': { source: require('../../../assets/icons/user-add.svg') },
  /** "file-edit" (25:1508) and "trash-2" (25:1507) on the list menu, 28pt. */
  'file-edit': { source: require('../../../assets/icons/file-edit.svg') },
  trash: { source: require('../../../assets/icons/trash.svg') },
  /** Tick on lists that already hold the listing. Not in Figma: drawn to match the 2pt stroke icons. */
  check: { source: require('../../../assets/icons/check.svg') },

  // Business page (Figma 25:2265 ... 47:7419)
  /** Verified badge next to a business name (P Shade 2), drawn at 14.6pt. */
  verified: { source: require('../../../assets/icons/verified.svg'), multicolor: true },
  /** "location.fill" pin before the address, 18pt. */
  'location-pin': { source: require('../../../assets/icons/location-pin.svg') },
  /** "navigation.fill" arrow before the distance, 18pt. */
  navigation: { source: require('../../../assets/icons/navigation.svg') },
  /** Play badge over the business logo (25:2265), 28pt. */
  'play-circle': { source: require('../../../assets/icons/play-circle.svg') },
  /** Panel handle: an up chevron (15 x 5) in S Tint 3; rotated to point down when expanded. */
  'handle-chevron': { source: require('../../../assets/icons/handle-chevron.svg'), glyph: { width: 15, height: 5.1 } },
  /** Red "remove service" button (47:1828), 40pt. */
  'remove-circle': { source: require('../../../assets/icons/remove-circle.svg'), multicolor: true },
  /** Red outline trash in the cart bar (47:1828). */
  'trash-red': { source: require('../../../assets/icons/trash-red.svg'), multicolor: true },
  /** "file-signature" on membership services and "Write a review" (47:3101, 47:2080). */
  'file-signature': { source: require('../../../assets/icons/file-signature.svg') },
  /** Upload cloud in the review media dropzone (47:7344), 32pt. */
  'upload-cloud': { source: require('../../../assets/icons/upload-cloud.svg'), multicolor: true },
  /** Big rating stars on "Write a review" (47:7344): amber and grey. */
  'star-rate': { source: require('../../../assets/icons/star-rate.svg'), multicolor: true },
  'star-rate-empty': { source: require('../../../assets/icons/star-rate-empty.svg'), multicolor: true },
  /** Share sheet (47:2457): brand marks keep their colours; utility icons sit on grey circles. */
  'share-facebook': { source: require('../../../assets/icons/share-facebook.svg'), multicolor: true },
  'share-twitter': { source: require('../../../assets/icons/share-twitter.svg'), multicolor: true },
  'share-messenger': { source: require('../../../assets/icons/share-messenger.svg'), multicolor: true },
  'share-whatsapp': { source: require('../../../assets/icons/share-whatsapp.svg'), multicolor: true },
  'share-sms': { source: require('../../../assets/icons/share-sms.svg') },
  'share-email': { source: require('../../../assets/icons/share-email.svg') },
  'share-link-copy': { source: require('../../../assets/icons/share-link-copy.svg'), glyph: { width: 17.6, height: 17.6 } },
  'share-more': { source: require('../../../assets/icons/share-more.svg') },

  // Booking Flow (Figma 47:3637 ... 48:7876)
  /** Clock before a session's time (47:4198), 14pt. */
  clock: { source: require('../../../assets/icons/clock.svg') },
  /** Guest stepper minus / plus (47:4596), 28pt in a 32pt grey circle. */
  minus: { source: require('../../../assets/icons/minus.svg') },
  'plus-thin': { source: require('../../../assets/icons/plus-thin.svg') },
  /** Payment Method row (47:5143). */
  creditcard: { source: require('../../../assets/icons/creditcard.svg') },
  /** Small chevron (18pt) at the end of rows; points down, rotate for right. */
  'chevron-small': { source: require('../../../assets/icons/chevron-small.svg') },
  /** Promo code row (47:5143). */
  ticket: { source: require('../../../assets/icons/ticket.svg') },
  /** Promo applied / invalid (48:7600, 48:7743): keep their green and red. */
  'check-circle': { source: require('../../../assets/icons/check-circle.svg'), multicolor: true },
  'x-circle': { source: require('../../../assets/icons/x-circle.svg'), multicolor: true },
  /** Moment mark on "Contact Moment Support" (47:5143): 19 x 17 in a 28pt box. */
  'moment-mark': { source: require('../../../assets/icons/moment-mark.svg'), glyph: { width: 16.5, height: 14.5 } },
  /** White check in the success sheet (47:5045), 56pt. */
  'check-large': { source: require('../../../assets/icons/check-large.svg') },
  /** Open-in-new arrow on session cards (47:4198): 21pt glyph in a 28pt box. */
  'open-external': { source: require('../../../assets/icons/open-external.svg'), glyph: { width: 18, height: 18 } },

  // Booking Status (Figma 52:8373 ... 52:9442)
  /** Header cart and ••• on Bookings (52:8565), 28pt. */
  cart: { source: require('../../../assets/icons/cart.svg') },
  'more-dots': { source: require('../../../assets/icons/more-dots.svg'), glyph: { width: 24, height: 6 } },
  /** Filter on All Bookings (52:9094). */
  sliders: { source: require('../../../assets/icons/sliders.svg') },
  'chevron-right': { source: require('../../../assets/icons/chevron-right.svg') },
  /** Reservation info rows (47:6385). */
  'calendar-days': { source: require('../../../assets/icons/calendar-days.svg') },
  'clock-outline': { source: require('../../../assets/icons/clock-outline.svg') },
  'map-pin': { source: require('../../../assets/icons/map-pin.svg') },
  'credit-card': { source: require('../../../assets/icons/credit-card.svg') },
  /** Status icons after the reservation title: keep their greens. */
  'status-pending': { source: require('../../../assets/icons/status-pending.svg'), multicolor: true },
  'status-confirmed': { source: require('../../../assets/icons/status-confirmed.svg'), multicolor: true },
  'status-completed': { source: require('../../../assets/icons/status-completed.svg'), multicolor: true },
  /** Chat button on the reservation (52:9299), 30pt. */
  message: { source: require('../../../assets/icons/message.svg') },
  /** Close on the reservation photo and chat header (1.5 stroke). */
  'close-thin': { source: require('../../../assets/icons/close-thin.svg') },
  /** Chat (47:5940, 52:9442). */
  call: { source: require('../../../assets/icons/call.svg') },
  'add-file': { source: require('../../../assets/icons/add-file.svg') },
  mic: { source: require('../../../assets/icons/mic.svg') },
  /** Paper plane inside the black send button: 12pt glyph. */
  send: { source: require('../../../assets/icons/send.svg'), glyph: { width: 14, height: 14 } },

  // Explore, Experience details, Host Profile (48:2341 ... 48:4223)
  /** Filled map pin: meeting area and first itinerary step (48:6527). */
  'pin-fill': { source: require('../../../assets/icons/pin-fill.svg') },
  /** Report host (48:4175), 28pt. */
  flag: { source: require('../../../assets/icons/flag.svg') },
  /** Host Profile "Language" row. */
  languages: { source: require('../../../assets/icons/languages.svg') },
  /** Explore: locate button (crosshair), mode switch arrows (white), panel chevron (26 x 5.5 in a 28 box). */
  locate: { source: require('../../../assets/icons/locate.svg') },
  'arrow-up-down': { source: require('../../../assets/icons/arrow-up-down.svg') },
  'handle-up': { source: require('../../../assets/icons/handle-up.svg'), glyph: { width: 28, height: 7.6 } },
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof icons;
