// ============================================================
// STAT CARD — tarjeta de resumen con label, valor y hint opcional
//
// Props:
//   label   → kicker de la métrica
//   value   → valor principal (texto)
//   hint    → subtexto secundario (opcional)
//   href    → convierte la card en Link (opcional)
//   muted   → reduce prominencia cuando el valor es vacío/cero
//
// Usado en: AgendaSummaryStats, PatientTopMosaic
// ============================================================

import Link from 'next/link'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  href?: string
  muted?: boolean
}

export default function StatCard({ label, value, hint, href, muted = false }: StatCardProps) {
  const content = (
    <div
      className={`glass-cool rounded-[14px] h-full ${muted ? 'opacity-70' : ''}`}
      style={{ minHeight: '64px', padding: '10px 12px' }}
    >
      <p className="card-label mb-0.5" style={{ color: 'var(--ink-cool-faint)' }}>
        {label}
      </p>
      <p
        className="text-[13px] font-medium leading-snug"
        style={{ color: muted ? 'var(--ink-cool-soft)' : 'var(--ink-cool-strong)' }}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[11px] leading-tight" style={{ color: 'var(--ink-cool-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )

  if (href) return <Link href={href} className="block h-full">{content}</Link>
  return content
}
