'use client'
// ============================================================
// CONFIGURACIÓN CLIENT — página de ajustes
//
// Persistencia: Supabase settings (key-value), reutiliza upsertSettingValue
// Secciones vigentes: Agenda · WhatsApp · Consultorios
// ============================================================

import { useState, useCallback } from 'react'
import {
  Building2, Calendar, MessageCircle, MapPin, Plus, Trash2,
  Check, AlertCircle, ChevronDown, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  CONSULTORIO_ICON_OPTIONS,
  type ConsultorioIconKey,
  resolveConsultorioDisplayConfig,
} from '@/lib/consultorios'
import { mapConsultorioRow } from '@/lib/supabase/mappers'
import { upsertSettingValue, type SettingsKey, type SettingsMap } from '@/lib/settings'
import type { Consultorio, ConsultorioPrimaryType } from '@/types'
import TemplateEditor from './TemplateEditor'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  consultorios: Consultorio[]
  settings: SettingsMap
  userId: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// ── Tabs ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'agenda',        label: 'Agenda',        icon: Calendar },
  { id: 'recordatorios', label: 'WhatsApp',      icon: MessageCircle },
  { id: 'consultorios',  label: 'Consultorios',  icon: MapPin },
] as const

type TabId = (typeof TABS)[number]['id']

// ── Shared helpers ─────────────────────────────────────────────────────────

/** Guarda múltiples pares key/value en Supabase */
async function saveSettings(
  userId: string,
  pairs: Array<[SettingsKey, string]>
): Promise<void> {
  const supabase = createClient()
  await Promise.all(
    pairs.map(([key, value]) => upsertSettingValue(supabase, userId, key, value))
  )
}

/** Hook para manejar el estado de guardado de una sección */
function useSave(userId: string) {
  const [state, setState] = useState<SaveState>('idle')

  const save = useCallback(async (pairs: Array<[SettingsKey, string]>) => {
    setState('saving')
    try {
      await saveSettings(userId, pairs)
      setState('saved')
      setTimeout(() => setState('idle'), 2500)
    } catch {
      setState('error')
    }
  }, [userId])

  return { state, save }
}

// ── Shared UI ──────────────────────────────────────────────────────────────

function SaveButton({ state, onClick }: { state: SaveState; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: '1px solid var(--border-glass-muted)' }}>
      {state === 'saved' && (
        <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--state-success-text)' }}>
          <Check size={14} />
          Guardado
        </span>
      )}
      {state === 'error' && (
        <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--state-cancel-text)' }}>
          <AlertCircle size={14} />
          Error al guardar
        </span>
      )}
      {(state === 'idle' || state === 'saving') && <span />}

      <button
        onClick={onClick}
        disabled={state === 'saving'}
        className="btn-action px-4 py-2 text-[11px] tracking-[0.06em] uppercase flex items-center gap-2"
      >
        {state === 'saving' && <Loader2 size={12} className="animate-spin" />}
        {state === 'saving' ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3.5 border-b last:border-b-0"
      style={{ borderColor: 'var(--border-glass-muted)' }}
    >
      <div className="flex-1 min-w-0">
        <span className="text-[14px] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
          {label}
        </span>
        {description && (
          <p className="text-[13px] mt-0.5 leading-snug" style={{ color: 'var(--ink-cool-faint)' }}>
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  )
}

function SettingsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-cool rounded-[18px] p-4 ${className}`}>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-[22px] w-9 flex-shrink-0 rounded-full cursor-pointer transition-all"
      style={{
        background: checked
          ? 'linear-gradient(145deg, var(--accent-lilac) 0%, var(--accent-mauve) 100%)'
          : 'rgba(185,174,189,0.28)',
        border: '1px solid var(--border-glass-muted)',
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(14px)' : 'translateX(0)' }}
      />
    </button>
  )
}

function LumiSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none rounded-[12px] pl-3 pr-8 py-2 text-[13px] focus:outline-none cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.72)',
          border: '1px solid var(--border-glass-white)',
          color: 'var(--ink-cool-strong)',
          boxShadow: '0 4px 12px rgba(124,108,128,0.08)',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown
        size={12}
        strokeWidth={2}
        className="absolute right-2 pointer-events-none"
        style={{ color: 'var(--ink-cool-faint)' }}
      />
    </div>
  )
}

const inactiveToggle = {
  background: 'rgba(255,255,255,0.42)',
  color: 'var(--ink-cool-strong)',
  border: '1px solid transparent',
}

// ── AGENDA ─────────────────────────────────────────────────────────────────

function AgendaSection({ settings, userId }: Pick<Props, 'settings' | 'userId'>) {
  const { state, save } = useSave(userId)

  const [duracion,    setDuracion]    = useState(settings['agenda_duracion_cita']    ?? '60')
  const [vista,       setVista]       = useState(settings['agenda_vista_default']    ?? 'week')
  const [intervalo,   setIntervalo]   = useState(settings['agenda_intervalo']        ?? '30')
  const [horaInicio,  setHoraInicio]  = useState(settings['agenda_hora_inicio']      ?? '07:00')
  const [horaFin,     setHoraFin]     = useState(settings['agenda_hora_fin']         ?? '21:00')
  const [festivos,    setFestivos]    = useState(settings['agenda_mostrar_festivos'] !== 'false')

  // Días laborales: guardados como JSON array ["lun","mar",...]
  const parseDias = (raw: string): Record<string, boolean> => {
    try {
      const arr: string[] = JSON.parse(raw)
      return { lun: false, mar: false, mie: false, jue: false, vie: false, sab: false, dom: false,
        ...Object.fromEntries(arr.map(d => [d, true])) }
    } catch {
      return { lun: true, mar: true, mie: true, jue: true, vie: true, sab: false, dom: false }
    }
  }
  const [dias, setDias] = useState(() => parseDias(settings['agenda_dias_laborales'] ?? '["lun","mar","mie","jue","vie"]'))

  const DIA_LABELS = [
    { k: 'lun', l: 'L' }, { k: 'mar', l: 'M' }, { k: 'mie', l: 'X' },
    { k: 'jue', l: 'J' }, { k: 'vie', l: 'V' }, { k: 'sab', l: 'S' }, { k: 'dom', l: 'D' },
  ] as const

  function handleSave() {
    const diasArr = Object.entries(dias).filter(([, v]) => v).map(([k]) => k)
    save([
      ['agenda_duracion_cita',    duracion],
      ['agenda_vista_default',    vista],
      ['agenda_intervalo',        intervalo],
      ['agenda_hora_inicio',      horaInicio],
      ['agenda_hora_fin',         horaFin],
      ['agenda_mostrar_festivos', festivos ? 'true' : 'false'],
      ['agenda_dias_laborales',   JSON.stringify(diasArr)],
    ])
  }

  return (
    <div className="space-y-3">
      <SettingsCard>
        <p className="section-kicker mb-0.5">Citas</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Comportamiento por defecto al crear una cita nueva.
        </p>

        <SettingRow label="Duración por defecto" description="Tiempo estándar de cada cita nueva">
          <LumiSelect
            value={duracion}
            onChange={setDuracion}
            options={[
              { value: '15',  label: '15 min' },
              { value: '30',  label: '30 min' },
              { value: '45',  label: '45 min' },
              { value: '60',  label: '1 hora' },
              { value: '90',  label: '1:30 h' },
              { value: '120', label: '2 horas' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Vista al abrir agenda" description="Perspectiva inicial cada vez que entras">
          <LumiSelect
            value={vista}
            onChange={setVista}
            options={[
              { value: 'day',   label: 'Día' },
              { value: 'week',  label: 'Semana' },
              { value: 'month', label: 'Mes' },
            ]}
          />
        </SettingRow>

        <SettingRow label="Intervalo de grilla" description="Granularidad de la cuadrícula horaria">
          <LumiSelect
            value={intervalo}
            onChange={setIntervalo}
            options={[
              { value: '15', label: '15 min' },
              { value: '30', label: '30 min' },
              { value: '60', label: '1 hora' },
            ]}
          />
        </SettingRow>

        <SaveButton state={state} onClick={handleSave} />
      </SettingsCard>

      <SettingsCard>
        <p className="section-kicker mb-0.5">Horario laboral</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Rango de horas y días que aparecen en tu agenda.
        </p>

        <SettingRow label="Días de atención">
          <div className="flex gap-1">
            {DIA_LABELS.map(({ k, l }) => (
              <button
                key={k}
                onClick={() => setDias(prev => ({ ...prev, [k]: !prev[k] }))}
                className="w-8 h-8 rounded-[8px] text-[12px] font-medium transition-all"
                style={{
                  background: dias[k]
                    ? 'linear-gradient(145deg, var(--accent-lilac) 0%, var(--accent-mauve) 100%)'
                    : 'rgba(185,174,189,0.16)',
                  color: dias[k] ? 'var(--ink-cool-strong)' : 'var(--ink-cool-muted)',
                  border: '1px solid var(--border-glass-muted)',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Hora de inicio" description="Primera hora visible en la agenda">
          <input
            type="time"
            value={horaInicio}
            onChange={e => setHoraInicio(e.target.value)}
            className="rounded-[12px] px-3 py-2 text-[13px] focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid var(--border-glass-white)',
              color: 'var(--ink-cool-strong)',
            }}
          />
        </SettingRow>

        <SettingRow label="Hora de cierre" description="Última hora visible en la agenda">
          <input
            type="time"
            value={horaFin}
            onChange={e => setHoraFin(e.target.value)}
            className="rounded-[12px] px-3 py-2 text-[13px] focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid var(--border-glass-white)',
              color: 'var(--ink-cool-strong)',
            }}
          />
        </SettingRow>

        <SettingRow label="Mostrar festivos" description="Resaltar días festivos colombianos en la vista">
          <Toggle checked={festivos} onChange={setFestivos} />
        </SettingRow>

        <SaveButton state={state} onClick={handleSave} />
      </SettingsCard>
    </div>
  )
}

// ── RECORDATORIOS ──────────────────────────────────────────────────────────

function RecordatoriosSection({ settings, userId }: Pick<Props, 'settings' | 'userId'>) {
  return (
    <div className="space-y-3">
      <SettingsCard>
        <p className="section-kicker mb-0.5">Plantillas de mensajes</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Personaliza el texto de cada tipo de mensaje. Usa{' '}
          <code className="text-[11px] rounded px-1 py-0.5" style={{ background: 'var(--state-cancel-bg)', color: 'var(--accent-wine)' }}>
            {'{variables}'}
          </code>{' '}
          para insertar datos dinámicos.
        </p>
        <TemplateEditor settings={settings} userId={userId} />
      </SettingsCard>
    </div>
  )
}

// ── CONSULTORIOS ───────────────────────────────────────────────────────────

type ConsultorioFormValue = {
  nombre: string
  color: string
  icono: ConsultorioIconKey
  dato_principal_tipo: ConsultorioPrimaryType | ''
  dato_principal: string
}

function toConsultorioFormValue(consultorio?: Consultorio | null): ConsultorioFormValue {
  return {
    nombre: consultorio?.nombre ?? '',
    color: consultorio?.color ?? '#9488B0',
    icono: (consultorio?.icono as ConsultorioIconKey | undefined) ?? 'map-pin',
    dato_principal_tipo: consultorio?.dato_principal_tipo ?? '',
    dato_principal: consultorio?.dato_principal ?? '',
  }
}

function buildPrimaryFieldCopy(tipo: ConsultorioPrimaryType | '') {
  if (!tipo) {
    return {
      label: 'Detalle opcional',
      placeholder: 'Selecciona primero el tipo de dato principal.',
      inputType: 'text' as const,
    }
  }
  if (tipo === 'direccion') {
    return {
      label: 'Dirección',
      placeholder: 'Ej. Calle 10 # 43D-28, El Poblado',
      inputType: 'text' as const,
    }
  }
  if (tipo === 'enlace') {
    return {
      label: 'Enlace',
      placeholder: 'https://meet.google.com/tu-sala',
      inputType: 'url' as const,
    }
  }
  return {
    label: 'Nota corta',
    placeholder: 'Ej. Llevar ropa cómoda o llegar 10 min antes.',
    inputType: 'text' as const,
  }
}

function ConsultorioCard({
  consultorio,
  userId,
  onCancelNew,
  onDeleted,
  onSaved,
}: {
  consultorio?: Consultorio
  userId: string
  onCancelNew?: () => void
  onDeleted: (consultorioId: string) => void
  onSaved: (consultorio: Consultorio) => void
}) {
  const supabase = createClient()
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState<ConsultorioFormValue>(() => toConsultorioFormValue(consultorio))

  const preview = resolveConsultorioDisplayConfig({
    id: consultorio?.id ?? 'preview',
    nombre: form.nombre.trim() || 'Consultorio',
    color: form.color,
    icono: form.icono,
    dato_principal_tipo: form.dato_principal_tipo || null,
    dato_principal: form.dato_principal,
  })
  const primaryFieldCopy = buildPrimaryFieldCopy(form.dato_principal_tipo)

  function updateForm<K extends keyof ConsultorioFormValue>(key: K, value: ConsultorioFormValue[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    if (!form.nombre.trim()) {
      setError('Escribe un nombre para el consultorio.')
      return
    }

    setState('saving')
    setError(null)

    const payload = {
      user_id: userId,
      nombre: form.nombre.trim(),
      color: form.color,
      icono: form.icono,
      dato_principal_tipo: form.dato_principal_tipo || null,
      dato_principal: form.dato_principal_tipo ? form.dato_principal.trim() || null : null,
    }

    try {
      const response = consultorio
        ? await supabase
            .from('consultorios')
            .update(payload)
            .eq('id', consultorio.id)
            .select('*')
            .single()
        : await supabase
            .from('consultorios')
            .insert(payload)
            .select('*')
            .single()

      if (response.error || !response.data) {
        throw response.error ?? new Error('No se pudo guardar el consultorio.')
      }

      onSaved(mapConsultorioRow(response.data))
      setState('saved')
      setTimeout(() => setState('idle'), 2500)
    } catch {
      setState('error')
      setError('No se pudo guardar. Intenta de nuevo.')
    }
  }

  async function handleDelete() {
    if (!consultorio) {
      onCancelNew?.()
      return
    }

    setState('saving')
    setError(null)

    const { count, error: usageError } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('consultorio_id', consultorio.id)

    if (usageError) {
      setState('error')
      setError('No se pudo validar el uso del consultorio.')
      return
    }

    if ((count ?? 0) > 0) {
      setState('error')
      setConfirmDelete(false)
      setError('No puedes eliminar este consultorio porque ya está siendo usado por citas existentes.')
      return
    }

    const { error: deleteError } = await supabase
      .from('consultorios')
      .delete()
      .eq('id', consultorio.id)

    if (deleteError) {
      setState('error')
      setError('No se pudo eliminar. Intenta de nuevo.')
      return
    }

    onDeleted(consultorio.id)
  }

  return (
    <SettingsCard>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0"
          style={{ background: `${preview.color}22`, border: `1px solid ${preview.color}44` }}
        >
          <preview.Icon size={18} style={{ color: preview.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={form.nombre}
            onChange={(event) => updateForm('nombre', event.target.value)}
            className="text-[14px] font-medium bg-transparent border-b w-full focus:outline-none pb-0.5"
            style={{
              color: 'var(--ink-cool-strong)',
              borderColor: 'var(--border-glass-muted)',
            }}
            placeholder="Nombre del consultorio"
          />
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-cool-muted)' }}>
            Nombre visible en agenda y citas
          </p>
        </div>

        <label className="relative cursor-pointer flex items-center gap-2 flex-shrink-0">
          <span className="text-[12px]" style={{ color: 'var(--ink-cool-faint)' }}>Color</span>
          <div
            className="w-7 h-7 rounded-full border-2"
            style={{ background: form.color, borderColor: 'var(--border-glass-muted)' }}
          />
          <input
            type="color"
            value={form.color}
            onChange={(event) => updateForm('color', event.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div>
          <p className="section-kicker mb-1.5">Ícono</p>
          <div className="flex flex-wrap gap-1.5">
            {CONSULTORIO_ICON_OPTIONS.map((option) => {
              const isActive = form.icono === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateForm('icono', option.value)}
                  aria-label={option.label}
                  title={option.label}
                  className="h-10 w-10 rounded-[12px] transition-all flex items-center justify-center"
                  style={isActive ? {
                    background: `${preview.color}22`,
                    color: preview.textColor,
                    border: `1px solid ${preview.color}44`,
                  } : inactiveToggle}
                >
                  <option.Icon size={16} style={{ color: isActive ? preview.color : undefined }} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-2">
          <div>
            <p className="section-kicker mb-1.5">Dato principal</p>
            <LumiSelect
              value={form.dato_principal_tipo}
              onChange={(value) => updateForm('dato_principal_tipo', value as ConsultorioPrimaryType | '')}
              options={[
                { value: '', label: 'Sin dato extra' },
                { value: 'direccion', label: 'Dirección' },
                { value: 'enlace', label: 'Enlace' },
                { value: 'nota', label: 'Nota corta' },
              ]}
            />
          </div>

          <div>
            <p className="section-kicker mb-1.5">{primaryFieldCopy.label}</p>
            <input
              type={primaryFieldCopy.inputType}
              value={form.dato_principal}
              onChange={(event) => updateForm('dato_principal', event.target.value)}
              placeholder={primaryFieldCopy.placeholder}
              disabled={!form.dato_principal_tipo}
              className="w-full rounded-[12px] px-3.5 py-2.5 text-[14px] focus:outline-none disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.72)',
                border: '1px solid var(--border-glass-white)',
                color: 'var(--ink-cool-strong)',
              }}
            />
          </div>
        </div>

        {preview.primaryValue && (
          <p className="text-[12px] leading-snug" style={{ color: 'var(--ink-cool-faint)' }}>
            {preview.primaryValue}
          </p>
        )}
      </div>

      {error && (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--state-cancel-text)' }}>
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: '1px solid var(--border-glass-muted)' }}>
        <div className="flex items-center gap-2">
          {consultorio ? (
            confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btn-subtle px-3 py-2 text-[12px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={state === 'saving'}
                  className="btn-subtle px-3 py-2 text-[12px] flex items-center gap-1.5"
                  style={{ color: 'var(--state-cancel-text)' }}
                >
                  <Trash2 size={12} />
                  Confirmar borrado
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-subtle px-3 py-2 text-[12px] flex items-center gap-1.5"
              >
                <Trash2 size={12} />
                Eliminar
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={onCancelNew}
              className="btn-subtle px-3 py-2 text-[12px]"
            >
              Cancelar
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {state === 'saved' && (
            <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--state-success-text)' }}>
              <Check size={14} />
              Guardado
            </span>
          )}
          {state === 'error' && !error && (
            <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--state-cancel-text)' }}>
              <AlertCircle size={14} />
              Error
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={state === 'saving'}
            className="btn-action px-4 py-2 text-[11px] tracking-[0.06em] uppercase flex items-center gap-2"
          >
            {state === 'saving' && <Loader2 size={12} className="animate-spin" />}
            {state === 'saving' ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </SettingsCard>
  )
}

function ConsultoriosSection({ consultorios, userId }: Pick<Props, 'consultorios' | 'userId'>) {
  const [items, setItems] = useState(consultorios)
  const [showNewCard, setShowNewCard] = useState(false)

  function handleSaved(saved: Consultorio) {
    setItems((current) => {
      const exists = current.some((item) => item.id === saved.id)
      if (exists) {
        return current.map((item) => item.id === saved.id ? saved : item)
      }
      return [...current, saved]
    })
    setShowNewCard(false)
  }

  function handleDeleted(consultorioId: string) {
    setItems((current) => current.filter((item) => item.id !== consultorioId))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px]" style={{ color: 'var(--ink-cool-faint)' }}>
            Crea y edita los consultorios reales que quieres usar en agenda y citas.
          </p>
        </div>
        {!showNewCard && (
          <button
            type="button"
            onClick={() => setShowNewCard(true)}
            className="btn-action px-3 py-2 text-[12px] flex items-center gap-1.5 shrink-0"
          >
            <Plus size={12} />
            Agregar consultorio
          </button>
        )}
      </div>

      {showNewCard && (
        <ConsultorioCard
          userId={userId}
          onCancelNew={() => setShowNewCard(false)}
          onDeleted={() => undefined}
          onSaved={handleSaved}
        />
      )}

      {items.length === 0 && !showNewCard ? (
        <SettingsCard>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center"
              style={{ background: 'rgba(148,136,176,0.14)', border: '1px solid var(--border-glass-white)' }}
            >
              <Building2 size={18} style={{ color: 'var(--ink-cool-soft)' }} />
            </div>
            <div>
              <p className="text-[14px] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
                Aún no tienes consultorios
              </p>
              <p className="text-[13px]" style={{ color: 'var(--ink-cool-faint)' }}>
                Crea el primero para usarlo al crear o editar citas.
              </p>
            </div>
          </div>
        </SettingsCard>
      ) : (
        items.map((consultorio) => (
          <ConsultorioCard
            key={consultorio.id}
            consultorio={consultorio}
            userId={userId}
            onDeleted={handleDeleted}
            onSaved={handleSaved}
          />
        ))
      )}
    </div>
  )
}

// ── MAIN ───────────────────────────────────────────────────────────────────

export default function ConfiguracionClient({ settings, consultorios, userId }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('agenda')

  const section = (() => {
    switch (activeTab) {
      case 'agenda':        return <AgendaSection        settings={settings} userId={userId} />
      case 'recordatorios': return <RecordatoriosSection settings={settings} userId={userId} />
      case 'consultorios':  return <ConsultoriosSection consultorios={consultorios} userId={userId} />
    }
  })()

  return (
    <>
      {/* ── Tab navigation ── */}
      <div className="mb-5">
        <div
          className="flex gap-0.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background: isActive
                    ? 'linear-gradient(145deg, rgba(200,188,205,0.32) 0%, rgba(185,174,189,0.22) 100%)'
                    : 'transparent',
                  color:      isActive ? 'var(--ink-cool-strong)' : 'var(--ink-cool-muted)',
                  fontWeight: isActive ? 500 : 400,
                  border:     isActive ? '1px solid var(--border-glass-muted)' : '1px solid transparent',
                }}
              >
                <Icon size={14} strokeWidth={isActive ? 2.2 : 1.6} />
                <span className="text-[13px]">{label}</span>
              </button>
            )
          })}
        </div>
        <div className="h-px mt-1" style={{ background: 'var(--border-glass-muted)' }} />
      </div>

      {section}
    </>
  )
}
