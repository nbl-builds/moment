# Figma index

File: https://www.figma.com/design/YO49DEbUlD2NhVAKYFQ5vi/Moment-Costumer-App
Page "App Design" is node `2:30`. Never fetch it whole: use these node ids with
`get_design_context` / `get_screenshot`, one frame at a time. Frames are 428 x 926
(long frames are taller). "Built" points at the route that implements the frame.

Other pages: Typography `2:121`, Colors `4:82`, Icons `4:58` (Huge Icons), Buttons `5:69`.

## Onboarding Screens
| Frame | Node | Built |
|---|---|---|
| Splash Screen | 6:1461 | `components/brand-splash.tsx` |
| Onboarding 1-4 | 6:1422, 7:175, 7:212, 7:249 | `app/onboarding.tsx` |

## Sign Up / Screens with phone (phone row y=1135) and with email (row y=2723)
| Frame | Phone | Email | Built |
|---|---|---|---|
| Login or sign up (sheet) | 1825:2658 | | `features/auth/login-sheet-content.tsx` |
| Sign in / Up | 7:623 | 10:1049 | sheet / `app/sign-in-email.tsx` |
| Sign In OTP: empty, entered, wrong | 7:1034, 9:603, 9:728 | 10:2240, 10:2287, 10:2335 | `app/verify-code.tsx` |
| Sign Up Finishing (form) | 7:949 | 10:2153 | `app/finish-sign-up.tsx` |
| Passcode & Face ID | 7:999 | 10:2204 | `app/face-id.tsx` |
| Location / Notifications sheets | 20:2787, 20:2936 | 10:1879, 10:2016 | `features/permissions` |

## Sign In Screens with Email / Forgot Screens
| Frame | Node | Built |
|---|---|---|
| Sign in with email | 12:845 | `app/sign-in-email.tsx` |
| Enter Password | 12:979 | `app/enter-password.tsx` (also Create / Set new password) |
| Forgot Password | 13:1141 | `app/forgot-password.tsx` |
| Message Sent sheet | 13:1256 | `app/forgot-password.tsx` |

## Customer Dashboard
| Frame | Node | Built |
|---|---|---|
| Dashboard (top) | 13:1487 | `app/(tabs)/home.tsx` |
| Dashboard Bootm Bar Hide (scrolled) | 15:1061 | tab bar replaced by `components/tab-bar` |
| Dashboard Long (all sections) | 17:1027 | `app/(tabs)/home.tsx` |

## Customer Dashboard (Section Screens): "See all" lists
| Frame | Node | Built |
|---|---|---|
| Popular Activites | 18:1085 | `app/see-all/[section].tsx` (`popular`) |
| Popular Activites, chip selected | 20:1354 | `features/search/components/group-chip.tsx` |
| Top Hosts (2-column grid) | 20:1479 | `see-all/hosts`, `HostCard variant="grid"` |
| Services near you (frame named "Just For You") | 20:1676 | `see-all/services` |
| Just For You (titled "Explore") | 20:1897 | `see-all/explore` (Home "More to explore" arrow) |

Local fun, Must-trys and Recently viewed have no frame and reuse the list layout (`see-all/local-fun`, `must-try`, `recent`).

## Costumer Dashboard (Adventure Quiz)
All in `app/quiz.tsx` (one screen, components in `features/quiz/components`).
| Frame | Node | Built |
|---|---|---|
| Adventure Quiz (intro) | 20:2060 | `quiz-intro.tsx` |
| Question 1, 2 (photo list) | 20:2103, 20:2170 | `answer-cards.tsx` `PhotoAnswers` |
| Question 3 (glass) | 20:2237 | `glass-question.tsx` |
| Question 4 (emoji) | 20:2305 | `answer-cards.tsx` `EmojiAnswers` |
| Question 5 (plane seat) | 20:2367 | `seat-question.tsx` (plane exported as `assets/quiz/plane.png`) |
| Question 6 (thermometer) | 20:2453 | `thermometer-question.tsx` |
| Analyzing | 20:3444 | `quiz-analyzing.tsx` |
| Result | 20:3543 | `quiz-result.tsx` |

## Search Filter
| Frame | Node | Built |
|---|---|---|
| Search Filter | 20:3702 | `app/filters.tsx` |
| Search Filter Long | 22:1336 | `app/filters.tsx` |
| Select Location (sheet) | 22:1475 | `components/picker-sheet.tsx` ("Choose a destination") |
| Select Date (sheet) | 22:1789 | `components/range-calendar.tsx` |
| Select Language (sheet) | 22:2017 | `components/picker-sheet.tsx` |
| Search Results | 22:2173 | `app/search-results.tsx` |
| (no frame) typing a search | n/a | `app/search.tsx` |

## Bucket List
| Frame | Node | Built |
|---|---|---|
| Bucket List, empty | 22:2329 | `app/bucket-list/index.tsx` |
| Heart action sheet | 22:2487 | `features/bucket-list/bucket-sheets.tsx` |
| Your Bucketlist (picker) | 24:1225 | `bucket-sheets.tsx` |
| Give it a name | 24:1444 | `features/bucket-list/components/name-sheet.tsx` |
| First item saved | 24:1667 | `bucket-sheets.tsx` |
| Bucket List, all lists | 24:2071 | `app/bucket-list/index.tsx` |
| One list | 24:2120 | `app/bucket-list/[id].tsx` |
| Share sheet | 24:2226 | `[id].tsx` |
| ••• menu | 24:2474 | `[id].tsx` |
| Rename | 25:1517 | `name-sheet.tsx` |
| Delete confirm | 25:1723 | `[id].tsx` |

## Recommend a place
Recommend a service: 25:1941, 25:2025, 25:2067, 25:2148, 25:2198

## Business Look (Business Screens)
| Frame | Node | Built |
|---|---|---|
| Business, Popular tab (collapsed) | 25:2265 | `app/business/[slug]/index.tsx` |
| Services tab / added + cart bar / expanded | 47:1697, 47:1828, 47:2913 | same screen, `features/business/components/{service-card,cart-bar}.tsx` |
| Membership tab | 47:2231 | `features/business/components/plan-card.tsx` |
| Membership Details | 47:3101 | `app/membership/[id].tsx` |
| Reviews tab / expanded | 47:2080, 47:3245 | `features/business/components/review-item.tsx` |
| About tab | 47:1972 | `features/business/components/about-section.tsx` |
| Write a review / with media | 47:7344, 47:7419 | `app/business/[slug]/review.tsx` |
| Share sheet | 47:2457 | `features/business/components/share-sheet.tsx` |
(Experience details 48:3873, 48:6527 · About the host 48:4175, 48:4223 · Reviews 48:4310 sit under Explore Screens on the canvas)

## Booking Flow
Business Summary 47:4198, 47:3637, 47:5143, 48:7600, 48:7743, 47:4348, 47:4445, 47:4311, 47:5045 · Edit Reservation 48:7876 · Edit Day 47:3717 · Edit Slot 47:3864 · Edit Guests 47:4596 · Edit Notes 47:4735 · Payment Method 47:4827 · Enter coupon 47:4945

| Screen | Frame | Code |
|---|---|---|
| Entry (business cart "Continue") | 48:7876 | `app/business/[slug]/index.tsx` -> `app/booking/new.tsx` |
| Select dates: Dates / Guests / Private group | 47:4198, 47:4348, 47:4311 | `app/booking/dates/[listingId].tsx`, `features/booking/components/slot-card.tsx` |
| Confirm Reservation (short, full) | 47:3637, 47:5143 | `app/booking/confirm.tsx` |
| Promo applied / invalid | 48:7600, 48:7743 | `features/booking/components/promo-row.tsx` |
| Select Date / Select Time | 47:3717, 47:3864 | `features/booking/components/date-sheet.tsx`, `time-sheet.tsx` |
| Add Guest | 47:4596 (47:4445 is the older styling) | `features/booking/components/guests-sheet.tsx` |
| Add Notes / Payment Method / Add Coupon | 47:4735, 47:4827, 47:4945 | `notes-sheet.tsx`, `payment-sheet.tsx`, `coupon-sheet.tsx` |
| Success | 47:5045 | `features/booking/components/success-sheet.tsx` |

## Booking Status Screens
Booking Empty 52:8373, 52:8565 · Bookings 47:6282 · All Bookings 52:9094 · Booking Details (Pending) 47:6385, 52:9299, 47:6493 · Empty Cart 52:8690 · Empty Cart View 52:8991 · Chat 47:5940, 52:9442

| Screen | Frame | Code |
|---|---|---|
| Bookings tab, empty / with items | 52:8373, 52:8565 | `app/(tabs)/bookings.tsx` |
| All Bookings + Filter sheet | 52:9094, 47:6282 | `app/all-bookings.tsx` |
| Cart, empty / with items | 52:8690, 52:8991 | `app/cart.tsx` (illustration exported from node 52:8941 at 1x) |
| Reservation pending / confirmed / completed (cancelled: no frame) | 47:6385, 52:9299, 47:6493 | `app/reservation/[id].tsx` |
| Chat, + attachments open | 47:5940, 52:9442 | `app/chat/[businessId].tsx`, `features/chat/` |

## Explore Screens
Explore (Experiences) 48:2341, 52:9860, 52:10435 · Explore (Businesses) 52:10292

| Screen | Frame | Code |
|---|---|---|
| Explore map / list, experiences | 48:2341, 52:9860 | `app/map.tsx`, `features/explore/` |
| Explore map / list, businesses | 52:10292, 52:10435 | `app/map.tsx` (business cards: `features/home/components/service-business-card.tsx`) |
| Experience details, top / full | 48:3873, 48:6527 | `app/experience/[id]/index.tsx`, `features/experience/` (+ `photos.tsx`, `reviews.tsx`, no frames) |
| Host Profile, About / Listings | 48:4175, 48:4223 | `app/host/[id].tsx`, `features/host/` |

## Group Screens
Groups 48:3071, 48:6213, 48:6274 (long) · My Groups 48:3142 · Create new group 48:4074, 48:4118 · Groups View 48:4500 · Group Share 48:4668 · Group Settings 48:4832, 48:5138, 48:5184 · Group Rename 48:4986 · Group Delete 48:5243

| Screen | Frame | Code |
|---|---|---|
| Groups tab, empty / list | 48:3071, 48:3142 | `app/(tabs)/groups.tsx` |
| Moment Groups intro, top / full (+ FAQ sheet, no frame) | 48:6213, 48:6274 | `app/group/intro.tsx` |
| New Group, Congratulations | 48:4074, 48:4118 | `app/group/new.tsx`, `features/booking/components/success-sheet.tsx` (kind `group`) |
| Group page: Liked by group, Group Match, Recommended | 48:4500 | `app/group/[id]/index.tsx`, `features/groups/components/` |
| Share sheet, ••• menu, Rename | 48:4668, 48:4832, 48:4986 | `app/group/[id]/index.tsx` |
| Invite others, Members, Leave (no frames) | | `features/groups/components/invite-sheet.tsx`, `members-sheet.tsx`, `confirm-sheet.tsx` |
| Group Settings, Who can see likes, Delete | 48:5138, 48:5184, 48:5243 | `app/group/[id]/settings.tsx` |
| Add to Groups picker (from the heart) | | `features/groups/components/group-picker-sheet.tsx` |

## Profile Screens
General: Profile 48:3255, 48:3423, 48:3951 · Personal Information 48:3617, 48:3686 · Transactions 48:3728 · Notifications 48:4018 · Add loc 48:4398 · Business Summary variants 48:6140, 48:5297, 48:5379, 48:5415, 48:5832, 48:5607, 48:5660, 48:5703
Support: Get started 48:6483 · FAQ 48:5465, 48:5505 · Give us feedback 48:6365, 48:6410 · Invite a friend 48:5873 · 48:5969, 48:5772
Legal: Privacy Policy 48:5551 · Terms & Conditions 48:5579

| Screen | Frame | Code |
|---|---|---|
| Profile tab, top / full | 48:3423, 48:3255 | `app/(tabs)/profile.tsx`, `features/profile/components/menu-card.tsx` |
| Notifications | 48:4018 | `app/notifications.tsx` |
| Show profile, unverified / verified | 48:3951, 48:6140 | `app/me/index.tsx` (+ `app/me/verify.tsx`, no frame) |
| Edit personal info | 48:3617 | `app/me/edit.tsx` |
| Adventure Quiz badge | 48:3686 | `app/me/badge.tsx` |
| Choose Location sheet | 48:4398 | `features/profile/components/location-sheet.tsx` |
| Wallet, All Transactions | 48:5297, 48:3728 | `app/wallet.tsx`, `features/wallet/` |
| Payment Method (empty), Add payment sheet | 48:5379, 48:5703 | `app/payment-methods.tsx`, `features/payment-methods/` |
| Privacy & Sharing | 48:5832 | `app/privacy.tsx` |
| Offers | 48:5415 | `app/offers.tsx` |
| Invite friends, My Recent Invites | 48:5873, 48:5969 | `app/invite.tsx`, `features/referrals/` |
| Get started | 48:6483 | `app/get-started.tsx` |
| FAQ, answer sheet | 48:5465, 48:5505 | `app/help.tsx`, `features/support/faq.ts` |
| Give us feedback | 48:6365, 48:6410 | `app/feedback.tsx` |
| Follow us sheet | 48:5772 | `features/profile/components/follow-us-sheet.tsx` |
| Privacy Policy, Terms (not matched yet: built in our style from `legal_documents`) | 48:5551, 48:5579 | `app/legal/[type].tsx` |
| Membership, Contact Moment Support (no frames) | | `app/memberships.tsx`, `app/support.tsx` |

# Business portal (web)

File: https://www.figma.com/design/hvSITt4VVdCeFArVVFUgl1/Moment-Business-App
Page "Business Web App Design" is node `2:30`: never fetch it whole. Frames are
1440 x 1024 (long forms are taller). Other pages: Typography `2:121` (frame
`111:146`), Colors `4:82` (frame `4:139`), Icons `4:58`, Buttons `5:69` (component
set `127:886`). Web tokens: `packages/shared/src/tokens/web.ts`.

## Sign up, login and recovery
| Frame | Node | Built |
|---|---|---|
| Welcome (phone / email flow) | 472:1633, 626:4555 | `app/business/(auth)/page.tsx` |
| Sign up (phone / email) | 472:1944, 626:4593 | `app/business/(auth)/signup` (`?method=email`) |
| Code empty / filled / wrong (phone) | 472:2042, 495:2112, 495:2167 | `app/business/(auth)/verify` |
| Code empty / filled / wrong (email) | 626:4670, 626:4779, 626:4716 | `app/business/(auth)/verify` |
| Tell us about yourself | 472:1880, 626:4832 | `app/business/(auth)/onboarding/type` |
| What does your business provide | 472:1727, 626:4885 | `app/business/(auth)/onboarding/category` |
| Details form (empty / filled / email) | 472:4804, 472:3616, 626:4974 | `app/business/(auth)/onboarding/details` |
| Login | 472:4321 | `app/business/(auth)/login` |
| Forgot password | 472:5023 | `app/business/(auth)/forgot-password` |
| Set new password | 472:5102 | `app/business/(auth)/reset-password` |

Photos per flow: phone (cave, `welcome`), email (harness, `email`), login (quad
bikes), forgot (dog), reset (hiker); in `apps/web/public/business/auth` as WebP 710 / 1420.

## Portal main area
| Frame | Node | Built |
|---|---|---|
| Dashboard (empty / with reservations) | 102:2894, 209:929 | `app/business/(portal)/dashboard` |
| Avatar menu | 203:763 | `features/portal/shell/top-bar.tsx` |
| Calendar (no listing / with reservations) | 102:3034, 477:2553 | `app/business/(portal)/calendar` |
| Inbox / time filter | 127:507, 476:1958 | `app/business/(portal)/inbox` |
| My Listings / My Drafts + category menu / My Archives | 126:302, 626:5263, 626:5371 | `app/business/(portal)/listings` |
| Insights (top / full) | 127:456, 512:2143 | `app/business/(portal)/insights` |
| Reviews | 513:2725 | `app/business/(portal)/reviews` |
| Create New Listing: Type, Basics, Category, Title, Photos upload / review, Description, Location, What I'll provide, Guest requirements, Group size | 614:2157, 615:2507, 615:2633, 615:2912, 615:3179, 615:3270, 615:3361, 616:3462 (616:3603 duplicate), 616:3710, 616:3823, 616:3963 | `app/business/(wizard)/listings`, `features/listing-wizard/` |
| Create New Listing placeholders (designed in the wizard style): Guest pricing, Discount, Your information, Review & submit | 616:4055, 616:4131, 616:4209, 616:4291 | `features/listing-wizard/steps/` |
| Profile (About Me) | 629:7232 | `app/business/(portal)/profile`, `features/account/profile-view.tsx` (+ Business section, not in Figma) |
| Account Settings, Personal Information, Payment Method, Login & Security | 131:676, 515:3218, 515:3352, 515:3295 | `app/business/(portal)/settings`, `features/account/` |
| Listing Details (start only: top bar, title, cover) | 629:7360 | `app/business/(portal)/listings/[id]`, `features/portal/listing-detail/` (rest designed in portal style) |

Not in Figma, built in the portal style: the reservation side panel, the help and What's New sheets, review replies, the phone menu.
