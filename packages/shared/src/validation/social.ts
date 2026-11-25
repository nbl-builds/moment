import { z } from 'zod';
import { LIMITS } from '../constants';
import { localDateSchema, mediaRefSchema, optionalText, ratingSchema, requiredText, uuidSchema } from './common';

// Figma: "Write a review", "Create new group", "Group Rename", "Group Settings",
// "Chat", "Give us feedback", "Adventure Quiz".

/** "Write a review": "How was your experience?", comment and media optional. */
export const reviewSchema = z.object({
  bookingId: uuidSchema,
  rating: ratingSchema,
  body: optionalText(LIMITS.reviewBody, 'Comment'),
  photos: z.array(mediaRefSchema).max(LIMITS.reviewPhotos, { message: `Add up to ${LIMITS.reviewPhotos} photos` }).default([]),
});

export type ReviewInput = z.input<typeof reviewSchema>;
export type ReviewForm = z.output<typeof reviewSchema>;

/** Business portal: replying to a review. */
export const reviewReplySchema = z.object({
  reviewId: uuidSchema,
  reply: requiredText('Reply', { max: LIMITS.reviewReply }),
});

const groupName = requiredText('Group name', LIMITS.groupName);

/** "Create new group": name and topic in the design; trip details are optional extras for Group Match. */
export const createGroupSchema = z
  .object({
    name: groupName,
    /** "Group Topic (Optional)". */
    description: optionalText(LIMITS.groupDescription, 'Group topic'),
    destinationCity: optionalText(80, 'Destination'),
    startDate: localDateSchema.optional(),
    endDate: localDateSchema.optional(),
    visibility: z.enum(['private', 'public']).default('private'),
    isOpenToMatch: z.boolean().default(false),
    maxMembers: z.number().int().min(LIMITS.groupMembers.min).max(LIMITS.groupMembers.max).default(12),
    interestTagIds: z.array(uuidSchema).max(10).default([]),
    /** "Upload Cover Photo": a storage ref from `groups.uploadCover`. */
    coverUrl: mediaRefSchema.optional(),
  })
  .refine((g) => !g.startDate || !g.endDate || g.endDate >= g.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export type CreateGroupInput = z.input<typeof createGroupSchema>;
export type CreateGroupForm = z.output<typeof createGroupSchema>;

/** "Group Rename". */
export const renameGroupSchema = z.object({ name: groupName });

/** "Group Settings": "Make Private" / "Enable Sharing" (public = anyone with the link can join). */
export const groupSettingsSchema = z.object({
  visibility: z.enum(['private', 'public']).optional(),
  isOpenToMatch: z.boolean().optional(),
  sharingEnabled: z.boolean().optional(),
  likesVisibility: z.enum(['everyone', 'only_me']).optional(),
});
export type GroupSettings = z.output<typeof groupSettingsSchema>;

/** Chat composer. Attachments are uploaded to `chat-attachments` first and referenced by path. */
export const sendMessageSchema = z
  .object({
    conversationId: uuidSchema,
    body: optionalText(LIMITS.messageBody, 'Message'),
    attachments: z
      .array(z.object({ path: z.string().min(1), name: z.string().optional(), mimeType: z.string().optional() }))
      .max(10)
      .default([]),
  })
  .refine((m) => Boolean(m.body) || m.attachments.length > 0, { message: 'Type a message', path: ['body'] });

export type SendMessageForm = z.output<typeof sendMessageSchema>;

export const FEEDBACK_TOPICS = ['app', 'booking', 'payment', 'business', 'suggestion', 'other'] as const;
export type FeedbackTopic = (typeof FEEDBACK_TOPICS)[number];

export const FEEDBACK_TOPIC_LABELS: Record<FeedbackTopic, string> = {
  app: 'The Moment app',
  booking: 'A booking',
  payment: 'Payments and refunds',
  business: 'A business or host',
  suggestion: 'A suggestion',
  other: 'Something else',
};

/** "Give us feedback" (and Support): stored as a support ticket. */
export const feedbackSchema = z.object({
  topic: z.enum(FEEDBACK_TOPICS, { message: 'Pick a topic' }),
  message: requiredText('Feedback', { min: 10, max: LIMITS.supportBody }),
  bookingId: uuidSchema.optional(),
  businessId: uuidSchema.optional(),
});

export type FeedbackForm = z.output<typeof feedbackSchema>;

/** Replying inside an existing support ticket. */
export const supportMessageSchema = z.object({
  ticketId: uuidSchema,
  body: requiredText('Message', { max: LIMITS.supportBody }),
});

/** "Adventure Quiz": one answer per question, scored by `submit_quiz`. */
export const quizSubmissionSchema = z.object({
  answerIds: z
    .array(uuidSchema)
    .min(1, { message: 'Answer at least one question' })
    .refine((ids) => new Set(ids).size === ids.length, { message: 'Duplicate answers' }),
});
