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
Popular Activites 18:1085, 20:1354 · Top Hosts 20:1479 · Just For You 20:1676, 20:1897

## Costumer Dashboard (Adventure Quiz)
Adventure Quiz 20:2060 · Questions 1-6: 20:2103, 20:2170, 20:2237, 20:2305, 20:2367, 20:2453 · Analyzing 20:3444 · Result 20:3543

## Search Filter
| Frame | Node | Built |
|---|---|---|
| Search Filter | 20:3702 | `app/search.tsx` |
| Search Filter Long | 22:1336 | `app/search.tsx` |
| Select Location (sheet) | 22:1475 | `components/picker-sheet.tsx` |
| Select Date (sheet) | 22:1789 | `components/range-calendar.tsx` |
| Select Language (sheet) | 22:2017 | `components/picker-sheet.tsx` |
| Search Results | 22:2173 | `app/search-results.tsx` |

## Bucket List
22:2329, 22:2487, 24:1225, 24:1444, 24:1667, 24:2071, 24:2120, 24:2226, 24:2474, 25:1517, 25:1723

## Recommend a place
Recommend a service: 25:1941, 25:2025, 25:2067, 25:2148, 25:2198

## Business Look (Business Screens)
Business Details: Popular 25:2265, 47:2457 · Services 47:1697, 47:1828, 47:2913 · Membership 47:2231 · Reviews 47:2080 · Ratings 47:3245 · About 47:1972
Membership Details 47:3101 · Write a review 47:7344, 47:7419
(Experience details 48:3873, 48:6527 · About the host 48:4175, 48:4223 · Reviews 48:4310 sit under Explore Screens on the canvas)

## Booking Flow
Business Summary 47:4198, 47:3637, 47:5143, 48:7600, 48:7743, 47:4348, 47:4445, 47:4311, 47:5045 · Edit Reservation 48:7876 · Edit Day 47:3717 · Edit Slot 47:3864 · Edit Guests 47:4596 · Edit Notes 47:4735 · Payment Method 47:4827 · Enter coupon 47:4945

## Booking Status Screens
Booking Empty 52:8373, 52:8565 · Bookings 47:6282 · All Bookings 52:9094 · Booking Details (Pending) 47:6385, 52:9299, 47:6493 · Empty Cart 52:8690 · Empty Cart View 52:8991 · Chat 47:5940, 52:9442

## Explore Screens
Explore (Experiences) 48:2341, 52:9860, 52:10435 · Explore (Businesses) 52:10292

## Group Screens
Groups 48:3071, 48:6213, 48:6274 (long) · My Groups 48:3142 · Create new group 48:4074, 48:4118 · Groups View 48:4500 · Group Share 48:4668 · Group Settings 48:4832, 48:5138, 48:5184 · Group Rename 48:4986 · Group Delete 48:5243

## Profile Screens
General: Profile 48:3255, 48:3423, 48:3951 · Personal Information 48:3617, 48:3686 · Transactions 48:3728 · Notifications 48:4018 · Add loc 48:4398 · Business Summary variants 48:6140, 48:5297, 48:5379, 48:5415, 48:5832, 48:5607, 48:5660, 48:5703
Support: Get started 48:6483 · FAQ 48:5465, 48:5505 · Give us feedback 48:6365, 48:6410 · Invite a friend 48:5873 · 48:5969, 48:5772
Legal: Privacy Policy 48:5551 · Terms & Conditions 48:5579
