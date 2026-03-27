interface PatientCaseNotesCardProps {
  generalNotes: string | null
}

export default function PatientCaseNotesCard({ generalNotes }: PatientCaseNotesCardProps) {
  return (
    <div
      className="rounded-[16px] px-3 py-2.5"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.38) 100%)',
        border: '1px solid rgba(255,255,255,0.42)',
        boxShadow: '0 10px 40px rgba(124, 108, 128, 0.10)',
        backdropFilter: 'blur(20px) saturate(140%)',
      }}
    >
      {generalNotes ? (
        <p className="text-[14px] whitespace-pre-wrap leading-6" style={{ color: '#635965' }}>
          {generalNotes}
        </p>
      ) : (
        <p className="text-[14px] leading-6" style={{ color: '#7E7381' }}>
          Sin notas generales.
        </p>
      )}
    </div>
  )
}
