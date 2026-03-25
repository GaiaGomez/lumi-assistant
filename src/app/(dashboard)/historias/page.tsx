// ============================================================
// HISTORIAS PAGE — redirige a pacientes para crear notas desde ahí
// ============================================================

import { redirect } from 'next/navigation'

export default function HistoriasPage() {
  redirect('/pacientes')
}
