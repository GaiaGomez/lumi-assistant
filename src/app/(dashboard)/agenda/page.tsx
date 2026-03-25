// ============================================================
// AGENDA PAGE — muestra el calendario con las citas
// Server Component: carga las citas desde Supabase antes de renderizar
// ============================================================

import { createClient } from '@/lib/supabase/server'
import AgendaClient from '@/components/agenda/AgendaClient'
import { Appointment } from '@/types'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Cargamos todas las citas del usuario con los datos del paciente incluidos
  // .select('*, patient:patients(*)') hace un JOIN automático de appointments con patients
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*, patient:patients(*)')
    .eq('user_id', user!.id)
    .order('fecha_inicio', { ascending: true })

  if (error) {
    console.error('Error cargando citas:', error)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-800">Agenda</h1>
        <p className="text-stone-500 text-sm mt-1">Tus citas y sesiones</p>
      </div>

      {/* AgendaClient es el componente interactivo del calendario */}
      {/* Recibe las citas como prop porque es un Client Component */}
      <AgendaClient appointments={(appointments as Appointment[]) ?? []} />
    </div>
  )
}
