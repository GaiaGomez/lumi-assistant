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
        <h1 className="text-2xl font-light tracking-tight" style={{ color: '#2D2520' }}>WhatsApp</h1>
        <p className="text-sm mt-1" style={{ color: '#9C8878' }}>
          {totalAlertas === 0
            ? 'Todo al día — no hay alertas pendientes 🌿'
            : `${totalAlertas} mensajes sugeridos hoy`}
        </p>
      </div>

      <div className="space-y-4">

        {/* SECCIÓN 1: Recordatorios de citas de mañana */}
        <Section
          icon={<Clock size={17} />}
          title="Recordatorio de cita"
          subtitle="Citas para mañana"
          iconBg="rgba(196,168,130,0.2)"
          iconColor="#8B7355"
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
          icon={<CreditCard size={17} />}
          title="Pago pendiente"
          subtitle="Más de 3 días sin confirmar"
          iconBg="rgba(220,180,100,0.2)"
          iconColor="#8B6914"
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
          icon={<UserX size={17} />}
          title="Paciente inactivo"
          subtitle="Más de 20 días sin cita"
          iconBg="rgba(220,160,120,0.2)"
          iconColor="#8B5E2A"
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

// --- Componentes auxiliares de UI — glassmorphism tierra/sage ---

function Section({ icon, title, subtitle, iconBg, iconColor, children }: {
  icon: React.ReactNode
  title: string
  subtitle: string
  iconBg: string
  iconColor: string
  children: React.ReactNode
}) {
  return (
    <div className="glass rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(217,201,184,0.35)' }}>
      {/* Header de la sección */}
      <div className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid rgba(217,201,184,0.25)' }}>
        <span className="p-2 rounded-xl" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </span>
        <div>
          <p className="font-medium text-sm" style={{ color: '#2D2520' }}>{title}</p>
          <p className="text-xs" style={{ color: '#B4A494' }}>{subtitle}</p>
        </div>
      </div>
      {/* Items de la sección — separados por línea sutil */}
      <div>{children}</div>
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
    <div className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: '1px solid rgba(217,201,184,0.15)' }}>
      <div>
        <p className="font-medium text-sm" style={{ color: '#2D2520' }}>{nombre}</p>
        <p className="text-xs mt-0.5" style={{ color: '#B4A494' }}>{detalle}</p>
      </div>
      {tieneWhatsApp ? (
        // El link abre WhatsApp con el mensaje ya escrito — un solo tap para enviar
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #4CAF6B 0%, #3D9E59 100%)', color: 'white' }}
        >
          <MessageCircle size={13} />
          Enviar
        </a>
      ) : (
        <span className="text-xs italic" style={{ color: '#C4B4A4' }}>Sin WhatsApp</span>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-center text-sm py-4" style={{ color: '#C4B4A4' }}>{text} ✓</p>
}
