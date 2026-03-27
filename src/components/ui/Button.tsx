// ============================================================
// BUTTON — variantes del sistema de acciones de Lumi
//
// Variantes:
//   action  → CTA principal zona cool (lavanda, referencia "Enviar WhatsApp")
//   subtle  → acción secundaria (cristal neutro)
//   ghost   → terciaria / sin superficie
//
// Para <a> o <Link> externos, usa directamente las clases CSS:
//   className="btn-action ..."  /  className="btn-subtle ..."
// ============================================================

import type { ButtonHTMLAttributes, ReactNode } from 'react'

const variantClass = {
  action: 'btn-action',
  subtle: 'btn-subtle',
  ghost:  'btn-ghost',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClass
  children: ReactNode
}

export default function Button({
  variant = 'action',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${variantClass[variant]} disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
