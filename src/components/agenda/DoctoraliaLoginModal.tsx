'use client'

import { useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import type { DoctoraliaConnectionSummary } from '@/lib/doctoralia/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ModalShell from '@/components/ui/ModalShell'
import SectionHeader from '@/components/ui/SectionHeader'

interface DoctoraliaLoginModalProps {
  mode: 'connect' | 'reconnect'
  onClose: () => void
  onResolved: (connection: DoctoraliaConnectionSummary, shouldClose: boolean) => void
}

const MODAL_COPY = {
  connect: {
    title: 'Conectar Doctoralia',
    description: 'Inicia sesión con tu cuenta de Doctoralia para habilitar la sincronización de agenda.',
    action: 'Conectar',
  },
  reconnect: {
    title: 'Reconectar Doctoralia',
    description: 'La sesión anterior venció o falló. Vuelve a iniciar sesión para retomar la sincronización.',
    action: 'Reconectar',
  },
} as const

export default function DoctoraliaLoginModal({
  mode,
  onClose,
  onResolved,
}: DoctoraliaLoginModalProps) {
  const copy = MODAL_COPY[mode]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Ingresa tu email y contraseña de Doctoralia.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/integrations/doctoralia/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const payload = await response.json().catch(() => null) as {
        error?: string
        connection?: DoctoraliaConnectionSummary
      } | null

      if (!response.ok || !payload?.connection) {
        if (payload?.connection) {
          onResolved(payload.connection, false)
        }
        throw new Error(payload?.error ?? 'No se pudo iniciar sesión en Doctoralia.')
      }

      onResolved(payload.connection, true)
      onClose()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo iniciar sesión en Doctoralia.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' && !submitting) {
      void handleSubmit()
    }
  }

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <div>
        <div className="flex items-start justify-between p-4">
          <div>
            <SectionHeader label="Doctoralia" className="mb-1" />
            <h2 className="editorial-panel-title text-[1.05rem]">{copy.title}</h2>
          </div>
          <Button variant="subtle" onClick={onClose} className="p-2">
            <X size={16} />
          </Button>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-cool-soft)' }}>
            {copy.description}
          </p>

          <div className="space-y-2.5" onKeyDown={handleKeyDown}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={submitting}
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-2 rounded-[14px] px-3 py-2.5"
              style={{
                background: 'var(--state-cancel-bg)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <AlertCircle
                size={14}
                className="mt-0.5 shrink-0"
                style={{ color: 'var(--state-cancel-text)' }}
              />
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--state-cancel-text)' }}>
                {error}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="subtle"
              onClick={onClose}
              className="px-4 py-2 text-[11px] tracking-[0.06em] uppercase"
            >
              Cancelar
            </Button>
            <Button
              variant="action"
              onClick={handleSubmit}
              disabled={submitting || !email.trim() || !password}
              className="px-4 py-2 text-[11px] tracking-[0.06em] uppercase"
            >
              {submitting ? 'Conectando…' : copy.action}
            </Button>
          </div>
        </div>
      </div>
    </ModalShell>
  )
}
