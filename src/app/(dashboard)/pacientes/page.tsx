export const dynamic = 'force-dynamic'
// ============================================================
// PACIENTES PAGE — lista de todos los pacientes
// Server Component: carga datos antes de renderizar
// ============================================================

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { UserPlus, ChevronRight } from 'lucide-react'
import { Patient } from '@/types'
import Avatar from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'

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
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="editorial-panel-title text-[1.8rem] leading-none" style={{ color: 'var(--ink-cool-strong)' }}>
            Pacientes
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--ink-cool-soft)' }}>
            {patients?.length ?? 0} paciente{(patients?.length ?? 0) === 1 ? '' : 's'} registrado{(patients?.length ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        <Link
          href="/pacientes/nuevo"
          className="btn-action gap-2"
          style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
        >
          <UserPlus size={15} />
          Nuevo
        </Link>
      </div>

      {/* ── Lista ── */}
      <div className="space-y-2">
        {patients?.length === 0 && (
          <EmptyState
            message="Aún no hay pacientes"
            hint="Toca «Nuevo» para agregar el primero"
            size="md"
          />
        )}

        {patients?.map((patient: Patient) => (
          <Link
            key={patient.id}
            href={`/pacientes/${patient.id}`}
            className="glass-cool rounded-[16px] flex items-center justify-between p-4 transition-all hover:translate-y-[-1px]"
          >
            <div className="flex items-center gap-3">
              <Avatar nombre={patient.nombre} apellido={patient.apellido} size="lg" />
              <div>
                <p className="font-medium text-[14px]" style={{ color: 'var(--ink-cool-strong)' }}>
                  {patient.nombre} {patient.apellido}
                </p>
                {patient.whatsapp && (
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--ink-cool-soft)' }}>
                    +{patient.whatsapp}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight size={17} style={{ color: 'var(--ink-cool-muted)' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
