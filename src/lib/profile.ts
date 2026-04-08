import type { User } from '@supabase/supabase-js'
import type { SettingsMap } from '@/lib/settings'

export interface ProfileIdentity {
  displayName: string
  workspaceName: string
  email: string
  pendingEmail: string
  avatarLabel: string
}

function toTitleCase(value: string): string {
  return value
    .split(/[._-\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ')
}

function resolveFallbackDisplayName(user: User | null | undefined): string {
  const metadataName = typeof user?.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : typeof user?.user_metadata?.name === 'string'
      ? user.user_metadata.name
      : ''

  if (metadataName.trim()) return metadataName.trim()

  const emailLocalPart = user?.email?.split('@')[0]?.trim()
  if (emailLocalPart) return toTitleCase(emailLocalPart)

  return 'Mi perfil'
}

export function getAvatarLabel(displayName: string): string {
  const tokens = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (tokens.length === 0) return 'M'
  if (tokens.length === 1) return tokens[0][0]?.toUpperCase() ?? 'M'
  return `${tokens[0][0] ?? ''}${tokens[1][0] ?? ''}`.toUpperCase()
}

export function resolveProfileIdentity(
  user: User | null | undefined,
  settings?: Partial<Pick<SettingsMap, 'perfil_nombre_mostrado' | 'perfil_nombre_consultorio'>> | null
): ProfileIdentity {
  const displayName = settings?.perfil_nombre_mostrado?.trim() || resolveFallbackDisplayName(user)
  const workspaceName = settings?.perfil_nombre_consultorio?.trim() || 'Consultorio privado'
  const email = user?.email?.trim() ?? ''
  const pendingEmail = user?.new_email?.trim() ?? ''

  return {
    displayName,
    workspaceName,
    email,
    pendingEmail,
    avatarLabel: getAvatarLabel(displayName),
  }
}
