// ============================================================
// INPUT — campo de texto del sistema Lumi
//
// Props:
//   label    → etiqueta visible encima del campo (opcional)
//   + todos los atributos HTML estándar de <input>
//
// El estilo base (fondo, foco, border, sombra) viene de globals.css.
// Este componente aplica el radio y tamaño tipográfico del sistema.
// ============================================================

import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="card-label block"
          style={{ color: 'var(--ink-cool-faint)' }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-[14px] px-3.5 py-3 text-[14px] ${className}`}
        {...props}
      />
    </div>
  )
}
