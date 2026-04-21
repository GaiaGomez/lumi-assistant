// ============================================================
// Wrapper de IA — Anthropic SDK
//
// Lanza 'AI_NOT_CONFIGURED' si ANTHROPIC_API_KEY no está seteada,
// para que las rutas API puedan devolver 501 sin stacktrace.
// ============================================================

import Anthropic from '@anthropic-ai/sdk'
import type { ClinicalNoteTemplateData } from '@/types'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('AI_NOT_CONFIGURED')
  return new Anthropic({ apiKey })
}

const TRANSCRIPTION_MODEL = 'claude-sonnet-4-6'
const STRUCTURING_MODEL = 'claude-haiku-4-5-20251001'

/**
 * Transcribe una imagen de canvas manuscrito a texto plano.
 * Marca [ilegible] donde no puede leer.
 * imageUrl debe ser una URL accesible (signed URL de Supabase Storage está bien).
 */
export async function transcribeCanvas(imageUrl: string): Promise<string> {
  const client = getClient()

  const response = await client.messages.create({
    model: TRANSCRIPTION_MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          {
            type: 'text',
            text: `Transcribí fielmente el texto manuscrito de esta nota clínica de sesión de psicología.

Reglas:
- Copiá el texto tal como aparece, respetando saltos de línea, puntuación y estructura
- Si una palabra es ilegible, escribí [ilegible] en su lugar
- Si hay una sección completa que no se puede leer, escribí [sección ilegible]
- No interpretes ni reformules — solo transcribí lo que ves
- Si la imagen no tiene texto o está vacía, escribí [sin texto]
- Devolvé únicamente la transcripción, sin comentarios previos ni posteriores`,
          },
        ],
      },
    ],
  })

  const block = response.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('La IA no devolvió texto.')
  return block.text.trim()
}

/**
 * Convierte una transcripción revisada a una nota DAP estructurada.
 * Usa el texto editado por el usuario, nunca re-lee el canvas.
 */
export async function structureTranscription(transcriptionText: string): Promise<ClinicalNoteTemplateData> {
  const client = getClient()

  const response = await client.messages.create({
    model: STRUCTURING_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Sos un asistente clínico especializado en psicología. A partir de la siguiente transcripción de notas de sesión, generá una nota en formato DAP estructurado.

Transcripción:
${transcriptionText}

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta (sin markdown, sin texto extra):
{
  "focus": "tema central de la sesión (máximo 1 línea)",
  "data": "datos objetivos y subjetivos: lo observado, lo reportado, intervenciones aplicadas",
  "assessment": "lectura clínica: hipótesis, progreso, nivel de insight, alertas",
  "plan": "próximos pasos, acuerdos, objetivos para la próxima sesión",
  "riskLevel": null
}

Reglas:
- riskLevel puede ser null, "sin-riesgo-agudo", "monitoreo" o "atencion-prioritaria"
- Si la transcripción contiene [ilegible], inclúyelo en el campo que corresponda
- No inventes información que no esté en la transcripción
- Devolvé solo el JSON, sin explicaciones`,
      },
    ],
  })

  const block = response.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('La IA no devolvió texto.')

  // Strip markdown code fences if present
  const jsonString = block.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    throw new Error(`Respuesta de IA no es JSON válido: ${jsonString.slice(0, 80)}`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('La IA devolvió un formato inesperado.')
  }

  const r = parsed as Record<string, unknown>
  return {
    format: 'dap',
    focus:      typeof r.focus === 'string' ? r.focus : '',
    data:       typeof r.data === 'string' ? r.data : '',
    assessment: typeof r.assessment === 'string' ? r.assessment : '',
    plan:       typeof r.plan === 'string' ? r.plan : '',
    riskLevel:  validateRiskLevel(r.riskLevel),
  }
}

function validateRiskLevel(value: unknown): ClinicalNoteTemplateData['riskLevel'] {
  if (
    value === 'sin-riesgo-agudo' ||
    value === 'monitoreo' ||
    value === 'atencion-prioritaria'
  ) return value
  return null
}
