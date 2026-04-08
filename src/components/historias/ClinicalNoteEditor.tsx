'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, Expand, Loader2, Save, ShieldAlert, Trash2, X } from 'lucide-react'
import type { Appointment, ClinicalCanvasPath, ClinicalNote, ClinicalNoteTemplateData, Patient } from '@/types'
import { createClient } from '@/lib/supabase/client'
import {
  createClinicalNote,
  createClinicalNoteCanvasSignedUrl,
  deleteClinicalNoteCanvas,
  extractCanvasPath,
  updateClinicalNote,
  uploadClinicalNoteCanvas,
} from '@/lib/clinical-notes'
import {
  CLINICAL_NOTE_RISK_META,
  createEmptyClinicalNoteTemplate,
  isClinicalNoteTemplateEmpty,
} from '@/lib/clinical-note-template'
import { formatDateTimeFull } from '@/lib/format'
import { APPOINTMENT_SELECT, mapAppointmentRows, mapClinicalNoteRow, mapPatientRow } from '@/lib/supabase/mappers'
import DrawingCanvas from '@/components/historias/DrawingCanvas'

type EditorMode = 'create' | 'edit'

interface ClinicalNoteEditorProps {
  mode: EditorMode
  patientId?: string | null
  noteId?: string
}

function formatAppointmentOption(appointment: Appointment) {
  return `${formatDateTimeFull(appointment.fecha_inicio)}${appointment.estado_sesion === 'realizada' ? ' · realizada' : ''}`
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="section-kicker">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[18px] px-4 py-3 text-[14px] focus:outline-none"
        style={{
          background: 'rgba(255,255,255,0.66)',
          border: '1px solid rgba(255,255,255,0.46)',
          color: 'var(--ink-cool-strong)',
          boxShadow: '0 10px 28px rgba(124,108,128,0.06)',
        }}
      >
        {children}
      </select>
    </label>
  )
}

function TextField({
  label,
  value,
  placeholder,
  rows = 4,
  onChange,
  helper,
}: {
  label: string
  value: string
  placeholder: string
  rows?: number
  onChange: (value: string) => void
  helper?: string
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="section-kicker">
          {label}
        </span>
        {helper && (
          <span className="text-[11px]" style={{ color: 'var(--ink-cool-muted)' }}>
            {helper}
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-[14px] px-4 py-3 text-[14px] leading-6 focus:outline-none"
        style={{
          background: 'rgba(255,255,255,0.66)',
          border: '1px solid rgba(255,255,255,0.46)',
          color: 'var(--ink-cool-strong)',
          boxShadow: '0 10px 28px rgba(124,108,128,0.06)',
        }}
      />
    </label>
  )
}

export default function ClinicalNoteEditor({
  mode,
  patientId,
  noteId,
}: ClinicalNoteEditorProps) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [note, setNote] = useState<ClinicalNote | null>(null)

  const [appointmentId, setAppointmentId] = useState('')
  const [template, setTemplate] = useState<ClinicalNoteTemplateData>(createEmptyClinicalNoteTemplate())
  const [textoLibre, setTextoLibre] = useState('')

  const [canvasBackgroundImage, setCanvasBackgroundImage] = useState<string | null>(null)
  const [canvasHasLegacyBackground, setCanvasHasLegacyBackground] = useState(false)
  const [canvasPreviewUrl, setCanvasPreviewUrl] = useState<string | null>(null)
  const [canvasInitialPaths, setCanvasInitialPaths] = useState<ClinicalCanvasPath[] | null>(null)
  const [canvasPaths, setCanvasPaths] = useState<ClinicalCanvasPath[] | null>(null)
  const [canvasDataUrl, setCanvasDataUrl] = useState('')
  const [canvasTouched, setCanvasTouched] = useState(false)
  const [canvasRemoved, setCanvasRemoved] = useState(false)
  const [isCanvasEditorOpen, setIsCanvasEditorOpen] = useState(false)
  const canvasModalScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadEditor() {
      setLoading(true)
      setLoadError(null)

      try {
        if (mode === 'edit') {
          if (!noteId) throw new Error('No encontramos la nota a editar.')

          const { data: noteRow, error: noteError } = await supabase
            .from('clinical_notes')
            .select('id, patient_id, appointment_id, user_id, texto, canvas_url, canvas_paths, template_kind, template_data, created_at, updated_at, patient:patients(*)')
            .eq('id', noteId)
            .single()

          if (noteError || !noteRow) throw new Error('No se pudo cargar la nota.')

          const mappedNote = mapClinicalNoteRow(noteRow)
          const resolvedPatient = mappedNote.patient ?? null

          const { data: appointmentsRow } = await supabase
            .from('appointments')
            .select(APPOINTMENT_SELECT)
            .eq('patient_id', mappedNote.patient_id)
            .order('fecha_inicio', { ascending: false })

          let previewUrl: string | null = null
          if (mappedNote.canvas_url) {
            previewUrl = await createClinicalNoteCanvasSignedUrl(supabase, mappedNote.canvas_url)
          }

          if (cancelled) return

          setNote(mappedNote)
          setPatient(resolvedPatient)
          setAppointments(mapAppointmentRows(appointmentsRow))
          setAppointmentId(mappedNote.appointment_id ?? '')
          setTemplate(mappedNote.template_data ?? createEmptyClinicalNoteTemplate())
          setTextoLibre(mappedNote.texto ?? '')
          setCanvasInitialPaths(mappedNote.canvas_paths)
          setCanvasPaths(mappedNote.canvas_paths)
          setCanvasBackgroundImage(mappedNote.canvas_paths?.length ? null : previewUrl)
          setCanvasHasLegacyBackground(Boolean(mappedNote.canvas_url && !(mappedNote.canvas_paths && mappedNote.canvas_paths.length > 0)))
          setCanvasPreviewUrl(previewUrl)
          setCanvasTouched(false)
          setCanvasRemoved(false)
          setCanvasDataUrl('')
          setIsCanvasEditorOpen(false)
        } else {
          if (!patientId) throw new Error('Falta el paciente para crear la nota.')

          const [{ data: patientRow, error: patientError }, { data: appointmentsRow }] = await Promise.all([
            supabase.from('patients').select('*').eq('id', patientId).single(),
            supabase
              .from('appointments')
              .select(APPOINTMENT_SELECT)
              .eq('patient_id', patientId)
              .order('fecha_inicio', { ascending: false }),
          ])

          if (patientError || !patientRow) throw new Error('No se pudo cargar el paciente.')

          if (cancelled) return

          setPatient(mapPatientRow(patientRow))
          setAppointments(mapAppointmentRows(appointmentsRow))
          setNote(null)
          setAppointmentId('')
          setTemplate(createEmptyClinicalNoteTemplate())
          setTextoLibre('')
          setCanvasInitialPaths(null)
          setCanvasPaths(null)
          setCanvasBackgroundImage(null)
          setCanvasHasLegacyBackground(false)
          setCanvasPreviewUrl(null)
          setCanvasTouched(false)
          setCanvasRemoved(false)
          setCanvasDataUrl('')
          setIsCanvasEditorOpen(false)
        }
      } catch (error) {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : 'No se pudo abrir el editor de notas.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadEditor()
    return () => {
      cancelled = true
    }
  }, [mode, noteId, patientId, supabase])

  useEffect(() => {
    if (!isCanvasEditorOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.classList.add('canvas-editor-open')
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.classList.remove('canvas-editor-open')
      document.body.style.overflow = previousOverflow
    }
  }, [isCanvasEditorOpen])

  const canSave = useMemo(() => {
    const hasTemplate = !isClinicalNoteTemplateEmpty(template)
    const hasFreeText = textoLibre.trim().length > 0
    const hasCanvas = canvasRemoved
      ? false
      : Boolean(canvasPaths?.length || (!canvasTouched && note?.canvas_url))

    return Boolean(patient && (hasTemplate || hasFreeText || hasCanvas))
  }, [canvasPaths, canvasRemoved, canvasTouched, note?.canvas_url, patient, template, textoLibre])

  const cancelHref = mode === 'edit' && note ? `/historias/${note.id}` : patient ? `/pacientes/${patient.id}` : '/pacientes'

  async function handleSave() {
    if (!patient) return

    setSaving(true)
    setSaveError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesion expirada. Recarga la pagina.')

      let nextCanvasPath = note?.canvas_url ?? null
      let nextCanvasPaths = note?.canvas_paths ?? null

      if (canvasTouched) {
        if (canvasRemoved || (!canvasDataUrl && !(canvasPaths && canvasPaths.length > 0))) {
          if (note?.canvas_url) {
            await deleteClinicalNoteCanvas(supabase, note.canvas_url)
          }
          nextCanvasPath = null
          nextCanvasPaths = null
        } else {
          const existingCanvasUrl = note?.canvas_url ?? null
          const managedExistingPath = existingCanvasUrl &&
            (!existingCanvasUrl.startsWith('http') || existingCanvasUrl.includes('/canvas-notes/'))
            ? extractCanvasPath(existingCanvasUrl)
            : null

          const fileName = managedExistingPath ?? (mode === 'edit' && note ? `${user.id}/${note.id}.png` : undefined)
          nextCanvasPath = await uploadClinicalNoteCanvas(supabase, user.id, canvasDataUrl, fileName)
          nextCanvasPaths = canvasPaths && canvasPaths.length > 0 ? canvasPaths : null
        }
      }

      if (mode === 'edit' && note) {
        const { error } = await updateClinicalNote(supabase, {
          id: note.id,
          appointmentId: appointmentId || null,
          texto: textoLibre,
          canvasPath: nextCanvasPath,
          canvasPaths: nextCanvasPaths,
          templateData: template,
        })

        if (error) throw error

        router.push(`/historias/${note.id}`)
      } else {
        const { error } = await createClinicalNote(supabase, {
          patientId: patient.id,
          userId: user.id,
          appointmentId: appointmentId || null,
          texto: textoLibre,
          canvasPath: nextCanvasPath,
          canvasPaths: nextCanvasPaths,
          templateData: template,
        })

        if (error) throw error

        router.push(`/pacientes/${patient.id}`)
      }

      router.refresh()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar la nota. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  function handleRemoveCanvas() {
    setCanvasTouched(true)
    setCanvasRemoved(true)
    setCanvasInitialPaths(null)
    setCanvasPaths(null)
    setCanvasDataUrl('')
    setCanvasBackgroundImage(null)
    setCanvasHasLegacyBackground(false)
    setCanvasPreviewUrl(null)
  }

  function openCanvasEditor() {
    setCanvasInitialPaths(canvasPaths ?? canvasInitialPaths ?? null)
    setCanvasBackgroundImage((currentBackgroundImage) => {
      if (canvasHasLegacyBackground) return currentBackgroundImage ?? canvasPreviewUrl
      return currentBackgroundImage
    })
    setIsCanvasEditorOpen(true)
  }

  const canvasPreviewSrc = canvasRemoved
    ? null
    : canvasDataUrl || canvasPreviewUrl

  const hasCanvasContent = Boolean(
    !canvasRemoved && (canvasPaths?.length || canvasDataUrl || canvasPreviewUrl)
  )

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="glass-cool rounded-[18px] px-5 py-4 text-[14px]" style={{ color: 'var(--ink-cool-soft)' }}>
          Cargando editor de nota...
        </div>
      </div>
    )
  }

  if (loadError || !patient) {
    return (
      <div className="glass-cool rounded-[18px] p-4">
        <p className="text-[14px]" style={{ color: 'var(--state-cancel-text)' }}>
          {loadError ?? 'No pudimos cargar esta nota.'}
        </p>
        <button
          type="button"
          onClick={() => router.push('/pacientes')}
          className="btn-subtle mt-4 inline-flex items-center gap-2"
        >
          <ArrowLeft size={14} />
          Volver
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[920px] space-y-3 pb-6">
      <div className="flex flex-wrap items-start gap-3">
        <button
          type="button"
          onClick={() => router.push(cancelHref)}
          className="btn-subtle flex h-8 w-8 items-center justify-center"
        >
          <ArrowLeft size={14} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="section-kicker mb-0.5">
            {mode === 'edit' ? 'Editar nota clínica' : 'Nueva nota clínica'}
          </p>
          <h1 className="page-title text-[1.6rem] leading-none">
            {patient.nombre} {patient.apellido}
          </h1>
          {mode === 'edit' && note && (
            <p className="text-[13px] mt-1" style={{ color: 'var(--ink-cool-soft)' }}>
              {`Ultima actualizacion ${formatDateTimeFull(note.updated_at)}`}
            </p>
          )}
        </div>
      </div>

      {saveError && (
        <div
          className="rounded-[14px] px-4 py-3 text-[14px]"
          style={{ background: 'rgba(176,124,132,0.12)', color: 'var(--state-cancel-text)' }}
        >
          {saveError}
        </div>
      )}

      <div className="space-y-2.5">
        <section className="glass-cool rounded-[18px] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="section-kicker">
                Canvas manuscrito
              </p>
              <h2 className="editorial-panel-title mt-0.5 text-[1.05rem]">Lienzo flexible y editable</h2>
            </div>
            {(canvasPaths?.length || canvasBackgroundImage || note?.canvas_url) && (
              <button
                type="button"
                onClick={handleRemoveCanvas}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]"
                style={{ background: 'rgba(176,124,132,0.12)', color: 'var(--state-cancel-text)' }}
              >
                <Trash2 size={13} />
                Quitar manuscrito
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={openCanvasEditor}
            className="mt-3 block w-full text-left"
          >
            <div
              className="overflow-hidden rounded-[14px]"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.56) 0%, rgba(255,255,255,0.34) 100%)',
                border: '1px solid rgba(255,255,255,0.42)',
                boxShadow: '0 18px 42px rgba(120,110,130,0.08)',
              }}
            >
              {hasCanvasContent && canvasPreviewSrc ? (
                <>
                  <div
                    className="h-[220px] w-full"
                    style={{
                      backgroundColor: '#FAF7F4',
                      backgroundImage: `url("${canvasPreviewSrc}")`,
                      backgroundPosition: 'top center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: 'cover',
                    }}
                  />
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-[14px] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
                        Vista previa del dibujo
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--ink-cool-soft)' }}>
                        {canvasPaths?.length ? `${canvasPaths.length} trazos listos para seguir editando.` : 'Abre el canvas para revisar o ajustar el dibujo.'}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]"
                      style={{ background: 'rgba(255,255,255,0.72)', color: 'var(--ink-cool-strong)' }}
                    >
                      <Expand size={13} />
                      Abrir
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-6 py-8 text-center">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]"
                    style={{ background: 'rgba(255,255,255,0.62)', color: 'var(--ink-cool-soft)' }}
                  >
                    Canvas
                  </div>
                  <div>
                    <p className="text-[14px] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
                      Sin dibujo aun
                    </p>
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--ink-cool-soft)' }}>
                      Abre el canvas para empezar a escribir o bosquejar.
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]"
                    style={{ background: 'rgba(255,255,255,0.72)', color: 'var(--ink-cool-strong)' }}
                  >
                    <Expand size={13} />
                    Abrir canvas
                  </span>
                </div>
              )}
            </div>
          </button>
        </section>

        <section className="glass-cool rounded-[18px] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="section-kicker">
                Notas libres
              </p>
              <h2 className="editorial-panel-title mt-0.5 text-[1.05rem]">Texto complementario</h2>
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            <TextField
              label="Observaciones extra"
              value={textoLibre}
              onChange={setTextoLibre}
              rows={7}
              placeholder="Contexto que no quieras incluir en la estructura DAP, recordatorios clinicos o acuerdos operativos."
            />

            <div className="grid gap-2.5 md:grid-cols-[1.1fr_0.9fr]">
              <div
                className="rounded-[14px] p-3"
                style={{ background: 'rgba(255,255,255,0.48)', border: '1px solid var(--border-glass-white)' }}
              >
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} style={{ color: 'var(--ink-cool-soft)' }} />
                  <p className="section-kicker">
                    Sesion asociada
                  </p>
                </div>
                <div className="mt-3">
                  <SelectField label="Vinculo de agenda" value={appointmentId} onChange={setAppointmentId}>
                    <option value="">Sin vincular</option>
                    {appointments.map((appointment) => (
                      <option key={appointment.id} value={appointment.id}>
                        {formatAppointmentOption(appointment)}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>

              <div
                className="rounded-[14px] p-3"
                style={{ background: 'rgba(255,255,255,0.48)', border: '1px solid var(--border-glass-white)' }}
              >
                <p className="section-kicker">
                  Resumen de guardado
                </p>
                <div className="mt-3 space-y-2 text-[14px]" style={{ color: 'var(--ink-cool-soft)' }}>
                  <p>{textoLibre.trim() ? 'Incluye texto libre complementario.' : 'Sin texto libre adicional.'}</p>
                  <p>
                    {canvasRemoved
                      ? 'El canvas manuscrito se eliminara.'
                      : canvasPaths?.length || (!canvasTouched && note?.canvas_url)
                        ? 'La nota conserva manuscrito.'
                        : 'Sin canvas manuscrito.'}
                  </p>
                  <p>{appointmentId ? 'La nota quedara vinculada a una sesion.' : 'La nota quedara sin vinculo de agenda.'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-cool rounded-[18px] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="section-kicker">
                Plantilla escrita
              </p>
              <h2 className="editorial-panel-title mt-0.5 text-[1.05rem]">DAP como apoyo estructurado</h2>
            </div>
          </div>

          <div className="mt-3 grid gap-2.5 md:grid-cols-[1.15fr_0.85fr]">
            <label className="block space-y-2">
              <span className="section-kicker">
                Foco de sesion
              </span>
              <input
                value={template.focus}
                onChange={(event) => setTemplate((current) => ({ ...current, focus: event.target.value }))}
                placeholder="Ej. regulacion emocional tras conflicto familiar"
                className="w-full rounded-[18px] px-4 py-3 text-[14px] focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.66)',
                  border: '1px solid rgba(255,255,255,0.46)',
                  color: 'var(--ink-cool-strong)',
                  boxShadow: '0 10px 28px rgba(124,108,128,0.06)',
                }}
              />
            </label>

            <SelectField
              label="Riesgo clinico"
              value={template.riskLevel ?? ''}
              onChange={(value) => setTemplate((current) => ({
                ...current,
                riskLevel: value ? value as ClinicalNoteTemplateData['riskLevel'] : null,
              }))}
            >
              <option value="">Sin marcar</option>
              {Object.entries(CLINICAL_NOTE_RISK_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="mt-3 space-y-2.5">
            <TextField
              label="D · Data"
              helper="Lo observado y lo reportado"
              value={template.data}
              onChange={(value) => setTemplate((current) => ({ ...current, data: value }))}
              rows={5}
              placeholder="Sintomas, temas abordados, cambios relevantes, intervenciones aplicadas, respuesta del paciente."
            />
            <TextField
              label="A · Assessment"
              helper="Lectura clinica breve"
              value={template.assessment}
              onChange={(value) => setTemplate((current) => ({ ...current, assessment: value }))}
              rows={4}
              placeholder="Hipotesis clinica, progreso, nivel de insight, adherencia, factores protectores o alertas."
            />
            <TextField
              label="P · Plan"
              helper="Siguiente paso concreto"
              value={template.plan}
              onChange={(value) => setTemplate((current) => ({ ...current, plan: value }))}
              rows={4}
              placeholder="Acuerdos, tareas, seguimiento, objetivo para proxima sesion, coordinaciones necesarias."
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            {template.riskLevel && (
              <div
                className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[11px]"
                style={{
                  background: CLINICAL_NOTE_RISK_META[template.riskLevel].tone === 'success'
                    ? 'var(--state-success-bg)'
                    : CLINICAL_NOTE_RISK_META[template.riskLevel].tone === 'warning'
                      ? 'var(--state-warning-bg)'
                      : 'var(--state-cancel-bg)',
                  color: CLINICAL_NOTE_RISK_META[template.riskLevel].tone === 'success'
                    ? 'var(--state-success-text)'
                    : CLINICAL_NOTE_RISK_META[template.riskLevel].tone === 'warning'
                      ? 'var(--state-warning-text)'
                      : 'var(--state-cancel-text)',
                }}
              >
                <ShieldAlert size={13} />
                {CLINICAL_NOTE_RISK_META[template.riskLevel].label}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-sticky-action sticky z-10 flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="btn-action inline-flex items-center gap-2 px-5 py-2.5 text-[14px] disabled:opacity-45"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Guardando...' : 'Guardar nota'}
        </button>
      </div>

      {isCanvasEditorOpen && (
        <div
          className="fixed inset-0 z-50 bg-[rgba(52,34,35,0.22)] backdrop-blur-[10px]"
          onClick={() => setIsCanvasEditorOpen(false)}
        >
          <div
            ref={canvasModalScrollRef}
            className="h-full overflow-y-auto px-4 py-6 sm:px-6"
          >
            <div
              className="mx-auto max-w-[980px]"
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className="rounded-[18px] p-3"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,252,250,0.94) 0%, rgba(255,248,244,0.88) 100%)',
                  border: '1px solid rgba(255,255,255,0.42)',
                  boxShadow: '0 28px 90px rgba(70,46,43,0.18)',
                  backdropFilter: 'blur(26px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(26px) saturate(140%)',
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="section-kicker">
                      Canvas manuscrito
                    </p>
                    <h3 className="editorial-panel-title mt-0.5 text-[1.05rem]">
                      Editor de dibujo
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {(canvasPaths?.length || canvasPreviewUrl) && (
                      <button
                        type="button"
                        onClick={handleRemoveCanvas}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]"
                        style={{ background: 'rgba(176,124,132,0.12)', color: 'var(--state-cancel-text)' }}
                      >
                        <Trash2 size={13} />
                        Quitar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCanvasEditorOpen(false)}
                      className="btn-subtle inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
                    >
                      <X size={13} />
                      Cerrar
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <DrawingCanvas
                    key={`canvas-modal-${note?.id ?? 'new'}-${canvasHasLegacyBackground ? 'legacy' : 'clean'}`}
                    initialPaths={canvasInitialPaths}
                    backgroundImage={canvasBackgroundImage}
                    scrollContainerRef={canvasModalScrollRef}
                    onChange={({ dataUrl, paths }) => {
                      setCanvasTouched(true)
                      setCanvasRemoved(false)
                      setCanvasDataUrl(dataUrl)
                      setCanvasPaths(paths.length > 0 ? paths : null)
                      setCanvasPreviewUrl(dataUrl || null)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
