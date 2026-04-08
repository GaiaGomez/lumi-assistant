export const dynamic = 'force-dynamic'
// ============================================================
// CONFIGURACIÓN — ajustes y personalización del sistema
//
// Server component: verifica sesión y carga settings desde Supabase
// Pasa datos a ConfiguracionClient para renderizar las secciones interactivas
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { fetchConsultorios } from '@/lib/consultorios'
import { fetchSettings } from '@/lib/settings'
import PageBlobs from '@/components/ui/PageBlobs'
import ConfiguracionClient from '@/components/configuracion/ConfiguracionClient'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [settings, consultorios] = await Promise.all([
    fetchSettings(supabase, user!.id),
    fetchConsultorios(supabase, user!.id),
  ])

  return (
    <div className="relative mx-auto max-w-[860px] pb-1">
      <PageBlobs />

      {/* Page header */}
      <div className="relative mb-5">
        <p className="section-kicker mb-1.5">Ajustes</p>
        <h1 className="page-title text-[1.6rem] leading-none">Configuración</h1>
        <p className="page-subtitle mt-1">
          Personaliza cómo trabaja Lumi para tu consultorio.
        </p>
      </div>

      {/* Client tabs + secciones */}
      <div className="relative">
        <ConfiguracionClient settings={settings} consultorios={consultorios} userId={user!.id} />
      </div>
    </div>
  )
}
