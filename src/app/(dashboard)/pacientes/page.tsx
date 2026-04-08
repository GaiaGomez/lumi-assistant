export const dynamic = 'force-dynamic'
// ============================================================
// PACIENTES PAGE — lista de todos los pacientes
// Server Component: carga datos antes de renderizar
// ============================================================

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import PatientsListClient from '@/components/pacientes/PatientsListClient'

export default async function PacientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: patients } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', user!.id)
    .order('nombre', { ascending: true })
    .order('apellido', { ascending: true })

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title text-[1.6rem] leading-none">
            Pacientes
          </h1>
          <p className="page-subtitle mt-1">
            {patients?.length ?? 0} paciente{(patients?.length ?? 0) === 1 ? '' : 's'} registrado{(patients?.length ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/pacientes/nuevo"
          className="btn-action gap-2 px-4 py-2 text-[14px]"
        >
          <UserPlus size={14} />
          Nuevo
        </Link>
      </div>

      <PatientsListClient patients={patients ?? []} />
    </div>
  )
}
