/**
 * Date formatting that survives hydration.
 *
 * `date.toLocaleDateString(undefined, …)` is the obvious way to do this and is
 * a hydration bug: `undefined` means "the runtime's locale", and the server's
 * locale and timezone are not the browser's. React then reports that the
 * server-rendered HTML did not match, discards the tree, and re-renders it on
 * the client — which is not merely a console warning, because state created
 * during the discarded render goes with it.
 *
 * Both arguments are therefore pinned. `en-GB` gives an unambiguous
 * day-month-year that no reader mistakes for the other order, and `UTC` means
 * a due date reads the same to everyone looking at the same task.
 *
 * ponytail: no per-user timezone preference. When one exists, it belongs in a
 * client component that formats after mount, not here.
 */
const dayMonthYear = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dayMonth = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

/** "26 Aug 2026" */
export function formatDate(date: Date): string {
  return dayMonthYear.format(date);
}

/** "26 Aug" — for dates whose year is obvious from context. */
export function formatDayMonth(date: Date): string {
  return dayMonth.format(date);
}

const dayMonthYearTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * "26 Aug 2026, 14:32" — a comment, an inbox row, an audit entry.
 *
 * Anything with a clock on it needs the time as well as the day: two comments a
 * minute apart on the same afternoon are otherwise indistinguishable.
 */
export function formatDateTime(date: Date): string {
  return `${dayMonthYearTime.format(date)} UTC`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

const relative = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

/**
 * "2 hours ago".
 *
 * **Only ever called after mount** — see `src/components/ui/relative-time.tsx`.
 * Its output depends on `now`, and the server's `now` is not the browser's, so
 * rendering it during SSR is a guaranteed hydration mismatch rather than a
 * likely one. That is why `now` is a parameter here: a pure function of two
 * instants, with the decision about *which* instant made by the caller.
 */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const elapsed = date.getTime() - now.getTime();
  const magnitude = Math.abs(elapsed);

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (magnitude >= ms) {
      return relative.format(Math.round(elapsed / ms), unit);
    }
  }

  // Under a minute. "0 seconds ago" is technically right and reads as broken.
  return "just now";
}

const timeOfDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * "14:32" — a row in a feed whose day is already written above it.
 *
 * The activity timeline groups by day, so repeating "26 Aug 2026" on twenty
 * consecutive rows is noise that hides the one thing that separates them. UTC,
 * like every other formatter here, so the clock agrees with the day heading the
 * rows were bucketed under.
 */
export function formatTimeOfDay(date: Date): string {
  return timeOfDay.format(date);
}

/** The UTC day a timestamp falls in — "2026-08-26". The activity feed's bucket key. */
export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Where a person's avatar comes from, in one place.
 *
 * Three sources in priority order, and the order is the whole reason this
 * function exists rather than a ternary at each render site:
 *
 *   1. `avatarKey` — an image they uploaded. Served through
 *      `/api/avatars/<id>`, which signs a short-lived URL per request so the
 *      bucket can stay private. The path is stable, so it caches.
 *   2. `image` — whatever Better Auth wrote there on a social sign-in. A full
 *      URL at somebody else's origin, and the reason `avatarKey` is a separate
 *      column: with one column we could not tell our object from Google's.
 *   3. `null` — the caller renders initials.
 *
 * Pure and client-safe. Services select `avatarKey` alongside `image`; nothing
 * here reads the database.
 */
export function avatarUrl(user: {
  id: string;
  image?: string | null;
  avatarKey?: string | null;
}): string | null {
  if (user.avatarKey) return `/api/avatars/${user.id}`;
  return user.image ?? null;
}