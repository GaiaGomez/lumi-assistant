export default function WhatsappLoading() {
  return (
    <div className="animate-pulse relative mx-auto max-w-[1180px] px-4 sm:px-5">
      <div className="glass-cool rounded-[18px] p-3 mb-3" style={{ minHeight: '72px' }}>
        <div className="h-5 w-28 rounded-full mb-2" style={{ background: 'var(--surface-glass-strong)' }} />
        <div className="h-3 w-44 rounded-full" style={{ background: 'var(--surface-glass)' }} />
      </div>

      <div className="mb-3 grid gap-[10px] sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[16px]" style={{ minHeight: '76px', padding: '12px 14px', background: 'linear-gradient(180deg, var(--surface-glass-strong) 0%, var(--surface-glass) 100%)', border: '1px solid var(--border-glass-white)' }}>
            <div className="h-2 w-14 rounded-full mb-3" style={{ background: 'rgba(0,0,0,0.06)' }} />
            <div className="h-6 w-8 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }} />
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-cool rounded-[18px] p-3" style={{ minHeight: '120px' }} />
        ))}
      </div>
    </div>
  )
}
