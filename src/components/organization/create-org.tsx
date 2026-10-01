"use client";

import {
  OnboardingFormData,
  onboardingSchema,
  slugify,
} from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { organization } from "better-auth/plugins";
import { Controller, useForm } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const NewOrganization = ({ defaultName }: { defaultName: string }) => {
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: defaultName,
      organizationName: "",
    },
  });

  const router = useRouter();

  const submitting = form.formState.isSubmitting;

  const handleSubmit = async (values: OnboardingFormData) => {
    if (values.name !== defaultName) {
      const { error: nameError } = await authClient.updateUser({
        name: values.name,
      });

      if (nameError) {
        toast.error("Nós não conseguimos atualizar seu nome. Tente novamente.");
        return;
      }
    }

    const slug = await availableSlug(slugify(values.organizationName));

    const { error: createError } = await authClient.organization.create({
      name: values.organizationName,
      slug,
      keepCurrentActiveOrganization: false,
    });

    if (createError) {
      toast.error("Nós não conseguimos criar sua organização. Tente novamente.");

      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}

      className="space-y-4"
    >
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Seu nome</FieldLabel>
            <Input {...field} type="text" />
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name="organizationName"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Nome da organização</FieldLabel>
            <Input {...field} type="text" autoFocus placeholder="Acme Inc." />
            {fieldState.error ? (
              <FieldError errors={[fieldState.error]} />
            ) : (
              <p
                id="organization-hint"
                className="text-muted-foreground text-xs"
              >
                {field.value
                  ? `Sua workspace estará em /${slugify(field.value)}`
                  : "Sua equipe, departamento ou empresa. Você pode renomeá-la mais tarde."}
              </p>
            )}
          </Field>
        )}
      />

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Criando..." : "Criar organização"}
      </Button>
    </form>
  );
};

async function availableSlug(base: string): Promise<string> {
  const candidate = base || "workspace";

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`;
    const { data } = await authClient.organization.checkSlug({ slug });
    if (data?.status) return slug;
  }

  return `${candidate}-${Math.random().toString(36).slice(2, 7)}`;
}