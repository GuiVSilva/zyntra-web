import { SignInForm } from '@/components/auth/sign-in-form'
import { redirectIfSignedIn } from '@/lib/authentication'

const SignInPage = async () => {
  await redirectIfSignedIn()

  return <SignInForm />
}

export default SignInPage
