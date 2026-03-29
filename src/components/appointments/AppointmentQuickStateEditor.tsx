'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Appointment } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { updateAppointmentById } from '@/lib/appointment-updates'
import {
  APPOINTMENT_PAYMENT_LABEL,
  APPOINTMENT_PAYMENT_STATES,
  APPOINTMENT_SESSION_LABEL,
  APPOINTMENT_SESSION_STATES,
} from '@/lib/appointment-status'

interface AppointmentQuickStateEditorProps {
  appointmentId: string
  initialSessionState: Appointment['estado_sesion']
  initialPaymentState: Appointment['estado_pago']
}

const inactiveChipStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.46)',
  color: 'var(--ink-cool-strong)',
  border: '1px solid transparent',
}

const sessionActiveStyles: Record<Appointment['estado_sesion'], React.CSSProperties> = {
  pendiente: {
    background: 'var(--state-inactive-bg)',
    color: 'var(--ink-cool-strong)',
    border: '1px solid rgba(255,255,255,0.18)',
  },
  confirmada: {
    background: 'rgba(143,165,189,0.22)',
    color: '#273847',
    border: '1px solid rgba(143,165,189,0.24)',
  },
  realizada: {
    background: 'var(--state-success-bg)',
    color: '#284236',
    border: '1px solid rgba(126,168,143,0.24)',
  },
  cancelo: {
    background: 'var(--state-cancel-bg)',
    color: '#5B353B',
    border: '1px solid rgba(185,143,149,0.20)',
  },
}

const paymentActiveStyles: Record<Appointment['estado_pago'], React.CSSProperties> = {
  pendiente: {
    background: 'var(--state-pending-bg)',
    color: '#5D4535',
    border: '1px solid rgba(184,155,130,0.20)',
  },
  pagado: {
    background: 'var(--state-success-bg)',
    color: '#284236',
    border: '1px solid rgba(126,168,143,0.24)',
  },
}

function ChipButton({
  active,
  disabled,
  onClick,
  children,
  activeStyle,
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
  activeStyle: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="rounded-full px-2.5 py-1 text-[10px] font-medium transition-all"
      style={active ? activeStyle : inactiveChipStyle}
    >
      {children}
    </button>
  )
}

export default function AppointmentQuickStateEditor({
  appointmentId,
  initialSessionState,
  initialPaymentState,
}: AppointmentQuickStateEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isRefreshing, startTransition] = useTransition()
  const [sessionState, setSessionState] = useState(initialSessionState)
  const [paymentState, setPaymentState] = useState(initialPaymentState)
  const [savingField, setSavingField] = useState<'estado_sesion' | 'estado_pago' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSessionState(initialSessionState)
  }, [initialSessionState])

  useEffect(() => {
    setPaymentState(initialPaymentState)
  }, [initialPaymentState])

  async function updateField(
    field: 'estado_sesion' | 'estado_pago',
    value: Appointment['estado_sesion'] | Appointment['estado_pago']
  ) {
    if (savingField) return

    if (field === 'estado_sesion' && value === sessionState) return
    if (field === 'estado_pago' && value === paymentState) return

    const previousSession = sessionState
    const previousPayment = paymentState

    setError(null)
    setSavingField(field)

    if (field === 'estado_sesion') {
      setSessionState(value as Appointment['estado_sesion'])
    } else {
      setPaymentState(value as Appointment['estado_pago'])
    }

    const { error: updateError } = await updateAppointmentById(supabase, appointmentId, {
      [field]: value,
    })

    if (updateError) {
      setSessionState(previousSession)
      setPaymentState(previousPayment)
      setError('No se pudo guardar el cambio.')
      setSavingField(null)
      return
    }

    setSavingField(null)
    startTransition(() => {
      router.refresh()
    })
  }

  const disabled = !!savingField || isRefreshing

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--ink-cool-faint)' }}>
          Sesión
        </p>
        <div className="flex flex-wrap gap-1.5">
          {APPOINTMENT_SESSION_STATES.map((value) => (
            <ChipButton
              key={value}
              active={sessionState === value}
              disabled={disabled}
              onClick={() => updateField('estado_sesion', value)}
              activeStyle={sessionActiveStyles[value]}
            >
              {APPOINTMENT_SESSION_LABEL[value]}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--ink-cool-faint)' }}>
          Pago
        </p>
        <div className="flex flex-wrap gap-1.5">
          {APPOINTMENT_PAYMENT_STATES.map((value) => (
            <ChipButton
              key={value}
              active={paymentState === value}
              disabled={disabled}
              onClick={() => updateField('estado_pago', value)}
              activeStyle={paymentActiveStyles[value]}
            >
              {APPOINTMENT_PAYMENT_LABEL[value]}
            </ChipButton>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-[10px]" style={{ color: 'var(--state-cancel-text)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
