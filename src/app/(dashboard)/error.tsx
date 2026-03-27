'use client'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div
        className="glass-cool rounded-[18px] p-6 text-center"
        style={{ maxWidth: '360px', width: '100%' }}
      >
        <p className="card-label mb-3" style={{ color: 'var(--ink-cool-faint)' }}>
          Algo salió mal
        </p>
        <p className="text-[13px] mb-4" style={{ color: 'var(--ink-cool-soft)' }}>
          {error.message || 'Error inesperado. Intenta de nuevo.'}
        </p>
        <button
          onClick={reset}
          className="btn-action px-5 py-2.5 text-[13px]"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
