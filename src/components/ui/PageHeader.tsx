// ============================================================
// PAGE HEADER — header estándar de página en Lumi
//
// Props:
//   kicker    → texto uppercase encima del título (opcional)
//   title     → h1 principal de la página
//   subtitle  → texto descriptivo debajo del título (opcional)
//   action    → slot derecho para botón(es) (opcional)
//   backHref  → si se provee, muestra botón de volver a la izquierda
//
// Usado en: todas las páginas del dashboard
// Referencia visual: page-title text-[1.6rem] + section-kicker
// ============================================================

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  kicker?: string
  subtitle?: string
  action?: ReactNode
  backHref?: string
  className?: string
}

export default function PageHeader({
  title,
  kicker,
  subtitle,
  action,
  backHref,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="btn-subtle flex h-8 w-8 shrink-0 items-center justify-center mt-1"
            aria-label="Volver"
          >
            <ArrowLeft size={14} />
          </Link>
        )}
        <div className="min-w-0">
          {kicker && <p className="section-kicker mb-0.5">{kicker}</p>}
          <h1 className="page-title text-[1.6rem] leading-none">{title}</h1>
          {subtitle && <p className="page-subtitle mt-1">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
