// ============================================================
// EMPTY STATE — estado vacío para listas y secciones
//
// Props:
//   message → texto principal
//   hint    → subtexto opcional
//   size    → 'sm' (inline, compacto) | 'md' (full-page, más espacio)
// ============================================================

interface EmptyStateProps {
  message: string
  hint?: string
  size?: 'sm' | 'md'
}

export default function EmptyState({ message, hint, size = 'sm' }: EmptyStateProps) {
  if (size === 'md') {
    return (
      <div className="text-center py-16">
        <p className="text-[15px] font-medium" style={{ color: 'var(--ink-cool-soft)' }}>
          {message}
        </p>
        {hint && (
          <p className="text-[13px] mt-1" style={{ color: 'var(--ink-cool-muted)' }}>
            {hint}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="py-5 text-center">
      <p className="text-[13px]" style={{ color: 'var(--ink-cool-soft)' }}>
        {message}
      </p>
      {hint && (
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--ink-cool-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}
