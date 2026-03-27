// ============================================================
// PAGE BLOBS — decoración de fondo para páginas con layout centrado
// Tres esferas difusas + gradiente suave de fondo
// Requiere que el contenedor padre tenga position: relative
// ============================================================

export default function PageBlobs() {
  return (
    <>
      <div
        className="pointer-events-none absolute -top-10 right-[-10%] h-[24rem] w-[24rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(215,199,220,0.42) 0%, rgba(215,199,220,0.18) 32%, transparent 72%)' }}
      />
      <div
        className="pointer-events-none absolute left-[-10%] top-[14rem] h-[18rem] w-[18rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(244,213,224,0.26) 0%, rgba(244,213,224,0.10) 38%, transparent 72%)' }}
      />
      <div
        className="pointer-events-none absolute right-[6%] top-[36rem] h-[15rem] w-[15rem] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(221,205,226,0.22) 0%, transparent 72%)' }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(250,244,248,0.34) 0%, rgba(245,237,243,0.16) 42%, rgba(240,233,241,0.10) 100%)',
        }}
      />
    </>
  )
}
