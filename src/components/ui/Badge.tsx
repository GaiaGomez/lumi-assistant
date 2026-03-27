// ============================================================
// BADGE — estados semánticos del sistema Lumi
//
// Props:
//   status → 'success' | 'pending' | 'cancel' | 'warning' | 'inactive'
//
// Mapea directamente al sistema .status-badge en globals.css.
// ============================================================

import type { ReactNode } from 'react'

type BadgeStatus = 'success' | 'pending' | 'cancel' | 'warning' | 'inactive'

interface BadgeProps {
  status: BadgeStatus
  children: ReactNode
}

export default function Badge({ status, children }: BadgeProps) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {children}
    </span>
  )
}
