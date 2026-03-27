export default function ConfiguracionLoading() {
  return (
    <div className="animate-pulse mx-auto max-w-[860px]">
      <div className="mb-6">
        <div className="h-7 w-36 rounded-full mb-2" style={{ background: 'var(--surface-glass-strong)' }} />
        <div className="h-3 w-52 rounded-full" style={{ background: 'var(--surface-glass)' }} />
      </div>

      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-cool rounded-[18px] p-4 space-y-3">
            <div className="h-3 w-28 rounded-full" style={{ background: 'var(--surface-glass-strong)' }} />
            <div className="h-10 rounded-[14px]" style={{ background: 'var(--surface-glass-strong)' }} />
            <div className="h-20 rounded-[14px]" style={{ background: 'var(--surface-glass-strong)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
