// ============================================================
// PACIENTES PAGE — lista de todos los pacientes
// Server Component: carga datos antes de renderizar
// ============================================================

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserPlus, ChevronRight } from 'lucide-react'
import { Patient } from '@/types'

export default async function PacientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: patients } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', user!.id)
    .order('apellido', { ascending: true })

  return (
    <div>
      {/* Header con botón de agregar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Pacientes</h1>
          <p className="text-stone-500 text-sm mt-1">
            {patients?.length ?? 0} pacientes registrados
          </p>
        </div>
        <Link
          href="/pacientes/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-900 transition-colors"
        >
          <UserPlus size={16} />
          Nuevo
        </Link>
      </div>

      {/* Lista de pacientes */}
      <div className="space-y-2">
        {patients?.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <p className="text-lg mb-1">Aún no hay pacientes</p>
            <p className="text-sm">Toca "Nuevo" para agregar el primero</p>
          </div>
        )}

        {patients?.map((patient: Patient) => (
          <Link
            key={patient.id}
            href={`/pacientes/${patient.id}`}
            className="flex items-center justify-between p-4 bg-white rounded-xl border border-stone-200 hover:border-stone-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Avatar con iniciales */}
              <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-stone-600 font-medium text-sm">
                  {patient.nombre[0]}{patient.apellido[0]}
                </span>
              </div>
              <div>
                <p className="font-medium text-stone-800">
                  {patient.nombre} {patient.apellido}
                </p>
                {patient.whatsapp && (
                  <p className="text-stone-400 text-sm">+{patient.whatsapp}</p>
                )}
              </div>
            </div>
            <ChevronRight size={18} className="text-stone-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}
