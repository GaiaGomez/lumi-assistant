'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  ClipboardList,
  Database,
  FileCheck,
  HeartPulse,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Shield,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react'
import type {
  ClinicalAlertKey,
  InformedConsentStatus,
  Patient,
  PatientClinicalProfile,
} from '@/types'
import {
  CLINICAL_ALERT_OPTIONS,
  getClinicalAlertLabel,
  INFORMED_CONSENT_OPTIONS,
  resolveClinicalAlertKeys,
} from '@/lib/patients/clinical-profile'
import { upsertPatientClinicalProfile } from '@/lib/patients/clinical-profile.client'
import { markConsentSigned, markDataProcessingAuthorized } from '@/lib/patients/clinical-profile.actions'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Input from '@/components/ui/Input'
import ModalShell from '@/components/ui/ModalShell'
import SectionHeader from '@/components/ui/SectionHeader'
import Textarea from '@/components/ui/Textarea'

type BlockKey = 'personal' | 'emergency' | 'health' | 'therapy' | 'alerts'

type ClinicalProfileDraft = {
  documento: string
  birth_date: string
  genero: string
  ocupacion: string
  email: string
  direccion: string
  ciudad: string
  eps: string
  emergency_contact_name: string
  emergency_contact_relationship: string
  emergency_contact_phone: string
  emergency_contact_authorized: boolean | null
  emergency_contact_notes: string
  medication: string
  allergies: string
  medical_conditions: string
  diagnoses: string
  previous_treatments: string
  consultation_reason: string
  therapeutic_objective: string
  session_frequency: string
  care_modality: string
  process_status: string
  support_network: string
  clinical_alerts: ClinicalAlertKey[]
  informed_consent_status: InformedConsentStatus | ''
  administrative_notes: string
}

interface PatientClinicalProfileTabProps {
  patient: Patient
  initialProfile: PatientClinicalProfile | null
}

function toDraft(
  profile: PatientClinicalProfile | null,
  patient: Patient
): ClinicalProfileDraft {
  return {
    documento: profile?.documento ?? '',
    birth_date: profile?.birth_date ?? '',
    genero: profile?.genero ?? '',
    ocupacion: profile?.ocupacion ?? '',
    email: profile?.email ?? patient.email ?? '',
    direccion: profile?.direccion ?? '',
    ciudad: profile?.ciudad ?? '',
    eps: profile?.eps ?? '',
    emergency_contact_name: profile?.emergency_contact_name ?? '',
    emergency_contact_relationship: profile?.emergency_contact_relationship ?? '',
    emergency_contact_phone: profile?.emergency_contact_phone ?? '',
    emergency_contact_authorized: profile?.emergency_contact_authorized ?? null,
    emergency_contact_notes: profile?.emergency_contact_notes ?? '',
    medication: profile?.medication ?? '',
    allergies: profile?.allergies ?? '',
    medical_conditions: profile?.medical_conditions ?? '',
    diagnoses: profile?.diagnoses ?? '',
    previous_treatments: profile?.previous_treatments ?? '',
    consultation_reason: profile?.consultation_reason ?? '',
    therapeutic_objective: profile?.therapeutic_objective ?? '',
    session_frequency: profile?.session_frequency ?? '',
    care_modality: profile?.care_modality ?? '',
    process_status: profile?.process_status ?? '',
    support_network: profile?.support_network ?? '',
    clinical_alerts: profile?.clinical_alerts ?? [],
    informed_consent_status: profile?.informed_consent_status ?? '',
    administrative_notes: profile?.administrative_notes ?? '',
  }
}

function formatDisplayValue(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null
}

function formatBirthDate(value: string | null | undefined) {
  if (!value) return null

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  const age = getAge(value)
  const formatted = date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return age === null ? formatted : `${formatted} · ${age} años`
}

function getAge(value: string | null | undefined) {
  if (!value) return null

  const birthDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }

  return age >= 0 ? age : null
}

function getConsentLabel(value: InformedConsentStatus | '' | null | undefined) {
  if (!value) return 'Sin registrar'
  return INFORMED_CONSENT_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function getBooleanLabel(value: boolean | null) {
  if (value === true) return 'Autorizado'
  if (value === false) return 'No autorizado'
  return 'Sin definir'
}

function buildPayload(block: BlockKey, draft: ClinicalProfileDraft) {
  switch (block) {
    case 'personal':
      return {
        documento: draft.documento,
        birth_date: draft.birth_date,
        genero: draft.genero,
        ocupacion: draft.ocupacion,
        email: draft.email,
        direccion: draft.direccion,
        ciudad: draft.ciudad,
        eps: draft.eps,
      }
    case 'emergency':
      return {
        emergency_contact_name: draft.emergency_contact_name,
        emergency_contact_relationship: draft.emergency_contact_relationship,
        emergency_contact_phone: draft.emergency_contact_phone,
        emergency_contact_authorized: draft.emergency_contact_authorized,
        emergency_contact_notes: draft.emergency_contact_notes,
      }
    case 'health':
      return {
        medication: draft.medication,
        allergies: draft.allergies,
        medical_conditions: draft.medical_conditions,
        diagnoses: draft.diagnoses,
        previous_treatments: draft.previous_treatments,
      }
    case 'therapy':
      return {
        consultation_reason: draft.consultation_reason,
        therapeutic_objective: draft.therapeutic_objective,
        session_frequency: draft.session_frequency,
        care_modality: draft.care_modality,
        process_status: draft.process_status,
        support_network: draft.support_network,
      }
    case 'alerts':
      return {
        clinical_alerts: draft.clinical_alerts,
        informed_consent_status: draft.informed_consent_status || null,
        administrative_notes: draft.administrative_notes,
      }
  }
}

function isBlockEmpty(block: BlockKey, profile: PatientClinicalProfile | null, patient: Patient) {
  const alerts = resolveClinicalAlertKeys(patient, profile)

  switch (block) {
    case 'personal':
      return ![
        profile?.documento,
        profile?.birth_date,
        profile?.genero,
        profile?.ocupacion,
        profile?.email ?? patient.email,
        profile?.direccion,
        profile?.ciudad,
        profile?.eps,
      ].some(formatDisplayValue)
    case 'emergency':
      return ![
        profile?.emergency_contact_name,
        profile?.emergency_contact_relationship,
        profile?.emergency_contact_phone,
        profile?.emergency_contact_notes,
      ].some(formatDisplayValue) && profile?.emergency_contact_authorized === null
    case 'health':
      return ![
        profile?.medication,
        profile?.allergies,
        profile?.medical_conditions,
        profile?.diagnoses,
        profile?.previous_treatments,
      ].some(formatDisplayValue)
    case 'therapy':
      return ![
        profile?.consultation_reason,
        profile?.therapeutic_objective,
        profile?.session_frequency,
        profile?.care_modality,
        profile?.process_status,
        profile?.support_network,
      ].some(formatDisplayValue)
    case 'alerts':
      return alerts.length === 0 && !formatDisplayValue(profile?.administrative_notes) && !profile?.informed_consent_status
  }
}

function FieldItem({
  label,
  value,
  icon,
  multiline = false,
}: {
  label: string
  value: string | null
  icon?: ReactNode
  multiline?: boolean
}) {
  return (
    <Card radius="sm" className="px-3 py-2">
      <div className="flex items-start gap-2">
        {icon ? (
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.5)', color: 'var(--ink-cool-soft)' }}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="card-label" style={{ color: 'var(--ink-cool-faint)' }}>
            {label}
          </p>
          <p
            className={`${multiline ? 'whitespace-pre-wrap' : ''} text-[13px] leading-snug`}
            style={{ color: value ? 'var(--ink-cool-strong)' : 'var(--ink-cool-muted)' }}
          >
            {value ?? 'Sin registrar'}
          </p>
        </div>
      </div>
    </Card>
  )
}

function AlertChip({ alert }: { alert: ClinicalAlertKey }) {
  const statusByAlert: Record<ClinicalAlertKey, 'warning' | 'pending' | 'inactive' | 'cancel'> = {
    medicacion_activa: 'warning',
    contacto_incompleto: 'inactive',
    consentimiento_pendiente: 'pending',
    prefiere_whatsapp: 'inactive',
    no_llamar: 'cancel',
    riesgo_clinico: 'cancel',
  }

  return (
    <span className={`status-badge status-badge--${statusByAlert[alert]}`}>
      {getClinicalAlertLabel(alert)}
    </span>
  )
}

function BlockCard({
  title,
  kicker,
  icon,
  onEdit,
  isEmpty,
  emptyHint,
  children,
}: {
  title: string
  kicker: string
  icon: ReactNode
  onEdit: () => void
  isEmpty: boolean
  emptyHint: string
  children: ReactNode
}) {
  return (
    <Card className="p-3">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.46)', color: 'var(--ink-cool-soft)' }}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <SectionHeader label={kicker} className="mb-0.5" />
            <h2 className="editorial-panel-title text-[1.05rem]">{title}</h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="btn-subtle shrink-0 px-3 py-1.5 text-[12px]"
        >
          Editar
        </button>
      </div>

      {isEmpty ? (
        <div className="rounded-[14px] px-3 py-2">
          <EmptyState message="Sin registrar" hint={emptyHint} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onEdit}
              className="btn-subtle px-3 py-1.5 text-[12px]"
            >
              Agregar
            </button>
          </div>
        </div>
      ) : children}
    </Card>
  )
}

export default function PatientClinicalProfileTab({
  patient,
  initialProfile,
}: PatientClinicalProfileTabProps) {
  const router = useRouter()
  const [profile, setProfile] = useState(initialProfile)
  const [editingBlock, setEditingBlock] = useState<BlockKey | null>(null)
  const [draft, setDraft] = useState<ClinicalProfileDraft>(() => toDraft(initialProfile, patient))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentSigning, setConsentSigning] = useState(false)
  const [consentError, setConsentError] = useState<string | null>(null)
  const [dataSigning, setDataSigning] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)

  const alertKeys = resolveClinicalAlertKeys(patient, profile)
  const personalEmpty = isBlockEmpty('personal', profile, patient)
  const emergencyEmpty = isBlockEmpty('emergency', profile, patient)
  const healthEmpty = isBlockEmpty('health', profile, patient)
  const therapyEmpty = isBlockEmpty('therapy', profile, patient)
  const alertsEmpty = isBlockEmpty('alerts', profile, patient)

  function openEditor(block: BlockKey) {
    setDraft(toDraft(profile, patient))
    setError(null)
    setEditingBlock(block)
  }

  function closeEditor() {
    setEditingBlock(null)
    setError(null)
  }

  function setField<K extends keyof ClinicalProfileDraft>(field: K, value: ClinicalProfileDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function toggleAlert(alert: ClinicalAlertKey) {
    setDraft((current) => ({
      ...current,
      clinical_alerts: current.clinical_alerts.includes(alert)
        ? current.clinical_alerts.filter((item) => item !== alert)
        : [...current.clinical_alerts, alert],
    }))
  }

  async function handleSave() {
    if (!editingBlock) return

    setSaving(true)
    setError(null)
    try {
      const nextProfile = await upsertPatientClinicalProfile(
        patient.id,
        buildPayload(editingBlock, draft)
      )

      setProfile(nextProfile)
      setDraft(toDraft(nextProfile, patient))
      setEditingBlock(null)
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar la ficha clínica.')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkConsentSigned() {
    setConsentSigning(true)
    setConsentError(null)
    try {
      const next = await markConsentSigned(patient.id)
      setProfile(next)
      router.refresh()
    } catch (err) {
      setConsentError(err instanceof Error ? err.message : 'No se pudo registrar el consentimiento')
    } finally {
      setConsentSigning(false)
    }
  }

  async function handleMarkDataProcessingAuthorized() {
    setDataSigning(true)
    setDataError(null)
    try {
      const next = await markDataProcessingAuthorized(patient.id)
      setProfile(next)
      router.refresh()
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'No se pudo registrar la autorización')
    } finally {
      setDataSigning(false)
    }
  }

  const modalTitleByBlock: Record<BlockKey, string> = {
    personal: 'Datos personales',
    emergency: 'Contacto de emergencia',
    health: 'Medicación y salud',
    therapy: 'Proceso terapéutico',
    alerts: 'Alertas y consentimiento',
  }

  return (
    <>
      <div className="space-y-2.5">
        <Card className="p-3">
          <SectionHeader label="Ficha clínica" className="mb-1" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="editorial-panel-title text-[1.05rem]">Resumen estable del proceso</h2>
              <p className="mt-0.5 text-[13px]" style={{ color: 'var(--ink-cool-soft)' }}>
                Información persistente del paciente, separada de las notas DAP por sesión.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {alertKeys.length > 0 ? alertKeys.map((alert) => (
                <AlertChip key={alert} alert={alert} />
              )) : (
                <span className="status-badge status-badge--success">
                  Sin alertas activas
                </span>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
          <BlockCard
            title="Datos personales"
            kicker="Base"
            icon={<UserRound size={15} />}
            onEdit={() => openEditor('personal')}
            isEmpty={personalEmpty}
            emptyHint="Agrega documento, fecha de nacimiento o datos administrativos."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FieldItem label="Documento" value={formatDisplayValue(profile?.documento)} icon={<IdCard size={13} />} />
              <FieldItem label="Nacimiento / edad" value={formatBirthDate(profile?.birth_date)} icon={<CalendarDays size={13} />} />
              <FieldItem label="Género" value={formatDisplayValue(profile?.genero)} />
              <FieldItem label="Ocupación" value={formatDisplayValue(profile?.ocupacion)} />
              <FieldItem label="Correo" value={formatDisplayValue(profile?.email ?? patient.email)} icon={<Mail size={13} />} />
              <FieldItem label="EPS" value={formatDisplayValue(profile?.eps)} />
              <FieldItem label="Dirección" value={formatDisplayValue(profile?.direccion)} icon={<MapPin size={13} />} />
              <FieldItem label="Ciudad" value={formatDisplayValue(profile?.ciudad)} />
            </div>
          </BlockCard>

          <BlockCard
            title="Contacto de emergencia"
            kicker="Soporte"
            icon={<Shield size={15} />}
            onEdit={() => openEditor('emergency')}
            isEmpty={emergencyEmpty}
            emptyHint="Registra una persona de apoyo y cómo contactarla."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FieldItem label="Nombre" value={formatDisplayValue(profile?.emergency_contact_name)} />
              <FieldItem label="Parentesco" value={formatDisplayValue(profile?.emergency_contact_relationship)} />
              <FieldItem label="Teléfono" value={formatDisplayValue(profile?.emergency_contact_phone)} icon={<Phone size={13} />} />
              <FieldItem label="Autorizado" value={getBooleanLabel(profile?.emergency_contact_authorized ?? null)} />
              <div className="sm:col-span-2">
                <FieldItem
                  label="Notas"
                  value={formatDisplayValue(profile?.emergency_contact_notes)}
                  multiline
                  icon={<MessageCircle size={13} />}
                />
              </div>
            </div>
          </BlockCard>

          <BlockCard
            title="Medicación y salud"
            kicker="Clínico"
            icon={<HeartPulse size={15} />}
            onEdit={() => openEditor('health')}
            isEmpty={healthEmpty}
            emptyHint="Añade medicación, alergias o antecedentes relevantes."
          >
            <div className="grid grid-cols-1 gap-2">
              <FieldItem label="Medicación" value={formatDisplayValue(profile?.medication)} multiline />
              <FieldItem label="Alergias" value={formatDisplayValue(profile?.allergies)} multiline />
              <FieldItem label="Condiciones médicas" value={formatDisplayValue(profile?.medical_conditions)} multiline />
              <FieldItem label="Diagnósticos" value={formatDisplayValue(profile?.diagnoses)} multiline />
              <FieldItem label="Tratamientos previos" value={formatDisplayValue(profile?.previous_treatments)} multiline />
            </div>
          </BlockCard>

          <BlockCard
            title="Proceso terapéutico"
            kicker="Seguimiento"
            icon={<ClipboardList size={15} />}
            onEdit={() => openEditor('therapy')}
            isEmpty={therapyEmpty}
            emptyHint="Resume motivo de consulta, objetivos y modalidad del proceso."
          >
            <div className="grid grid-cols-1 gap-2">
              <FieldItem label="Motivo de consulta" value={formatDisplayValue(profile?.consultation_reason)} multiline />
              <FieldItem label="Objetivo terapéutico" value={formatDisplayValue(profile?.therapeutic_objective)} multiline />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <FieldItem label="Frecuencia" value={formatDisplayValue(profile?.session_frequency)} />
                <FieldItem label="Modalidad" value={formatDisplayValue(profile?.care_modality)} />
                <FieldItem label="Estado del proceso" value={formatDisplayValue(profile?.process_status)} />
              </div>
              <FieldItem label="Red de apoyo" value={formatDisplayValue(profile?.support_network)} multiline />
            </div>
          </BlockCard>
        </div>

        <BlockCard
          title="Alertas"
          kicker="Señales rápidas"
          icon={<TriangleAlert size={15} />}
          onEdit={() => openEditor('alerts')}
          isEmpty={alertsEmpty}
          emptyHint="Marca alertas clínicas, consentimiento o preferencias de contacto."
        >
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {alertKeys.map((alert) => (
                <AlertChip key={alert} alert={alert} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FieldItem label="Consentimiento" value={getConsentLabel(profile?.informed_consent_status)} />
              <FieldItem label="Notas administrativas" value={formatDisplayValue(profile?.administrative_notes)} multiline />
            </div>
          </div>
        </BlockCard>

        {/* ── Consentimiento informado ── */}
        <Card className="p-3">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.46)', color: 'var(--ink-cool-soft)' }}
              >
                <FileCheck size={15} />
              </span>
              <div>
                <SectionHeader label="Legal" className="mb-0.5" />
                <h2 className="editorial-panel-title text-[1.05rem]">Consentimiento informado</h2>
              </div>
            </div>
            {profile?.informed_consent_status !== 'signed' && (
              <button
                type="button"
                onClick={handleMarkConsentSigned}
                disabled={consentSigning}
                className="btn-subtle shrink-0 px-3 py-1.5 text-[12px] flex items-center gap-1"
              >
                {consentSigning ? <Loader2 size={12} className="animate-spin" /> : null}
                Marcar firmado
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <FieldItem
              label="Estado"
              value={
                profile?.informed_consent_status === 'signed'
                  ? 'Firmado'
                  : profile?.informed_consent_status === 'not_required'
                  ? 'No aplica'
                  : 'Pendiente'
              }
            />
            {profile?.informed_consent_signed_at && (
              <FieldItem
                label="Fecha de firma"
                value={new Date(profile.informed_consent_signed_at).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
            )}
            {profile?.consent_version && (
              <FieldItem label="Versión" value={profile.consent_version} />
            )}
          </div>
          {consentError && (
            <p className="mt-2 text-[12px]" style={{ color: 'var(--state-cancel-text)' }}>
              {consentError}
            </p>
          )}
        </Card>

        {/* ── Autorización tratamiento de datos ── */}
        <Card className="p-3">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.46)', color: 'var(--ink-cool-soft)' }}
              >
                <Database size={15} />
              </span>
              <div>
                <SectionHeader label="Legal" className="mb-0.5" />
                <h2 className="editorial-panel-title text-[1.05rem]">Autorización datos</h2>
              </div>
            </div>
            {profile?.data_processing_authorization_status !== 'authorized' && (
              <button
                type="button"
                onClick={handleMarkDataProcessingAuthorized}
                disabled={dataSigning}
                className="btn-subtle shrink-0 px-3 py-1.5 text-[12px] flex items-center gap-1"
              >
                {dataSigning ? <Loader2 size={12} className="animate-spin" /> : null}
                Marcar autorizado
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <FieldItem
              label="Estado"
              value={
                profile?.data_processing_authorization_status === 'authorized'
                  ? 'Autorizado'
                  : 'Pendiente'
              }
            />
            {profile?.data_processing_authorized_at && (
              <FieldItem
                label="Fecha autorización"
                value={new Date(profile.data_processing_authorized_at).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
            )}
          </div>
          {dataError && (
            <p className="mt-2 text-[12px]" style={{ color: 'var(--state-cancel-text)' }}>
              {dataError}
            </p>
          )}
        </Card>
      </div>

      {editingBlock && typeof document !== 'undefined' && createPortal(
        <ModalShell onClose={closeEditor} maxWidth="max-w-2xl">
          <div className="flex items-start justify-between p-3.5 sm:p-4">
            <div>
              <SectionHeader label="Ficha clínica" className="mb-0.5" />
              <h2 className="editorial-panel-title text-[1rem]">
                {modalTitleByBlock[editingBlock]}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeEditor}
              className="btn-subtle flex h-8 w-8 shrink-0 items-center justify-center"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2.5 px-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.875rem)] sm:px-4">
            {editingBlock === 'personal' && (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input label="Documento" value={draft.documento} onChange={(event) => setField('documento', event.target.value)} />
                  <Input label="Fecha de nacimiento" type="date" value={draft.birth_date} onChange={(event) => setField('birth_date', event.target.value)} />
                  <Input label="Género" value={draft.genero} onChange={(event) => setField('genero', event.target.value)} />
                  <Input label="Ocupación" value={draft.ocupacion} onChange={(event) => setField('ocupacion', event.target.value)} />
                  <Input label="Correo" type="email" value={draft.email} onChange={(event) => setField('email', event.target.value)} />
                  <Input label="EPS" value={draft.eps} onChange={(event) => setField('eps', event.target.value)} />
                  <Input label="Dirección" value={draft.direccion} onChange={(event) => setField('direccion', event.target.value)} />
                  <Input label="Ciudad" value={draft.ciudad} onChange={(event) => setField('ciudad', event.target.value)} />
                </div>
              </>
            )}

            {editingBlock === 'emergency' && (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input label="Nombre" value={draft.emergency_contact_name} onChange={(event) => setField('emergency_contact_name', event.target.value)} />
                  <Input label="Parentesco" value={draft.emergency_contact_relationship} onChange={(event) => setField('emergency_contact_relationship', event.target.value)} />
                  <Input label="Teléfono" value={draft.emergency_contact_phone} onChange={(event) => setField('emergency_contact_phone', event.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <p className="card-label" style={{ color: 'var(--ink-cool-faint)' }}>
                    Autorizado
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Sin definir', value: null },
                      { label: 'Sí', value: true },
                      { label: 'No', value: false },
                    ].map((option) => {
                      const active = draft.emergency_contact_authorized === option.value
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => setField('emergency_contact_authorized', option.value)}
                          className={`${active ? 'btn-action' : 'btn-subtle'} px-3 py-1.5 text-[12px]`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Textarea
                  label="Notas"
                  rows={3}
                  value={draft.emergency_contact_notes}
                  onChange={(event) => setField('emergency_contact_notes', event.target.value)}
                />
              </>
            )}

            {editingBlock === 'health' && (
              <>
                <Textarea label="Medicación" rows={3} value={draft.medication} onChange={(event) => setField('medication', event.target.value)} />
                <Textarea label="Alergias" rows={3} value={draft.allergies} onChange={(event) => setField('allergies', event.target.value)} />
                <Textarea label="Condiciones médicas" rows={3} value={draft.medical_conditions} onChange={(event) => setField('medical_conditions', event.target.value)} />
                <Textarea label="Diagnósticos" rows={3} value={draft.diagnoses} onChange={(event) => setField('diagnoses', event.target.value)} />
                <Textarea label="Tratamientos previos" rows={3} value={draft.previous_treatments} onChange={(event) => setField('previous_treatments', event.target.value)} />
              </>
            )}

            {editingBlock === 'therapy' && (
              <>
                <Textarea label="Motivo de consulta" rows={3} value={draft.consultation_reason} onChange={(event) => setField('consultation_reason', event.target.value)} />
                <Textarea label="Objetivo terapéutico" rows={3} value={draft.therapeutic_objective} onChange={(event) => setField('therapeutic_objective', event.target.value)} />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input label="Frecuencia" value={draft.session_frequency} onChange={(event) => setField('session_frequency', event.target.value)} />
                  <Input label="Modalidad" value={draft.care_modality} onChange={(event) => setField('care_modality', event.target.value)} />
                  <Input label="Estado del proceso" value={draft.process_status} onChange={(event) => setField('process_status', event.target.value)} />
                </div>
                <Textarea label="Red de apoyo" rows={3} value={draft.support_network} onChange={(event) => setField('support_network', event.target.value)} />
              </>
            )}

            {editingBlock === 'alerts' && (
              <>
                <div className="space-y-1.5">
                  <p className="card-label" style={{ color: 'var(--ink-cool-faint)' }}>
                    Alertas rápidas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CLINICAL_ALERT_OPTIONS.map((option) => {
                      const active = draft.clinical_alerts.includes(option.key)
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => toggleAlert(option.key)}
                          className={`${active ? 'btn-action' : 'btn-subtle'} px-3 py-1.5 text-[12px]`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="card-label" style={{ color: 'var(--ink-cool-faint)' }}>
                    Consentimiento informado
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setField('informed_consent_status', '')}
                      className={`${draft.informed_consent_status === '' ? 'btn-action' : 'btn-subtle'} px-3 py-1.5 text-[12px]`}
                    >
                      Sin registrar
                    </button>
                    {INFORMED_CONSENT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setField('informed_consent_status', option.value)}
                        className={`${draft.informed_consent_status === option.value ? 'btn-action' : 'btn-subtle'} px-3 py-1.5 text-[12px]`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  label="Notas administrativas"
                  rows={4}
                  value={draft.administrative_notes}
                  onChange={(event) => setField('administrative_notes', event.target.value)}
                />
              </>
            )}

            {error && (
              <p className="text-[13px]" style={{ color: 'var(--state-cancel-text)' }}>
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-0.5">
              <Button variant="subtle" onClick={closeEditor} className="px-3 py-1.5 text-[12px]">
                Cancelar
              </Button>
              <Button
                variant="action"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </ModalShell>,
        document.body
      )}
    </>
  )
}
