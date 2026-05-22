export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPatientClinicalProfile } from '@/lib/patients/clinical-profile.server'
import { getPatientNotes } from '@/lib/notes/actions'
import { fetchSettings } from '@/lib/settings'
import { resolveProfileIdentity } from '@/lib/profile'
import { mapPatientRow } from '@/lib/supabase/mappers'
import PrintButton from '@/components/export/PrintButton'

interface Props {
  params: Promise<{ patientId: string }>
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ExportPage({ params }: Props) {
  const { patientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: patientRow }, clinicalProfile, allNotes, settings] = await Promise.all([
    supabase.from('patients').select('*').eq('id', patientId).single(),
    getPatientClinicalProfile(patientId),
    getPatientNotes(patientId),
    fetchSettings(supabase, user.id),
  ])

  if (!patientRow) notFound()

  const patient = mapPatientRow(patientRow)
  const identity = resolveProfileIdentity(user, settings)

  // Solo notas firmadas, en orden cronológico ascendente
  const signedNotes = allNotes
    .filter((n) => n.status === 'signed')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const exportDate = new Date().toLocaleString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <>
      {/* Print button — oculto en impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .dashboard-shell-main { margin-left: 0 !important; padding: 0 !important; }
        }
        @page { margin: 2cm; }
        .print-page { max-width: 720px; margin: 0 auto; font-family: Georgia, serif; color: #1a1a1a; }
        .print-section { border-top: 1px solid #ddd; padding-top: 1rem; margin-top: 1rem; }
        .print-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #888; margin-bottom: 2px; font-family: system-ui, sans-serif; }
        .print-value { font-size: 14px; line-height: 1.5; }
        .print-note { border: 1px solid #e5e5e5; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
        .print-note-field { margin-bottom: 0.75rem; }
      `}</style>

      <div className="no-print mb-4 flex items-center gap-3">
        <a
          href={`/pacientes/${patientId}`}
          className="btn-subtle px-3 py-1.5 text-[12px]"
        >
          ← Volver al paciente
        </a>
        <PrintButton />
        <p className="text-[12px]" style={{ color: 'var(--ink-cool-faint)' }}>
          En el diálogo de impresión, elige "Guardar como PDF".
        </p>
      </div>

      <div className="print-page glass-cool rounded-[18px] p-6">
        {/* ── Encabezado ── */}
        <div style={{ borderBottom: '2px solid #e0daea', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <p className="print-label">Historia clínica · Exportado el {exportDate}</p>
          <h1 style={{ fontSize: '1.6rem', fontFamily: 'Georgia, serif', margin: '0.25rem 0 0' }}>
            {patient.nombre} {patient.apellido}
          </h1>
          <p className="print-value" style={{ marginTop: '0.25rem', color: '#555' }}>
            Profesional: {identity.displayName}
            {identity.email ? ` · ${identity.email}` : ''}
          </p>
        </div>

        {/* ── Datos del paciente ── */}
        <div className="print-section">
          <p className="print-label" style={{ marginBottom: '0.5rem' }}>Datos del paciente</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {clinicalProfile?.documento && (
              <div>
                <p className="print-label">Documento</p>
                <p className="print-value">{clinicalProfile.documento}</p>
              </div>
            )}
            {clinicalProfile?.birth_date && (
              <div>
                <p className="print-label">Fecha de nacimiento</p>
                <p className="print-value">{formatDate(clinicalProfile.birth_date)}</p>
              </div>
            )}
            {patient.telefono && (
              <div>
                <p className="print-label">Teléfono</p>
                <p className="print-value">{patient.telefono}</p>
              </div>
            )}
            {(clinicalProfile?.email ?? patient.email) && (
              <div>
                <p className="print-label">Correo</p>
                <p className="print-value">{clinicalProfile?.email ?? patient.email}</p>
              </div>
            )}
            {patient.fecha_inicio && (
              <div>
                <p className="print-label">Inicio del proceso</p>
                <p className="print-value">{formatDate(patient.fecha_inicio)}</p>
              </div>
            )}
            {clinicalProfile?.diagnoses && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="print-label">Diagnósticos</p>
                <p className="print-value">{clinicalProfile.diagnoses}</p>
              </div>
            )}
            {clinicalProfile?.consultation_reason && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="print-label">Motivo de consulta</p>
                <p className="print-value">{clinicalProfile.consultation_reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Consentimientos ── */}
        <div className="print-section">
          <p className="print-label" style={{ marginBottom: '0.5rem' }}>Consentimientos</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <p className="print-label">Consentimiento informado</p>
              <p className="print-value">
                {clinicalProfile?.informed_consent_status === 'signed'
                  ? `Firmado el ${formatDateTime(clinicalProfile.informed_consent_signed_at)}${clinicalProfile.consent_version ? ` (${clinicalProfile.consent_version})` : ''}`
                  : clinicalProfile?.informed_consent_status === 'not_required'
                  ? 'No aplica'
                  : 'Pendiente'}
              </p>
            </div>
            <div>
              <p className="print-label">Autorización tratamiento de datos</p>
              <p className="print-value">
                {clinicalProfile?.data_processing_authorization_status === 'authorized'
                  ? `Autorizado el ${formatDateTime(clinicalProfile.data_processing_authorized_at)}`
                  : 'Pendiente'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Notas firmadas ── */}
        <div className="print-section">
          <p className="print-label" style={{ marginBottom: '0.75rem' }}>
            Notas de sesión firmadas ({signedNotes.length})
          </p>

          {signedNotes.length === 0 && (
            <p className="print-value" style={{ color: '#aaa' }}>
              No hay notas firmadas para este paciente.
            </p>
          )}

          {signedNotes.map((note) => (
            <div key={note.id} className="print-note">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', fontWeight: 600, color: '#9488B0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Sesión #{note.sessionNumber ?? '—'}
                  </p>
                  <p style={{ fontSize: '14px', color: '#555', fontFamily: 'system-ui, sans-serif' }}>
                    {formatDate(note.createdAt)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#aaa', fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Firmada</p>
                  <p style={{ fontSize: '13px', color: '#555', fontFamily: 'system-ui, sans-serif' }}>
                    {formatDateTime(note.signedAt)}
                  </p>
                </div>
              </div>

              {note.comoLlego && (
                <div className="print-note-field">
                  <p className="print-label">¿Cómo llegó?</p>
                  <p className="print-value" style={{ whiteSpace: 'pre-wrap' }}>{note.comoLlego}</p>
                </div>
              )}
              {note.queTrabajaron && (
                <div className="print-note-field">
                  <p className="print-label">¿Qué trabajaron?</p>
                  <p className="print-value" style={{ whiteSpace: 'pre-wrap' }}>{note.queTrabajaron}</p>
                </div>
              )}
              {note.comoVaProceso && (
                <div className="print-note-field">
                  <p className="print-label">¿Cómo va el proceso?</p>
                  <p className="print-value" style={{ whiteSpace: 'pre-wrap' }}>{note.comoVaProceso}</p>
                </div>
              )}
              {note.queSigue && (
                <div className="print-note-field" style={{ marginBottom: 0 }}>
                  <p className="print-label">¿Qué sigue?</p>
                  <p className="print-value" style={{ whiteSpace: 'pre-wrap' }}>{note.queSigue}</p>
                </div>
              )}

              {/* Canvas/apunte privado: excluido intencionalmente */}
            </div>
          ))}
        </div>

        {/* ── Pie ── */}
        <div style={{ borderTop: '1px solid #e0daea', marginTop: '2rem', paddingTop: '1rem' }}>
          <p style={{ fontSize: '11px', color: '#aaa', fontFamily: 'system-ui, sans-serif' }}>
            Documento generado por Lumi · {exportDate} · Solo incluye notas con estado firmado
          </p>
        </div>
      </div>
    </>
  )
}
