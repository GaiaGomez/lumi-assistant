export const dynamic = 'force-dynamic'
// ============================================================
// PERFIL DE PACIENTE — historial de citas y notas clínicas
// [id] = parámetro dinámico de la URL: /pacientes/uuid-del-paciente
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, MessageCircle } from 'lucide-react'
import { Patient, Appointment, ClinicalNote } from '@/types'
import { linkPacienteInactivo } from '@/lib/whatsapp'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PatientProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Cargamos el paciente, sus citas y sus notas clínicas en paralelo
  // Promise.all ejecuta las 3 queries al mismo tiempo (más rápido que secuencial)
  const [{ data: patient }, { data: appointments }, { data: notes }] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase.from('appointments').select('*').eq('patient_id', id).order('fecha_inicio', { ascending: false }),
    supabase.from('clinical_notes').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
  ])

  if (!patient) notFound()

  // Calcular días desde la última cita
  const ultimaCita = appointments?.[0]
  const diasSinCita = ultimaCita
    ? Math.floor((Date.now() - new Date(ultimaCita.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const p = patient as Patient

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pacientes"
          className="p-2.5 rounded-2xl transition-colors"
          style={{ background: 'rgba(200,198,208,0.35)' }}>
          <ArrowLeft size={20} style={{ color: '#555555' }} />
        </Link>
        <div className="flex-1">
          {/* Avatar + nombre en línea */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #C4B0C8 0%, #9A9AB8 100%)' }}>
              <span className="text-white font-medium">{p.nombre[0]}{p.apellido[0]}</span>
            </div>
            <div>
              <h1 className="text-xl font-light tracking-tight" style={{ color: '#111111' }}>
                {p.nombre} {p.apellido}
              </h1>
              {diasSinCita !== null && (
                <p className="text-sm mt-0.5" style={{ color: diasSinCita > 20 ? '#C06060' : '#666666' }}>
                  Última cita: hace {diasSinCita} días
                </p>
              )}
            </div>
          </div>
        </div>
        {/* WhatsApp rápido si lleva más de 20 días — verde de WA se mantiene */}
        {diasSinCita && diasSinCita > 20 && p.whatsapp && (
          <a
            href={linkPacienteInactivo(p, diasSinCita)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4CAF6B 0%, #3D9E59 100%)', color: 'white' }}
          >
            <MessageCircle size={16} />
            Contactar
          </a>
        )}
      </div>

      {/* Historial de notas clínicas */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-sm tracking-widest uppercase" style={{ color: '#888888' }}>
            Notas clínicas
          </h2>
          <Link
            href={`/historias/nueva?paciente=${id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'rgba(155, 142, 160, 0.90)', color: 'white' }}
          >
            <Plus size={14} />
            Nueva nota
          </Link>
        </div>

        <div className="space-y-2">
          {(notes as ClinicalNote[])?.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: '#AAAAAA' }}>
              No hay notas clínicas aún
            </p>
          )}
          {(notes as ClinicalNote[])?.map((note) => (
            <Link
              key={note.id}
              href={`/historias/${note.id}`}
              className="block p-4 glass rounded-2xl transition-all"
            >
              <p className="text-xs mb-1.5 capitalize" style={{ color: '#AAAAAA' }}>
                {new Date(note.created_at).toLocaleDateString('es-CO', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
              {note.texto && (
                <p className="text-sm line-clamp-2" style={{ color: '#333333' }}>{note.texto}</p>
              )}
              {note.canvas_url && (
                <p className="text-xs mt-1.5" style={{ color: '#AAAAAA' }}>📝 Nota manuscrita adjunta</p>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Historial de citas */}
      <div>
        <h2 className="font-medium text-sm tracking-widest uppercase mb-3" style={{ color: '#888888' }}>
          Historial de citas
        </h2>
        <div className="space-y-2">
          {(appointments as Appointment[])?.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: '#AAAAAA' }}>Sin citas registradas</p>
          )}
          {(appointments as Appointment[])?.map((apt) => (
            <div key={apt.id}
              className="flex items-center justify-between p-4 glass rounded-2xl">
              <p className="text-sm" style={{ color: '#333333' }}>
                {new Date(apt.fecha_inicio).toLocaleDateString('es-CO', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
              <div className="flex gap-1.5">
                {/* Badge estado sesión — colores semánticos muted */}
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={apt.estado_sesion === 'asistio'
                    ? { background: 'rgba(130,162,158,0.20)', color: '#2A5A55' }
                    : apt.estado_sesion === 'cancelo'
                    ? { background: 'rgba(195,155,155,0.25)', color: '#7A2E2E' }
                    : apt.estado_sesion === 'no_asistio'
                    ? { background: 'rgba(180,168,130,0.22)', color: '#6A4E18' }
                    : { background: 'rgba(158,152,165,0.20)', color: '#555555' }
                  }>
                  {apt.estado_sesion === 'asistio' ? 'Asistió' :
                   apt.estado_sesion === 'cancelo' ? 'Canceló' :
                   apt.estado_sesion === 'no_asistio' ? 'No asistió' : 'Pendiente'}
                </span>
                {/* Badge pago */}
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={apt.estado_pago === 'pagado'
                    ? { background: 'rgba(130,162,158,0.20)', color: '#2A5A55' }
                    : { background: 'rgba(185,172,135,0.22)', color: '#6A4E18' }
                  }>
                  {apt.estado_pago === 'pagado' ? '✓ Pagado' : '⏳ Pendiente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
