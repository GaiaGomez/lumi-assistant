export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPatientClinicalProfile } from '@/lib/patients/clinical-profile.server'
import { getPatientNotes } from '@/lib/notes/actions'
import { fetchSettings } from '@/lib/settings'
import { mapPatientRow } from '@/lib/supabase/mappers'
import { getProfessionalSignatureUrl } from '@/lib/profile/signature'
import PrintButton from '@/components/export/PrintButton'

interface Props {
  params: Promise<{ patientId: string }>
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtModalidad(m: string | null | undefined) {
  if (m === 'virtual') return 'Virtual'
  if (m === 'presencial') return 'Presencial'
  return null
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

  // Solo notas firmadas, orden cronológico ascendente
  const signedNotes = allNotes
    .filter((n) => n.status === 'signed')
    .sort((a, b) => {
      const dateA = a.sessionDate ?? a.createdAt
      const dateB = b.sessionDate ?? b.createdAt
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

  // Firma profesional (signed URL temporal)
  let signatureUrl: string | null = null
  if (settings.professional_signature_path) {
    try {
      signatureUrl = await getProfessionalSignatureUrl(supabase, settings.professional_signature_path, 300)
    } catch {
      // no crítico
    }
  }

  const exportDate = new Date().toLocaleString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const professionalName = settings.professional_full_name || settings.perfil_nombre_mostrado || user.email || ''
  const professionalTitle = settings.professional_title || ''
  const professionalLicense = settings.professional_license || ''
  const professionalEmail = settings.professional_email || ''
  const professionalCity = settings.professional_city || ''

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .dashboard-shell-nav,
          .dashboard-shell-sidebar,
          nav, header, aside { display: none !important; }
          .dashboard-shell-main {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .dashboard-shell-main > div {
            padding: 0 !important;
            max-width: 100% !important;
          }
          body { background: white !important; }
          .print-page {
            max-width: 100% !important;
            padding: 0 !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .p-session { page-break-inside: avoid; break-inside: avoid; }
        }
        @page { margin: 2cm; }
        .print-page {
          max-width: 720px;
          margin: 0 auto;
          font-family: 'Georgia', serif;
          color: #1a1a1a;
          font-size: 13px;
          line-height: 1.6;
        }
        .p-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #888;
          font-family: system-ui, sans-serif;
          margin-bottom: 2px;
        }
        .p-value { font-size: 13px; line-height: 1.5; }
        .p-section { border-top: 1px solid #ddd; padding-top: 1rem; margin-top: 1rem; }
        .p-session { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; }
        .p-session-title {
          font-size: 11px;
          font-family: system-ui, sans-serif;
          font-weight: 600;
          color: #9488B0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.5rem;
        }
        .p-field { margin-bottom: 0.85rem; }
        .p-field:last-child { margin-bottom: 0; }
        table.p-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        table.p-table td { padding: 0.3rem 0.5rem; vertical-align: top; }
        table.p-table td:first-child { width: 40%; color: #666; font-family: system-ui, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
      `}</style>

      {/* Toolbar — oculto en impresión */}
      <div className="no-print mb-4 flex items-center gap-3">
        <a href={`/pacientes/${patientId}`} className="btn-subtle px-3 py-1.5 text-[12px]">
          ← Volver al paciente
        </a>
        <PrintButton />
        <p className="text-[12px]" style={{ color: 'var(--ink-cool-faint)' }}>
          En el diálogo de impresión, elige "Guardar como PDF".
        </p>
      </div>

      <div className="print-page glass-cool rounded-[18px] p-6">

        {/* ── Encabezado institucional ── */}
        <div style={{ borderBottom: '2px solid #c8bdd4', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <p className="p-label">Registro de sesiones · Proceso terapéutico particular</p>
          <p style={{ fontSize: '11px', color: '#777', fontFamily: 'system-ui, sans-serif', marginTop: '0.5rem' }}>
            Generado el {exportDate} · Solo incluye notas con estado firmado
          </p>
        </div>

        {/* ── Datos del profesional ── */}
        {(professionalName || professionalTitle || professionalLicense) && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="p-label" style={{ marginBottom: '0.4rem' }}>Profesional</p>
            <p style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'system-ui, sans-serif', color: '#222', margin: '0 0 2px' }}>
              {professionalName}
              {professionalTitle && (
                <span style={{ fontWeight: 400, color: '#555', marginLeft: '0.5rem' }}>— {professionalTitle}</span>
              )}
            </p>
            <p style={{ fontSize: '12px', color: '#666', fontFamily: 'system-ui, sans-serif' }}>
              {[
                professionalLicense && `TP: ${professionalLicense}`,
                professionalEmail,
                professionalCity,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        )}

        {/* ── Datos del paciente ── */}
        <div className="p-section">
          <p className="p-label" style={{ marginBottom: '0.5rem' }}>Paciente</p>
          <h1 style={{ fontSize: '1.4rem', margin: '0 0 0.75rem', fontFamily: 'Georgia, serif' }}>
            {patient.nombre} {patient.apellido}
          </h1>
          <table className="p-table">
            <tbody>
              {clinicalProfile?.documento && (
                <tr><td>Documento</td><td>{clinicalProfile.documento}</td></tr>
              )}
              {clinicalProfile?.birth_date && (
                <tr><td>Fecha de nacimiento</td><td>{fmtDate(clinicalProfile.birth_date)}</td></tr>
              )}
              {patient.fecha_inicio && (
                <tr><td>Inicio del proceso</td><td>{fmtDate(patient.fecha_inicio)}</td></tr>
              )}
              {clinicalProfile?.diagnoses && (
                <tr><td>Diagnósticos</td><td>{clinicalProfile.diagnoses}</td></tr>
              )}
              {clinicalProfile?.consultation_reason && (
                <tr><td>Motivo de consulta</td><td>{clinicalProfile.consultation_reason}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Consentimientos (línea discreta) ── */}
        <div
          className="p-section"
          style={{ fontSize: '11px', color: '#888', fontFamily: 'system-ui, sans-serif' }}
        >
          <span>
            Consentimiento informado:{' '}
            {clinicalProfile?.informed_consent_status === 'signed'
              ? `✓ Firmado el ${fmtDate(clinicalProfile.informed_consent_signed_at)}`
              : clinicalProfile?.informed_consent_status === 'not_required'
              ? '— No requerido'
              : '— Pendiente'}
          </span>
          <span style={{ margin: '0 1rem' }}>·</span>
          <span>
            Autorización de datos:{' '}
            {clinicalProfile?.data_processing_authorization_status === 'authorized'
              ? `✓ Autorizado el ${fmtDate(clinicalProfile.data_processing_authorized_at)}`
              : '— Pendiente'}
          </span>
        </div>

        {/* ── Notas de sesión firmadas ── */}
        <div className="p-section">
          <p className="p-label" style={{ marginBottom: '1rem' }}>
            Notas de sesión ({signedNotes.length})
          </p>

          {signedNotes.length === 0 && (
            <p className="p-value" style={{ color: '#aaa' }}>
              No hay notas firmadas para este paciente.
            </p>
          )}

          {signedNotes.map((note, idx) => {
            const modalidad = fmtModalidad(note.sessionModality)
            const duracion = note.sessionDurationMinutes ? `${note.sessionDurationMinutes} min` : null
            const metaLine = [
              fmtDate(note.createdAt),
              modalidad,
              duracion,
            ].filter(Boolean).join(' · ')

            // Determinar si la nota tiene campos nuevos o solo legacy
            const hasNew = !!(note.sessionTopic || note.clinicalObservations || note.interventions || note.clinicalEvolution || note.therapeuticPlan)
            const hasLegacy = !!(note.comoLlego || note.queTrabajaron || note.comoVaProceso || note.queSigue)

            return (
              <div key={note.id} className="p-session">
                <p className="p-session-title">
                  Sesión N.° {idx + 1}
                </p>
                <p style={{ fontSize: '12px', color: '#666', fontFamily: 'system-ui, sans-serif', marginBottom: '0.75rem' }}>
                  {metaLine}
                  <span style={{ marginLeft: '0.75rem', color: '#aaa' }}>Firmada: {fmtDateTime(note.signedAt)}</span>
                </p>

                {note.sessionTopic && (
                  <div className="p-field">
                    <p className="p-label">Tema de sesión</p>
                    <p className="p-value">{note.sessionTopic}</p>
                  </div>
                )}

                {hasNew && (
                  <>
                    {note.clinicalObservations && (
                      <div className="p-field">
                        <p className="p-label">Observaciones clínicas</p>
                        <p className="p-value" style={{ whiteSpace: 'pre-wrap' }}>{note.clinicalObservations}</p>
                      </div>
                    )}
                    {note.interventions && (
                      <div className="p-field">
                        <p className="p-label">Intervenciones</p>
                        <p className="p-value" style={{ whiteSpace: 'pre-wrap' }}>{note.interventions}</p>
                      </div>
                    )}
                    {note.clinicalEvolution && (
                      <div className="p-field">
                        <p className="p-label">Evolución clínica</p>
                        <p className="p-value" style={{ whiteSpace: 'pre-wrap' }}>{note.clinicalEvolution}</p>
                      </div>
                    )}
                    {note.therapeuticPlan && (
                      <div className="p-field">
                        <p className="p-label">Plan terapéutico</p>
                        <p className="p-value" style={{ whiteSpace: 'pre-wrap' }}>{note.therapeuticPlan}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Campos legacy — solo mostrar si no hay campos nuevos */}
                {!hasNew && hasLegacy && (
                  <>
                    {note.comoLlego && (
                      <div className="p-field">
                        <p className="p-label">¿Cómo llegó?</p>
                        <p className="p-value" style={{ whiteSpace: 'pre-wrap' }}>{note.comoLlego}</p>
                      </div>
                    )}
                    {note.queTrabajaron && (
                      <div className="p-field">
                        <p className="p-label">¿Qué trabajaron?</p>
                        <p className="p-value" style={{ whiteSpace: 'pre-wrap' }}>{note.queTrabajaron}</p>
                      </div>
                    )}
                    {note.comoVaProceso && (
                      <div className="p-field">
                        <p className="p-label">¿Cómo va el proceso?</p>
                        <p className="p-value" style={{ whiteSpace: 'pre-wrap' }}>{note.comoVaProceso}</p>
                      </div>
                    )}
                    {note.queSigue && (
                      <div className="p-field">
                        <p className="p-label">¿Qué sigue?</p>
                        <p className="p-value" style={{ whiteSpace: 'pre-wrap' }}>{note.queSigue}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Firma profesional ── */}
        <div
          className="p-section"
          style={{ marginTop: '2rem', paddingTop: '1.5rem' }}
        >
          <p className="p-label" style={{ marginBottom: '0.75rem' }}>Firma del profesional</p>
          {signatureUrl && (
            <img
              src={signatureUrl}
              alt="Firma profesional"
              style={{ maxHeight: '80px', maxWidth: '260px', objectFit: 'contain', display: 'block', marginBottom: '0.5rem' }}
            />
          )}
          <p style={{ fontSize: '13px', fontFamily: 'system-ui, sans-serif', color: '#333' }}>
            {professionalName}
            {professionalTitle && <span style={{ color: '#777' }}> — {professionalTitle}</span>}
          </p>
          {professionalLicense && (
            <p style={{ fontSize: '12px', color: '#888', fontFamily: 'system-ui, sans-serif' }}>
              TP: {professionalLicense}
            </p>
          )}
          {!signatureUrl && (
            <div style={{ width: '200px', borderBottom: '1px solid #999', marginTop: '2rem', marginBottom: '0.5rem' }} />
          )}
        </div>

      </div>
    </>
  )
}
