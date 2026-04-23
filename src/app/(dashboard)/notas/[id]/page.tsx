export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getSessionNoteById } from '@/lib/notes/actions'
import { createClient } from '@/lib/supabase/server'
import PageBlobs from '@/components/ui/PageBlobs'
import SessionNote from '@/components/notes/SessionNote'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NotaPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const note = await getSessionNoteById(id)
  if (!note) notFound()

  const { data: patient } = await supabase
    .from('patients')
    .select('nombre, apellido')
    .eq('id', note.patientId)
    .single()

  const patientName = patient
    ? `${patient.nombre} ${patient.apellido}`
    : 'Paciente'

  return (
    <div className="relative pb-6">
      <PageBlobs />

      <div className="mb-2 flex items-center gap-3">
        <Link
          href={`/pacientes/${note.patientId}`}
          className="btn-subtle flex h-8 w-8 shrink-0 items-center justify-center"
        >
          <ArrowLeft size={14} />
        </Link>
        <div>
          <p className="section-kicker mb-0.5">{patientName}</p>
          <h1 className="page-title text-[1.6rem] leading-none">
            Sesión #{note.sessionNumber ?? '—'}
          </h1>
        </div>
      </div>

      <div className="glass-cool rounded-[18px] overflow-hidden">
        <SessionNote noteId={id} patientName={patientName} />
      </div>
    </div>
  )
}
