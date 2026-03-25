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
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-stone-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">L</span>
          </div>
          <h1 className="text-2xl font-semibold text-stone-800">Lu Assistant</h1>
          <p className="text-stone-500 text-sm mt-1">Tu espacio clínico privado</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lu@email.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 text-base"
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-stone-700 hover:bg-stone-800 disabled:bg-stone-400 text-white font-medium rounded-xl transition-colors text-base"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

      </div>
    </div>
  )
}
