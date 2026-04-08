'use client'
// ============================================================
// CONFIGURACIÓN CLIENT — página de ajustes con 6 secciones
//
// Navegación: tabs horizontales (scroll en mobile)
// Secciones: Agenda · Recordatorios · Consultorios · Pacientes · Historial · Seguridad
//
// Secciones con backend real: Recordatorios (TemplateEditor + DoctoraliaSync)
// Secciones visuales preparadas (sin persistencia aún): el resto
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar, Bell, MapPin, Users, FileText, Shield,
  Download, LogOut, ChevronDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type SettingsMap } from '@/lib/settings'
import TemplateEditor from './TemplateEditor'
import DoctoraliaSync from './DoctoraliaSync'

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  settings: SettingsMap
  userId: string
}

// ── Tabs ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'agenda',        label: 'Agenda',        icon: Calendar },
  { id: 'recordatorios', label: 'Recordatorios', icon: Bell },
  { id: 'consultorios',  label: 'Consultorios',  icon: MapPin },
  { id: 'pacientes',     label: 'Pacientes',     icon: Users },
  { id: 'historial',     label: 'Historial',     icon: FileText },
  { id: 'seguridad',     label: 'Seguridad',     icon: Shield },
] as const

type TabId = (typeof TABS)[number]['id']

// ── Shared UI ──────────────────────────────────────────────────────────────

/** Badge "Próximamente" para campos sin backend aún */
function ComingSoon() {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        background: 'rgba(184,155,130,0.14)',
        color: 'var(--state-pending-text)',
      }}
    >
      Próximamente
    </span>
  )
}

/** Fila de setting: label + descripción a la izquierda, control a la derecha */
function SettingRow({
  label,
  description,
  children,
  soon = false,
}: {
  label: string
  description?: string
  children?: React.ReactNode
  soon?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3.5 border-b last:border-b-0"
      style={{ borderColor: 'var(--border-glass-muted)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
            {label}
          </span>
          {soon && <ComingSoon />}
        </div>
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

/** Card de sección de configuración */
function SettingsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-cool rounded-[18px] p-4 ${className}`}>
      {children}
    </div>
  )
}

/** Toggle visual (sin persistencia real salvo que se conecte) */
function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-[22px] w-9 flex-shrink-0 rounded-full transition-all ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
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

/** Select nativo con estilo Lumi */
function LumiSelect({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none rounded-[12px] pl-3 pr-8 py-2 text-[13px] focus:outline-none"
        style={{
          background: 'rgba(255,255,255,0.72)',
          border: '1px solid var(--border-glass-white)',
          color: disabled ? 'var(--ink-cool-faint)' : 'var(--ink-cool-strong)',
          boxShadow: '0 4px 12px rgba(124,108,128,0.08)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
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

// ── AGENDA ─────────────────────────────────────────────────────────────────

function AgendaSection({ settings, userId }: Props) {
  const [duracion, setDuracion] = useState('60')
  const [vista, setVista] = useState('semana')
  const [intervalo, setIntervalo] = useState('30')
  const [horaInicio, setHoraInicio] = useState('07:00')
  const [horaFin, setHoraFin] = useState('21:00')
  const [festivos, setFestivos] = useState(false)
  const [dias, setDias] = useState({
    lun: true, mar: true, mie: true, jue: true, vie: true, sab: false, dom: false,
  })

  const DIA_LABELS = [
    { k: 'lun', l: 'L' }, { k: 'mar', l: 'M' }, { k: 'mie', l: 'X' },
    { k: 'jue', l: 'J' }, { k: 'vie', l: 'V' }, { k: 'sab', l: 'S' }, { k: 'dom', l: 'D' },
  ] as const

  return (
    <div className="space-y-3">
      {/* Citas */}
      <SettingsCard>
        <p className="section-kicker mb-0.5">Citas</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Comportamiento por defecto al crear una cita nueva.
        </p>

        <SettingRow
          label="Duración por defecto"
          description="Tiempo estándar de cada cita al agregarla a la agenda"
          soon
        >
          <LumiSelect
            value={duracion}
            onChange={setDuracion}
            disabled
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

        <SettingRow
          label="Vista al abrir agenda"
          description="Perspectiva inicial cada vez que entras a la agenda"
          soon
        >
          <LumiSelect
            value={vista}
            onChange={setVista}
            disabled
            options={[
              { value: 'dia',    label: 'Día' },
              { value: 'semana', label: 'Semana' },
              { value: 'mes',    label: 'Mes' },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Intervalo de grilla"
          description="Granularidad de la cuadrícula horaria"
          soon
        >
          <LumiSelect
            value={intervalo}
            onChange={setIntervalo}
            disabled
            options={[
              { value: '15', label: '15 min' },
              { value: '30', label: '30 min' },
              { value: '60', label: '1 hora' },
            ]}
          />
        </SettingRow>
      </SettingsCard>

      {/* Horario laboral */}
      <SettingsCard>
        <p className="section-kicker mb-0.5">Horario laboral</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Rango de horas y días que quieres ver en tu agenda.
        </p>

        <SettingRow
          label="Días de atención"
          description="Días en los que trabajas habitualmente"
          soon
        >
          <div className="flex gap-1">
            {DIA_LABELS.map(({ k, l }) => (
              <button
                key={k}
                disabled
                className="w-8 h-8 rounded-[8px] text-[12px] font-medium transition-all"
                style={{
                  background: dias[k]
                    ? 'linear-gradient(145deg, var(--accent-lilac) 0%, var(--accent-mauve) 100%)'
                    : 'rgba(185,174,189,0.16)',
                  color: dias[k] ? 'var(--ink-cool-strong)' : 'var(--ink-cool-muted)',
                  border: '1px solid var(--border-glass-muted)',
                  opacity: 0.65,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Hora de inicio" description="Primera hora visible" soon>
          <input
            type="time"
            value={horaInicio}
            onChange={e => setHoraInicio(e.target.value)}
            disabled
            className="rounded-[12px] px-3 py-2 text-[13px] focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid var(--border-glass-white)',
              color: 'var(--ink-cool-faint)',
              opacity: 0.7,
            }}
          />
        </SettingRow>

        <SettingRow label="Hora de cierre" description="Última hora visible" soon>
          <input
            type="time"
            value={horaFin}
            onChange={e => setHoraFin(e.target.value)}
            disabled
            className="rounded-[12px] px-3 py-2 text-[13px] focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.72)',
              border: '1px solid var(--border-glass-white)',
              color: 'var(--ink-cool-faint)',
              opacity: 0.7,
            }}
          />
        </SettingRow>

        <SettingRow
          label="Mostrar festivos"
          description="Resaltar días festivos en la vista de agenda"
          soon
        >
          <Toggle checked={festivos} onChange={setFestivos} disabled />
        </SettingRow>
      </SettingsCard>

      {/* Integraciones */}
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

function RecordatoriosSection({ settings, userId }: Props) {
  const [activo, setActivo] = useState(true)
  const [cuando, setCuando] = useState('ambos')

  return (
    <div className="space-y-3">
      {/* Envío automático */}
      <SettingsCard>
        <p className="section-kicker mb-0.5">Envío automático</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Control de cuándo y cómo se envían los mensajes a pacientes.
        </p>

        <SettingRow
          label="Mensajes automáticos activos"
          description="Habilita el envío automático de recordatorios por WhatsApp"
          soon
        >
          <Toggle checked={activo} onChange={setActivo} disabled />
        </SettingRow>

        <SettingRow
          label="Momento del recordatorio"
          description="Con cuánta anticipación se envía el mensaje antes de la cita"
          soon
        >
          <LumiSelect
            value={cuando}
            onChange={setCuando}
            disabled
            options={[
              { value: 'dia',     label: '1 día antes' },
              { value: 'horas',   label: '2 horas antes' },
              { value: 'ambos',   label: 'Ambos' },
              { value: 'ninguno', label: 'Ninguno' },
            ]}
          />
        </SettingRow>
      </SettingsCard>

      {/* Plantillas */}
      <SettingsCard>
        <p className="section-kicker mb-0.5">Plantillas de mensajes</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Personaliza el texto de cada tipo de mensaje. Usa variables entre{' '}
          <code className="text-[11px] rounded px-1 py-0.5" style={{ background: 'var(--state-cancel-bg)', color: 'var(--accent-wine)' }}>
            {'{llaves}'}
          </code>{' '}
          para insertar datos dinámicos.
        </p>
        <TemplateEditor settings={settings} userId={userId} />
      </SettingsCard>
    </div>
  )
}

// ── CONSULTORIOS ───────────────────────────────────────────────────────────

const MODALIDADES_CONFIG = [
  {
    id:          'medellin',
    label:       'Medellín',
    emoji:       '🏢',
    colorBg:     'rgba(196,176,200,0.18)',
    colorBorder: 'rgba(196,176,200,0.32)',
    fieldLabel:  'Dirección del consultorio',
    placeholder: 'Calle 10 # 43D-28, El Poblado',
    hint:        'Dirección que se enviará en los mensajes de confirmación.',
  },
  {
    id:          'online',
    label:       'Online',
    emoji:       '💻',
    colorBg:     'rgba(154,154,184,0.18)',
    colorBorder: 'rgba(154,154,184,0.32)',
    fieldLabel:  'Enlace de videollamada',
    placeholder: 'https://meet.google.com/tu-sala',
    hint:        'Link que se enviará automáticamente en las confirmaciones online.',
  },
  {
    id:          'retiro',
    label:       'Retiro',
    emoji:       '🌿',
    colorBg:     'rgba(138,158,140,0.18)',
    colorBorder: 'rgba(138,158,140,0.32)',
    fieldLabel:  'Instrucciones logísticas',
    placeholder: 'Ej: Llevar ropa cómoda. El encuentro es en Parque Arví.',
    hint:        'Nota que se incluirá al confirmar sesiones en modalidad retiro.',
  },
] as const

function ConsultoriosSection() {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-[13px]" style={{ color: 'var(--ink-cool-faint)' }}>
          Configura el nombre, color e información de contacto de cada modalidad de atención.
        </p>
        <ComingSoon />
      </div>

      {MODALIDADES_CONFIG.map(m => (
        <SettingsCard key={m.id}>
          {/* Identidad de la modalidad */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 text-[18px]"
              style={{ background: m.colorBg, border: `1px solid ${m.colorBorder}` }}
            >
              {m.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                defaultValue={m.label}
                disabled
                className="text-[14px] font-medium bg-transparent border-none outline-none w-full cursor-not-allowed"
                style={{ color: 'var(--ink-cool-strong)' }}
              />
              <p className="text-[11px]" style={{ color: 'var(--ink-cool-muted)' }}>
                Nombre de la modalidad
              </p>
            </div>
          </div>

          {/* Campo principal */}
          <div>
            <p className="section-kicker mb-1.5">{m.fieldLabel}</p>
            <input
              type="text"
              placeholder={m.placeholder}
              disabled
              className="w-full rounded-[12px] px-3.5 py-2.5 text-[14px] focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.65)',
                border: '1px solid var(--border-glass-white)',
                color: 'var(--ink-cool-faint)',
              }}
            />
            <p className="text-[12px] mt-1.5" style={{ color: 'var(--ink-cool-muted)' }}>
              {m.hint}
            </p>
          </div>
        </SettingsCard>
      ))}
    </div>
  )
}

// ── PACIENTES ──────────────────────────────────────────────────────────────

const CAMPOS_OPCIONALES = [
  { key: 'telefono',        label: 'Teléfono / WhatsApp' },
  { key: 'email',           label: 'Correo electrónico' },
  { key: 'fecha_nacimiento',label: 'Fecha de nacimiento' },
  { key: 'motivo',          label: 'Motivo de consulta inicial' },
  { key: 'ocupacion',       label: 'Ocupación' },
]

function PacientesSection() {
  const [whatsappPrincipal, setWhatsappPrincipal] = useState(true)
  const [diasInactivo, setDiasInactivo] = useState('90')
  const [diasReactivar, setDiasReactivar] = useState('60')

  return (
    <div className="space-y-3">
      {/* Interfaz de paciente */}
      <SettingsCard>
        <p className="section-kicker mb-0.5">Interfaz de paciente</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Cómo se presenta la información al consultar el perfil de un paciente.
        </p>

        <SettingRow
          label="WhatsApp como campo principal"
          description="Muestra el WhatsApp destacado como forma de contacto principal"
          soon
        >
          <Toggle checked={whatsappPrincipal} onChange={setWhatsappPrincipal} disabled />
        </SettingRow>
      </SettingsCard>

      {/* Campos obligatorios */}
      <SettingsCard>
        <p className="section-kicker mb-0.5">Campos al crear paciente</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Define qué información es obligatoria al registrar un paciente nuevo.
        </p>

        {/* Campo fijo */}
        <div
          className="flex items-center gap-3 py-2.5 border-b"
          style={{ borderColor: 'var(--border-glass-muted)' }}
        >
          <div
            className="w-4 h-4 rounded-[5px] flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(145deg, var(--accent-lilac) 0%, var(--accent-mauve) 100%)',
              border: '1px solid var(--border-glass-muted)',
            }}
          >
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[14px] flex-1" style={{ color: 'var(--ink-cool-soft)' }}>Nombre completo</span>
          <span className="text-[11px]" style={{ color: 'var(--ink-cool-muted)' }}>siempre obligatorio</span>
        </div>

        {/* Campos opcionales */}
        {CAMPOS_OPCIONALES.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center gap-3 py-2.5 border-b last:border-b-0"
            style={{ borderColor: 'var(--border-glass-muted)' }}
          >
            <div
              className="w-4 h-4 rounded-[5px] flex-shrink-0 opacity-40"
              style={{
                background: 'rgba(185,174,189,0.22)',
                border: '1px solid var(--border-glass-muted)',
              }}
            />
            <span className="text-[14px] flex-1" style={{ color: 'var(--ink-cool-soft)' }}>{label}</span>
          </div>
        ))}

        <p className="text-[12px] mt-3" style={{ color: 'var(--ink-cool-muted)' }}>
          La selección de campos obligatorios estará disponible próximamente.
        </p>
      </SettingsCard>

      {/* Actividad */}
      <SettingsCard>
        <p className="section-kicker mb-0.5">Actividad y seguimiento</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Reglas para detectar pacientes inactivos y sugerir reactivación.
        </p>

        <SettingRow
          label="Días para marcar como inactivo"
          description="Un paciente se considera inactivo si no tiene citas en este período"
          soon
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={diasInactivo}
              onChange={e => setDiasInactivo(e.target.value)}
              disabled
              min="1"
              className="w-16 rounded-[12px] px-2 py-2 text-[13px] text-center focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.72)',
                border: '1px solid var(--border-glass-white)',
                color: 'var(--ink-cool-faint)',
                opacity: 0.7,
              }}
            />
            <span className="text-[13px]" style={{ color: 'var(--ink-cool-faint)' }}>días</span>
          </div>
        </SettingRow>

        <SettingRow
          label="Días para sugerir reactivación"
          description="A partir de cuántos días sin cita aparece el botón 'Reactivar'"
          soon
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={diasReactivar}
              onChange={e => setDiasReactivar(e.target.value)}
              disabled
              min="1"
              className="w-16 rounded-[12px] px-2 py-2 text-[13px] text-center focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.72)',
                border: '1px solid var(--border-glass-white)',
                color: 'var(--ink-cool-faint)',
                opacity: 0.7,
              }}
            />
            <span className="text-[13px]" style={{ color: 'var(--ink-cool-faint)' }}>días</span>
          </div>
        </SettingRow>
      </SettingsCard>
    </div>
  )
}

// ── HISTORIAL ──────────────────────────────────────────────────────────────

const TEMPLATE_BASE = `## Motivo de consulta

## Contenido de la sesión

## Intervenciones aplicadas

## Plan y próximos pasos`

function HistorialSection() {
  const [vista, setVista] = useState<'compacta' | 'expandida'>('expandida')

  return (
    <div className="space-y-3">
      {/* Visualización */}
      <SettingsCard>
        <p className="section-kicker mb-0.5">Visualización</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Cómo se presentan las notas clínicas en el historial del paciente.
        </p>

        <SettingRow
          label="Vista por defecto de notas"
          description="Modo en que se muestran las entradas del historial al abrir un perfil"
          soon
        >
          <div className="flex gap-1.5">
            {(['compacta', 'expandida'] as const).map(v => (
              <button
                key={v}
                disabled
                className="px-3 py-1.5 rounded-full text-[12px] font-medium capitalize transition-all"
                style={{
                  background: vista === v
                    ? 'linear-gradient(145deg, var(--accent-lilac) 0%, var(--accent-mauve) 100%)'
                    : 'rgba(185,174,189,0.16)',
                  color: vista === v ? 'var(--ink-cool-strong)' : 'var(--ink-cool-faint)',
                  border: '1px solid var(--border-glass-muted)',
                  opacity: 0.65,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingsCard>

      {/* Plantilla base */}
      <SettingsCard>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="section-kicker mb-0.5">Plantilla base de sesión</p>
            <p className="text-[13px]" style={{ color: 'var(--ink-cool-faint)' }}>
              Estructura sugerida que se pre-carga al crear una nota nueva.
            </p>
          </div>
          <ComingSoon />
        </div>

        <textarea
          defaultValue={TEMPLATE_BASE}
          disabled
          rows={8}
          className="w-full rounded-[14px] px-4 py-3 leading-relaxed resize-none focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.65)',
            border: '1px solid var(--border-glass-white)',
            color: 'var(--ink-cool-faint)',
            fontFamily: 'ui-monospace, "SF Mono", monospace',
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        />

        <p className="text-[12px] mt-2" style={{ color: 'var(--ink-cool-muted)' }}>
          El editor de plantillas base estará disponible próximamente. Por ahora puedes editar el contenido
          de cada nota directamente al crearla.
        </p>
      </SettingsCard>
    </div>
  )
}

// ── SEGURIDAD ──────────────────────────────────────────────────────────────

function SeguridadSection() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-3">
      {/* Acceso */}
      <SettingsCard>
        <p className="section-kicker mb-0.5">Acceso</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Gestiona las credenciales de acceso a tu cuenta de Lumi.
        </p>

        <SettingRow
          label="Cambiar contraseña"
          description="Actualiza la contraseña que usas para entrar a Lumi"
          soon
        >
          <button
            disabled
            className="btn-subtle px-4 py-2 text-[13px] opacity-50 cursor-not-allowed"
          >
            Cambiar
          </button>
        </SettingRow>
      </SettingsCard>

      {/* Datos */}
      <SettingsCard>
        <p className="section-kicker mb-0.5">Datos</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Respaldo y exportación de tu información clínica.
        </p>

        <SettingRow
          label="Exportar datos"
          description="Descarga toda tu información en formato seguro"
          soon
        >
          <button
            disabled
            className="btn-subtle px-4 py-2 text-[13px] opacity-50 cursor-not-allowed flex items-center gap-2"
          >
            <Download size={14} strokeWidth={1.8} />
            Exportar
          </button>
        </SettingRow>

        <SettingRow
          label="Respaldo automático"
          description="Tus datos están respaldados en Supabase con seguridad enterprise"
        >
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: 'var(--state-success-text)' }}
            />
            <span className="text-[13px]" style={{ color: 'var(--state-success-text)' }}>Activo</span>
          </div>
        </SettingRow>
      </SettingsCard>

      {/* Equipo */}
      <SettingsCard>
        <p className="section-kicker mb-0.5">Equipo</p>
        <p className="text-[13px] mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Control de acceso para colaboradores o asistentes del consultorio.
        </p>

        <SettingRow
          label="Usuarios y roles"
          description="Invita y gestiona quién puede acceder a Lumi en tu consultorio"
          soon
        >
          <span className="text-[13px]" style={{ color: 'var(--ink-cool-muted)' }}>
            Próximamente
          </span>
        </SettingRow>
      </SettingsCard>

      {/* Sesión */}
      <SettingsCard>
        <SettingRow
          label="Cerrar sesión"
          description="Salir de tu cuenta en este dispositivo"
        >
          <button
            onClick={handleSignOut}
            className="rounded-full px-4 py-2 text-[13px] font-medium transition-colors hover:opacity-80"
            style={{
              background: 'rgba(176,124,132,0.12)',
              color: 'var(--state-cancel-text)',
              border: '1px solid rgba(176,124,132,0.18)',
            }}
          >
            Cerrar sesión
          </button>
        </SettingRow>
      </SettingsCard>
    </div>
  )
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────

export default function ConfiguracionClient({ settings, userId }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('agenda')

  const section = (() => {
    switch (activeTab) {
      case 'agenda':        return <AgendaSection settings={settings} userId={userId} />
      case 'recordatorios': return <RecordatoriosSection settings={settings} userId={userId} />
      case 'consultorios':  return <ConsultoriosSection />
      case 'pacientes':     return <PacientesSection />
      case 'historial':     return <HistorialSection />
      case 'seguridad':     return <SeguridadSection />
    }
  })()

  return (
    <>
      {/* ── Tab navigation ── */}
      <div className="mb-5">
        {/* Scrollable horizontally en mobile */}
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
                  color: isActive ? 'var(--ink-cool-strong)' : 'var(--ink-cool-muted)',
                  fontWeight: isActive ? 500 : 400,
                  border: isActive ? '1px solid var(--border-glass-muted)' : '1px solid transparent',
                }}
              >
                <Icon size={14} strokeWidth={isActive ? 2.2 : 1.6} />
                <span className="text-[13px]">{label}</span>
              </button>
            )
          })}
        </div>
        {/* Línea divisora */}
        <div className="h-px mt-1" style={{ background: 'var(--border-glass-muted)' }} />
      </div>

      {/* ── Section content ── */}
      {section}
    </>
  )
}
