export const dynamic = 'force-dynamic'
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
          <h1 className="text-2xl font-light tracking-tight" style={{ color: '#111111' }}>
            Pacientes
          </h1>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>
            {patients?.length ?? 0} pacientes registrados
          </p>
        </div>
        {/* Botón Nuevo — glass gris con toque rose sutil */}
        <Link
          href="/pacientes/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: 'rgba(155, 142, 160, 0.90)', color: 'white' }}
        >
          <UserPlus size={16} />
          Nuevo
        </Link>
      </div>

      {/* Lista de pacientes */}
      <div className="space-y-2">
        {patients?.length === 0 && (
          <div className="text-center py-16" style={{ color: '#AAAAAA' }}>
            <p className="text-lg mb-1">Aún no hay pacientes</p>
            <p className="text-sm">Toca &quot;Nuevo&quot; para agregar el primero 🌿</p>
          </div>
        )}

        {patients?.map((patient: Patient) => (
          <Link
            key={patient.id}
            href={`/pacientes/${patient.id}`}
            className="flex items-center justify-between p-4 glass rounded-2xl transition-all"
          >
            <div className="flex items-center gap-3">
              {/* Avatar con iniciales — gradiente rose-lavender */}
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #C4B0C8 0%, #9A9AB8 100%)' }}>
                <span className="text-white font-medium text-sm">
                  {patient.nombre[0]}{patient.apellido[0]}
                </span>
              </div>
              <div>
                <p className="font-medium" style={{ color: '#111111' }}>
                  {patient.nombre} {patient.apellido}
                </p>
                {patient.whatsapp && (
                  <p className="text-sm" style={{ color: '#888888' }}>+{patient.whatsapp}</p>
                )}
              </div>
            </div>
            <ChevronRight size={18} style={{ color: '#CCCCCC' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
