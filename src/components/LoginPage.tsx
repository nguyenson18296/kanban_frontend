import { useState, type FormEvent } from 'react'

const flowboardIcon =
  'https://www.figma.com/api/mcp/asset/727622b7-021b-49ea-bbd5-085721641c1d'
const companyLogo1 =
  'https://www.figma.com/api/mcp/asset/7d50ff35-9645-46c6-b42c-5c62ca170fab'
const companyLogo2 =
  'https://www.figma.com/api/mcp/asset/1e44145b-cfdc-441e-9c56-3e70e2adbc6d'
const companyLogo3 =
  'https://www.figma.com/api/mcp/asset/8347056d-afe5-4d1c-b67b-d7626f38595a'
const googleIcon =
  'https://www.figma.com/api/mcp/asset/33c95150-af94-46fd-8817-41c8209ecd8f'
const githubIcon =
  'https://www.figma.com/api/mcp/asset/b8ad82e8-b936-4dd5-a440-6b5e054fb62f'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    console.log({ email, password, rememberMe })
  }

  return (
    <div className="flex min-h-screen bg-[#f6f6f8]">
      {/* Left Panel - Branding */}
      <section className="relative flex w-[55%] flex-col justify-between overflow-hidden bg-[#0f172a] p-12">
        {/* Blur decorations */}
        <div className="pointer-events-none absolute -left-[70px] -top-[102px] size-[500px] rounded-full bg-[rgba(101,101,241,0.2)] blur-[60px]" />
        <div className="pointer-events-none absolute -bottom-[102px] -right-[70px] size-[600px] rounded-full bg-[rgba(49,46,129,0.4)] blur-[50px]" />

        {/* Brand header */}
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-[rgba(101,101,241,0.2)] backdrop-blur-[2px]">
            <img src={flowboardIcon} alt="" width={18} height={18} />
          </div>
          <span className="text-xl font-bold tracking-[-0.5px] text-white">
            Flowboard
          </span>
        </div>

        {/* Hero content */}
        <div className="relative flex flex-1 flex-col justify-center py-12">
          <div className="flex max-w-[576px] flex-col gap-6 pb-12">
            <h1 className="m-0 text-5xl font-extrabold leading-[1.15] text-white">
              Manage projects with
              <span className="block text-[#6565f1]">clarity.</span>
            </h1>
            <p className="m-0 max-w-[448px] text-lg leading-[1.625] text-[#94a3b8]">
              Streamline your workflow with the new standard in project
              management. Collaborate, track, and ship faster.
            </p>
          </div>

          {/* Glassmorphism kanban preview */}
          <div className="flex max-w-[512px] flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-[17px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-[6px]">
            {/* Window chrome */}
            <div className="flex items-center justify-between border-b border-white/5 pb-[13px]">
              <div className="flex gap-2">
                <span className="size-3 rounded-full bg-[#f87171]" />
                <span className="size-3 rounded-full bg-[#facc15]" />
                <span className="size-3 rounded-full bg-[#4ade80]" />
              </div>
              <div className="h-2 w-20 rounded bg-white/10" />
            </div>

            {/* Mock columns */}
            <div className="flex gap-3">
              {/* Column 1 */}
              <div className="flex flex-1 flex-col gap-2">
                <div className="mb-1 h-3 w-16 rounded bg-white/20" />
                <div className="flex flex-col gap-2 rounded-lg border border-white/5 bg-white/5 p-[13px]">
                  <div className="h-2 w-full rounded bg-white/10" />
                  <div className="h-2 w-[55%] rounded bg-white/10" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="size-4 rounded-full bg-[rgba(101,101,241,0.4)]" />
                    <div className="h-1.5 w-8 rounded bg-white/10" />
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-lg border border-white/5 bg-white/5 p-[13px]">
                  <div className="h-2 w-[65%] rounded bg-white/10" />
                  <div className="h-2 w-[55%] rounded bg-white/10" />
                </div>
              </div>

              {/* Column 2 */}
              <div className="flex flex-1 flex-col gap-2">
                <div className="mb-1 h-3 w-16 rounded bg-white/20" />
                <div className="flex flex-col gap-2 rounded-lg border border-white/5 bg-white/5 p-[13px]">
                  <div className="h-2 w-full rounded bg-white/10" />
                  <div className="h-2 w-full rounded bg-white/10" />
                  <div className="flex items-start pt-1">
                    <div className="size-5 rounded-full border border-[#0f172a] bg-[#60a5fa]" />
                    <div className="-ml-1 size-5 rounded-full border border-[#0f172a] bg-[#c084fc]" />
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div className="flex flex-1 flex-col gap-2 opacity-50">
                <div className="mb-1 h-3 w-16 rounded bg-white/20" />
                <div className="flex flex-col rounded-lg border border-white/5 bg-white/5 p-[13px]">
                  <div className="h-2 w-full rounded bg-white/10" />
                </div>
                <div className="flex flex-col rounded-lg border border-white/5 bg-white/5 p-[13px]">
                  <div className="h-2 w-[55%] rounded bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted logos */}
        <div className="relative flex flex-col gap-4">
          <span className="text-xs font-medium uppercase tracking-[0.6px] text-[#64748b]">
            Trusted by industry leaders
          </span>
          <div className="flex items-center gap-8 opacity-60 saturate-0 brightness-[10]">
            <img src={companyLogo1} alt="Company logo" height={24} />
            <img src={companyLogo2} alt="Company logo" height={32} />
            <img src={companyLogo3} alt="Company logo" height={20} />
          </div>
        </div>
      </section>

      {/* Right Panel - Login Form */}
      <section className="relative flex w-[45%] flex-col items-center justify-center overflow-hidden bg-white">
        {/* Top navigation */}
        <div className="absolute left-0 right-0 top-0 flex items-start justify-end gap-1 p-10">
          <span className="text-sm font-medium leading-5 text-[#475569]">
            New to Flowboard?&nbsp;
          </span>
          <a
            href="#"
            className="text-sm font-semibold leading-5 text-[#6565f1] no-underline hover:underline"
          >
            Sign up
          </a>
        </div>

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
      </section>
    </div>
  )
}

export default LoginPage
