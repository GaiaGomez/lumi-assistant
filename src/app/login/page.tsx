'use client'
// force-dynamic: evita que Next.js intente pre-renderizar esta página en build time
export const dynamic = 'force-dynamic'

// ============================================================
// LOGIN PAGE — única página pública de la app
// Usa Supabase Auth con email/contraseña
// ============================================================

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

  return (
    <div className="min-h-screen relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 16% 18%, rgba(231, 200, 197, 0.88) 0%, transparent 26%),
            radial-gradient(circle at 84% 14%, rgba(202, 171, 164, 0.40) 0%, transparent 24%),
            radial-gradient(circle at 72% 72%, rgba(184, 143, 149, 0.24) 0%, transparent 28%),
            linear-gradient(135deg, rgba(247, 240, 235, 0.96) 0%, rgba(236, 223, 216, 0.92) 52%, rgba(242, 234, 229, 0.96) 100%)
          `,
        }}
      />
      <div
        className="absolute pointer-events-none rounded-[44px]"
        style={{
          top: '8%',
          left: '6%',
          width: 'min(36vw, 520px)',
          height: 'min(48vh, 420px)',
          background: 'linear-gradient(160deg, rgba(52,37,35,0.96) 0%, rgba(31,22,21,0.94) 100%)',
          boxShadow: 'var(--shadow-dark)',
          filter: 'blur(1px)',
          transform: 'rotate(-8deg)',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          right: '-10%',
          bottom: '-14%',
          width: 'min(52vw, 780px)',
          height: 'min(52vw, 780px)',
          background: 'radial-gradient(circle, rgba(216,194,192,0.70) 0%, rgba(216,194,192,0.24) 34%, transparent 70%)',
          filter: 'blur(6px)',
        }}
      />

      <div className="relative z-10 min-h-[calc(100vh-4rem)] flex items-center">
        <div className="w-full max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <section className="relative px-1 sm:px-4 lg:px-0">
            <div className="luxury-dark-panel rounded-[40px] p-7 sm:p-9 lg:p-10 max-w-[36rem]">
              <p className="luxury-kicker mb-5">Private Clinical Suite</p>
              <h1 className="page-title text-[3.5rem] sm:text-[4.4rem] leading-[0.9] text-[var(--accent-cream)]">
                Lumi
              </h1>
              <p className="mt-4 max-w-md text-[0.98rem] leading-7" style={{ color: 'rgba(255,239,232,0.78)' }}>
                Un espacio clínico privado, íntimo y diseñado como una suite de trabajo serena para acompañar cada jornada.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div
                  className="rounded-[26px] px-5 py-4"
                  style={{
                    background: 'rgba(255, 246, 241, 0.08)',
                    border: '1px solid rgba(255, 240, 233, 0.10)',
                  }}
                >
                  <p className="luxury-kicker mb-2">Acceso</p>
                  <p className="text-sm leading-6" style={{ color: 'rgba(255,239,232,0.74)' }}>
                    Reservado para tu práctica privada.
                  </p>
                </div>
                <div
                  className="rounded-[26px] px-5 py-4"
                  style={{
                    background: 'rgba(255, 246, 241, 0.08)',
                    border: '1px solid rgba(255, 240, 233, 0.10)',
                  }}
                >
                  <p className="luxury-kicker mb-2">Atmósfera</p>
                  <p className="text-sm leading-6" style={{ color: 'rgba(255,239,232,0.74)' }}>
                    Calma editorial, ritmo suave y herramientas esenciales.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute inset-x-6 -top-7 h-28 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,250,247,0.64) 0%, transparent 72%)' }} />
            <div className="luxury-glass rounded-[38px] p-6 sm:p-8 lg:p-9">
              <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                  <p className="section-kicker mb-3">Ingreso privado</p>
                  <h2 className="editorial-panel-title text-[1.8rem] sm:text-[2.1rem]">
                    Bienvenida de nuevo
                  </h2>
                  <p className="page-subtitle mt-3 max-w-xs leading-6">
                    Entra a tu suite clínica para revisar agenda, pacientes y seguimiento.
                  </p>
                </div>
                <div
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{
                    width: '4.8rem',
                    height: '4.8rem',
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.58) 0%, rgba(243,228,223,0.26) 100%)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    boxShadow: '0 18px 40px rgba(102, 74, 69, 0.12)',
                  }}
                >
                  <span className="editorial-title text-[2rem]" style={{ color: 'var(--accent-espresso)' }}>L</span>
                </div>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <label className="card-label block mb-2" style={{ color: 'var(--ink-faint)' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hola@email.com"
                    required
                    className="w-full px-4 py-3.5 rounded-[14px] text-[13px]"
                  />
                </div>

                <div>
                  <label className="card-label block mb-2" style={{ color: 'var(--ink-faint)' }}>
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3.5 rounded-[14px] text-[13px]"
                  />
                </div>

                {error && (
                  <p
                    className="text-sm text-center py-3 px-4 rounded-[12px]"
                    style={{ background: 'var(--state-cancel-bg)', color: 'var(--state-cancel-text)' }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary-dark w-full py-3.5 text-xs font-medium tracking-[0.06em] uppercase disabled:opacity-50 mt-2"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

              <div className="mt-7 pt-5 flex items-center justify-between gap-4 border-t" style={{ borderColor: 'rgba(166, 142, 132, 0.18)' }}>
                <p className="text-[11px] tracking-[0.16em] uppercase" style={{ color: 'var(--ink-faint)' }}>
                  Lu Assistant
                </p>
                <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                  Acceso privado solo para Lu
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
