export const dynamic = 'force-dynamic'
// ============================================================
// DASHBOARD LAYOUT — envuelve todas las páginas protegidas
// (agenda, pacientes, historias, whatsapp)
// Verifica la sesión en el servidor y agrega la navegación
// ============================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/ui/BottomNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificación de sesión server-side — si no hay sesión, redirige a login
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="relative flex h-full">

      {/* ── Blobs de color fijos — la CLAVE del efecto glass ──
          Sin color detrás, el backdrop-filter no tiene qué desenfocar
          y el panel glass solo parece blanco.
          Estos blobs son position:fixed y z-index:0, están detrás
          de todo el contenido pero SE VEN a través de los paneles glass. */}
      {/* ── Solo 2 blobs, grandes y muy difusos — rose + lavender ──
          Sin café/tierra/sage. Opacidad baja = mancha suave de acuarela.
          La card glass con 72% de blanco los filtra suavemente → minimal elegante */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* Blob rose — arriba a la derecha */}
        <div className="absolute" style={{
          top: '-30%', right: '-20%',
          width: '900px', height: '900px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(215,175,195,0.28) 0%, transparent 70%)',
        }} />
        {/* Blob lavender — abajo a la izquierda */}
        <div className="absolute" style={{
          bottom: '-35%', left: '-20%',
          width: '1000px', height: '1000px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(175,175,210,0.22) 0%, transparent 70%)',
        }} />
      </div>

      {/* Sidebar/BottomNav — z-50 para estar por encima de los blobs */}
      <BottomNav />

      {/* Contenido principal — z-10 por encima de los blobs */}
      {/* lg:ml-64 — en pantallas grandes deja espacio para el sidebar */}
      {/* pb-20 — en pantallas chicas deja espacio para la bottom nav */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0 min-h-screen" style={{ position: 'relative', zIndex: 10 }}>
        <div className="max-w-5xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
