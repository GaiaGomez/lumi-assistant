'use client'

import type { ConsultorioFilterOption } from '@/lib/consultorios'

interface ConsultorioFilterBarProps {
  options: ConsultorioFilterOption[]
  filtrosActivos: Set<string>
  onToggle: (key: string) => void
  onClear: () => void
  compact?: boolean
}

export default function ConsultorioFilterBar({
  options,
  filtrosActivos,
  onToggle,
  onClear,
  compact = false,
}: ConsultorioFilterBarProps) {
  return (
    <>
      {options.map((option) => {
        const Icon = option.Icon
        const activo = filtrosActivos.has(option.key)
        return (
          <button
            key={option.key}
            onClick={() => onToggle(option.key)}
            className={
              compact
                ? 'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full text-[11px] sm:text-[12px] font-medium transition-all shrink-0'
                : 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all'
            }
            style={
              activo
                ? {
                    background: option.bg,
                    color: 'white',
                    border: `1px solid ${option.bg}`,
                    boxShadow: `0 2px 8px ${option.bg}44`,
                  }
                : {
                    background: 'rgba(255,255,255,0.38)',
                    color: 'var(--ink-cool-muted)',
                    border: '1px solid transparent',
                  }
            }
          >
            {Icon && <Icon size={10} style={{ color: activo ? 'white' : option.bg }} />}
            {option.label}
          </button>
        )
      })}
      {filtrosActivos.size > 0 && (
        <button
          onClick={onClear}
          className={
            compact
              ? 'text-[11px] sm:text-[12px] px-2 py-0.5 sm:py-1 rounded-full shrink-0'
              : 'text-[12px] px-2 py-1 rounded-full transition-all'
          }
          style={{ color: 'var(--ink-cool-faint)', background: 'transparent' }}
        >
          Ver todas
        </button>
      )}
    </>
  )
}
