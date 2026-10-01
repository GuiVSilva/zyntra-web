'use client'

import { SignInFormData, signInSchema } from '@/lib/validations/auth'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Field, FieldError, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'

export const SignInForm = () => {
  const router = useRouter()

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })
  const submitting = form.formState.isSubmitting

  const handleSubmit = async (data: SignInFormData) => {
    await authClient.signIn.email(data, {
      onSuccess: () => {
        router.push('/dashboard')
      },
      onError: error => {
        toast.error(error.error.message || 'Ocorreu um erro ao fazer login.')
      }
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-foreground">Bem vindo de volta</h1>
      </div>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                {...field}
                type="email"
                autoComplete="email"
                placeholder="Digite seu email"
                autoFocus
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Senha</FieldLabel>
              <Input
                {...field}
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                autoFocus
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <div className="mt-4 text-sm text-muted-foreground">
        Não tem uma conta?{' '}
        <Link
          href="/sign-up"
          className="font-medium text-primary hover:underline"
        >
          Criar Conta
        </Link>
      </div>
    </div>
  )
}
