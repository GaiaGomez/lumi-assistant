import Card from '@/components/ui/Card'

interface PatientCaseNotesCardProps {
  generalNotes: string | null
}

export default function PatientCaseNotesCard({ generalNotes }: PatientCaseNotesCardProps) {
  return (
    <Card radius="sm" className="px-3 py-2.5">
      {generalNotes ? (
        <p className="text-[14px] whitespace-pre-wrap leading-6" style={{ color: 'var(--ink-cool-soft)' }}>
          {generalNotes}
        </p>
      ) : (
        <p className="text-[14px] leading-6" style={{ color: 'var(--ink-cool-faint)' }}>
          Sin notas generales.
        </p>
      )}
    </Card>
  )
}
