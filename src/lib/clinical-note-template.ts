import type {
  ClinicalCanvasPath,
  ClinicalNote,
  ClinicalNoteRiskLevel,
  ClinicalNoteTemplateData,
} from '@/types'

export const CLINICAL_NOTE_TEMPLATE_KIND = 'dap' as const

export const CLINICAL_NOTE_RISK_META: Record<ClinicalNoteRiskLevel, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  'sin-riesgo-agudo': {
    label: 'Sin riesgo agudo',
    tone: 'success',
  },
  monitoreo: {
    label: 'Monitoreo',
    tone: 'warning',
  },
  'atencion-prioritaria': {
    label: 'Atencion prioritaria',
    tone: 'danger',
  },
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function optionalRiskLevel(value: unknown): ClinicalNoteRiskLevel | null {
  if (
    value === 'sin-riesgo-agudo' ||
    value === 'monitoreo' ||
    value === 'atencion-prioritaria'
  ) {
    return value
  }
  return null
}

function isCanvasPoint(value: unknown): value is { x: number; y: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return typeof record.x === 'number' && typeof record.y === 'number'
}

export function normalizeClinicalCanvasPaths(value: unknown): ClinicalCanvasPath[] | null {
  if (!Array.isArray(value)) return null

  const normalized = value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const record = entry as Record<string, unknown>
    const points = Array.isArray(record.paths) ? record.paths.filter(isCanvasPoint) : []
    if (points.length === 0) return []

    return [{
      drawMode: typeof record.drawMode === 'boolean' ? record.drawMode : true,
      strokeColor: typeof record.strokeColor === 'string' ? record.strokeColor : '#3D2E22',
      strokeWidth: typeof record.strokeWidth === 'number' ? record.strokeWidth : 3,
      paths: points,
      startTimestamp: typeof record.startTimestamp === 'number' ? record.startTimestamp : undefined,
      endTimestamp: typeof record.endTimestamp === 'number' ? record.endTimestamp : undefined,
    }]
  })

  return normalized.length > 0 ? normalized : null
}

export function createEmptyClinicalNoteTemplate(): ClinicalNoteTemplateData {
  return {
    format: CLINICAL_NOTE_TEMPLATE_KIND,
    focus: '',
    riskLevel: null,
    data: '',
    assessment: '',
    plan: '',
  }
}

export function normalizeClinicalNoteTemplateData(value: unknown): ClinicalNoteTemplateData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>

  return {
    format: CLINICAL_NOTE_TEMPLATE_KIND,
    focus: optionalString(record.focus),
    riskLevel: optionalRiskLevel(record.riskLevel),
    data: optionalString(record.data),
    assessment: optionalString(record.assessment),
    plan: optionalString(record.plan),
  }
}

export function isClinicalNoteTemplateEmpty(template: ClinicalNoteTemplateData | null | undefined): boolean {
  if (!template) return true

  return (
    !template.focus.trim() &&
    !template.data.trim() &&
    !template.assessment.trim() &&
    !template.plan.trim() &&
    !template.riskLevel
  )
}

export function serializeClinicalNoteTemplateData(
  template: ClinicalNoteTemplateData | null | undefined
): ClinicalNoteTemplateData | null {
  if (!template) return null

  const normalized: ClinicalNoteTemplateData = {
    format: CLINICAL_NOTE_TEMPLATE_KIND,
    focus: template.focus.trim(),
    riskLevel: template.riskLevel,
    data: template.data.trim(),
    assessment: template.assessment.trim(),
    plan: template.plan.trim(),
  }

  return isClinicalNoteTemplateEmpty(normalized) ? null : normalized
}

export function getClinicalNoteHeadline(note: Pick<ClinicalNote, 'template_data' | 'texto' | 'canvas_url'>): string {
  const focus = note.template_data?.focus.trim()
  if (focus) return focus

  const dataLine = note.template_data?.data.trim().split('\n').find(Boolean)
  if (dataLine) return dataLine

  const textLine = note.texto?.trim().split('\n').find(Boolean)
  if (textLine) return textLine

  return note.canvas_url ? 'Nota manuscrita' : 'Nota de sesion'
}

export function getClinicalNoteSummary(note: Pick<ClinicalNote, 'template_data' | 'texto' | 'canvas_url'>): string {
  const candidate = [
    note.template_data?.assessment,
    note.template_data?.plan,
    note.template_data?.data,
    note.texto,
  ]
    .find((value) => typeof value === 'string' && value.trim().length > 0)
    ?.trim()

  if (!candidate) return note.canvas_url ? 'Incluye canvas manuscrito.' : 'Sin contenido escrito.'

  return candidate.length > 140 ? `${candidate.slice(0, 137).trimEnd()}...` : candidate
}

export function clinicalNoteHasStructuredContent(note: Pick<ClinicalNote, 'template_data' | 'texto' | 'canvas_url'>): boolean {
  return Boolean(
    !isClinicalNoteTemplateEmpty(note.template_data) ||
    note.texto?.trim() ||
    note.canvas_url
  )
}
