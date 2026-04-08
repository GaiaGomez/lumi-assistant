export const dynamic = 'force-dynamic'
// ============================================================
// CONFIGURACIÓN — ajustes personalizables de la app
// Primera sección: plantillas de mensajes de WhatsApp
// ============================================================

import { createClient } from '@/lib/supabase/server'
import { fetchSettings } from '@/lib/settings'
import PageBlobs from '@/components/ui/PageBlobs'
import TemplateEditor from '@/components/configuracion/TemplateEditor'
import DoctoraliaSync from '@/components/configuracion/DoctoraliaSync'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const settings = await fetchSettings(supabase, user!.id)

  return (
    <div className="relative mx-auto max-w-[860px] pb-1">
      <PageBlobs />

      <div className="relative mb-4">
        <p className="section-kicker mb-1.5">Configuración</p>
        <h1 className="page-title text-[1.6rem] leading-none">Ajustes</h1>
        <p className="page-subtitle mt-1">
          Personaliza tu agenda, mensajes y conexiones externas.
        </p>
      </div>

      <div className="space-y-4">
        <section>
          <p className="section-kicker mb-2">Doctoralia</p>
          <DoctoraliaSync settings={settings} userId={user!.id} />
        </section>

        <section>
          <p className="section-kicker mb-2">Mensajes de WhatsApp</p>
          <TemplateEditor settings={settings} userId={user!.id} />
        </section>
      </div>
    </div>
  )
}
