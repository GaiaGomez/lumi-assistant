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
  key: Exclude<SettingsKey, 'doctoralia_url'>
  label: string
  description: string
  variables: { name: string; hint: string }[]
  previewVars: Record<string, string>
}

const TEMPLATES: TemplateConfig[] = [
  {
    key: 'template_cobros',
    label: 'Cobro pendiente',
    description: 'Se envía a pacientes que asistieron a una sesión pero no han pagado.',
    variables: [
      { name: 'first_name', hint: 'Nombre del paciente' },
      { name: 'session_date', hint: 'Fecha y hora de la sesión (ej: Lunes 24/03/26 · 10:00 a. m.)' },
    ],
    previewVars: { first_name: 'Valentina', session_date: 'Lunes 24/03/26 · 10:00 a. m.' },
  },
  {
    key: 'template_sin_proxima',
    label: 'Sin próxima sesión',
    description: 'Para pacientes que asistieron pero aún no tienen una próxima cita agendada.',
    variables: [
      { name: 'first_name', hint: 'Nombre del paciente' },
      { name: 'booking_url', hint: 'URL de tu agenda (se toma del campo "Link de agenda" de arriba)' },
    ],
    previewVars: { first_name: 'Valentina', booking_url: 'tu-enlace-doctoralia' },
  },
  {
    key: 'template_retomar',
    label: 'Retomar proceso',
    description: 'Para pacientes con más de 20 días sin agendar su próxima cita.',
    variables: [
      { name: 'first_name', hint: 'Nombre del paciente' },
      { name: 'days_inactive', hint: 'Días desde la última sesión (ej: 28)' },
    ],
    previewVars: { first_name: 'Valentina', days_inactive: '28' },
  },
]

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function TemplateEditor({ settings, userId }: Props) {
  const supabase = createClient()

  const [doctoraliaUrl, setDoctoraliaUrl] = useState(settings['doctoralia_url'] ?? '')
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
    <div className="space-y-3">

      {/* ── URL de agenda ── */}
      <Card className="p-4 space-y-3">
        <div>
          <h2 className="editorial-panel-title text-[1.05rem] mb-0.5" style={{ color: 'var(--ink-cool-strong)' }}>
            Link de agenda
          </h2>
          <p className="text-[12px]" style={{ color: 'var(--ink-cool-soft)' }}>
            Se usa como <VarChip name="booking_url" /> en las plantillas.
          </p>
        </div>

        <Input
          type="url"
          value={doctoraliaUrl}
          onChange={e => setDoctoraliaUrl(e.target.value)}
          placeholder="https://www.doctoralia.co/tu-perfil"
        />

        <FieldActions
          state={saveStates['doctoralia_url'] ?? 'idle'}
          onSave={() => saveField('doctoralia_url', doctoraliaUrl)}
        />
      </Card>

      {/* ── Plantillas ── */}
      {TEMPLATES.map((tpl) => {
        const currentValue = values[tpl.key] ?? ''
        const previewVars: Record<string, string> = {
          ...tpl.previewVars,
          booking_url: doctoraliaUrl || tpl.previewVars['booking_url'] || 'tu-enlace',
        }

        return (
          <Card key={tpl.key} className="p-4 space-y-3">
            <div>
              <h2 className="editorial-panel-title text-[1.05rem] mb-0.5" style={{ color: 'var(--ink-cool-strong)' }}>
                {tpl.label}
              </h2>
              <p className="text-[12px]" style={{ color: 'var(--ink-cool-soft)' }}>
                {tpl.description}
              </p>
            </div>

            {/* Variables disponibles */}
            <div className="flex flex-wrap gap-1.5">
              {tpl.variables.map(v => (
                <VarChip key={v.name} name={v.name} hint={v.hint} />
              ))}
            </div>

            <Textarea
              value={currentValue}
              onChange={e => setValues(prev => ({ ...prev, [tpl.key]: e.target.value }))}
              rows={4}
            />

            {/* Vista previa en vivo */}
            {currentValue.trim() && (
              <div
                className="rounded-[12px] px-3.5 py-3"
                style={{
                  background: 'var(--state-cancel-bg)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                <SectionHeader label="Vista previa" className="mb-1.5" />
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-cool-soft)' }}>
                  {interpolate(currentValue, previewVars)}
                </p>
              </div>
            )}

            <FieldActions
              state={saveStates[tpl.key] ?? 'idle'}
              onSave={() => saveField(tpl.key, currentValue)}
            />
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
      className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-mono font-medium cursor-default"
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

function FieldActions({ state, onSave }: { state: SaveState; onSave: () => void }) {
  return (
    <div className="flex items-center justify-end pt-0.5">
      {state === 'saved' && (
        <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--state-success-text)' }}>
          <Check size={13} />
          Guardado
        </span>
      )}
      {state === 'error' && (
        <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'var(--state-cancel-text)' }}>
          <AlertCircle size={13} />
          No se pudo guardar
        </span>
      )}
      {(state === 'idle' || state === 'saving') && (
        <Button
          variant="action"
          onClick={onSave}
          disabled={state === 'saving'}
          className="px-5 py-2.5 text-xs tracking-[0.06em] uppercase"
        >
          {state === 'saving' ? 'Guardando…' : 'Guardar'}
        </Button>
      )}
    </div>
  )
}
