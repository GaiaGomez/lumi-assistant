'use client'
// ============================================================
// TEMPLATE EDITOR — editor de plantillas de WhatsApp
// Guarda en la tabla `settings` de Supabase (upsert por clave)
// ============================================================

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, AlertCircle } from 'lucide-react'
import { interpolate, type SettingsKey, type SettingsMap, upsertSettingValue } from '@/lib/settings'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import SectionHeader from '@/components/ui/SectionHeader'

interface Props {
  settings: SettingsMap
  userId: string
}

interface TemplateConfig {
  key: Exclude<SettingsKey, 'booking_url'>
  label: string
  description: string
  variables: { name: string; hint: string }[]
  previewVars: Record<string, string>
}

const TEMPLATES: TemplateConfig[] = [
  {
    key: 'template_cobros',
    label: 'Sin cobrar',
    description: 'Para citas realizadas sin cobrar.',
    variables: [
      { name: 'first_name', hint: 'Nombre del paciente' },
      { name: 'session_date', hint: 'Fecha y hora de la cita (ej: Lunes 24/03/26 · 10:00 a. m.)' },
    ],
    previewVars: { first_name: 'Valentina', session_date: 'Lunes 24/03/26 · 10:00 a. m.' },
  },
  {
    key: 'template_sin_proxima',
    label: 'Sin próxima cita',
    description: 'Para pacientes sin una nueva cita agendada.',
    variables: [
      { name: 'first_name', hint: 'Nombre del paciente' },
      { name: 'booking_url', hint: 'URL de tu agenda (se toma del campo "Link de agenda" de arriba)' },
    ],
    previewVars: { first_name: 'Valentina', booking_url: 'tu-enlace-de-agenda' },
  },
  {
    key: 'template_retomar',
    label: 'Reactivar',
    description: 'Para pacientes con más de 20 días sin agendar.',
    variables: [
      { name: 'first_name', hint: 'Nombre del paciente' },
      { name: 'days_inactive', hint: 'Días desde la última cita (ej: 28)' },
    ],
    previewVars: { first_name: 'Valentina', days_inactive: '28' },
  },
]

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function TemplateEditor({ settings, userId }: Props) {
  const supabase = createClient()

  const [bookingUrl, setBookingUrl] = useState(settings['booking_url'] ?? '')
  const [values, setValues] = useState<Record<string, string>>({
    template_cobros:      settings['template_cobros'] ?? '',
    template_sin_proxima: settings['template_sin_proxima'] ?? '',
    template_retomar:     settings['template_retomar'] ?? '',
  })
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})

  async function saveField(key: SettingsKey, value: string) {
    setSaveStates(prev => ({ ...prev, [key]: 'saving' }))
    try {
      const { error } = await upsertSettingValue(supabase, userId, key, value)
      if (error) throw error
      setSaveStates(prev => ({ ...prev, [key]: 'saved' }))
      setTimeout(() => setSaveStates(prev => ({ ...prev, [key]: 'idle' })), 2500)
    } catch {
      setSaveStates(prev => ({ ...prev, [key]: 'error' }))
    }
  }

  return (
    <div className="space-y-2.5">

      {/* ── URL de agenda ── */}
      <Card className="space-y-2.5 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="editorial-panel-title mb-0.5 text-[1.05rem]">
              Link de agenda
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--ink-cool-soft)' }}>
              Se usa como <VarChip name="booking_url" /> en las plantillas.
            </p>
          </div>
          <FieldStatus state={saveStates['booking_url'] ?? 'idle'} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:flex-1">
            <Input
              type="url"
              value={bookingUrl}
              onChange={e => setBookingUrl(e.target.value)}
              placeholder="https://tuagenda.com/tu-perfil"
              className="py-2.5"
            />
          </div>

          <FieldActions
            state={saveStates['booking_url'] ?? 'idle'}
            onSave={() => saveField('booking_url', bookingUrl)}
            className="sm:shrink-0"
          />
        </div>
      </Card>

      {/* ── Plantillas ── */}
      {TEMPLATES.map((tpl) => {
        const currentValue = values[tpl.key] ?? ''
        const previewVars: Record<string, string> = {
          ...tpl.previewVars,
          booking_url: bookingUrl || tpl.previewVars['booking_url'] || 'tu-enlace',
        }

        return (
          <Card key={tpl.key} className="space-y-2.5 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="editorial-panel-title mb-0.5 text-[1.05rem]">
                  {tpl.label}
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--ink-cool-soft)' }}>
                  {tpl.description}
                </p>
              </div>
              <FieldStatus state={saveStates[tpl.key] ?? 'idle'} />
            </div>

            <div className="flex flex-wrap gap-1">
              {tpl.variables.map(v => (
                <VarChip key={v.name} name={v.name} hint={v.hint} />
              ))}
            </div>

            <Textarea
              value={currentValue}
              onChange={e => setValues(prev => ({ ...prev, [tpl.key]: e.target.value }))}
              rows={3}
              className="py-2.5 leading-[1.45]"
            />

            {currentValue.trim() && (
              <div
                className="rounded-[12px] px-3 py-2.5"
                style={{
                  background: 'var(--state-cancel-bg)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                <SectionHeader label="Vista previa" className="mb-1" />
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ink-cool-soft)' }}>
                  {interpolate(currentValue, previewVars)}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <FieldActions
                state={saveStates[tpl.key] ?? 'idle'}
                onSave={() => saveField(tpl.key, currentValue)}
              />
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Sub-componentes ─────────────────────────────────────────────────────────

function VarChip({ name, hint }: { name: string; hint?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-medium cursor-default"
      style={{
        background: 'var(--state-cancel-bg)',
        color: 'var(--accent-wine)',
        border: '1px solid var(--border-medium)',
      }}
      title={hint}
    >
      {`{${name}}`}
    </span>
  )
}

function FieldStatus({ state }: { state: SaveState }) {
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--state-success-text)' }}>
        <Check size={12} />
        Guardado
      </span>
    )
  }

  if (state === 'error') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--state-cancel-text)' }}>
        <AlertCircle size={12} />
        No se pudo guardar
      </span>
    )
  }

  return null
}

function FieldActions({
  state,
  onSave,
  className = '',
}: {
  state: SaveState
  onSave: () => void
  className?: string
}) {
  return (
    <div className={`flex items-center justify-end ${className}`.trim()}>
      {(state === 'idle' || state === 'saving' || state === 'error') && (
        <Button
          variant="action"
          onClick={onSave}
          disabled={state === 'saving'}
          className="px-4 py-2 text-[11px] tracking-[0.06em] uppercase"
        >
          {state === 'saving' ? 'Guardando…' : 'Guardar'}
        </Button>
      )}
    </div>
  )
}
