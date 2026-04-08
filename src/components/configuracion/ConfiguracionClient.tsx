'use client'
// ============================================================
// CONFIGURACIÓN CLIENT — página de ajustes con 6 secciones
//
// Persistencia: Supabase settings (key-value), reutiliza upsertSettingValue
// Secciones funcionales: Agenda · Recordatorios · Consultorios · Pacientes · Seguridad
// Secciones visuales preparadas: Historial
// ============================================================

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Calendar, MessageCircle, MapPin, Plus, Trash2, Users, FileText, Shield,
  Check, AlertCircle, Download, ChevronDown, Eye, EyeOff, Loader2,
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
import DoctoraliaSync from './DoctoraliaSync'

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
  { id: 'pacientes',     label: 'Pacientes',     icon: Users },
  { id: 'historial',     label: 'Historial',     icon: FileText },
  { id: 'seguridad',     label: 'Seguridad',     icon: Shield },
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

      <SettingsCard>
        <p className="section-kicker mb-0.5">Integraciones</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Conecta plataformas externas para importar citas automáticamente.
        </p>
        <DoctoraliaSync settings={settings} userId={userId} />
      </SettingsCard>
    </div>
  )
}

// ── RECORDATORIOS ──────────────────────────────────────────────────────────

function RecordatoriosSection({ settings, userId }: Pick<Props, 'settings' | 'userId'>) {
  const { state, save } = useSave(userId)

  const [firma, setFirma] = useState(settings['recordatorio_firma'] ?? '')

  function handleSave() {
    save([['recordatorio_firma', firma]])
  }

  return (
    <div className="space-y-3">
      <SettingsCard>
        <p className="section-kicker mb-0.5">WhatsApp manual</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Ajusta la firma que se añade a los mensajes manuales de WhatsApp.
        </p>

        <div className="pt-3.5">
          <p className="section-kicker mb-1.5">Firma automática</p>
          <p className="text-[13px] mb-2" style={{ color: 'var(--ink-cool-faint)' }}>
            Se añade al final de los mensajes manuales que Lumi abre con WhatsApp.
            Deja vacío para no usar firma.
          </p>
          <textarea
            value={firma}
            onChange={e => setFirma(e.target.value)}
            rows={2}
            placeholder="Ej: Un saludo, Lu"
            className="w-full rounded-[14px] px-3.5 py-2.5 text-[14px] leading-relaxed resize-none focus:outline-none"
          />
        </div>

        <SaveButton state={state} onClick={handleSave} />
      </SettingsCard>

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
  const router = useRouter()
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
      router.refresh()
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
    router.refresh()
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
                  className="py-2 px-3 rounded-[12px] text-[13px] font-medium transition-all flex items-center gap-1.5"
                  style={isActive ? {
                    background: `${preview.color}22`,
                    color: preview.textColor,
                    border: `1px solid ${preview.color}44`,
                  } : inactiveToggle}
                >
                  <option.Icon size={13} style={{ color: isActive ? preview.color : undefined }} />
                  {option.label}
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

// ── PACIENTES ──────────────────────────────────────────────────────────────

function PacientesSection({ settings, userId }: Pick<Props, 'settings' | 'userId'>) {
  const { state, save } = useSave(userId)

  const [whatsappPrincipal, setWhatsappPrincipal] = useState(settings['pacientes_whatsapp_principal'] !== 'false')
  const [diasInactivo,      setDiasInactivo]      = useState(settings['pacientes_dias_inactivo']  ?? '90')
  const [diasReactivar,     setDiasReactivar]     = useState(settings['pacientes_dias_reactivar'] ?? '60')

  function handleSave() {
    save([
      ['pacientes_whatsapp_principal', whatsappPrincipal ? 'true' : 'false'],
      ['pacientes_dias_inactivo',      diasInactivo],
      ['pacientes_dias_reactivar',     diasReactivar],
    ])
  }

  return (
    <div className="space-y-3">
      <SettingsCard>
        <p className="section-kicker mb-0.5">Interfaz de paciente</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Cómo se presenta la información en el perfil de cada paciente.
        </p>

        <SettingRow
          label="WhatsApp como campo principal"
          description="Muestra el WhatsApp destacado como forma de contacto principal en el perfil"
        >
          <Toggle checked={whatsappPrincipal} onChange={setWhatsappPrincipal} />
        </SettingRow>
      </SettingsCard>

      <SettingsCard>
        <p className="section-kicker mb-0.5">Actividad y seguimiento</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Reglas para detectar pacientes inactivos y activar sugerencias de reactivación.
          Estos umbrales afectan la sección {`"Pendientes"`} directamente.
        </p>

        <SettingRow
          label="Días para marcar como inactivo"
          description="Días sin citas para considerar a un paciente inactivo"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={diasInactivo}
              onChange={e => setDiasInactivo(e.target.value)}
              min="1"
              max="365"
              className="w-16 rounded-[12px] px-2 py-2 text-[13px] text-center focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.72)',
                border: '1px solid var(--border-glass-white)',
                color: 'var(--ink-cool-strong)',
              }}
            />
            <span className="text-[13px]" style={{ color: 'var(--ink-cool-faint)' }}>días</span>
          </div>
        </SettingRow>

        <SettingRow
          label="Días para sugerir reactivación"
          description="A partir de este período sin cita aparece el aviso 'Reactivar' en Pendientes"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={diasReactivar}
              onChange={e => setDiasReactivar(e.target.value)}
              min="1"
              max="365"
              className="w-16 rounded-[12px] px-2 py-2 text-[13px] text-center focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.72)',
                border: '1px solid var(--border-glass-white)',
                color: 'var(--ink-cool-strong)',
              }}
            />
            <span className="text-[13px]" style={{ color: 'var(--ink-cool-faint)' }}>días</span>
          </div>
        </SettingRow>

        <SaveButton state={state} onClick={handleSave} />
      </SettingsCard>
    </div>
  )
}

// ── HISTORIAL ──────────────────────────────────────────────────────────────

const TEMPLATE_DEFAULT = `## Motivo de consulta\n\n## Contenido de la sesión\n\n## Intervenciones aplicadas\n\n## Plan y próximos pasos`

function HistorialSection({ settings, userId }: Pick<Props, 'settings' | 'userId'>) {
  const { state, save } = useSave(userId)

  const [vista,    setVista]    = useState<'compacta' | 'expandida'>(
    (settings['historial_vista'] as 'compacta' | 'expandida') ?? 'expandida'
  )
  const [template, setTemplate] = useState(settings['historial_plantilla_base'] ?? '')

  function handleSave() {
    save([
      ['historial_vista',          vista],
      ['historial_plantilla_base', template],
    ])
  }

  return (
    <div className="space-y-3">
      <SettingsCard>
        <p className="section-kicker mb-0.5">Visualización</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Cómo se presentan las notas clínicas en el historial del paciente.
        </p>

        <SettingRow label="Vista por defecto" description="Modo en que aparecen las notas al abrir un perfil">
          <div className="flex gap-1.5">
            {(['compacta', 'expandida'] as const).map(v => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium capitalize transition-all"
                style={{
                  background: vista === v
                    ? 'linear-gradient(145deg, var(--accent-lilac) 0%, var(--accent-mauve) 100%)'
                    : 'rgba(185,174,189,0.16)',
                  color: vista === v ? 'var(--ink-cool-strong)' : 'var(--ink-cool-faint)',
                  border: '1px solid var(--border-glass-muted)',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingsCard>

      <SettingsCard>
        <p className="section-kicker mb-0.5">Plantilla base de sesión</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Texto que se pre-carga en el campo de notas al crear una historia clínica nueva.
          Deja vacío para comenzar con la hoja en blanco.
        </p>

        <textarea
          value={template}
          onChange={e => setTemplate(e.target.value)}
          placeholder={TEMPLATE_DEFAULT}
          rows={9}
          className="w-full rounded-[14px] px-4 py-3 leading-relaxed resize-none focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid var(--border-glass-white)',
            color: 'var(--ink-cool-strong)',
            fontFamily: 'ui-monospace, "SF Mono", monospace',
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        />

        <SaveButton state={state} onClick={handleSave} />
      </SettingsCard>
    </div>
  )
}

// ── SEGURIDAD ──────────────────────────────────────────────────────────────

function CambiarPasswordModal({ onClose }: { onClose: () => void }) {
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew,         setShowNew]         = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [state,           setState]           = useState<SaveState>('idle')
  const [errorMsg,        setErrorMsg]        = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }
    if (newPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setErrorMsg('')
    setState('saving')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setState('saved')
      setTimeout(onClose, 1500)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al cambiar la contraseña.')
      setState('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay-modal)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass-cool rounded-[22px] p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="editorial-panel-title text-[1.05rem] mb-4">Cambiar contraseña</h2>

        {state === 'saved' ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Check size={32} style={{ color: 'var(--state-success-text)' }} />
            <p className="text-[14px]" style={{ color: 'var(--state-success-text)' }}>
              Contraseña actualizada correctamente.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="section-kicker mb-1.5">Nueva contraseña</p>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-[14px] px-3.5 py-3 text-[14px] pr-10 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--ink-cool-faint)' }}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <p className="section-kicker mb-1.5">Confirmar contraseña</p>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-[14px] px-3.5 py-3 text-[14px] pr-10 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--ink-cool-faint)' }}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-[13px] flex items-center gap-1.5" style={{ color: 'var(--state-cancel-text)' }}>
                <AlertCircle size={13} />
                {errorMsg}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="btn-subtle flex-1 py-2.5 text-[13px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={state === 'saving'}
                className="btn-action flex-1 py-2.5 text-[13px] flex items-center justify-center gap-2"
              >
                {state === 'saving' && <Loader2 size={13} className="animate-spin" />}
                {state === 'saving' ? 'Guardando…' : 'Cambiar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function SeguridadSection() {
  const router = useRouter()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [exportState, setExportState] = useState<'idle' | 'loading'>('idle')

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleExport() {
    // Estructura preparada para exportación futura
    // TODO: implementar descarga de CSV/JSON cuando se defina el formato
    setExportState('loading')
    await new Promise(r => setTimeout(r, 800))
    setExportState('idle')
    alert('La exportación de datos estará disponible en una próxima versión.')
  }

  return (
    <>
      {showPasswordModal && (
        <CambiarPasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      <div className="space-y-3">
        <SettingsCard>
          <p className="section-kicker mb-0.5">Acceso</p>
          <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
            Gestiona las credenciales de acceso a tu cuenta de Lumi.
          </p>

          <SettingRow label="Contraseña" description="Actualiza la contraseña que usas para entrar a Lumi">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="btn-subtle px-4 py-2 text-[13px]"
            >
              Cambiar
            </button>
          </SettingRow>
        </SettingsCard>

        <SettingsCard>
          <p className="section-kicker mb-0.5">Datos</p>
          <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
            Respaldo y exportación de tu información clínica.
          </p>

          <SettingRow
            label="Exportar datos"
            description="Descarga toda tu información en formato seguro"
          >
            <button
              onClick={handleExport}
              disabled={exportState === 'loading'}
              className="btn-subtle px-4 py-2 text-[13px] flex items-center gap-2"
            >
              {exportState === 'loading'
                ? <Loader2 size={13} className="animate-spin" />
                : <Download size={13} strokeWidth={1.8} />
              }
              Exportar
            </button>
          </SettingRow>

          <SettingRow
            label="Respaldo automático"
            description="Tus datos están respaldados en Supabase con seguridad enterprise"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--state-success-text)' }} />
              <span className="text-[13px]" style={{ color: 'var(--state-success-text)' }}>Activo</span>
            </div>
          </SettingRow>
        </SettingsCard>

        <SettingsCard>
          <p className="section-kicker mb-0.5">Equipo</p>
          <SettingRow
            label="Usuarios y roles"
            description="Invita y gestiona quién puede acceder a Lumi en tu consultorio"
          >
            <span className="text-[13px]" style={{ color: 'var(--ink-cool-muted)' }}>Próximamente</span>
          </SettingRow>
        </SettingsCard>

        <SettingsCard>
          <SettingRow label="Cerrar sesión" description="Salir de tu cuenta en este dispositivo">
            <button
              onClick={handleSignOut}
              className="rounded-full px-4 py-2 text-[13px] font-medium transition-colors hover:opacity-80"
              style={{
                background: 'rgba(176,124,132,0.12)',
                color:      'var(--state-cancel-text)',
                border:     '1px solid rgba(176,124,132,0.18)',
              }}
            >
              Cerrar sesión
            </button>
          </SettingRow>
        </SettingsCard>
      </div>
    </>
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
      case 'pacientes':     return <PacientesSection     settings={settings} userId={userId} />
      case 'historial':     return <HistorialSection     settings={settings} userId={userId} />
      case 'seguridad':     return <SeguridadSection />
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
