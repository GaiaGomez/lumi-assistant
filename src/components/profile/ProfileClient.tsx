'use client'

import { useState } from 'react'
import { AlertCircle, Check, Eye, EyeOff, KeyRound, Mail, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { upsertSettingValue } from '@/lib/settings'
import { getAvatarLabel, type ProfileIdentity } from '@/lib/profile'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface ProfileClientProps {
  userId: string
  identity: ProfileIdentity
}

export default function ProfileClient({ userId, identity }: ProfileClientProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(identity.displayName)
  const [workspaceName, setWorkspaceName] = useState(identity.workspaceName)
  const [email, setEmail] = useState(identity.email)
  const [currentAuthEmail, setCurrentAuthEmail] = useState(identity.email)
  const [pendingEmail, setPendingEmail] = useState(identity.pendingEmail)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordState, setPasswordState] = useState<SaveState>('idle')
  const [passwordError, setPasswordError] = useState('')

  const avatarLabel = getAvatarLabel(displayName.trim() || identity.displayName)

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function handleSave() {
    const nextDisplayName = displayName.trim()
    const nextWorkspaceName = workspaceName.trim()
    const nextEmail = email.trim().toLowerCase()
    const currentEmail = currentAuthEmail.trim().toLowerCase()
    const profileChanged =
      nextDisplayName !== identity.displayName ||
      nextWorkspaceName !== identity.workspaceName
    const emailChanged = nextEmail !== currentEmail

    if (!nextDisplayName) {
      setSaveState('error')
      setErrorMessage('Escribe un nombre para mostrar en Lumi.')
      setSuccessMessage('')
      return
    }

    if (!nextWorkspaceName) {
      setSaveState('error')
      setErrorMessage('Escribe un nombre para tu consultorio o espacio.')
      setSuccessMessage('')
      return
    }

    if (!nextEmail) {
      setSaveState('error')
      setErrorMessage('Escribe un correo para tu cuenta.')
      setSuccessMessage('')
      return
    }

    if (!isValidEmail(nextEmail)) {
      setSaveState('error')
      setErrorMessage('Escribe un correo válido.')
      setSuccessMessage('')
      return
    }

    if (!profileChanged && !emailChanged) {
      setSaveState('saved')
      setErrorMessage('')
      setSuccessMessage('No había cambios por guardar.')
      window.setTimeout(() => setSaveState('idle'), 2500)
      return
    }

    setSaveState('saving')
    setErrorMessage('')
    setSuccessMessage('')

    let profileSaved = false
    try {
      const supabase = createClient()

      if (profileChanged) {
        await Promise.all([
          upsertSettingValue(supabase, userId, 'perfil_nombre_mostrado', nextDisplayName),
          upsertSettingValue(supabase, userId, 'perfil_nombre_consultorio', nextWorkspaceName),
        ])
        profileSaved = true
      }

      let nextSuccessMessage = profileSaved ? 'Perfil guardado.' : ''

      if (emailChanged) {
        const { data, error } = await supabase.auth.updateUser(
          { email: nextEmail },
          { emailRedirectTo: `${window.location.origin}/profile` }
        )

        if (error) throw error

        const updatedUser = data.user
        const resolvedCurrentEmail = updatedUser?.email?.trim() || nextEmail
        const resolvedPendingEmail = updatedUser?.new_email?.trim() || ''

        if (resolvedPendingEmail && resolvedPendingEmail !== resolvedCurrentEmail) {
          setPendingEmail(resolvedPendingEmail)
          setEmail(resolvedCurrentEmail)
          nextSuccessMessage = profileSaved
            ? `Guardamos tu perfil. Para cambiar el correo de acceso, confirma el mensaje enviado a ${resolvedPendingEmail}.`
            : `Te enviamos un correo de confirmación a ${resolvedPendingEmail}. Hasta que lo confirmes, seguirás entrando con ${resolvedCurrentEmail}.`
        } else {
          setCurrentAuthEmail(resolvedCurrentEmail)
          setEmail(resolvedCurrentEmail)
          setPendingEmail('')
          nextSuccessMessage = profileSaved
            ? `Perfil guardado. Tu correo de acceso ahora es ${resolvedCurrentEmail}.`
            : `Tu correo de acceso ahora es ${resolvedCurrentEmail}.`
        }
      }

      setSaveState('saved')
      setSuccessMessage(nextSuccessMessage || 'Perfil guardado.')
      router.refresh()
      window.setTimeout(() => setSaveState('idle'), 2500)
    } catch (error) {
      setSaveState('error')
      const message = error instanceof Error ? error.message : 'No se pudo guardar tu perfil.'
      setSuccessMessage('')
      setErrorMessage(
        profileSaved
          ? `Guardamos tu identidad, pero no pudimos actualizar el correo: ${message}`
          : message
      )
      if (profileSaved) router.refresh()
    }
  }

  async function handlePasswordSave() {
    if (newPassword !== confirmPassword) {
      setPasswordState('error')
      setPasswordError('Las contraseñas no coinciden.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordState('error')
      setPasswordError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setPasswordState('saving')
    setPasswordError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setNewPassword('')
      setConfirmPassword('')
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      setPasswordState('saved')
      window.setTimeout(() => setPasswordState('idle'), 2500)
    } catch (error) {
      setPasswordState('error')
      setPasswordError(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.')
    }
  }

  return (
    <div className="space-y-3">
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-[18px] text-[24px] font-light text-white"
            style={{ background: 'linear-gradient(135deg, #C4B0C8 0%, #9A9AB8 100%)' }}
          >
            {avatarLabel}
          </div>

          <div className="min-w-0">
            <p className="section-kicker mb-1">Identidad visible</p>
            <h2 className="editorial-panel-title text-[1.05rem] truncate">{displayName || identity.displayName}</h2>
            <p className="text-[13px] mt-1 truncate" style={{ color: 'var(--ink-cool-muted)' }}>
              {workspaceName || identity.workspaceName}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-3 sm:p-4">
        <div className="space-y-3">
          <div>
            <p className="section-kicker mb-0.5">Mi perfil</p>
            <p className="text-[13px]" style={{ color: 'var(--ink-cool-faint)' }}>
              Actualiza cómo aparece tu identidad dentro de Lumi.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Nombre mostrado"
              value={displayName}
              onChange={(event) => {
                    setDisplayName(event.target.value)
                    if (saveState === 'error') {
                      setSaveState('idle')
                      setErrorMessage('')
                    }
                    if (successMessage) setSuccessMessage('')
                  }}
              placeholder="Tu nombre"
            />

            <Input
              label="Consultorio o espacio"
              value={workspaceName}
              onChange={(event) => {
                    setWorkspaceName(event.target.value)
                    if (saveState === 'error') {
                      setSaveState('idle')
                      setErrorMessage('')
                    }
                    if (successMessage) setSuccessMessage('')
                  }}
              placeholder="Nombre del consultorio"
            />
          </div>

          <Input
            label="Correo"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (saveState === 'error') {
                setSaveState('idle')
                setErrorMessage('')
              }
              if (successMessage) setSuccessMessage('')
            }}
            placeholder="tu@correo.com"
          />

          {pendingEmail ? (
            <div
              className="flex items-start gap-2 rounded-[14px] px-3.5 py-3 text-[13px]"
              style={{
                background: 'rgba(200,188,205,0.16)',
                border: '1px solid var(--border-glass-white)',
                color: 'var(--ink-cool-soft)',
              }}
            >
              <Mail size={14} className="mt-0.5 shrink-0" />
              <p className="leading-snug">
                Hay un cambio de correo pendiente para <strong>{pendingEmail}</strong>. Hasta que lo confirmes desde ese correo,
                seguirás entrando a Lumi con <strong>{currentAuthEmail}</strong>.
              </p>
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: 'var(--ink-cool-muted)' }}>
              Este es el mismo correo que usas para iniciar sesión en Lumi.
            </p>
          )}

          <div
            className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: 'var(--border-glass-muted)' }}
          >
            <div className="min-h-[20px]">
              {saveState === 'saved' && (
                <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--state-success-text)' }}>
                  <Check size={14} />
                  {successMessage || 'Perfil guardado.'}
                </span>
              )}
              {saveState === 'error' && (
                <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--state-cancel-text)' }}>
                  <AlertCircle size={14} />
                  {errorMessage}
                </span>
              )}
            </div>

            <Button
              variant="action"
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className="px-4 py-2 text-[13px] inline-flex items-center gap-2"
            >
              <Save size={14} />
              {saveState === 'saving' ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-3 sm:p-4">
        <div className="space-y-3">
          <div>
            <p className="section-kicker mb-0.5">Acceso</p>
            <p className="text-[13px]" style={{ color: 'var(--ink-cool-faint)' }}>
              Cambia la contraseña que usas para entrar a Lumi.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="card-label block" style={{ color: 'var(--ink-cool-faint)' }}>
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value)
                    if (passwordState === 'error') {
                      setPasswordState('idle')
                      setPasswordError('')
                    }
                  }}
                  autoComplete="new-password"
                  minLength={6}
                  className="w-full rounded-[14px] px-3.5 py-3 pr-10 text-[14px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--ink-cool-faint)' }}
                  aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="card-label block" style={{ color: 'var(--ink-cool-faint)' }}>
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    if (passwordState === 'error') {
                      setPasswordState('idle')
                      setPasswordError('')
                    }
                  }}
                  autoComplete="new-password"
                  minLength={6}
                  className="w-full rounded-[14px] px-3.5 py-3 pr-10 text-[14px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--ink-cool-faint)' }}
                  aria-label={showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          <p className="text-[12px]" style={{ color: 'var(--ink-cool-muted)' }}>
            Usa una contraseña de al menos 6 caracteres.
          </p>

          <div
            className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: 'var(--border-glass-muted)' }}
          >
            <div className="min-h-[20px]">
              {passwordState === 'saved' && (
                <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--state-success-text)' }}>
                  <Check size={14} />
                  Contraseña actualizada correctamente.
                </span>
              )}
              {passwordState === 'error' && (
                <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--state-cancel-text)' }}>
                  <AlertCircle size={14} />
                  {passwordError}
                </span>
              )}
            </div>

            <Button
              variant="subtle"
              onClick={handlePasswordSave}
              disabled={passwordState === 'saving'}
              className="px-4 py-2 text-[13px] inline-flex items-center gap-2"
            >
              <KeyRound size={14} />
              {passwordState === 'saving' ? 'Guardando…' : 'Cambiar contraseña'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
