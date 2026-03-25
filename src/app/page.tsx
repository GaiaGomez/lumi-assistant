// Redirige automáticamente a /agenda (o a /login si no hay sesión — el middleware se encarga)
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/agenda')
}
