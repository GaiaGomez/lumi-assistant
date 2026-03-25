'use client'
// ============================================================
// BOTTOM NAV — navegación inferior estilo iPad/iOS
// En pantallas grandes (iPad landscape) se convierte en sidebar lateral
// "use client" porque usa usePathname para saber qué ruta está activa
// ============================================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, FileText, MessageCircle } from 'lucide-react'

const navItems = [
  { href: '/agenda',    label: 'Agenda',    icon: Calendar },
  { href: '/pacientes', label: 'Pacientes', icon: Users },
  { href: '/historias', label: 'Notas',     icon: FileText },
  { href: '/whatsapp',  label: 'WhatsApp',  icon: MessageCircle },
]

export default function BottomNav() {
  // usePathname: hook de Next.js que devuelve la ruta actual, ej: "/agenda"
  const pathname = usePathname()

  return (
    <>
      {/* ── BOTTOM NAV — iPad portrait / móvil, estilo frosted glass ── */}
      <nav
        className="fixed bottom-4 left-4 right-4 flex lg:hidden z-50 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          boxShadow: '0 4px 24px rgba(139,115,85,0.10)',
        }}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-3.5 gap-1 transition-all"
              style={{ color: isActive ? '#8B7355' : '#C4B4A4' }}
            >
              {/* Indicador activo — bolita sobre el ícono */}
              {isActive && (
                <span className="absolute top-2 w-1 h-1 rounded-full"
                  style={{ background: '#8B7355' }} />
              )}
              <Icon size={21} strokeWidth={isActive ? 2.2 : 1.5} />
              <span className="text-xs font-medium tracking-wide">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── SIDEBAR — iPad landscape / pantallas grandes ── */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-50"
        style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          boxShadow: '1px 0 24px rgba(139,115,85,0.06)',
        }}
      >
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg, #C4A882 0%, #8FAE8B 100%)' }}>
              <span className="text-white text-base font-light">L</span>
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: '#2D2520' }}>Lu Assistant</p>
              <p className="text-xs tracking-wide" style={{ color: '#C4B4A4' }}>Consultorio privado</p>
            </div>
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={isActive ? {
                  background: 'linear-gradient(135deg, rgba(196,168,130,0.25) 0%, rgba(143,174,139,0.25) 100%)',
                  color: '#6B5844',
                } : {
                  color: '#B4A494',
                }}
              >
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.5} />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-5">
          <p className="text-xs text-center tracking-widest" style={{ color: '#D4C4B4' }}>
            🌿 Lu Assistant
          </p>
        </div>
      </aside>
    </>
  )
}
