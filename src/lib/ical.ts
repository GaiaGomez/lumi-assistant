// ============================================================
// iCAL PARSER — lee el feed de Doctoralia y convierte a Appointments
// ical.js: librería que parsea el formato iCalendar (.ics)
// ============================================================

import ICAL from 'ical.js'
import { Appointment } from '@/types'

// Lee la URL del feed iCal de Doctoralia y devuelve citas parseadas
// La URL del feed la consigue Lu en su panel de Doctoralia → Configuración → Exportar agenda
export async function fetchDoctoraliaCitas(icalUrl: string, userId: string): Promise<Partial<Appointment>[]> {
  // Fetch del contenido .ics (texto plano con formato iCalendar)
  const response = await fetch(icalUrl, { next: { revalidate: 300 } }) // cache 5 minutos
  if (!response.ok) throw new Error('No se pudo obtener el calendario de Doctoralia')

  const icsText = await response.text()

  // Parseamos el texto iCal con ical.js
  const jcalData = ICAL.parse(icsText)         // convierte el texto a estructura JSON interna
  const comp = new ICAL.Component(jcalData)     // crea un componente iCal navegable
  const vevents = comp.getAllSubcomponents('vevent') // extrae todos los eventos (citas)

  // Transformamos cada evento iCal a nuestro formato Appointment
  return vevents.map((vevent) => {
    const event = new ICAL.Event(vevent)

    return {
      user_id: userId,
      doctoralia_uid: event.uid,                    // ID único del evento en Doctoralia
      fecha_inicio: event.startDate.toJSDate().toISOString(),
      fecha_fin: event.endDate?.toJSDate().toISOString() ?? null,
      notas: event.summary ?? null,                 // el nombre del paciente suele estar en summary
      estado_sesion: 'pendiente' as const,
      estado_pago: 'pendiente' as const,
    }
  })
}
