export const dynamic = 'force-dynamic'
// Ruta legacy: el producto hoy la presenta como "Pendientes".
// La mantenemos por compatibilidad mientras no hagamos un rename de URLs.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Appointment, Patient } from '@/types'
import { fetchSettings } from '@/lib/settings'
import { mapAppointmentRows, mapPatientRows } from '@/lib/supabase/mappers'
import PageBlobs from '@/components/ui/PageBlobs'
import EmptyState from '@/components/ui/EmptyState'
import AppointmentQuickStateEditor from '@/components/appointments/AppointmentQuickStateEditor'
import {
  buildPendingActions,
  PENDING_ACTION_SECTION_LABEL,
  PENDING_ACTION_SECTION_ORDER,
  type PendingAction,
  type PendingActionType,
} from '@/lib/pending-actions'

type AppointmentWithPatient = Appointment & { patient?: Patient | null }

function countSummary(actions: PendingAction[]) {
  return {
    confirmarHoy: actions.filter((action) => action.type === 'confirmar_cita_hoy').length,
    confirmarManana: actions.filter((action) => action.type === 'confirmar_cita_manana').length,
    cobros: actions.filter((action) => action.type === 'cobrar_sesion_realizada').length,
    seguimiento: actions.filter((action) => action.type === 'paciente_sin_proxima' || action.type === 'reactivar_paciente').length,
  }
}

function SummaryMiniCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-[16px]"
      style={{
        minHeight: value === 0 ? '60px' : '66px',
        padding: value === 0 ? '9px 11px' : '10px 12px',
        background: value === 0
          ? 'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.28) 100%)'
          : 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
        border: `1px solid ${value === 0 ? 'rgba(255,255,255,0.32)' : 'var(--border-glass-white)'}`,
        boxShadow: value === 0 ? '0 8px 24px rgba(124, 108, 128, 0.06)' : 'var(--shadow-glass)',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
        opacity: value === 0 ? 0.72 : 1,
      }}
    >
      <p className="card-label mb-0.5" style={{ color: 'var(--ink-cool-faint)' }}>
        {label}
      </p>
      <p className="font-medium leading-none" style={{ color: value === 0 ? 'var(--ink-cool-soft)' : 'var(--ink-cool-strong)', fontSize: value === 0 ? '18px' : '22px' }}>
        {value}
      </p>
    </div>
  )
}

function PendingActionCard({ action }: { action: PendingAction }) {
  const shouldShowDescription = action.type === 'reactivar_paciente'

  return (
    <div
      className="rounded-[16px]"
      style={{
        padding: '10px 11px',
        background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
        border: '1px solid var(--border-glass-white)',
        boxShadow: 'var(--shadow-glass)',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium leading-snug" style={{ color: 'var(--ink-cool-strong)', fontSize: '14px' }}>
            {action.patient.nombre} {action.patient.apellido}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <p className="text-[11px] leading-none" style={{ color: 'var(--ink-cool-strong)' }}>
              {action.title}
            </p>
            <span className="text-[10px] leading-none" style={{ color: 'var(--ink-cool-muted)' }}>
              •
            </span>
            <p className="text-[10px] leading-none" style={{ color: 'var(--ink-cool-faint)' }}>
              {action.context}
            </p>
          </div>
          {shouldShowDescription && (
            <p className="mt-1 text-[10px] leading-snug" style={{ color: 'var(--ink-cool-soft)' }}>
              {action.description}
            </p>
          )}
          {action.preview && (
            <p className="mt-1 line-clamp-2 text-[10px] leading-snug" style={{ color: 'var(--ink-cool-soft)' }}>
              {action.preview}
            </p>
          )}
        </div>

        <Link
          href={`/pacientes/${action.patientId}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            color: 'var(--ink-cool-strong)',
            background: 'rgba(255,255,255,0.58)',
            border: '1px solid var(--border-glass-white)',
            boxShadow: '0 6px 18px rgba(124, 108, 128, 0.07)',
          }}
        >
          Ver paciente
          <ArrowUpRight size={10} />
        </Link>
      </div>

      <div className="mt-1.5 flex flex-wrap items-start gap-1.5">
        {action.appointment && (
          <div
            className="min-w-0 flex-1 rounded-[12px] px-2 py-1.5"
            style={{
              background: 'rgba(255,255,255,0.38)',
              border: '1px solid var(--border-glass-white)',
            }}
          >
            <AppointmentQuickStateEditor
              appointmentId={action.appointment.id}
              initialSessionState={action.appointment.estado_sesion}
              initialPaymentState={action.appointment.estado_pago}
              compact
            />
          </div>
        )}

        {action.externalAction && (
          <a
            href={action.externalAction.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-action shrink-0 gap-1.5 self-start"
            style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
          >
            <MessageCircle size={12} />
            {action.externalAction.label}
          </a>
        )}
      </div>
    </div>
  )
}

function PendingSection({
  type,
  actions,
}: {
  type: PendingActionType
  actions: PendingAction[]
}) {
  if (actions.length === 0) return null

  return (
    <section
      className="rounded-[18px] p-2.5"
      style={{
        background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
        border: '1px solid var(--border-glass-white)',
        boxShadow: 'var(--shadow-glass)',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
    >
      <h2 className="editorial-panel-title text-[0.98rem] sm:text-[1.04rem]" style={{ color: 'var(--ink-cool-strong)' }}>
        {PENDING_ACTION_SECTION_LABEL[type]}
      </h2>
      <div className="mt-1.5 space-y-1.5">
        {actions.map((action) => (
          <PendingActionCard key={action.id} action={action} />
        ))}
      </div>
    </section>
  )
}

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const settingsPromise = fetchSettings(supabase, user.id)

  const [{ data: appointments }, { data: patients }] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, patient:patients(*)')
      .eq('user_id', user.id)
      .order('fecha_inicio', { ascending: false }),
    supabase
      .from('patients')
      .select('id, user_id, nombre, apellido, telefono, whatsapp, email, fecha_inicio, notas_generales, created_at')
      .eq('user_id', user.id)
      .order('apellido', { ascending: true }),
  ])

  const settings = await settingsPromise

  const allAppointments: AppointmentWithPatient[] = mapAppointmentRows(appointments)
  const allPatients = mapPatientRows(patients)
  const pendingActions = buildPendingActions(allAppointments, allPatients, settings)
  const summary = countSummary(pendingActions)

  return (
    <div className="relative mx-auto max-w-[1180px] px-4 pb-1 font-sans sm:px-5">
      <PageBlobs />

      <section
        className="relative mb-3 rounded-[18px] p-2.5"
        style={{
          background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
          border: '1px solid var(--border-glass-white)',
          boxShadow: 'var(--shadow-glass)',
          backdropFilter: 'blur(22px) saturate(140%)',
          WebkitBackdropFilter: 'blur(22px) saturate(140%)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="editorial-panel-title text-[1.3rem] sm:text-[1.4rem]" style={{ color: 'var(--ink-cool-strong)' }}>
              Pendientes
            </h1>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--ink-cool-soft)' }}>
              Acciones operativas listas para resolver
            </p>
          </div>
          <div
            className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
            style={{
              color: 'var(--ink-cool-soft)',
              background: 'rgba(255,255,255,0.42)',
              border: '1px solid var(--border-glass-white)',
            }}
          >
            {pendingActions.length} acciones
          </div>
        </div>
      </section>

      <div className="mb-3 grid gap-[10px] sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMiniCard label="Confirmar hoy" value={summary.confirmarHoy} />
        <SummaryMiniCard label="Confirmar mañana" value={summary.confirmarManana} />
        <SummaryMiniCard label="Cobros" value={summary.cobros} />
        <SummaryMiniCard label="Seguimiento" value={summary.seguimiento} />
      </div>

      {pendingActions.length === 0 ? (
        <section
          className="rounded-[18px] p-3"
          style={{
            background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
            border: '1px solid var(--border-glass-white)',
            boxShadow: 'var(--shadow-glass)',
            backdropFilter: 'blur(22px) saturate(140%)',
            WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          }}
        >
          <EmptyState
            message="No hay acciones pendientes reales en este momento."
            hint="Cuando aparezcan citas por confirmar, cobros o pacientes sin seguimiento, se verán aquí."
          />
        </section>
      ) : (
        <div className="space-y-2.5">
          {PENDING_ACTION_SECTION_ORDER.map((type) => (
            <PendingSection
              key={type}
              type={type}
              actions={pendingActions.filter((action) => action.type === type)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
