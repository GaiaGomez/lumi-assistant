'use client'
// ============================================================
// MODAL SHELL — contenedor base para modales del sistema Lumi
//
// Props:
//   onClose   → función que se llama al hacer clic en el overlay
//   children  → contenido del modal
//   maxWidth  → clase Tailwind de ancho máximo (default: 'max-w-md')
//
// Patrón: bottom sheet en móvil, centrado en sm+
// ============================================================

import type { ReactNode } from 'react'
import useBodyScrollLock from '@/components/ui/useBodyScrollLock'

interface ModalShellProps {
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}

export default function ModalShell({ onClose, children, maxWidth = 'max-w-md' }: ModalShellProps) {
  useBodyScrollLock(true)

  return (
    <div
      className="dashboard-modal-shell fixed inset-0 z-[90] flex items-end sm:items-center justify-center px-3 pb-3 pt-10 sm:p-4"
      style={{
        background: 'rgba(52, 34, 35, 0.34)',
        backdropFilter: 'blur(12px)',
        overscrollBehavior: 'contain',
      }}
      onClick={onClose}
    >
      <div
        className={`glass-cool w-full ${maxWidth} rounded-t-[22px] sm:rounded-[22px] overflow-hidden`}
        style={{
          boxShadow: '0 34px 96px rgba(54, 37, 34, 0.22)',
          border: '1px solid rgba(255,255,255,0.46)',
          maxHeight: 'calc(100dvh - var(--dashboard-action-clearance) - 1rem)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
