'use client'

import { useState } from 'react'
import { AlertCircle, KeyRound, X } from 'lucide-react'
import type { DoctoraliaConnectionSummary } from '@/lib/doctoralia/types'
import Button from '@/components/ui/Button'
import ModalShell from '@/components/ui/ModalShell'
import SectionHeader from '@/components/ui/SectionHeader'
import Textarea from '@/components/ui/Textarea'

interface DoctoraliaConnectModalProps {
  mode: 'connect' | 'reconnect' | 'refresh'
  onClose: () => void
  onResolved: (connection: DoctoraliaConnectionSummary, shouldClose: boolean) => void
}

const MODAL_COPY = {
  connect: {
    title: 'Conectar Doctoralia',
    description: 'Pega una credencial activa del navegador para habilitar la sincronización manual desde Agenda.',
    action: 'Guardar conexión',
  },
  reconnect: {
    title: 'Reconectar Doctoralia',
    description: 'Actualiza la credencial vencida o fallida. Lumi validará la sesión antes de volver a sincronizar.',
    action: 'Reconectar',
  },
  refresh: {
    title: 'Actualizar sesión',
    description: 'Reemplaza la sesión guardada si cambió en tu navegador o si quieres renovarla antes de sincronizar.',
    action: 'Actualizar sesión',
  },
} as const

export default function DoctoraliaConnectModal({
  mode,
  onClose,
  onResolved,
}: DoctoraliaConnectModalProps) {
  const copy = MODAL_COPY[mode]
  const [sessionValue, setSessionValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!sessionValue.trim()) {
      setError('Pega una credencial activa de Doctoralia.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/integrations/doctoralia/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionValue }),
      })

      const payload = await response.json().catch(() => null) as {
        error?: string
        connection?: DoctoraliaConnectionSummary
      } | null

      if (!response.ok || !payload?.connection) {
        if (payload?.connection) {
          onResolved(payload.connection, false)
        }
        throw new Error(payload?.error ?? 'No se pudo guardar la conexión.')
      }

      onResolved(payload.connection, true)
      onClose()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo guardar la conexión.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
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

          <div
            className="rounded-[14px] px-3 py-2.5"
            style={{
              background: 'var(--surface-glass)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <p className="section-kicker mb-1">Qué pegar aquí</p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-cool-soft)' }}>
              Puedes pegar el valor del header <strong>Authorization</strong>, el header <strong>Cookie</strong> o incluso el bloque completo de headers. Lumi detecta el formato y guarda la credencial solo en el backend.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound size={14} style={{ color: 'var(--ink-cool-muted)' }} />
              <span className="section-kicker">Credencial temporal</span>
            </div>
            <Textarea
              value={sessionValue}
              onChange={(event) => setSessionValue(event.target.value)}
              rows={6}
              placeholder="Authorization: Bearer ... o Cookie: ..."
              className="py-3"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
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
              <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--state-cancel-text)' }} />
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--state-cancel-text)' }}>
                {error}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="subtle" onClick={onClose} className="px-4 py-2 text-[11px] tracking-[0.06em] uppercase">
              Cancelar
            </Button>
            <Button
              variant="action"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 text-[11px] tracking-[0.06em] uppercase"
            >
              {submitting ? 'Guardando…' : copy.action}
            </Button>
          </div>
        </div>
      </div>
    </ModalShell>
  )
}
