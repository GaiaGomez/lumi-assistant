'use client'
// ============================================================
// TEMPLATE EDITOR — editor de plantillas de WhatsApp
// Guarda en la tabla `settings` de Supabase (upsert por clave)
// ============================================================

import { useState } from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, AlertCircle } from 'lucide-react'
import { interpolate, type SettingsMap } from '@/lib/settings'

interface Props {
  settings: SettingsMap
  userId: string
}

interface TemplateConfig {
  key: string
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

  async function saveField(key: string, value: string) {
    setSaveStates(prev => ({ ...prev, [key]: 'saving' }))
    try {
      const { error } = await supabase
        .from('settings')
        .upsert(
          { user_id: userId, key, value, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' }
        )
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
      <FieldCard>
        <div>
          <h2 className="editorial-panel-title text-[1.05rem] mb-0.5" style={{ color: '#3F3941' }}>
            Link de agenda
          </h2>
          <p className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>
            Se usa como <VarChip name="booking_url" /> en las plantillas.
          </p>
        </div>

        <input
          type="url"
          value={doctoraliaUrl}
          onChange={e => setDoctoraliaUrl(e.target.value)}
          placeholder="https://www.doctoralia.co/tu-perfil"
          className="w-full rounded-[12px] px-3 py-2.5 text-[13px]"
        />

        <FieldActions
          state={saveStates['doctoralia_url'] ?? 'idle'}
          onSave={() => saveField('doctoralia_url', doctoraliaUrl)}
        />
      </FieldCard>

      {/* ── Plantillas ── */}
      {TEMPLATES.map((tpl) => {
        const currentValue = values[tpl.key] ?? ''
        // Para la vista previa, {booking_url} usa el valor real del campo de arriba
        const previewVars: Record<string, string> = {
          ...tpl.previewVars,
          booking_url: doctoraliaUrl || tpl.previewVars['booking_url'] || 'tu-enlace',
        }

        return (
          <FieldCard key={tpl.key}>
            <div>
              <h2 className="editorial-panel-title text-[1.05rem] mb-0.5" style={{ color: '#3F3941' }}>
                {tpl.label}
              </h2>
              <p className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>
                {tpl.description}
              </p>
            </div>

            {/* Variables disponibles */}
            <div className="flex flex-wrap gap-1.5">
              {tpl.variables.map(v => (
                <VarChip key={v.name} name={v.name} hint={v.hint} />
              ))}
            </div>

            <textarea
              value={currentValue}
              onChange={e => setValues(prev => ({ ...prev, [tpl.key]: e.target.value }))}
              rows={4}
              className="w-full rounded-[12px] px-3 py-2.5 text-[13px] leading-relaxed resize-none"
            />

            {/* Vista previa en vivo */}
            {currentValue.trim() && (
              <div
                className="rounded-[10px] px-3 py-2.5"
                style={{
                  background: 'rgba(185,143,149,0.07)',
                  border: '1px solid rgba(185,143,149,0.14)',
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--ink-faint)' }}>
                  Vista previa
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                  {interpolate(currentValue, previewVars)}
                </p>
              </div>
            )}

            <FieldActions
              state={saveStates[tpl.key] ?? 'idle'}
              onSave={() => saveField(tpl.key, currentValue)}
            />
          </FieldCard>
        )
      })}
    </div>
  )
}

// ── Sub-componentes ─────────────────────────────────────────────────────────

function FieldCard({ children }: { children: ReactNode }) {
  return (
    <section
      className="rounded-[18px] p-4 space-y-3"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.56) 0%, rgba(255,255,255,0.42) 100%)',
        border: '1px solid rgba(255,255,255,0.42)',
        boxShadow: '0 10px 40px rgba(124,108,128,0.10)',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
    >
      {children}
    </section>
  )
}

function VarChip({ name, hint }: { name: string; hint?: string }) {
  return (
    <span
      className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-mono font-medium cursor-default"
      style={{
        background: 'rgba(185,143,149,0.12)',
        color: 'var(--accent-wine)',
        border: '1px solid rgba(185,143,149,0.22)',
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
        <button
          onClick={onSave}
          disabled={state === 'saving'}
          className="btn-primary px-4 py-2 text-[12px] font-medium tracking-[0.04em] disabled:opacity-50"
        >
          {state === 'saving' ? 'Guardando…' : 'Guardar'}
        </button>
      )}
    </div>
  )
}
