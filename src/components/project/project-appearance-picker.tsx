"use client";

import {
  PROJECT_COLORS,
  PROJECT_ICON_COMPONENTS,
  PROJECT_ICONS,
  ProjectColor,
  projectColorClasses,
  ProjectIcon,
} from "@/lib/project-appearance";
import { cn } from "cn";
import { CheckIcon } from "lucide-react";

export function ColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: ProjectColor;
  onChange: (color: ProjectColor) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Project colour"
      className="flex flex-wrap gap-1.5"
    >
      {PROJECT_COLORS.map((color) => {
        const selected = color === value;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            disabled={disabled}
            onClick={() => onChange(color)}
            className={cn(
              "focus-visible:ring-ring inline-flex size-7 items-center justify-center rounded-full transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50",
              projectColorClasses(color).bg,
              selected && "ring-foreground/40 ring-2 ring-offset-2",
            )}
          >
            {selected ? (
              <CheckIcon
                className="size-3.5 text-white drop-shadow"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function IconPicker({
  value,
  color,
  onChange,
  disabled,
}: {
  value: ProjectIcon;
  color: ProjectColor;
  onChange: (icon: ProjectIcon) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Project icon"
      className="flex flex-wrap gap-1.5"
    >
      {PROJECT_ICONS.map((icon) => {
        const Icon = PROJECT_ICON_COMPONENTS[icon];
        const selected = icon === value;

        return (
          <button
            key={icon}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={icon}
            disabled={disabled}
            onClick={() => onChange(icon)}
            className={cn(
              "focus-visible:ring-ring inline-flex size-8 items-center justify-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50",
              selected
                ? cn("bg-current/12", projectColorClasses(color).text)
                : "text-muted-foreground hover:text-foreground hover:border-foreground/20",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}