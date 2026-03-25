export const dynamic = 'force-dynamic'
// ============================================================
// WHATSAPP PAGE — panel de alertas automáticas
// Detecta: citas mañana, pagos pendientes, pacientes inactivos
// Genera links wa.me con mensajes listos para enviar
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { MessageCircle, Clock, CreditCard, UserX } from 'lucide-react'
import { Patient, Appointment } from '@/types'
import {
  linkRecordatorioCita,
  linkPagoPendiente,
  linkPacienteInactivo,
} from '@/lib/whatsapp'

export default async function WhatsAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const ahora = new Date()
  const manana = new Date(ahora)
  manana.setDate(manana.getDate() + 1)

  // --- Citas de mañana: recordatorio 24h antes ---
  const inicioManana = new Date(manana)
  inicioManana.setHours(0, 0, 0, 0)
  const finManana = new Date(manana)
  finManana.setHours(23, 59, 59, 999)

  const { data: citasManana } = await supabase
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('user_id', user!.id)
    .eq('estado_sesion', 'pendiente')
    .gte('fecha_inicio', inicioManana.toISOString())
    .lte('fecha_inicio', finManana.toISOString())

  // --- Pagos pendientes: citas hace más de 3 días sin pagar ---
  const hace3Dias = new Date(ahora)
  hace3Dias.setDate(hace3Dias.getDate() - 3)

  const { data: pagosPendientes } = await supabase
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('user_id', user!.id)
    .eq('estado_sesion', 'asistio')
    .eq('estado_pago', 'pendiente')
    .lte('fecha_inicio', hace3Dias.toISOString())

  // --- Pacientes inactivos: sin cita en los últimos 20 días ---
  const { data: allPatients } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', user!.id)

  // Para cada paciente, buscamos su última cita
  const pacientesInactivos: { patient: Patient; dias: number }[] = []

  for (const patient of (allPatients ?? [])) {
    const { data: lastApt } = await supabase
      .from('appointments')
      .select('fecha_inicio')
      .eq('patient_id', patient.id)
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .single()

    if (lastApt) {
      const dias = Math.floor(
        (ahora.getTime() - new Date(lastApt.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (dias >= 20) {
        pacientesInactivos.push({ patient: patient as Patient, dias })
      }
    }
  }

  const totalAlertas = (citasManana?.length ?? 0) + (pagosPendientes?.length ?? 0) + pacientesInactivos.length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-800">WhatsApp</h1>
        <p className="text-stone-500 text-sm mt-1">
          {totalAlertas === 0
            ? 'Todo al día — no hay alertas pendientes ✓'
            : `${totalAlertas} mensajes sugeridos hoy`}
        </p>
      </div>

      <div className="space-y-6">

        {/* SECCIÓN 1: Recordatorios de citas de mañana */}
        <Section
          icon={<Clock size={18} />}
          title="Recordatorio de cita"
          subtitle="Citas para mañana"
          color="blue"
        >
          {citasManana?.length === 0 && <EmptyState text="No hay citas mañana" />}
          {(citasManana as (Appointment & { patient: Patient })[])?.map((apt) => (
            <AlertCard
              key={apt.id}
              nombre={`${apt.patient.nombre} ${apt.patient.apellido}`}
              detalle={new Date(apt.fecha_inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + ' — mañana'}
              link={linkRecordatorioCita(apt.patient, apt)}
              tieneWhatsApp={!!apt.patient.whatsapp}
            />
          ))}
        </Section>

        {/* SECCIÓN 2: Pagos pendientes */}
        <Section
          icon={<CreditCard size={18} />}
          title="Pago pendiente"
          subtitle="Más de 3 días sin confirmar"
          color="yellow"
        >
          {pagosPendientes?.length === 0 && <EmptyState text="Sin pagos pendientes" />}
          {(pagosPendientes as (Appointment & { patient: Patient })[])?.map((apt) => (
            <AlertCard
              key={apt.id}
              nombre={`${apt.patient.nombre} ${apt.patient.apellido}`}
              detalle={`Sesión del ${new Date(apt.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`}
              link={linkPagoPendiente(apt.patient, apt)}
              tieneWhatsApp={!!apt.patient.whatsapp}
            />
          ))}
        </Section>

        {/* SECCIÓN 3: Pacientes inactivos */}
        <Section
          icon={<UserX size={18} />}
          title="Paciente inactivo"
          subtitle="Más de 20 días sin cita"
          color="orange"
        >
          {pacientesInactivos.length === 0 && <EmptyState text="Todos los pacientes activos" />}
          {pacientesInactivos.map(({ patient, dias }) => (
            <AlertCard
              key={patient.id}
              nombre={`${patient.nombre} ${patient.apellido}`}
              detalle={`${dias} días sin cita`}
              link={linkPacienteInactivo(patient, dias)}
              tieneWhatsApp={!!patient.whatsapp}
            />
          ))}
        </Section>

      </div>
    </div>
  )
}

// --- Componentes auxiliares de UI ---

function Section({ icon, title, subtitle, color, children }: {
  icon: React.ReactNode
  title: string
  subtitle: string
  color: 'blue' | 'yellow' | 'orange'
  children: React.ReactNode
}) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
        <span className={`p-2 rounded-lg ${colors[color]}`}>{icon}</span>
        <div>
          <p className="font-medium text-stone-800 text-sm">{title}</p>
          <p className="text-xs text-stone-400">{subtitle}</p>
        </div>
      </div>
      <div className="divide-y divide-stone-50">{children}</div>
    </div>
  )
}

function AlertCard({ nombre, detalle, link, tieneWhatsApp }: {
  nombre: string
  detalle: string
  link: string
  tieneWhatsApp: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="font-medium text-stone-800 text-sm">{nombre}</p>
        <p className="text-xs text-stone-400 mt-0.5">{detalle}</p>
      </div>
      {tieneWhatsApp ? (
        // El link abre WhatsApp con el mensaje ya escrito — un solo tap para enviar
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-medium transition-colors"
        >
          <MessageCircle size={14} />
          Enviar
        </a>
      ) : (
        <span className="text-xs text-stone-400 italic">Sin WhatsApp</span>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-center text-stone-400 text-sm py-4">{text} ✓</p>
}
