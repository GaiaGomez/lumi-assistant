'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { getSessionNoteById, updateSessionNote, deleteSessionNote } from '@/lib/notes/actions'
import { createClient } from '@/lib/supabase/client'
import { uploadNoteCanvas } from '@/lib/notes/storage'
import DrawingCanvas, { type DrawingCanvasHandle } from '@/components/historias/DrawingCanvas'
import ModalShell from '@/components/ui/ModalShell'
import SectionHeader from '@/components/ui/SectionHeader'
import Button from '@/components/ui/Button'
import type { ClinicalCanvasPath, SessionNote as SessionNoteType } from '@/types'
import { ChevronDown, X } from 'lucide-react'

type NoteMode = 'session' | 'formal'

interface SessionNoteProps {
  noteId: string
  patientName: string
  patientId: string
}

export default function SessionNote({ noteId, patientName, patientId }: SessionNoteProps) {
  const router = useRouter()
  const [note, setNote] = useState<SessionNoteType | null>(null)
  const [mode, setMode] = useState<NoteMode>('session')

  const [quickNote, setQuickNote] = useState('')
  const [comoLlego, setComoLlego] = useState('')
  const [queTrabajaron, setQueTrabajaron] = useState('')
  const [comoVaProceso, setComoVaProceso] = useState('')
  const [queSigue, setQueSigue] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [showCanvas, setShowCanvas] = useState(false)
  const [canvasPaths, setCanvasPaths] = useState<ClinicalCanvasPath[] | null>(null)
  const [quickNoteExpanded, setQuickNoteExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasRef = useRef<DrawingCanvasHandle>(null)
  const canvasSnapshotRef = useRef<{ dataUrl: string; paths: ClinicalCanvasPath[] } | null>(null)
  const canvasScrollRef = useRef<HTMLDivElement>(null)

  // Lock body scroll while canvas is open so the app doesn't scroll behind
  useEffect(() => {
    if (showCanvas) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showCanvas])

  useEffect(() => {
    getSessionNoteById(noteId).then((loaded) => {
      if (!loaded) return
      setNote(loaded)
      setQuickNote(loaded.quickNote ?? '')
      setComoLlego(loaded.comoLlego ?? '')
      setQueTrabajaron(loaded.queTrabajaron ?? '')
      setComoVaProceso(loaded.comoVaProceso ?? '')
      setQueSigue(loaded.queSigue ?? '')
      setCanvasPaths(loaded.canvasPaths)
    })
  }, [noteId])

  function scheduleAutosave(
    data: Partial<Pick<SessionNoteType, 'quickNote' | 'comoLlego' | 'queTrabajaron' | 'comoVaProceso' | 'queSigue' | 'canvasPaths' | 'canvasUrl'>>
  ) {
    setIsSaving(true)
    setIsSaved(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const updated = await updateSessionNote(noteId, data)
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
    value: string
  ) {
    if (field === 'comoLlego') setComoLlego(value)
    else if (field === 'queTrabajaron') setQueTrabajaron(value)
    else if (field === 'comoVaProceso') setComoVaProceso(value)
    else if (field === 'queSigue') setQueSigue(value)

    scheduleAutosave({
      comoLlego: field === 'comoLlego' ? value : comoLlego,
      queTrabajaron: field === 'queTrabajaron' ? value : queTrabajaron,
      comoVaProceso: field === 'comoVaProceso' ? value : comoVaProceso,
      queSigue: field === 'queSigue' ? value : queSigue,
    })
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
        const updated = await updateSessionNote(noteId, {
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

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteSessionNote(noteId)
      router.push(`/pacientes/${patientId}`)
    } finally {
      setIsDeleting(false)
    }
  }

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
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-full px-3 py-1.5 text-[11px]"
              style={{ background: 'rgba(176,124,132,0.12)', color: 'var(--state-cancel-text)' }}
            >
              Eliminar nota
            </button>
          </div>
        </div>

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
              className="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-all"
              style={
                mode === m
                  ? {
                      background: 'rgba(255,255,255,0.88)',
                      color: 'var(--ink-cool-strong)',
                      fontWeight: 500,
                      boxShadow: '0 2px 8px rgba(120,108,130,0.10)',
                    }
                  : { color: 'var(--ink-cool-soft)' }
              }
            >
              {m === 'session' ? 'Durante la sesión' : 'Nota formal'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCanvas(true)}
            className="shrink-0 flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] transition-all"
            style={{ color: 'var(--ink-cool-soft)' }}
          >
            Canvas
            {canvasPaths && canvasPaths.length > 0 && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: '#6BAF8D' }}
              />
            )}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-4 py-4">
        {mode === 'session' && (
          <div className="relative">
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
                <textarea
                  value={value}
                  onChange={(e) => {
                    e.target.style.height = 'auto'
                    e.target.style.height = `${e.target.scrollHeight}px`
                    handleFormalFieldChange(key, e.target.value)
                  }}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full resize-none overflow-hidden rounded-[14px] px-3.5 py-3 text-[14px] leading-relaxed focus:outline-none"
                />
              </label>
            ))}

          </div>
        )}
      </div>

      {/* ── Canvas — fullscreen portal, mounted at document.body to escape layout stacking context ── */}
      {showCanvas && createPortal(
        <div
          className="fixed inset-0 flex flex-col"
          style={{ zIndex: 9999, background: '#FAF7F4' }}
        >
          {/* Context bar — patient + session + status + close */}
          <div
            className="flex shrink-0 items-center gap-3 px-4"
            style={{
              height: 44,
              background: 'rgba(250,247,244,0.97)',
              borderBottom: '1px solid rgba(170,160,185,0.14)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <p
                className="text-[13px] font-medium truncate"
                style={{ color: 'var(--ink-cool-strong)' }}
              >
                {patientName}
              </p>
              <span
                className="text-[12px] shrink-0"
                style={{ color: 'var(--ink-cool-faint)' }}
              >
                · Sesión #{note.sessionNumber ?? '—'}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isSaving && (
                <span
                  className="h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ background: '#D4A84B' }}
                  title="Guardando..."
                />
              )}
              {!isSaving && isSaved && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: '#6BAF8D' }}
                  title="Guardado"
                />
              )}
              <button
                type="button"
                onClick={handleCanvasClose}
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{
                  background: 'rgba(160,150,175,0.14)',
                  color: 'var(--ink-cool-soft)',
                }}
                aria-label="Cerrar canvas"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable canvas area */}
          <div ref={canvasScrollRef} className="flex-1 overflow-auto">
            <DrawingCanvas
              ref={canvasRef}
              initialPaths={canvasPaths}
              onChange={handleCanvasChange}
              initialHeight={900}
              scrollContainerRef={canvasScrollRef}
            />
          </div>
        </div>,
        document.body
      )}

      {/* ── Confirmar eliminación ── */}
      {confirmDelete && (
        <ModalShell onClose={() => setConfirmDelete(false)} maxWidth="max-w-sm">
          <div className="flex items-start justify-between p-4">
            <div>
              <SectionHeader label="Acción irreversible" className="mb-1" />
              <h2 className="editorial-panel-title text-[1.05rem]">¿Eliminar esta nota?</h2>
            </div>
            <Button variant="subtle" onClick={() => setConfirmDelete(false)} className="p-2">
              <X size={16} />
            </Button>
          </div>
          <div className="px-4 pb-4 space-y-3">
            <p className="text-[13px]" style={{ color: 'var(--ink-cool-soft)' }}>
              Se eliminará la nota de la Sesión #{note.sessionNumber ?? '—'} de {patientName}. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="subtle" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="rounded-full px-4 py-1.5 text-[13px]"
                style={{ background: 'rgba(176,124,132,0.12)', color: 'var(--state-cancel-text)' }}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
