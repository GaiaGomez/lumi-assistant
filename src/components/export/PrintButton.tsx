'use client'

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-action px-4 py-1.5 text-[13px]"
    >
      Imprimir / Guardar PDF
    </button>
  )
}
