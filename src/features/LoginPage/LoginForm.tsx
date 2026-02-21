import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Loader2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

import { useLogin } from './hooks/use-login'
import { useStoreUser } from '../../stores/use-store-user'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean(),
})

type FormSchema = z.infer<typeof formSchema>

const googleIcon =
  'https://www.figma.com/api/mcp/asset/33c95150-af94-46fd-8817-41c8209ecd8f'
const githubIcon =
  'https://www.figma.com/api/mcp/asset/b8ad82e8-b936-4dd5-a440-6b5e054fb62f'

export default function LoginForm() {
  const { mutateAsync: login, isPending, isError, reset: resetLogin } = useLogin()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<FormSchema>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const { setUser } = useStoreUser()

  async function onSubmit(data: FormSchema) {
    try {
      const response = await login({ email: data.email, password: data.password })
      setUser(response.user)
      navigate({ to: '/dashboard' })
    } catch {
      // Error is handled via isError state in the useEffect above
    }
  }

  useEffect(() => {
    if (isError) {
      setError('password', { message: "Invalid email or password" })
    } else {
      clearErrors('password')
    }
  }, [isError, setError, clearErrors])


  return (
    <div className="flex w-full max-w-[380px] flex-col gap-8 p-12">
      {/* Form header */}
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-[30px] font-bold leading-9 tracking-[-0.75px] text-[#0f172a]">
          Welcome back
        </h2>
        <p className="m-0 text-base leading-6 text-[#64748b]">
          Please enter your details to sign in.
        </p>
      </div>

      {/* Social login */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 py-[11px]">
          <img
            src={googleIcon}
            alt="Sign in with Google"
            width={20}
            height={20}
          />
        </Button>
        <Button type="button" variant="outline" className="flex-1 py-[11px]">
          <img
            src={githubIcon}
            alt="Sign in with GitHub"
            width={20}
            height={20}
          />
        </Button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-x-0 top-1/2 h-px bg-[#e2e8f0]" />
        <span className="relative bg-white px-3 text-sm leading-5 text-[#64748b]">
          Or continue with
        </span>
      </div>

      {/* Form */}
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            {...register('email', { onChange: () => isError && resetLogin() })}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password', { onChange: () => isError && resetLogin() })}
          />
          {errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="rememberMe"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="rememberMe" className="cursor-pointer text-[#475569]">
              Remember me
            </Label>
          </div>
          <a
            href="#"
            className="text-sm font-semibold leading-5 text-[#6565f1] no-underline hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <Button
          type="submit"
          className={cn(
            "w-full bg-[#6565f1] py-3.5 text-sm font-semibold hover:bg-[#5252d4]",
            isPending && "cursor-not-allowed"
          )}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign in</span>
          )}
        </Button>
      </form>

      <p className="m-0 text-center text-xs leading-4 text-[#94a3b8]">
        &copy; 2024 Flowboard Inc. All rights reserved.
      </p>
    </div>
  )
}
