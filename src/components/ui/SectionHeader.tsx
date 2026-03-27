// ============================================================
// SECTION HEADER — etiqueta de sección dentro de cards
//
// Props:
//   label     → texto del kicker (siempre uppercase via CSS)
//   className → margen y overrides del llamador (ej: "mb-2.5")
// ============================================================

interface SectionHeaderProps {
  label: string
  className?: string
}

export default function SectionHeader({ label, className = '' }: SectionHeaderProps) {
  return (
    <p
      className={`card-label ${className}`}
      style={{ color: 'var(--ink-cool-faint)' }}
    >
      {label}
    </p>
  )
}
