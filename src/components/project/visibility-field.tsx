"use client";

import { ProjectVisibility } from "@/generated/prisma/enums";
import { GlobeIcon, LockIcon } from "lucide-react";
import { Field, FieldLabel } from "../ui/field";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { cn } from "cn";

const OPTIONS = [
  {
    value: ProjectVisibility.OPEN,
    Icon: GlobeIcon,
    label: "Open",
    description: "Everyone in the organization can see and work on it.",
  },
  {
    value: ProjectVisibility.RESTRICTED,
    Icon: LockIcon,
    label: "Restricted",
    description:
      "Only people you add can see it. Owners and admins can always administer it.",
  },
] as const;

export const VisibilityField = ({
  value,
  onChange,
  disabled,
}: {
  value: ProjectVisibility;
  onChange: (visibility: ProjectVisibility) => void;
  disabled?: boolean;
}) => {
  return (
    <Field>
      <FieldLabel>Visibility</FieldLabel>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as ProjectVisibility)}
        disabled={disabled}
        className="gap-2"
      >
        {OPTIONS.map(({ value: option, Icon, label, description }) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              value === option
                ? "border-primary/50 bg-primary/5"
                : "hover:border-foreground/20",
            )}
          >
            <RadioGroupItem value={option} className="mt-0.5 " />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Icon className="size-3.5" />
                {label}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                {description}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>
    </Field>
  );
};