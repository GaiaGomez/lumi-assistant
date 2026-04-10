'use client'
// ============================================================
// BOTTOM NAV — navegación principal de Lumi
//
// En mobile/tablet: barra inferior frosted glass + header superior con acceso de cuenta
// En desktop (lg+): sidebar lateral con AccountMenu + links de nav
// ============================================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, MessageCircle, Settings } from 'lucide-react'
import AccountMenu from './AccountMenu'
import type { ProfileIdentity } from '@/lib/profile'

const navItems = [
  { href: '/agenda',        label: 'Agenda',     icon: Calendar },
  { href: '/pacientes',     label: 'Pacientes',  icon: Users },
  { href: '/whatsapp',      label: 'Pendientes', icon: MessageCircle },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

export default function BottomNav({ identity }: { identity: ProfileIdentity }) {
  const pathname = usePathname()

  return (
    <>
      {/* ── MOBILE HEADER — solo visible en < lg ──
          Header superior con identidad de la app + acceso rápido a cuenta */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{
          height: '56px',
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          borderBottom: '1px solid rgba(255,255,255,0.44)',
          boxShadow: '0 1px 12px rgba(120,110,130,0.07)',
        }}
      >
        {/* Identidad de la app */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #C4B0C8 0%, #9A9AB8 100%)' }}
          >
            <span className="text-white text-[13px] font-light select-none">{identity.avatarLabel}</span>
          </div>
          <div>
            <p className="text-[13px] font-medium leading-none" style={{ color: 'var(--ink-cool-strong)' }}>
              {identity.displayName}
            </p>
            <p className="text-[10px] tracking-wide leading-tight mt-0.5" style={{ color: 'var(--ink-cool-muted)' }}>
              {identity.workspaceName}
            </p>
          </div>
        </div>

        {/* Trigger de cuenta (solo avatar en modo compacto) */}
        <AccountMenu compact identity={identity} />
      </header>

      {/* ── BOTTOM NAV — mobile/tablet ── */}
      <nav
        className="dashboard-shell-nav fixed bottom-4 left-4 right-4 flex lg:hidden z-50 rounded-2xl overflow-hidden"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
          left: 'calc(env(safe-area-inset-left, 0px) + 1rem)',
          right: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          boxShadow: '0 4px 24px rgba(120,110,130,0.10)',
        }}
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="relative flex-1 flex flex-col items-center justify-center py-3.5 gap-1 transition-all"
              style={{ color: isActive ? 'var(--ink-cool-strong)' : 'var(--ink-cool-muted)' }}
            >
              {isActive && (
                <span
                  className="absolute top-2 w-1 h-1 rounded-full"
                  style={{ background: 'var(--ink-cool-faint)' }}
                />
              )}
              <Icon size={21} strokeWidth={isActive ? 2.2 : 1.5} />
              <span className="text-[11px] font-medium tracking-wide">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── SIDEBAR — desktop (lg+) ── */}
      <aside
        className="dashboard-shell-sidebar hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-50"
        style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          boxShadow: '1px 0 24px rgba(120,110,130,0.06)',
        }}
      >
        {/* Account menu completo — avatar + nombre + dropdown */}
        <div className="p-4 pb-2">
          <AccountMenu identity={identity} />
        </div>

        {/* Separador sutil */}
        <div className="mx-5 mb-2" style={{ borderTop: '1px solid var(--border-glass-muted)' }} />

        {/* Links de navegación */}
        <nav className="flex-1 px-3 py-1 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={isActive ? {
                  background: 'rgba(200, 188, 205, 0.30)',
                  color: 'var(--ink-cool-strong)',
                } : {
                  color: 'var(--ink-cool-muted)',
                }}
              >
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.5} />
                <span className="text-[14px] font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-5">
          <p className="text-[11px] text-center tracking-widest" style={{ color: 'var(--ink-cool-muted)' }}>
            Lumi Assistant
          </p>
        </div>
      </aside>
    </>
  )
}
