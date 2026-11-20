import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Mail, Loader2, Sparkles, AlertCircle, Activity } from 'lucide-react'
import api from '@/services/api'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    setLoading(true)
    try {
      const loginResponse = await api.post('/auth/login', data)
      const { access_token, refresh_token } = loginResponse.data

      localStorage.setItem('fp_token', access_token)
      localStorage.setItem('fp_refresh_token', refresh_token)
      if (rememberMe) {
        localStorage.setItem('fp_remember_email', data.email)
      } else {
        localStorage.removeItem('fp_remember_email')
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

      const userResponse = await api.get('/auth/me')
      localStorage.setItem('fp_user', JSON.stringify(userResponse.data))

      navigate('/')
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Invalid credentials. Please verify your email and password.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemoFill = () => {
    setValue('email', 'admin@gmail.com', { shouldValidate: true })
    setValue('password', 'Admin@123', { shouldValidate: true })
    setError(null)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-[#F5F7FA]">
      {/* Decorative top pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#0F766E_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F766E] text-white shadow-md mb-3">
            <Activity size={26} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033]">
            FactoryPulse
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Industrial Machine Downtime Intelligence & OEE Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E2E8F0] shadow-xl rounded-2xl p-7">
          <div className="mb-5">
            <h2 className="text-base font-bold text-[#172033]">Sign in to your account</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Enter credentials or use the 1-click demo fill below
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-[#DC2626] flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
            {/* Email */}
            <div>
              <label className="block font-semibold text-[#172033] mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="email"
                  placeholder="name@company.com"
                  {...register('email')}
                  className={`w-full h-10 pl-9 pr-3 rounded-lg border bg-white text-[#172033] focus:outline-none transition-all ${
                    errors.email ? 'border-rose-400 focus:border-rose-500' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-[#172033]">Password</label>
                <span className="text-[11px] text-[#0F766E] hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full h-10 pl-9 pr-3 rounded-lg border bg-white text-[#172033] focus:outline-none transition-all ${
                    errors.password ? 'border-rose-400 focus:border-rose-500' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-[#64748B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E]"
                />
                Remember this workstation
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          {/* 1-Click Demo Fill Button */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleQuickDemoFill}
              className="w-full py-2 px-3 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0F766E] border border-teal-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              Quick Fill Demo Admin Credentials
            </button>
            <p className="text-[11px] text-center text-[#64748B] mt-2">
              Default: <code>admin@gmail.com</code> / <code>Admin@123</code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#64748B] mt-5">
          &copy; 2026 FactoryPulse Inc. &bull; Enterprise Industrial SaaS &bull; All rights reserved.
        </p>
      </div>
    </div>
  )
}
