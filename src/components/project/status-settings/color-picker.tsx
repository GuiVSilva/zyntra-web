"use client";

import { CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  TOKEN_COLOR_LABELS,
  TOKEN_COLORS,
  tokenColorClasses,
  type TokenColor,
} from "@/lib/token-colors";
import { cn } from "@/lib/utils";

/**
 * Picking one of the nine palette colours.
 *
 * Shared by board columns and by labels — one picker, because they draw from one
 * palette (`src/lib/token-colors.ts`) and a second implementation would drift in
 * exactly the small ways that make a settings screen feel unfinished.
 *
 * Two accessibility decisions worth stating, both from `ui-ux-pro-max`:
 *
 *   **The selected swatch carries a check, not just a ring.** A ring around a
 *   coloured square is a colour-only signal telling you which colour is
 *   selected, which is circular — the one person who cannot resolve the ring is
 *   the person who cannot resolve the swatches either.
 *
 *   **Each swatch is a 2rem target inside a padded cell**, so the row clears the
 *   44px guidance without nine oversized squares dominating the panel.
 */
export function ColorPicker({
  value,
  onChange,
  disabled = false,
  label = "Colour",
}: {
  value: string;
  onChange: (color: TokenColor) => void;
  disabled?: boolean;
  label?: string;
}) {
  const current = tokenColorClasses(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          // The name says which colour, so the control is usable without seeing
          // the swatch at all.
          aria-label={`${label}: ${TOKEN_COLOR_LABELS[value as TokenColor] ?? value}`}
          className="size-9 shrink-0"
        >
          <span aria-hidden className={cn("size-4 rounded-full", current.bg)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div role="group" aria-label={label} className="grid grid-cols-3 gap-1">
          {TOKEN_COLORS.map((color) => {
            const selected = color === value;
            return (
              <button
                key={color}
                type="button"
                aria-label={TOKEN_COLOR_LABELS[color]}
                aria-pressed={selected}
                onClick={() => onChange(color)}
                className="focus-visible:ring-ring flex size-11 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full",
                    tokenColorClasses(color).bg,
                  )}
                >
                  {selected ? (
                    <CheckIcon
                      className="size-4 text-white drop-shadow-sm"
                      aria-hidden
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}