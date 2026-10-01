export const TOKEN_COLORS = [
  /**
   * Leads the list because it leads the picker, and it leads the picker because
   * it is the right answer more often than any hue: "Backlog" and "To do" are
   * states without a colour, and a palette that forces a hue onto them makes
   * every board louder than the work sitting on it.
   */
  "slate",
  "indigo",
  "violet",
  "blue",
  "teal",
  "green",
  "amber",
  "orange",
  "rose",
] as const;

export type TokenColor = (typeof TOKEN_COLORS)[number];
export const DEFAULT_TOKEN_COLOR: TokenColor = "indigo";

const COLOR_CLASSES: Record<
  TokenColor,
  { bg: string; text: string; soft: string; ring: string }
> = {
  slate: {
    bg: "bg-project-slate",
    text: "text-project-slate",
    soft: "bg-project-slate/15 text-project-slate",
    ring: "ring-project-slate",
  },
  indigo: {
    bg: "bg-project-indigo",
    text: "text-project-indigo",
    soft: "bg-project-indigo/15 text-project-indigo",
    ring: "ring-project-indigo",
  },
  violet: {
    bg: "bg-project-violet",
    text: "text-project-violet",
    soft: "bg-project-violet/15 text-project-violet",
    ring: "ring-project-violet",
  },
  blue: {
    bg: "bg-project-blue",
    text: "text-project-blue",
    soft: "bg-project-blue/15 text-project-blue",
    ring: "ring-project-blue",
  },
  teal: {
    bg: "bg-project-teal",
    text: "text-project-teal",
    soft: "bg-project-teal/15 text-project-teal",
    ring: "ring-project-teal",
  },
  green: {
    bg: "bg-project-green",
    text: "text-project-green",
    soft: "bg-project-green/15 text-project-green",
    ring: "ring-project-green",
  },
  amber: {
    bg: "bg-project-amber",
    text: "text-project-amber",
    soft: "bg-project-amber/15 text-project-amber",
    ring: "ring-project-amber",
  },
  orange: {
    bg: "bg-project-orange",
    text: "text-project-orange",
    soft: "bg-project-orange/15 text-project-orange",
    ring: "ring-project-orange",
  },
  rose: {
    bg: "bg-project-rose",
    text: "text-project-rose",
    soft: "bg-project-rose/15 text-project-rose",
    ring: "ring-project-rose",
  },
};

export function isTokenColor(value: string): value is TokenColor {
  return (TOKEN_COLORS as readonly string[]).includes(value);
}

export function tokenColorClasses(color: string) {
  return COLOR_CLASSES[isTokenColor(color) ? color : DEFAULT_TOKEN_COLOR];
}

export const TOKEN_COLOR_LABELS: Record<TokenColor, string> = {
  slate: "Slate",
  indigo: "Indigo",
  violet: "Violet",
  blue: "Blue",
  teal: "Teal",
  green: "Green",
  amber: "Amber",
  orange: "Orange",
  rose: "Rose",
};