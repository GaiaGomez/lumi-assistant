import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const demoEmail = process.env.DEMO_EMAIL
  const demoPassword = process.env.DEMO_PASSWORD

  if (!demoEmail || !demoPassword) {
    return NextResponse.json(
      { error: 'Demo access is not configured.' },
      { status: 500 }
    )
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  })

  if (error) {
    return NextResponse.json(
      { error: 'Demo access is currently unavailable.' },
      { status: 401 }
    )
  }

  return NextResponse.json({ ok: true })
}
