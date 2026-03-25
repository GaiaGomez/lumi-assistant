'use client'
// force-dynamic: evita que Next.js intente pre-renderizar esta página en build time
// sin las variables de entorno de Supabase disponibles
export const dynamic = 'force-dynamic'

// ============================================================
// LOGIN PAGE — única página pública de la app
// Usa Supabase Auth con email/contraseña
// "use client" porque maneja eventos del formulario (onClick, onChange)
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
    e.preventDefault()  // evita que el form recargue la página
    setLoading(true)
    setError(null)

    // signInWithPassword: método de Supabase Auth para login con email y contraseña
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    // Si el login fue exitoso → redirigimos a la agenda
    router.push('/agenda')
    router.refresh() // fuerza al middleware a re-verificar la sesión
  }

  return (
    // Fondo con gradiente tierra-sage (viene del globals.css)
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

      {/* ── Blobs de color de fondo — decorativos, no funcionales ── */}
      {/* Blob nude/rosa */}
      <div className="absolute top-[-10%] right-[-5%] w-80 h-80 rounded-full opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #DFC5C0 0%, transparent 70%)' }} />
      {/* Blob sage */}
      <div className="absolute bottom-[-5%] left-[-5%] w-96 h-96 rounded-full opacity-35 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #C4D4C0 0%, transparent 70%)' }} />
      {/* Blob arena pequeño */}
      <div className="absolute top-[40%] left-[10%] w-48 h-48 rounded-full opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D9C9B8 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative z-10">

        {/* ── Logo + título ── */}
        <div className="text-center mb-8">
          {/* Círculo con gradiente tierra → sage */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #C4A882 0%, #8FAE8B 100%)' }}>
            <span className="text-white text-3xl font-light tracking-tight">L</span>
          </div>
          <h1 className="text-3xl font-light tracking-tight"
            style={{ color: '#2D2520' }}>
            Lu Assistant
          </h1>
          <p className="text-sm mt-2 tracking-wide"
            style={{ color: '#9C8878' }}>
            Tu espacio clínico privado
          </p>
        </div>

        {/* ── Card glassmorphism ── */}
        <form
          onSubmit={handleLogin}
          className="glass rounded-3xl p-7 space-y-5 shadow-xl"
          style={{ boxShadow: '0 8px 40px rgba(139, 115, 85, 0.12)' }}
        >
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase mb-2"
              style={{ color: '#9C8878' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hola@email.com"
              required
              className="w-full px-4 py-3.5 rounded-2xl text-base focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.6)',
                border: '1.5px solid rgba(217,201,184,0.6)',
                color: '#2D2520',
              }}
              onFocus={e => e.target.style.border = '1.5px solid #C4A882'}
              onBlur={e => e.target.style.border = '1.5px solid rgba(217,201,184,0.6)'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-widest uppercase mb-2"
              style={{ color: '#9C8878' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3.5 rounded-2xl text-base focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.6)',
                border: '1.5px solid rgba(217,201,184,0.6)',
                color: '#2D2520',
              }}
              onFocus={e => e.target.style.border = '1.5px solid #C4A882'}
              onBlur={e => e.target.style.border = '1.5px solid rgba(217,201,184,0.6)'}
            />
          </div>

          {error && (
            <p className="text-sm text-center py-2.5 px-4 rounded-xl"
              style={{ background: 'rgba(223,197,192,0.4)', color: '#8B4A42' }}>
              {error}
            </p>
          )}

          {/* Botón con gradiente tierra → sage */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-medium tracking-wide transition-opacity disabled:opacity-50 mt-2"
            style={{ background: 'linear-gradient(135deg, #8B7355 0%, #6B8F6B 100%)' }}
          >
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>

        <p className="text-center text-xs mt-6 tracking-wide" style={{ color: '#C4B4A4' }}>
          Acceso privado · Solo para Lu 🌿
        </p>
      </div>
    </div>
  )
}
