'use client'
// ============================================================
// ACCOUNT MENU — dropdown de cuenta en header/sidebar
// Trigger: avatar + nombre + chevron (o solo avatar en modo compacto)
// Items: Mi perfil · Configuración · Cerrar sesión
// ============================================================

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, User, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ProfileIdentity } from '@/lib/profile'

interface AccountMenuProps {
  /** compact = true → solo avatar circular, sin nombre ni chevron (mobile header) */
  compact?: boolean
  identity: ProfileIdentity
}

export default function AccountMenu({ compact = false, identity }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  async function handleSignOut() {
    setOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div ref={ref} className="relative">

      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Menú de cuenta"
        aria-expanded={open}
        className={`flex items-center gap-3 rounded-xl transition-all hover:bg-[rgba(200,188,205,0.15)] active:scale-[0.98] ${
          compact ? '' : 'w-full px-2 py-2'
        } ${open && !compact ? 'bg-[rgba(200,188,205,0.20)]' : ''}`}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #C4B0C8 0%, #9A9AB8 100%)' }}
        >
          <span className="text-white text-[14px] font-light select-none">{identity.avatarLabel}</span>
        </div>

        {/* Nombre + subtítulo (solo en modo completo) */}
        {!compact && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[14px] font-medium truncate" style={{ color: 'var(--ink-cool-strong)' }}>
                {identity.displayName}
              </p>
              <p className="text-[11px] tracking-wide truncate" style={{ color: 'var(--ink-cool-muted)' }}>
                {identity.workspaceName}
              </p>
            </div>

            <ChevronDown
              size={13}
              strokeWidth={2.2}
              style={{
                color: 'var(--ink-cool-faint)',
                transform: open ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.18s ease',
                flexShrink: 0,
              }}
            />
          </>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className={`absolute z-[60] rounded-[14px] overflow-hidden py-1 ${
            compact
              ? 'right-0 top-full mt-2 w-52'
              : 'left-0 right-0 top-full mt-1.5'
          }`}
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid var(--border-glass-white)',
            boxShadow: '0 8px 32px rgba(120,108,130,0.18)',
          }}
        >
          <div className="px-4 py-3">
            <p className="text-[14px] font-medium truncate" style={{ color: 'var(--ink-cool-strong)' }}>
              {identity.displayName}
            </p>
            <p className="text-[11px] tracking-wide truncate" style={{ color: 'var(--ink-cool-muted)' }}>
              {identity.workspaceName}
            </p>
            <p className="text-[12px] mt-1 truncate" style={{ color: 'var(--ink-cool-faint)' }}>
              {identity.email}
            </p>
          </div>

          <div
            className="mb-1 mx-2"
            style={{ borderTop: '1px solid var(--border-glass-muted)' }}
          />

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[rgba(200,188,205,0.12)]"
            style={{ color: 'var(--ink-cool-soft)' }}
          >
            <User size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span className="text-[14px]">Mi perfil</span>
          </Link>

          <Link
            href="/configuracion"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[rgba(200,188,205,0.12)]"
            style={{ color: 'var(--ink-cool-soft)' }}
          >
            <Settings size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span className="text-[14px]">Configuración</span>
          </Link>

          {/* Separador */}
          <div
            className="my-1 mx-2"
            style={{ borderTop: '1px solid var(--border-glass-muted)' }}
          />

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[rgba(200,188,205,0.08)]"
            style={{ color: 'var(--state-cancel-text)' }}
          >
            <LogOut size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span className="text-[14px]">Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  )
}
