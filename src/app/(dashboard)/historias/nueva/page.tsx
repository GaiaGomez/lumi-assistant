import ClinicalNoteEditor from '@/components/historias/ClinicalNoteEditor'

interface Props {
  searchParams: Promise<{ paciente?: string }>
}

export default async function NuevaHistoriaPage({ searchParams }: Props) {
  const { paciente } = await searchParams

  return <ClinicalNoteEditor mode="create" patientId={paciente ?? null} />
}
