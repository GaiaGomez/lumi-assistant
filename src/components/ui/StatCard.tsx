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
      className={`glass-cool rounded-[16px] h-full ${muted ? 'opacity-70' : ''}`}
      style={{ minHeight: '76px', padding: '12px 14px' }}
    >
      <p className="card-label mb-1" style={{ color: 'var(--ink-cool-faint)' }}>
        {label}
      </p>
      <p
        className="font-medium leading-snug"
        style={{ color: muted ? 'var(--ink-cool-soft)' : 'var(--ink-cool-strong)', fontSize: '15px' }}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[11px] leading-tight" style={{ color: 'var(--ink-cool-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )

  if (href) return <Link href={href} className="block h-full">{content}</Link>
  return content
}
