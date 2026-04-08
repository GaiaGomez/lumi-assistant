'use client'

import { useDeferredValue, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Patient } from '@/types'
import Avatar from '@/components/ui/Avatar'
import EmptyState from '@/components/ui/EmptyState'
import Input from '@/components/ui/Input'

interface PatientsListClientProps {
  patients: Patient[]
}

const collator = new Intl.Collator('es', {
  sensitivity: 'base',
  numeric: true,
})

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function comparePatients(a: Patient, b: Patient) {
  const byName = collator.compare(a.nombre ?? '', b.nombre ?? '')
  if (byName !== 0) return byName

  const byLastName = collator.compare(a.apellido ?? '', b.apellido ?? '')
  if (byLastName !== 0) return byLastName

  return a.id.localeCompare(b.id)
}

function matchesPatientQuery(patient: Patient, query: string) {
  if (!query) return true

  const haystack = [
    patient.nombre,
    patient.apellido,
    `${patient.nombre} ${patient.apellido}`.trim(),
    patient.whatsapp,
    patient.telefono,
    patient.email,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ')

  return haystack.includes(query)
}

export default function PatientsListClient({ patients }: PatientsListClientProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = normalizeText(deferredQuery)

  const sortedPatients = [...patients].sort(comparePatients)
  const visiblePatients = normalizedQuery
    ? sortedPatients.filter((patient) => matchesPatientQuery(patient, normalizedQuery))
    : sortedPatients

  return (
    <div className="space-y-2.5">
      <div className="glass-cool rounded-[18px] p-3">
        <Input
          aria-label="Buscar paciente"
          placeholder="Buscar paciente"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        {patients.length === 0 && (
          <EmptyState
            message="Aún no hay pacientes"
            hint="Toca «Nuevo» para agregar el primero"
            size="md"
          />
        )}

        {patients.length > 0 && visiblePatients.length === 0 && (
          <EmptyState
            message="No encontramos pacientes con esa búsqueda"
            hint="Prueba con nombre, apellido, teléfono o correo"
            size="sm"
          />
        )}

        {visiblePatients.map((patient) => (
          <Link
            key={patient.id}
            href={`/pacientes/${patient.id}`}
            className="glass-cool rounded-[14px] flex items-center justify-between p-3 transition-all hover:translate-y-[-1px]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar nombre={patient.nombre} apellido={patient.apellido} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium" style={{ color: 'var(--ink-cool-strong)' }}>
                  {patient.nombre} {patient.apellido}
                </p>
                {patient.whatsapp && (
                  <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--ink-cool-soft)' }}>
                    +{patient.whatsapp}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight size={15} style={{ color: 'var(--ink-cool-muted)' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
