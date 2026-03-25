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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pacientes" className="p-2 hover:bg-stone-100 rounded-lg">
          <ArrowLeft size={20} className="text-stone-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-stone-800">
            {(patient as Patient).nombre} {(patient as Patient).apellido}
          </h1>
          {diasSinCita !== null && (
            <p className={`text-sm mt-0.5 ${diasSinCita > 20 ? 'text-orange-500' : 'text-stone-500'}`}>
              Última cita: hace {diasSinCita} días
            </p>
          )}
        </div>
        {/* WhatsApp rápido si lleva más de 20 días */}
        {diasSinCita && diasSinCita > 20 && (patient as Patient).whatsapp && (
          <a
            href={linkPacienteInactivo(patient as Patient, diasSinCita)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-medium"
          >
            <MessageCircle size={16} />
            Contactar
          </a>
        )}
      </div>

      {/* Historial de notas clínicas */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-700">Notas clínicas</h2>
          <Link
            href={`/historias/nueva?paciente=${id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 text-white rounded-lg text-sm font-medium"
          >
            <Plus size={14} />
            Nueva nota
          </Link>
        </div>

        <div className="space-y-2">
          {(notes as ClinicalNote[])?.length === 0 && (
            <p className="text-stone-400 text-sm py-4 text-center">No hay notas clínicas aún</p>
          )}
          {(notes as ClinicalNote[])?.map((note) => (
            <Link
              key={note.id}
              href={`/historias/${note.id}`}
              className="block p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-300 transition-colors"
            >
              <p className="text-xs text-stone-400 mb-1">
                {new Date(note.created_at).toLocaleDateString('es-CO', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
              {note.texto && (
                <p className="text-stone-700 text-sm line-clamp-2">{note.texto}</p>
              )}
              {note.canvas_url && (
                <p className="text-stone-400 text-xs mt-1">📝 Nota manuscrita adjunta</p>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Historial de citas */}
      <div>
        <h2 className="font-semibold text-stone-700 mb-3">Historial de citas</h2>
        <div className="space-y-2">
          {(appointments as Appointment[])?.map((apt) => (
            <div key={apt.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-stone-200">
              <p className="text-sm text-stone-700">
                {new Date(apt.fecha_inicio).toLocaleDateString('es-CO', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  apt.estado_sesion === 'asistio' ? 'bg-green-100 text-green-700' :
                  apt.estado_sesion === 'cancelo' ? 'bg-red-100 text-red-700' :
                  apt.estado_sesion === 'no_asistio' ? 'bg-orange-100 text-orange-700' :
                  'bg-stone-100 text-stone-600'
                }`}>
                  {apt.estado_sesion === 'asistio' ? 'Asistió' :
                   apt.estado_sesion === 'cancelo' ? 'Canceló' :
                   apt.estado_sesion === 'no_asistio' ? 'No asistió' : 'Pendiente'}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  apt.estado_pago === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {apt.estado_pago === 'pagado' ? 'Pagado' : 'Pendiente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
