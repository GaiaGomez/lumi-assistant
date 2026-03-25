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
      {/* ---- BOTTOM NAV para iPad en portrait y pantallas medianas ---- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex lg:hidden z-50 safe-bottom">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                isActive
                  ? 'text-stone-800'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-xs font-medium">{label}</span>
              {/* Indicador visual de ruta activa */}
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-stone-800 rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ---- SIDEBAR para iPad en landscape / pantallas grandes ---- */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-stone-200 z-50">
        {/* Logo */}
        <div className="p-6 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">L</span>
            </div>
            <div>
              <p className="font-semibold text-stone-800 text-sm">Lu Assistant</p>
              <p className="text-xs text-stone-400">Consultorio privado</p>
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
