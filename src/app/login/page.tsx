'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/agenda')
    router.refresh()
  }

  async function handleDemoLogin() {
    setDemoLoading(true)
    setDemoError(null)

    try {
      const response = await fetch('/api/demo-login', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        setDemoError('Demo access is currently unavailable.')
        setDemoLoading(false)
        return
      }

      router.push('/agenda')
      router.refresh()
    } catch {
      setDemoError('Demo access is currently unavailable.')
      setDemoLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: `
          radial-gradient(circle at 18% 22%, rgba(231,211,207,0.72) 0%, transparent 32%),
          radial-gradient(circle at 82% 78%, rgba(201,177,170,0.32) 0%, transparent 30%),
          linear-gradient(180deg, var(--bg-canvas) 0%, var(--bg-canvas-2) 100%)
        `,
      }}
    >
      <div className="w-full max-w-[400px]">

        {/* Marca */}
        <div className="text-center mb-8">
          <p className="section-kicker mb-2">Consultorio privado</p>
          <h1 className="page-title text-[2.8rem] leading-none">Lumi</h1>
          <p className="page-subtitle mt-2">Tu suite clínica</p>
        </div>

        {/* Card de login */}
        <div
          className="glass-cool rounded-[22px] p-6 space-y-4"
        >
          <div>
            <h2 className="editorial-panel-title text-[1.05rem] mb-0.5">Bienvenida de nuevo</h2>
            <p className="text-[13px]" style={{ color: 'var(--ink-cool-soft)' }}>
              Ingresa con tu cuenta para continuar.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="section-kicker">Email</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="hola@email.com"
                required
                className="w-full rounded-[14px] px-3.5 py-3 text-[14px]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="section-kicker">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-[14px] px-3.5 py-3 text-[14px]"
              />
            </label>

            {error && (
              <div
                className="rounded-[12px] px-3.5 py-3 text-[13px]"
                style={{ background: 'var(--state-cancel-bg)', color: 'var(--state-cancel-text)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-action w-full py-3 text-[13px] tracking-[0.06em] uppercase disabled:opacity-50 mt-1"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="border-t border-t-[var(--border-glass-white)] pt-4 mt-4">
            {demoError && (
              <div
                className="rounded-[12px] px-3.5 py-3 text-[13px] mb-3"
                style={{ background: 'var(--state-cancel-bg)', color: 'var(--state-cancel-text)' }}
              >
                {demoError}
              </div>
            )}

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="btn-subtle w-full py-3 text-[13px] tracking-[0.06em] uppercase disabled:opacity-50"
            >
              {demoLoading ? 'Cargando...' : 'Ver demo'}
            </button>

            <p className="text-center text-[12px] mt-3" style={{ color: 'var(--ink-cool-soft)' }}>
              Explora Lumi con datos ficticios. Sin datos reales de pacientes.
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] mt-6" style={{ color: 'var(--ink-cool-faint)' }}>
          Acceso privado · Lumi
        </p>
      </div>
    </div>
  )
}
