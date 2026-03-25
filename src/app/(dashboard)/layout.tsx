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
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* Blob terracota — arriba a la derecha */}
        <div className="absolute" style={{
          top: '-20%', right: '-15%',
          width: '680px', height: '680px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(214,138,108,0.60) 0%, transparent 65%)',
        }} />
        {/* Blob sage — abajo a la izquierda */}
        <div className="absolute" style={{
          bottom: '-25%', left: '-15%',
          width: '780px', height: '780px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(110,175,125,0.52) 0%, transparent 65%)',
        }} />
        {/* Blob nude/arena — centro */}
        <div className="absolute" style={{
          top: '30%', left: '20%',
          width: '520px', height: '520px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(205,165,125,0.42) 0%, transparent 65%)',
        }} />
        {/* Blob rose — arriba a la izquierda */}
        <div className="absolute" style={{
          top: '5%', left: '-8%',
          width: '420px', height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(210,155,155,0.45) 0%, transparent 65%)',
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
