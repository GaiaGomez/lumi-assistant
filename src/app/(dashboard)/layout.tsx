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
    <div className="flex h-full">
      {/* Sidebar — solo visible en pantallas grandes (iPad landscape) */}
      <BottomNav />

      {/* Contenido principal */}
      {/* lg:ml-64 — en pantallas grandes deja espacio para el sidebar */}
      {/* pb-20 — en pantallas chicas deja espacio para la bottom nav */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
