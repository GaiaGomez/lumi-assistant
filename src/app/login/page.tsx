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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

      {/* ── 2 blobs suaves — rose + lavender ── */}
      {/* Blob rose — top right */}
      <div className="absolute pointer-events-none" style={{
        top: '-30%', right: '-25%',
        width: '800px', height: '800px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(215,175,195,0.28) 0%, transparent 70%)',
      }} />
      {/* Blob lavender — bottom left */}
      <div className="absolute pointer-events-none" style={{
        bottom: '-35%', left: '-25%',
        width: '900px', height: '900px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(175,175,210,0.22) 0%, transparent 70%)',
      }} />

      <div className="w-full max-w-sm relative z-10">

        {/* ── Logo + título ── */}
        <div className="text-center mb-8">
          {/* Círculo con gradiente rose → lavender */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #C4B0C8 0%, #9A9AB8 100%)' }}>
            <span className="text-white text-3xl font-light tracking-tight">L</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight"
            style={{ color: '#111111' }}>
            Lu Assistant
          </h1>
          <p className="text-sm mt-2 tracking-wide"
            style={{ color: '#666666' }}>
            Tu espacio clínico privado
          </p>
        </div>

        {/* ── Card glassmorphism ── */}
        <form
          onSubmit={handleLogin}
          className="glass rounded-3xl p-7 space-y-5"
          style={{ boxShadow: '0 8px 48px rgba(120, 110, 140, 0.12)' }}
        >
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase mb-2"
              style={{ color: '#777777' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hola@email.com"
              required
              className="w-full px-4 py-3.5 rounded-2xl text-base transition-all"
              style={{ color: '#111111' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase mb-2"
              style={{ color: '#777777' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3.5 rounded-2xl text-base transition-all"
              style={{ color: '#111111' }}
            />
          </div>

          {error && (
            <p className="text-sm text-center py-2.5 px-4 rounded-xl"
              style={{ background: 'rgba(195,155,155,0.25)', color: '#7A2E2E' }}>
              {error}
            </p>
          )}

          {/* Botón — glass gris con toque rose sutil */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-medium tracking-wide transition-opacity disabled:opacity-50 mt-2"
            style={{ background: 'rgba(155, 142, 160, 0.92)' }}
          >
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>

        <p className="text-center text-xs mt-6 tracking-wide" style={{ color: '#CCCCCC' }}>
          Acceso privado · Solo para Lu 🌿
        </p>
      </div>
    </div>
  )
}
