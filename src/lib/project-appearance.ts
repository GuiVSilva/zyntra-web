import {
  BookOpenIcon,
  BriefcaseIcon,
  BugIcon,
  CodeIcon,
  CompassIcon,
  FlagIcon,
  FolderIcon,
  LayersIcon,
  LightbulbIcon,
  MegaphoneIcon,
  PaletteIcon,
  RocketIcon,
  ShoppingCartIcon,
  SparklesIcon,
  TargetIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

export {
  TOKEN_COLORS as PROJECT_COLORS,
  DEFAULT_TOKEN_COLOR as DEFAULT_PROJECT_COLOR,
  isTokenColor as isProjectColor,
  tokenColorClasses as projectColorClasses,
  type TokenColor as ProjectColor,
} from "@/lib/token-colors";

export const PROJECT_ICONS = [
  "folder",
  "layers",
  "rocket",
  "target",
  "flag",
  "sparkles",
  "lightbulb",
  "code",
  "bug",
  "palette",
  "megaphone",
  "cart",
  "briefcase",
  "book",
  "compass",
  "wrench",
] as const;

export type ProjectIcon = (typeof PROJECT_ICONS)[number];

export const DEFAULT_PROJECT_ICON: ProjectIcon = "folder";

export const PROJECT_ICON_COMPONENTS: Record<ProjectIcon, LucideIcon> = {
  folder: FolderIcon,
  layers: LayersIcon,
  rocket: RocketIcon,
  target: TargetIcon,
  flag: FlagIcon,
  sparkles: SparklesIcon,
  lightbulb: LightbulbIcon,
  code: CodeIcon,
  bug: BugIcon,
  palette: PaletteIcon,
  megaphone: MegaphoneIcon,
  cart: ShoppingCartIcon,
  briefcase: BriefcaseIcon,
  book: BookOpenIcon,
  compass: CompassIcon,
  wrench: WrenchIcon,
};

export function isProjectIcon(value: string): value is ProjectIcon {
  return (PROJECT_ICONS as readonly string[]).includes(value);
}

/** The key to look the component up by, falling back rather than throwing. */
export function projectIconKey(icon: string): ProjectIcon {
  return isProjectIcon(icon) ? icon : DEFAULT_PROJECT_ICON;
}