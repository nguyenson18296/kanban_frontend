import { useState, type FormEvent } from 'react'

const googleIcon =
  'https://www.figma.com/api/mcp/asset/33c95150-af94-46fd-8817-41c8209ecd8f'
const githubIcon =
  'https://www.figma.com/api/mcp/asset/b8ad82e8-b936-4dd5-a440-6b5e054fb62f'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    console.log({ email, password, rememberMe })
  }

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
        <button
          type="button"
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-[#e2e8f0] bg-white px-[17px] py-[11px] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f8fafc]"
        >
          <img
            src={googleIcon}
            alt="Sign in with Google"
            width={20}
            height={20}
          />
        </button>
        <button
          type="button"
          className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-[#e2e8f0] bg-white px-[17px] py-[11px] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors hover:bg-[#f8fafc]"
        >
          <img
            src={githubIcon}
            alt="Sign in with GitHub"
            width={20}
            height={20}
          />
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-x-0 top-1/2 h-px bg-[#e2e8f0]" />
        <span className="relative bg-white px-3 text-sm leading-5 text-[#64748b]">
          Or continue with
        </span>
      </div>

      {/* Form */}
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-sm font-medium leading-5 text-[#334155]"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-[15px] font-[inherit] text-sm text-[#0f172a] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] outline-none transition-[border-color,box-shadow] placeholder:text-[#94a3b8] focus:border-[#6565f1] focus:shadow-[0_0_0_3px_rgba(101,101,241,0.1)]"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-sm font-medium leading-5 text-[#334155]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-[15px] font-[inherit] text-sm text-[#0f172a] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] outline-none transition-[border-color,box-shadow] placeholder:text-[#94a3b8] focus:border-[#6565f1] focus:shadow-[0_0_0_3px_rgba(101,101,241,0.1)]"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm leading-5 text-[#475569]">
            <input
              type="checkbox"
              className="size-4 cursor-pointer rounded border border-[#cbd5e1] accent-[#6565f1]"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <a
            href="#"
            className="text-sm font-semibold leading-5 text-[#6565f1] no-underline hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          className="w-full cursor-pointer rounded-lg border-none bg-[#6565f1] px-3 py-3.5 font-[inherit] text-sm font-semibold leading-5 text-white shadow-[0_1px_2px_0_rgba(101,101,241,0.2)] transition-colors hover:bg-[#5252d4]"
        >
          Sign in
        </button>
      </form>

      <p className="m-0 text-center text-xs leading-4 text-[#94a3b8]">
        &copy; 2024 Flowboard Inc. All rights reserved.
      </p>
    </div>
  )
}
