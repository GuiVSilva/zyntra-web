export function nextCursor(page: { nextCursor: string | null }) {
  return page.nextCursor ?? undefined;
}

export function startOfTodayUtc(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}