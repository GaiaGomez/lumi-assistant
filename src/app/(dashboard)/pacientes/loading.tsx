export default function PacientesLoading() {
  return (
    <div className="animate-pulse mx-auto max-w-[1180px] px-4 sm:px-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-7 w-32 rounded-full" style={{ background: 'var(--surface-glass-strong)' }} />
        <div className="h-8 w-24 rounded-full" style={{ background: 'var(--surface-glass-strong)' }} />
      </div>

      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="glass-cool rounded-[16px]"
            style={{ minHeight: '64px', padding: '11px 14px' }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full shrink-0" style={{ width: '40px', height: '40px', background: 'var(--surface-glass-strong)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-36 rounded-full" style={{ background: 'var(--surface-glass-strong)' }} />
                <div className="h-2.5 w-24 rounded-full" style={{ background: 'var(--surface-glass)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
