import type { IconName } from '@/components/ui';

/**
 * Glyph for a personality badge. Figma draws only Nature Lover's sprout
 * (48:3686); the other badges use the quiz's generic badge until they get art.
 */
export function badgeIcon(code: string | null | undefined): IconName {
  return code === 'nature-soul' ? 'badge-nature' : 'quiz-badge';
}

/** "Nature Lover" -> "a Nature Lover"; "Adventure Lover" -> "an Adventure Lover". */
export function withArticle(name: string): string {
  return /^[aeiou]/i.test(name) ? `an ${name}` : `a ${name}`;
}
