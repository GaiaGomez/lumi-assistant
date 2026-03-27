// ============================================================
// AVATAR — iniciales circulares del sistema Lumi
//
// Props:
//   nombre   → primer nombre del paciente
//   apellido → apellido del paciente
//   size     → 'sm' (28px) | 'md' (36px) | 'lg' (40px)   default: 'md'
// ============================================================

const sizes = {
  sm: { box: '28px', font: '9px' },
  md: { box: '36px', font: '10px' },
  lg: { box: '40px', font: '12px' },
} as const

interface AvatarProps {
  nombre: string
  apellido: string
  size?: keyof typeof sizes
}

export default function Avatar({ nombre, apellido, size = 'md' }: AvatarProps) {
  const s = sizes[size]
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: s.box,
        height: s.box,
        background: 'linear-gradient(145deg, var(--accent-lavender-soft) 0%, var(--accent-lilac) 100%)',
        boxShadow: 'var(--shadow-glass)',
        border: '1px solid var(--border-glass-white)',
      }}
    >
      <span
        className="font-medium"
        style={{ fontSize: s.font, color: 'var(--ink-cool-strong)', letterSpacing: '0.02em' }}
      >
        {nombre[0]}{apellido[0]}
      </span>
    </div>
  )
}
