import { SignUpForm } from '@/components/auth/sign-up-form'
import { redirectIfSignedIn } from '@/lib/authentication'

const SignUpPage = async () => {
  await redirectIfSignedIn()

  return <SignUpForm />
}

export default SignUpPage
