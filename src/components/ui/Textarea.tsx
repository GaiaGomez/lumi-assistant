// ============================================================
// TEXTAREA — campo de texto largo del sistema Lumi
//
// Props:
//   label    → etiqueta visible encima del campo (opcional)
//   + todos los atributos HTML estándar de <textarea>
//
// Mismo lenguaje visual que Input: radio, tipografía, interline.
// ============================================================

import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export default function Textarea({ label, className = '', id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="card-label block"
          style={{ color: 'var(--ink-cool-faint)' }}
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full rounded-[14px] px-3.5 py-3 text-[13px] leading-relaxed resize-none ${className}`}
        {...props}
      />
    </div>
  )
}
