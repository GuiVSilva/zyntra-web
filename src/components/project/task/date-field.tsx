"use client";

import { useState } from "react";
import { CalendarIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DateField({
  id,
  value,
  onChange,
  label,
  disabled,
  className,
}: {
  id: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            // The accessible name carries the value as well as the label, so a
            // screen reader announces "Due date, 12 Sep 2026" rather than
            // leaving the reader to tab into a popover to find out.
            aria-label={value ? `${label}, ${formatDate(value)}` : label}
            className={cn(
              // `min-w-0 flex-1`, not `w-full`: the Button base is `shrink-0`, so a
              // `w-full` trigger claimed the whole row and pushed the clear
              // button — and the panel — 40px wide. The row scrolled sideways.
              "min-w-0 flex-1 justify-start gap-2 px-3 font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {value ? formatDate(value) : "Pick a date"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            autoFocus
            // A dropdown month and year, not twelve clicks to reach next March.
            captionLayout="dropdown"
            selected={value ? toCalendarDate(value) : undefined}
            defaultMonth={value ? toCalendarDate(value) : undefined}
            onSelect={(next) => {
              onChange(next ? fromCalendarDate(next) : null);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          disabled={disabled}
          onClick={() => onChange(null)}
          aria-label={`Clear ${label.toLowerCase()}`}
        >
          <XIcon className="size-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

/** UTC midnight → the same calendar day in the browser's local time. */
export function toCalendarDate(utc: Date): Date {
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

/** A local calendar day → UTC midnight, which is what the service stores. */
export function fromCalendarDate(local: Date): Date {
  return new Date(
    Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()),
  );
}