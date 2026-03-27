export default function AgendaLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-3 w-24 rounded-full mb-3" style={{ background: 'var(--surface-glass-strong)' }} />
        <div className="h-8 w-32 rounded-full mb-3" style={{ background: 'var(--surface-glass-strong)' }} />
        <div className="h-3 w-48 rounded-full" style={{ background: 'var(--surface-glass)' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-cool rounded-[16px]" style={{ minHeight: '76px', padding: '12px 14px' }}>
            <div className="h-2 w-12 rounded-full mb-3" style={{ background: 'var(--surface-glass-strong)' }} />
            <div className="h-4 w-24 rounded-full" style={{ background: 'var(--surface-glass-strong)' }} />
          </div>
        ))}
      </div>

      <div className="glass-cool rounded-[24px]" style={{ minHeight: '320px' }} />
    </div>
  )
}
