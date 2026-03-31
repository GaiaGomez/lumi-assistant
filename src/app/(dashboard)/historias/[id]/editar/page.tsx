import ClinicalNoteEditor from '@/components/historias/ClinicalNoteEditor'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarHistoriaPage({ params }: Props) {
  const { id } = await params

  return <ClinicalNoteEditor mode="edit" noteId={id} />
}
