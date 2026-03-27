'use client'

import { useEffect, useState } from 'react'

interface PatientInactivityStatusProps {
  lastAppointmentDate: string | null
}

export default function PatientInactivityStatus({
  lastAppointmentDate,
}: PatientInactivityStatusProps) {
  const [diasSinCita, setDiasSinCita] = useState<number | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!lastAppointmentDate) {
        setDiasSinCita(null)
        return
      }

      const dias = Math.floor(
        (Date.now() - new Date(lastAppointmentDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      setDiasSinCita(dias)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [lastAppointmentDate])

  if (diasSinCita === null) {
    return null
  }

  return (
    <p
      className="leading-none"
      style={{
        color: diasSinCita > 20 ? 'var(--ink-cool-strong)' : 'var(--ink-cool-soft)',
        fontSize: '12px',
      }}
    >
      Última cita: hace {diasSinCita} días
    </p>
  )
}
