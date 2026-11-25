// Receive help (48:5465): questions people ask most, grouped by topic. Figma
// only has placeholder rows, so this is Moment's own copy. Keep answers short
// and in line with the Terms (cancellation policies, wallet, PKR).

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqSection {
  title: string;
  items: FaqItem[];
}

export const FAQ: FaqSection[] = [
  {
    title: 'Your account',
    items: [
      {
        id: 'sign-in-phone',
        question: 'How do I sign in with my phone?',
        answer:
          'Enter your +92 mobile number on the sign in sheet and type the code we send you by SMS. You can also continue with your email, Apple, Google or Facebook. Once you’re in, turn on Face ID so signing in next time takes a second.',
      },
      {
        id: 'change-contact',
        question: 'How do I change my number or email?',
        answer:
          'Go to Profile > Personal Info and tap Edit next to your phone number or email. We’ll send a code to the new number or a link to the new email to confirm it’s yours. Your bookings, wallet and badge stay with your account.',
      },
      {
        id: 'delete-account',
        question: 'How do I delete my account?',
        answer:
          'Go to Profile > Privacy & Sharing > Manage my data and tap Delete account. Your account is closed straight away and deleted for good after 30 days; sign in before then to change your mind. Booking and payment records are kept as Pakistani tax rules require.',
      },
    ],
  },
  {
    title: 'Bookings',
    items: [
      {
        id: 'how-to-book',
        question: 'How do I book an experience?',
        answer:
          'Open an experience or business, tap Book, then pick a day and a time slot, add your guests and any notes for the host. Review the price in PKR, add a coupon if you have one and pay. You’ll see the booking under Bookings as soon as the host confirms it.',
      },
      {
        id: 'reschedule',
        question: 'Can I change or reschedule a booking?',
        answer:
          'Open the booking in Bookings and tap Reschedule to pick a new day or slot, if the host has space. If you need something else changed, like the number of guests, message the host from the booking and they’ll update it for you.',
      },
      {
        id: 'cancel-refund',
        question: 'How do cancellations and refunds work?',
        answer:
          'Every listing shows its cancellation policy before you book. Flexible: full refund up to 24 hours before. Moderate: full refund up to 48 hours before. Strict: 50% refund up to 7 days before. Non-refundable: no refund. If the host cancels, you always get a full refund. Refunds go back to your payment method or your Moment wallet.',
      },
    ],
  },
  {
    title: 'Payments',
    items: [
      {
        id: 'payment-methods',
        question: 'How can I pay?',
        answer:
          'Pay with a debit or credit card, JazzCash or Easypaisa, or use your Moment wallet balance. All prices are in Pakistani Rupees (PKR) and include taxes and Moment’s service fee, shown before you pay. We never store your full card number.',
      },
      {
        id: 'wallet',
        question: 'What is my Moment wallet?',
        answer:
          'Your wallet holds refunds you chose to keep on Moment and referral rewards. It’s used automatically at checkout if you turn it on. Wallet credit can be spent on any booking but can’t be withdrawn as cash.',
      },
      {
        id: 'coupons',
        question: 'How do I use a coupon?',
        answer:
          'On the payment step tap Add coupon and pick a saved coupon or type a code. Each coupon shows its minimum spend, expiry and whether it’s one use per person. Find current deals under Profile > Offers.',
      },
    ],
  },
  {
    title: 'Groups',
    items: [
      {
        id: 'create-group',
        question: 'How do I plan a trip with a group?',
        answer:
          'Go to Groups, tap Create group, give it a name and invite friends with a link. Everyone can like experiences, and the group sees what’s popular so you can book together.',
      },
      {
        id: 'group-match',
        question: 'What is Group Match?',
        answer:
          'Group Match compares what everyone in the group has liked and shows the experiences you all agree on first. The more you like, the better the matches get.',
      },
      {
        id: 'likes-privacy',
        question: 'Who can see my likes in a group?',
        answer:
          'The group owner decides whether likes are shared with everyone or kept private. You can also turn off Show my likes to groups under Profile > Privacy & Sharing > Sharing.',
      },
    ],
  },
  {
    title: 'Adventure Quiz',
    items: [
      {
        id: 'maq',
        question: 'What is the Moment Adventure Quiz?',
        answer:
          'The Moment Adventure Quiz (MAQ) is a short personality quiz about how you like to travel and spend your free time. Your answers give you a personality badge, which shows on your profile and shapes the Just For You picks on Home.',
      },
      {
        id: 'retake-quiz',
        question: 'Can I retake the quiz?',
        answer:
          'Yes. After you’ve completed 3 bookings, Retake Quiz unlocks on your badge in Profile. Your tastes change as you explore, and your badge and recommendations update with them.',
      },
    ],
  },
];
