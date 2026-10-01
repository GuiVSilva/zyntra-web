'use client'

import { SignUpFormData, signUpSchema } from '@/lib/validations/auth'
import { useRouter } from 'next/navigation'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Field, FieldError, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'

export const SignUpForm = () => {
  const router = useRouter()

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: ''
    }
  })
  const submitting = form.formState.isSubmitting

  const handleSubmit = async (data: SignUpFormData) => {
    await authClient.signUp.email(data, {
      onSuccess: () => {
        toast.success(
          'Conta criada com sucesso. Por favor, verifique seu email para verificar sua conta.'
        )
        router.push('/sign-in')
      },
      onError: error => {
        toast.error(error.error.message || 'Um erro ocorreu ao criar a conta.')
      }
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-foreground">Crie uma Conta</h1>
      </div>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Nome Completo</FieldLabel>
              <Input
                {...field}
                type="text"
                autoComplete="name"
                placeholder="Digite seu nome completo"
                autoFocus
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

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
        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Confirmar Senha</FieldLabel>
              <Input
                {...field}
                type="password"
                autoComplete="current-password"
                placeholder="Confirme sua senha"
                autoFocus
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>

      <div className="mt-4 text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <Link
          href="/sign-in"
          className="font-medium text-primary hover:underline"
        >
          Entrar
        </Link>
      </div>
    </div>
  )
}
