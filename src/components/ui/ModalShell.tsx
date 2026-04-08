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

interface ModalShellProps {
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}

export default function ModalShell({ onClose, children, maxWidth = 'max-w-md' }: ModalShellProps) {
  return (
    <div
      className="dashboard-modal-shell fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'var(--overlay-modal)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className={`glass-cool w-full ${maxWidth} rounded-[24px] overflow-hidden`}
        style={{
          boxShadow: 'var(--shadow-float)',
          maxHeight: 'calc(100vh - var(--dashboard-action-clearance) - 2rem)',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
