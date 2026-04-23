'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { upsertSessionNote, signNote as signNoteAction } from '@/lib/notes/actions'
import { createClient } from '@/lib/supabase/client'
import { uploadNoteCanvas } from '@/lib/notes/storage'
import DrawingCanvas, { type DrawingCanvasHandle } from '@/components/historias/DrawingCanvas'
import ModalShell from '@/components/ui/ModalShell'
import SectionHeader from '@/components/ui/SectionHeader'
import Button from '@/components/ui/Button'
import type { ClinicalCanvasPath, SessionNote as SessionNoteType } from '@/types'
import { X, PenLine } from 'lucide-react'

type NoteMode = 'session' | 'formal'

interface SessionNoteProps {
  appointmentId: string
  patientId: string
  patientName: string
}

export default function SessionNote({ appointmentId, patientId, patientName }: SessionNoteProps) {
  const [note, setNote] = useState<SessionNoteType | null>(null)
  const [mode, setMode] = useState<NoteMode>('session')

  const [quickNote, setQuickNote] = useState('')
  const [comoLlego, setComoLlego] = useState('')
  const [queTrabajaron, setQueTrabajaron] = useState('')
  const [comoVaProceso, setComoVaProceso] = useState('')
  const [queSigue, setQueSigue] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSigningNote, setIsSigningNote] = useState(false)
  const [showCanvas, setShowCanvas] = useState(false)
  const [canvasPaths, setCanvasPaths] = useState<ClinicalCanvasPath[] | null>(null)
  const [quickNoteExpanded, setQuickNoteExpanded] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasRef = useRef<DrawingCanvasHandle>(null)
  const canvasSnapshotRef = useRef<{ dataUrl: string; paths: ClinicalCanvasPath[] } | null>(null)

  useEffect(() => {
    upsertSessionNote(appointmentId, patientId, {}).then((loaded) => {
      setNote(loaded)
      setQuickNote(loaded.quickNote ?? '')
      setComoLlego(loaded.comoLlego ?? '')
      setQueTrabajaron(loaded.queTrabajaron ?? '')
      setComoVaProceso(loaded.comoVaProceso ?? '')
      setQueSigue(loaded.queSigue ?? '')
      setCanvasPaths(loaded.canvasPaths)
    })
  }, [appointmentId, patientId])

  function scheduleAutosave(data: Partial<SessionNoteType>) {
    setIsSaving(true)
    setIsSaved(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const updated = await upsertSessionNote(appointmentId, patientId, data)
        setNote(updated)
        setIsSaved(true)
      } finally {
        setIsSaving(false)
      }
    }, 2000)
  }

  function handleQuickNoteChange(value: string) {
    setQuickNote(value)
    scheduleAutosave({ quickNote: value })
  }

  function handleFormalFieldChange(
    field: 'comoLlego' | 'queTrabajaron' | 'comoVaProceso' | 'queSigue',
    value: string,
    currentComoLlego: string,
    currentQueTrabajaron: string,
    currentComoVaProceso: string,
    currentQueSigue: string
  ) {
    const updates = {
      comoLlego: field === 'comoLlego' ? value : currentComoLlego,
      queTrabajaron: field === 'queTrabajaron' ? value : currentQueTrabajaron,
      comoVaProceso: field === 'comoVaProceso' ? value : currentComoVaProceso,
      queSigue: field === 'queSigue' ? value : currentQueSigue,
    }
    if (field === 'comoLlego') setComoLlego(value)
    else if (field === 'queTrabajaron') setQueTrabajaron(value)
    else if (field === 'comoVaProceso') setComoVaProceso(value)
    else if (field === 'queSigue') setQueSigue(value)
    scheduleAutosave(updates)
  }

  const handleCanvasChange = useCallback(
    (snapshot: { dataUrl: string; paths: ClinicalCanvasPath[] }) => {
      canvasSnapshotRef.current = snapshot
    },
    []
  )

  async function handleCanvasClose() {
    if (canvasRef.current) {
      await canvasRef.current.flushPng()
    }

    const snapshot = canvasSnapshotRef.current
    if (snapshot && snapshot.dataUrl && note) {
      try {
        setIsSaving(true)
        const supabase = createClient()
        const path = await uploadNoteCanvas(
          supabase,
          note.psychologistId,
          snapshot.dataUrl,
          `${note.psychologistId}/${note.id}.png`
        )
        const updated = await upsertSessionNote(appointmentId, patientId, {
          canvasPaths: snapshot.paths,
          canvasUrl: path,
        })
        setNote(updated)
        setCanvasPaths(snapshot.paths)
        setIsSaved(true)
      } finally {
        setIsSaving(false)
      }
    }

    setShowCanvas(false)
  }

  async function handleSignNote() {
    if (!note) return
    setIsSigningNote(true)
    try {
      await signNoteAction(note.id)
      setNote((prev) =>
        prev ? { ...prev, isDraft: false, signedAt: new Date().toISOString() } : prev
      )
    } finally {
      setIsSigningNote(false)
    }
  }

  const isSigned = note !== null && !note.isDraft && note.signedAt !== null

  if (!note) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[13px]" style={{ color: 'var(--ink-cool-soft)' }}>
          Cargando nota...
        </p>
      </div>
    )
  }

  const formalFields = [
    {
      key: 'comoLlego' as const,
      label: '¿Cómo llegó hoy?',
      placeholder: 'Estado emocional, presentación, cambios desde la última sesión...',
      value: comoLlego,
    },
    {
      key: 'queTrabajaron' as const,
      label: '¿Qué trabajaron?',
      placeholder: 'Temas abordados, técnicas usadas, respuesta del paciente...',
      value: queTrabajaron,
    },
    {
      key: 'comoVaProceso' as const,
      label: '¿Cómo va el proceso?',
      placeholder: 'Tu lectura clínica, avances, obstáculos, hipótesis...',
      value: comoVaProceso,
    },
    {
      key: 'queSigue' as const,
      label: '¿Qué sigue?',
      placeholder: 'Acuerdos, tareas, objetivo para la próxima sesión...',
      value: queSigue,
    },
  ] as const

  return (
    <div className="flex flex-col">
      {/* ── Header sticky ── */}
      <div
        className="sticky top-0 z-10 flex flex-col gap-2.5 px-4 py-3"
        style={{
          background:
            'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)',
          borderBottom: '1px solid var(--border-glass-white)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="section-kicker mb-0.5">{patientName}</p>
            <p className="text-[14px] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
              Sesión #{note.sessionNumber ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ background: '#D4A84B' }}
                title="Guardando..."
              />
            )}
            {!isSaving && isSaved && (
              <span
                className="h-2 w-2 rounded-full transition-opacity"
                style={{ background: '#6BAF8D' }}
                title="Guardado"
              />
            )}
          </div>
        </div>

        {!isSigned && (
          <div
            className="inline-flex self-start rounded-full p-0.5"
            style={{
              background: 'rgba(255,255,255,0.32)',
              border: '1px solid rgba(255,255,255,0.42)',
            }}
          >
            {(['session', 'formal'] as NoteMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="rounded-full px-3.5 py-1.5 text-[13px] transition-all"
                style={
                  mode === m
                    ? {
                        background: 'rgba(255,255,255,0.88)',
                        color: 'var(--ink-cool-strong)',
                        fontWeight: 500,
                        boxShadow: '0 2px 8px rgba(120,108,130,0.10)',
                      }
                    : {
                        color: 'var(--ink-cool-soft)',
                      }
                }
              >
                {m === 'session' ? 'Durante la sesión' : 'Nota formal'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-4 py-4">
        {mode === 'session' && (
          <div className="relative">
            {isSigned ? (
              <p
                className="min-h-[60vh] text-[15px] leading-relaxed whitespace-pre-wrap"
                style={{
                  fontFamily: 'Iowan Old Style, Georgia, serif',
                  color: quickNote ? 'var(--ink-cool-strong)' : 'var(--ink-cool-faint)',
                }}
              >
                {quickNote || 'Sin notas de sesión.'}
              </p>
            ) : (
              <textarea
                value={quickNote}
                onChange={(e) => handleQuickNoteChange(e.target.value)}
                placeholder="Escribe lo que quieras mientras escuchas..."
                className="min-h-[60vh] w-full resize-none bg-transparent text-[15px] leading-relaxed focus:outline-none"
                style={{
                  fontFamily: 'Iowan Old Style, Georgia, serif',
                  color: 'var(--ink-cool-strong)',
                }}
              />
            )}

            {!isSigned && (
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCanvas(true)}
                  className="btn-ghost flex items-center gap-1.5 text-[13px]"
                  style={{ opacity: 0.45 }}
                >
                  <PenLine size={14} />
                  Canvas
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'formal' && (
          <div className="space-y-4">
            {quickNote.trim() !== '' && (
              <div>
                <button
                  type="button"
                  onClick={() => setQuickNoteExpanded((v) => !v)}
                  className="flex w-full items-center justify-between"
                >
                  <SectionHeader label="Notas de sesión" />
                  <span className="text-[11px]" style={{ color: 'var(--ink-cool-faint)' }}>
                    {quickNoteExpanded ? 'Ocultar' : 'Ver'}
                  </span>
                </button>
                {quickNoteExpanded && (
                  <div
                    className="mt-1.5 rounded-[14px] px-3.5 py-3"
                    style={{
                      background: 'rgba(255,255,255,0.38)',
                      border: '1px solid var(--border-glass-white)',
                    }}
                  >
                    <p
                      className="text-[13px] italic leading-relaxed whitespace-pre-wrap"
                      style={{ color: 'var(--ink-cool-soft)' }}
                    >
                      {quickNote}
                    </p>
                  </div>
                )}
              </div>
            )}

            {formalFields.map(({ key, label, placeholder, value }) => (
              <label key={key} className="block space-y-1.5">
                <span className="section-kicker">{label}</span>
                {isSigned ? (
                  <div
                    className="rounded-[14px] px-3.5 py-3"
                    style={{
                      background: 'rgba(255,255,255,0.38)',
                      border: '1px solid var(--border-glass-white)',
                    }}
                  >
                    <p
                      className="text-[14px] leading-relaxed whitespace-pre-wrap"
                      style={{
                        color: value ? 'var(--ink-cool-strong)' : 'var(--ink-cool-faint)',
                      }}
                    >
                      {value || 'Sin contenido.'}
                    </p>
                  </div>
                ) : (
                  <textarea
                    value={value}
                    onChange={(e) => {
                      e.target.style.height = 'auto'
                      e.target.style.height = `${e.target.scrollHeight}px`
                      handleFormalFieldChange(
                        key,
                        e.target.value,
                        comoLlego,
                        queTrabajaron,
                        comoVaProceso,
                        queSigue
                      )
                    }}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full resize-none overflow-hidden rounded-[14px] px-3.5 py-3 text-[14px] leading-relaxed focus:outline-none"
                  />
                )}
              </label>
            ))}

            {!isSigned && (
              <div className="pt-2">
                <Button
                  variant="action"
                  onClick={handleSignNote}
                  disabled={isSigningNote}
                  className="w-full px-4 py-2.5 text-[14px]"
                >
                  {isSigningNote ? 'Firmando...' : 'Firmar y cerrar nota'}
                </Button>
              </div>
            )}

            {isSigned && note.signedAt && (
              <div
                className="rounded-[14px] px-3.5 py-2.5 text-center"
                style={{
                  background: 'var(--state-success-bg)',
                  color: 'var(--state-success-text)',
                }}
              >
                <p className="text-[13px]">
                  Firmada el{' '}
                  {new Date(note.signedAt).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Canvas Modal ── */}
      {showCanvas && (
        <ModalShell onClose={handleCanvasClose} maxWidth="max-w-2xl">
          <div className="flex items-start justify-between p-4">
            <div>
              <SectionHeader label="Canvas" className="mb-1" />
              <h2 className="editorial-panel-title text-[1.05rem]">Notas manuscritas</h2>
            </div>
            <Button variant="subtle" onClick={handleCanvasClose} className="p-2">
              <X size={16} />
            </Button>
          </div>
          <div className="px-4 pb-4">
            <DrawingCanvas
              ref={canvasRef}
              initialPaths={canvasPaths}
              onChange={handleCanvasChange}
            />
          </div>
        </ModalShell>
      )}
    </div>
  )
}
