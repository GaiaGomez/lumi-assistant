// ============================================================
// CARD — superficie base del sistema Lumi (zona cool)
//
// Props:
//   radius   → 'sm' (14px) | 'md' (18px) | 'lg' (22px)   default: 'md'
//   className → padding, spacing y overrides del llamador
//
// La clase .glass-cool provee el fondo, borde y sombra.
// ============================================================

import type { CSSProperties, ReactNode } from 'react'

const radii = {
  sm: 'rounded-[14px]',
  md: 'rounded-[18px]',
  lg: 'rounded-[22px]',
} as const

interface CardProps {
  children: ReactNode
  radius?: keyof typeof radii
  className?: string
  style?: CSSProperties
}

export default function Card({
  children,
  radius = 'md',
  className = '',
  style,
}: CardProps) {
  return (
    <div
      className={`glass-cool ${radii[radius]} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
