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

      {/* ── Blobs de color — más grandes y saturados para que el glass se note ── */}
      {/* Blob terracota — top right, el más grande */}
      <div className="absolute pointer-events-none" style={{
        top: '-25%', right: '-20%',
        width: '650px', height: '650px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(214,128,98,0.62) 0%, transparent 65%)',
      }} />
      {/* Blob sage — bottom left */}
      <div className="absolute pointer-events-none" style={{
        bottom: '-30%', left: '-20%',
        width: '750px', height: '750px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(100,170,118,0.55) 0%, transparent 65%)',
      }} />
      {/* Blob rose — centro izquierda */}
      <div className="absolute pointer-events-none" style={{
        top: '35%', left: '5%',
        width: '380px', height: '380px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(210,148,148,0.48) 0%, transparent 65%)',
      }} />
      {/* Blob arena pequeño — top left */}
      <div className="absolute pointer-events-none" style={{
        top: '-5%', left: '15%',
        width: '280px', height: '280px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,160,110,0.40) 0%, transparent 65%)',
      }} />

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
          className="glass rounded-3xl p-7 space-y-5"
          style={{ boxShadow: '0 8px 48px rgba(139, 115, 85, 0.20)' }}
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
