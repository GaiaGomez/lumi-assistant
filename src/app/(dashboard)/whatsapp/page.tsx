export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Appointment, Patient } from '@/types'
import { formatDateTimeFull } from '@/lib/format'
import { fetchSettings, interpolate } from '@/lib/settings'
import PageBlobs from '@/components/ui/PageBlobs'
import {
  linkRecordatorioCita,
  mensajeRecordatorioCita,
  generarLinkWhatsApp,
} from '@/lib/whatsapp'

type AppointmentWithPatient = Appointment & { patient: Patient | null }

type PendingItem = {
  id: string
  patient: Patient
  reason: string
  context: string
  preview: string
  primaryLabel: 'Enviar WhatsApp'
  primaryHref: string
  patientHref: string
}

const palette = {
  inkStrong: '#3F3941',
  ink: '#5A535D',
  inkSoft: '#635965',
  inkFaint: '#7E7381',
  lavenderSmoke: '#BEB3C2',
  mauveFog: '#C7BCC8',
  glass: 'rgba(255,255,255,0.38)',
  glassStrong: 'rgba(255,255,255,0.52)',
  borderGlass: 'rgba(255,255,255,0.42)',
  borderSoft: 'rgba(185,174,189,0.28)',
  shadowGlass: '0 10px 40px rgba(124, 108, 128, 0.10)',
  shadowSoft: '0 18px 50px rgba(140, 122, 145, 0.10)',
}

function previewMessage(message: string) {
  return message.length > 84 ? `${message.slice(0, 84)}...` : message
}

function countSummary(items: {
  urgent: PendingItem[]
  cobros: PendingItem[]
  noNext: PendingItem[]
  retomar: PendingItem[]
}) {
  return items.urgent.length + items.cobros.length + items.noNext.length + items.retomar.length
}

function SummaryMiniCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-[16px]"
      style={{
        minHeight: value === 0 ? '68px' : '76px',
        padding: value === 0 ? '10px 12px' : '12px 14px',
        background: value === 0
          ? 'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.28) 100%)'
          : `linear-gradient(180deg, ${palette.glassStrong} 0%, ${palette.glass} 100%)`,
        border: `1px solid ${value === 0 ? 'rgba(255,255,255,0.32)' : palette.borderGlass}`,
        boxShadow: value === 0 ? '0 8px 24px rgba(124, 108, 128, 0.06)' : palette.shadowGlass,
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
        opacity: value === 0 ? 0.72 : 1,
      }}
    >
      <p className="mb-1 font-semibold uppercase" style={{ color: palette.inkFaint, fontSize: '9px', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p className="font-medium leading-none" style={{ color: value === 0 ? palette.inkSoft : palette.inkStrong, fontSize: value === 0 ? '20px' : '24px' }}>
        {value}
      </p>
    </div>
  )
}

function PendingCard({ item }: { item: PendingItem }) {
  return (
    <div
      className="rounded-[16px]"
      style={{
        padding: '11px 13px',
        background: `linear-gradient(180deg, ${palette.glassStrong} 0%, ${palette.glass} 100%)`,
        border: `1px solid ${palette.borderGlass}`,
        boxShadow: palette.shadowGlass,
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-snug" style={{ color: palette.inkStrong, fontSize: '15px' }}>
            {item.patient.nombre} {item.patient.apellido}
          </p>
          <p className="mt-1 text-[12px] leading-none" style={{ color: palette.inkStrong }}>
            {item.reason}
          </p>
          <p className="mt-1 text-[11px] leading-none" style={{ color: palette.inkFaint }}>
            {item.context}
          </p>
          <p className="mt-1.5 line-clamp-1 text-[11px] leading-none" style={{ color: palette.inkSoft }}>
            {item.preview}
          </p>
        </div>

        <Link
          href={item.patientHref}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
          style={{
            color: palette.inkStrong,
            background: 'rgba(255,255,255,0.58)',
            border: `1px solid ${palette.borderGlass}`,
            boxShadow: '0 6px 18px rgba(124, 108, 128, 0.07)',
          }}
        >
          Ver paciente
          <ArrowUpRight size={11} />
        </Link>
      </div>

      <div className="mt-2.5">
        <a
          href={item.primaryHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full font-medium"
          style={{
            height: '30px',
            padding: '0 12px',
            fontSize: '12px',
            background: `linear-gradient(145deg, ${palette.lavenderSmoke} 0%, ${palette.mauveFog} 100%)`,
            color: palette.inkStrong,
            border: `1px solid ${palette.borderSoft}`,
            boxShadow: palette.shadowSoft,
          }}
        >
          <MessageCircle size={13} />
          {item.primaryLabel}
        </a>
      </div>
    </div>
  )
}

function PendingSection({ title, items }: { title: string; items: PendingItem[] }) {
  if (items.length === 0) return null

  return (
    <section
      className="rounded-[18px] p-3"
      style={{
        background: `linear-gradient(180deg, ${palette.glassStrong} 0%, ${palette.glass} 100%)`,
        border: `1px solid ${palette.borderGlass}`,
        boxShadow: palette.shadowGlass,
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      }}
    >
      <h2 className="editorial-panel-title text-[1.02rem] sm:text-[1.08rem]" style={{ color: palette.inkStrong }}>
        {title}
      </h2>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => (
          <PendingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const tomorrowStart = new Date(tomorrow)
  tomorrowStart.setHours(0, 0, 0, 0)
  const tomorrowEnd = new Date(tomorrow)
  tomorrowEnd.setHours(23, 59, 59, 999)

  // fetchSettings corre en paralelo con las otras queries
  const settingsPromise = fetchSettings(supabase, user!.id)

  const [{ data: appointments }, { data: patients }] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, patient:patients(*)')
      .eq('user_id', user!.id)
      .order('fecha_inicio', { ascending: false }),
    supabase
      .from('patients')
      .select('*')
      .eq('user_id', user!.id)
      .order('apellido', { ascending: true }),
  ])

  const settings = await settingsPromise

  const allAppointments = ((appointments ?? []) as AppointmentWithPatient[]).filter((apt) => apt.patient)
  const allPatients = (patients ?? []) as Patient[]

  const urgent: PendingItem[] = []
  const cobros: PendingItem[] = []
  const noNext: PendingItem[] = []
  const retomar: PendingItem[] = []

  const tomorrowAppointments = allAppointments.filter((apt) => {
    const start = new Date(apt.fecha_inicio)
    return (
      apt.estado_sesion === 'pendiente' &&
      start >= tomorrowStart &&
      start <= tomorrowEnd &&
      !!apt.patient
    )
  })

  tomorrowAppointments.forEach((apt) => {
    const patient = apt.patient!
    urgent.push({
      id: `urgent-${apt.id}`,
      patient,
      reason: 'Sesión mañana',
      context: formatDateTimeFull(apt.fecha_inicio),
      preview: previewMessage(mensajeRecordatorioCita(patient, apt)),
      primaryLabel: 'Enviar WhatsApp',
      primaryHref: linkRecordatorioCita(patient, apt),
      patientHref: `/pacientes/${patient.id}`,
    })
  })

  const pendingPayments = allAppointments.filter(
    (apt) => apt.estado_sesion === 'asistio' && apt.estado_pago === 'pendiente' && !!apt.patient
  )

  pendingPayments.forEach((apt) => {
    const patient = apt.patient!
    const mensaje = interpolate(settings['template_cobros'], {
      first_name: patient.nombre,
      session_date: formatDateTimeFull(apt.fecha_inicio),
    })
    cobros.push({
      id: `payment-${apt.id}`,
      patient,
      reason: 'Pago pendiente',
      context: `Sesión del ${formatDateTimeFull(apt.fecha_inicio)}`,
      preview: previewMessage(mensaje),
      primaryLabel: 'Enviar WhatsApp',
      primaryHref: generarLinkWhatsApp(patient.whatsapp, mensaje),
      patientHref: `/pacientes/${patient.id}`,
    })
  })

  allPatients.forEach((patient) => {
    const patientAppointments = allAppointments
      .filter((apt) => apt.patient?.id === patient.id)
      .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())

    const futureAppointment = patientAppointments
      .filter((apt) => new Date(apt.fecha_inicio) > now)
      .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())[0] ?? null

    const lastPastAppointment = patientAppointments
      .filter((apt) => new Date(apt.fecha_inicio) <= now)
      .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())[0] ?? null

    if (!lastPastAppointment || futureAppointment) return

    const daysWithoutSchedule = Math.floor(
      (now.getTime() - new Date(lastPastAppointment.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysWithoutSchedule >= 20) {
      const mensaje = interpolate(settings['template_retomar'], {
        first_name: patient.nombre,
        days_inactive: String(daysWithoutSchedule),
      })
      retomar.push({
        id: `resume-${patient.id}`,
        patient,
        reason: `${daysWithoutSchedule} días sin agendar`,
        context: `Última sesión ${formatDateTimeFull(lastPastAppointment.fecha_inicio)}`,
        preview: previewMessage(mensaje),
        primaryLabel: 'Enviar WhatsApp',
        primaryHref: generarLinkWhatsApp(patient.whatsapp, mensaje),
        patientHref: `/pacientes/${patient.id}`,
      })
      return
    }

    const mensaje = interpolate(settings['template_sin_proxima'], {
      first_name: patient.nombre,
      booking_url: settings['doctoralia_url'],
    })
    noNext.push({
      id: `next-${patient.id}`,
      patient,
      reason: 'Sin próxima sesión',
      context: `Última sesión ${formatDateTimeFull(lastPastAppointment.fecha_inicio)}`,
      preview: previewMessage(mensaje),
      primaryLabel: 'Enviar WhatsApp',
      primaryHref: generarLinkWhatsApp(patient.whatsapp, mensaje),
      patientHref: `/pacientes/${patient.id}`,
    })
  })

  const totals = {
    urgent,
    cobros,
    noNext,
    retomar,
  }

  const totalSuggestions = countSummary(totals)
  const hasFewSuggestions = totalSuggestions <= 2

  return (
    <div className="relative mx-auto max-w-[1180px] px-4 pb-1 font-sans sm:px-5">
      <PageBlobs />

      <section
        className="relative mb-3 rounded-[18px] p-3"
        style={{
          background: `linear-gradient(180deg, ${palette.glassStrong} 0%, ${palette.glass} 100%)`,
          border: `1px solid ${palette.borderGlass}`,
          boxShadow: palette.shadowGlass,
          backdropFilter: 'blur(22px) saturate(140%)',
          WebkitBackdropFilter: 'blur(22px) saturate(140%)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="editorial-panel-title text-[1.3rem] sm:text-[1.4rem]" style={{ color: palette.inkStrong }}>
              Pendientes
            </h1>
            <p className="mt-1 text-[12px]" style={{ color: palette.inkSoft }}>
              Acciones sugeridas para hoy
            </p>
          </div>
          <div
            className="rounded-full px-2.5 py-1 text-[10px] font-medium"
            style={{
              color: palette.inkSoft,
              background: 'rgba(255,255,255,0.42)',
              border: `1px solid ${palette.borderGlass}`,
            }}
          >
            {totalSuggestions} sugerencias
          </div>
        </div>
      </section>

      <div className="mb-3 grid gap-[10px] sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMiniCard label="Urgentes" value={urgent.length} />
        <SummaryMiniCard label="Cobros" value={cobros.length} />
        <SummaryMiniCard label="Sin próxima" value={noNext.length} />
        <SummaryMiniCard label="Retomar" value={retomar.length} />
      </div>

      <div className={`space-y-2.5 ${hasFewSuggestions ? 'max-w-[860px]' : ''}`}>
        <PendingSection title="Urgente" items={urgent} />
        <PendingSection title="Cobros" items={cobros} />
        <PendingSection title="Sin próxima sesión" items={noNext} />
        <PendingSection title="Retomar proceso" items={retomar} />
      </div>
    </div>
  )
}
