export const dynamic = 'force-dynamic'
// ============================================================
// CONFIGURACIÓN — ajustes personalizables de la app
// Primera sección: plantillas de mensajes de WhatsApp
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { fetchSettings } from '@/lib/settings'
import PageBlobs from '@/components/ui/PageBlobs'
import TemplateEditor from '@/components/configuracion/TemplateEditor'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const settings = await fetchSettings(supabase, user!.id)

  return (
    <div className="relative mx-auto max-w-[860px] px-4 pb-1 font-sans sm:px-5">
      <PageBlobs />

      <div className="relative mb-5">
        <p className="section-kicker mb-3">Configuración</p>
        <h1 className="page-title text-[2rem] leading-none">Mensajes de WhatsApp</h1>
        <p className="page-subtitle mt-2">
          Personaliza los mensajes que se envían a tus pacientes desde Pendientes y su perfil.
        </p>
      </div>

      <TemplateEditor settings={settings} userId={user!.id} />
    </div>
  )
}
