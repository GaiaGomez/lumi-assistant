interface PatientCaseNotesCardProps {
  generalNotes: string | null
}

export default function PatientCaseNotesCard({ generalNotes }: PatientCaseNotesCardProps) {
  return (
    <div
      className="rounded-[16px] px-3 py-2.5"
      style={{
        background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
        border: '1px solid var(--border-glass-white)',
        boxShadow: 'var(--shadow-glass)',
        backdropFilter: 'blur(20px) saturate(140%)',
      }}
    >
      {generalNotes ? (
        <p className="text-[14px] whitespace-pre-wrap leading-6" style={{ color: 'var(--ink-cool-soft)' }}>
          {generalNotes}
        </p>
      ) : (
        <p className="text-[14px] leading-6" style={{ color: 'var(--ink-cool-faint)' }}>
          Sin notas generales.
        </p>
      )}
    </div>
  )
}
