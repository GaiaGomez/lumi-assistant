'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, Loader2, Save, ShieldAlert, Sparkles, Trash2 } from 'lucide-react'
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
import { mapAppointmentRows, mapClinicalNoteRow, mapPatientRow } from '@/lib/supabase/mappers'
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
      <span className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[18px] px-4 py-3 text-sm focus:outline-none"
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
        <span className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
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
        className="w-full resize-none rounded-[20px] px-4 py-3 text-sm leading-6 focus:outline-none"
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
  const [canvasInitialPaths, setCanvasInitialPaths] = useState<ClinicalCanvasPath[] | null>(null)
  const [canvasPaths, setCanvasPaths] = useState<ClinicalCanvasPath[] | null>(null)
  const [canvasDataUrl, setCanvasDataUrl] = useState('')
  const [canvasTouched, setCanvasTouched] = useState(false)
  const [canvasRemoved, setCanvasRemoved] = useState(false)

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
            .select('id, patient_id, user_id, doctoralia_uid, fecha_inicio, fecha_fin, estado_sesion, estado_pago, notas, modalidad, created_at, updated_at')
            .eq('patient_id', mappedNote.patient_id)
            .order('fecha_inicio', { ascending: false })

          let backgroundImage: string | null = null
          if (mappedNote.canvas_url && !(mappedNote.canvas_paths && mappedNote.canvas_paths.length > 0)) {
            backgroundImage = await createClinicalNoteCanvasSignedUrl(supabase, mappedNote.canvas_url)
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
          setCanvasBackgroundImage(backgroundImage)
          setCanvasTouched(false)
          setCanvasRemoved(false)
          setCanvasDataUrl('')
        } else {
          if (!patientId) throw new Error('Falta el paciente para crear la nota.')

          const [{ data: patientRow, error: patientError }, { data: appointmentsRow }] = await Promise.all([
            supabase.from('patients').select('*').eq('id', patientId).single(),
            supabase
              .from('appointments')
              .select('id, patient_id, user_id, doctoralia_uid, fecha_inicio, fecha_fin, estado_sesion, estado_pago, notas, modalidad, created_at, updated_at')
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
          setCanvasTouched(false)
          setCanvasRemoved(false)
          setCanvasDataUrl('')
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
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="glass rounded-[24px] px-5 py-4 text-sm" style={{ color: 'var(--ink-cool-soft)' }}>
          Cargando editor de nota...
        </div>
      </div>
    )
  }

  if (loadError || !patient) {
    return (
      <div className="glass rounded-[24px] p-5">
        <p style={{ color: 'var(--state-cancel-text)' }}>
          {loadError ?? 'No pudimos cargar esta nota.'}
        </p>
        <button
          type="button"
          onClick={() => router.push('/pacientes')}
          className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
          style={{ background: 'rgba(255,255,255,0.7)', color: 'var(--ink-cool-strong)' }}
        >
          <ArrowLeft size={15} />
          Volver
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(cancelHref)}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background: 'rgba(255,255,255,0.46)',
            border: '1px solid rgba(255,255,255,0.42)',
            color: 'var(--ink-cool-soft)',
          }}
        >
          <ArrowLeft size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
            {mode === 'edit' ? 'Editar nota clinica' : 'Nueva nota clinica'}
          </p>
          <h1 className="page-title text-[1.75rem]" style={{ color: 'var(--ink-cool-strong)' }}>
            {patient.nombre} {patient.apellido}
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-cool-soft)' }}>
            {mode === 'edit' && note
              ? `Ultima actualizacion ${formatDateTimeFull(note.updated_at)}`
              : 'Registro de sesion con plantilla DAP y canvas manuscrito.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="btn-action inline-flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-45"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Guardando...' : 'Guardar nota'}
        </button>
      </div>

      {saveError && (
        <div
          className="rounded-[20px] px-4 py-3 text-sm"
          style={{ background: 'rgba(176,124,132,0.12)', color: 'var(--state-cancel-text)' }}
        >
          {saveError}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <section className="glass rounded-[28px] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
                  Plantilla escrita
                </p>
                <h2 className="mt-1 text-[1.15rem] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
                  DAP integrada al flujo
                </h2>
                <p className="mt-1 max-w-[54ch] text-sm leading-6" style={{ color: 'var(--ink-cool-soft)' }}>
                  Un formato breve de progreso para salud mental: datos de sesion, lectura clinica y plan claro de continuidad.
                </p>
              </div>

              <div
                className="rounded-[18px] px-3 py-2 text-xs"
                style={{
                  background: 'rgba(255,255,255,0.52)',
                  border: '1px solid rgba(255,255,255,0.42)',
                  color: 'var(--ink-cool-soft)',
                }}
              >
                Siempre disponible aunque prefieras escribir libre.
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
              <label className="block space-y-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
                  Foco de sesion
                </span>
                <input
                  value={template.focus}
                  onChange={(event) => setTemplate((current) => ({ ...current, focus: event.target.value }))}
                  placeholder="Ej. regulacion emocional tras conflicto familiar"
                  className="w-full rounded-[18px] px-4 py-3 text-sm focus:outline-none"
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

            <div className="mt-4 space-y-3">
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

            <div
              className="mt-4 rounded-[20px] px-4 py-3 text-sm"
              style={{ background: 'rgba(207,196,209,0.18)', color: 'var(--ink-cool-soft)' }}
            >
              DAP mantiene la nota breve y usable en practica real sin mezclarla con notas privadas de proceso.
            </div>
          </section>

          <section className="glass rounded-[28px] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
                  Notas complementarias
                </p>
                <h2 className="mt-1 text-[1.05rem] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
                  Texto libre
                </h2>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs" style={{ background: 'rgba(255,255,255,0.44)', color: 'var(--ink-cool-soft)' }}>
                <Sparkles size={13} />
                Util para contexto adicional
              </div>
            </div>

            <TextField
              label="Observaciones extra"
              value={textoLibre}
              onChange={setTextoLibre}
              rows={6}
              placeholder="Contexto que no quieras incluir en la estructura DAP, recordatorios clinicos o acuerdos operativos."
            />
          </section>
        </div>

        <div className="space-y-4">
          <section className="glass rounded-[28px] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
                  Canvas manuscrito
                </p>
                <h2 className="mt-1 text-[1.1rem] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
                  Lienzo flexible y editable
                </h2>
              </div>
              {(canvasPaths?.length || canvasBackgroundImage || note?.canvas_url) && (
                <button
                  type="button"
                  onClick={handleRemoveCanvas}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs"
                  style={{ background: 'rgba(176,124,132,0.12)', color: 'var(--state-cancel-text)' }}
                >
                  <Trash2 size={13} />
                  Quitar manuscrito
                </button>
              )}
            </div>

            {canvasBackgroundImage && !(canvasPaths && canvasPaths.length > 0) && (
              <div
                className="mt-3 rounded-[18px] px-4 py-3 text-sm leading-6"
                style={{ background: 'rgba(255,255,255,0.5)', color: 'var(--ink-cool-soft)' }}
              >
                Esta nota viene de un canvas legacy sin trazos editables. Puedes escribir encima para actualizarla o quitarla por completo.
              </div>
            )}

            <div className="mt-4">
              <DrawingCanvas
                key={`${note?.id ?? 'new'}-${canvasBackgroundImage ? 'background' : 'plain'}-${canvasInitialPaths?.length ?? 0}`}
                initialPaths={canvasInitialPaths}
                backgroundImage={canvasBackgroundImage}
                onChange={({ dataUrl, paths }) => {
                  setCanvasTouched(true)
                  setCanvasRemoved(false)
                  setCanvasDataUrl(dataUrl)
                  setCanvasPaths(paths.length > 0 ? paths : null)
                }}
              />
            </div>
          </section>

          <section className="glass rounded-[28px] p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} style={{ color: 'var(--ink-cool-soft)' }} />
              <h2 className="text-[1rem] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
                Vinculo con sesion
              </h2>
            </div>

            <div className="mt-3">
              <SelectField label="Sesion asociada" value={appointmentId} onChange={setAppointmentId}>
                <option value="">Sin vincular</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {formatAppointmentOption(appointment)}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="mt-4 grid gap-3">
              <div
                className="rounded-[20px] p-4"
                style={{ background: 'rgba(255,255,255,0.48)', border: '1px solid rgba(255,255,255,0.42)' }}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--ink-cool-faint)' }}>
                  Resumen de guardado
                </p>
                <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--ink-cool-soft)' }}>
                  <p>{isClinicalNoteTemplateEmpty(template) ? 'Plantilla DAP vacia.' : 'Plantilla DAP lista para guardarse.'}</p>
                  <p>{textoLibre.trim() ? 'Incluye texto libre complementario.' : 'Sin texto libre adicional.'}</p>
                  <p>
                    {canvasRemoved
                      ? 'El canvas manuscrito se eliminara.'
                      : canvasPaths?.length || (!canvasTouched && note?.canvas_url)
                        ? 'La nota conserva manuscrito.'
                        : 'Sin canvas manuscrito.'}
                  </p>
                </div>
              </div>

              {template.riskLevel && (
                <div
                  className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs"
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
      </div>
    </div>
  )
}
