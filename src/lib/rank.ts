import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

export const FIRST_RANK = generateKeyBetween(null, null);

export function rankBetween(
  before: string | null,
  after: string | null,
): string {
  if (before !== null && after !== null && before >= after) {
    throw new Error(`rankBetween: neighours are out of order`);
  }

  return generateKeyBetween(before, after);
}

export function ranksBetween(
  before: string | null,
  after: string | null,
  count: number,
): string[] {
  return generateNKeysBetween(before, after, count);
}