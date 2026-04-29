# UI Rules — Lumi Assistant

Referencia oficial de patrones visuales. Toda pantalla, card, botón o formulario nuevo debe seguir estas reglas.
No inventar estilos ad-hoc. Si algo no está aquí, extender este documento antes de codear.

---

## Tipografía

| Elemento | Clase | Tamaño | Fuente |
|---|---|---|---|
| Título de página (h1) | `page-title text-[1.6rem] leading-none` | 1.6rem | Serif (Iowan Old Style) |
| Título de sección/panel (h2, h3) | `editorial-panel-title text-[1.05rem]` | 1.05rem | Serif |
| Kicker uppercase | `section-kicker` | 11px | Sans, 600, tracking 0.12em |
| Body / inputs / botones | `text-[14px]` | 14px | Sans |
| Texto secundario / fechas / hints | `text-[13px]` | 13px | Sans |
| Captions / badges / chips compactos | `text-[11px]` o `text-[12px]` | 11–12px | Sans |

**Reglas:**
- Máximo 2 familias: serif para h1/h2/h3, sans para todo lo demás.
- No usar `text-sm`, `text-xs`, `text-base` — siempre px explícito.
- No usar `font-size` inline si existe una clase equivalente.
- Colores de texto: `var(--ink-cool-strong)` principal · `var(--ink-cool-soft)` secundario · `var(--ink-cool-faint)` kickers · `var(--ink-cool-muted)` hints.

---

## Colores de estado

| Estado | Fondo | Texto |
|---|---|---|
| Éxito / Realizada | `var(--state-success-bg)` | `var(--state-success-text)` |
| Pendiente / Deuda | `var(--state-pending-bg)` | `var(--state-pending-text)` |
| Cancelado / Error | `var(--state-cancel-bg)` | `var(--state-cancel-text)` |
| Alerta / Conflicto | `var(--state-warning-bg)` | `var(--state-warning-text)` |
| Inactivo | `var(--state-inactive-bg)` | `var(--state-inactive-text)` |

---

## Superficies (Cards)

Usar el componente `<Card>` de `src/components/ui/Card.tsx`.

```tsx
<Card>               {/* rounded-[18px] + glass-cool, padding propio */}
<Card radius="sm">   {/* rounded-[14px] — para cards anidadas / items de lista */}
<Card radius="lg">   {/* rounded-[22px] — para secciones grandes */}
```

**Padding estándar:** `p-3` (12px) para secciones · `px-3 py-2` para items de lista.

**Clases CSS directas cuando no se usa el componente:**
```
glass-cool rounded-[18px] p-3          ← sección estándar
glass-cool rounded-[14px] px-3 py-2   ← item de lista
```

**Nunca** usar `rounded-2xl`, `rounded-3xl`, ni radios hardcodeados distintos a 14/18/22px.
**Nunca** usar `.glass` (zona cálida) en pantallas del dashboard — siempre `.glass-cool`.

---

## Botones

Usar el componente `<Button>` de `src/components/ui/Button.tsx`, o las clases CSS directamente en `<a>` / `<Link>`.

| Variante | Uso | Clase CSS |
|---|---|---|
| `action` | CTA principal (guardar, crear, enviar) | `btn-action` |
| `subtle` | Acción secundaria (cancelar, volver, editar) | `btn-subtle` |
| `ghost` | Terciaria / sin superficie | `btn-ghost` |

**Tamaño estándar de botones:**
- Icono solo: `h-8 w-8` con `flex items-center justify-center`
- Texto: `px-4 py-2 text-[14px]` o `px-5 py-2.5 text-[13px] tracking-[0.06em] uppercase`

**Nunca** crear botones con `background` inline, `borderRadius` inline ni colores hardcodeados.
El botón de eliminar / acción destructiva: `rounded-full px-3 py-1.5 text-[11px]` con `background: rgba(176,124,132,0.12)` y `color: var(--state-cancel-text)`.

---

## Inputs y formularios

Usar `<Input>` y `<Textarea>` de `src/components/ui/`.
Para inputs con icono/select/dropdown complejos (agenda), usar el sistema `lumi-control-shell`.

**Campo libre estándar:**
```tsx
<label className="block space-y-1.5">
  <span className="section-kicker">Label</span>
  <input className="w-full rounded-[14px] px-3.5 py-3 text-[14px] focus:outline-none" />
</label>
```

El fondo, borde y foco de inputs vienen de `globals.css` — no sobreescribir inline salvo para `color`.

---

## Estructura de página (header)

Usar `<PageHeader>` de `src/components/ui/PageHeader.tsx`.

```tsx
<PageHeader
  kicker="Sección"        // optional
  title="Título"
  subtitle="Descripción"  // optional
  action={<Button ...>}   // optional — slot derecho
/>
```

Manual cuando no aplica el componente:
```tsx
<div className="mb-4">
  <p className="section-kicker mb-0.5">Kicker</p>
  <h1 className="page-title text-[1.6rem] leading-none">Título</h1>
  <p className="page-subtitle mt-1">Subtítulo</p>
</div>
```

---

## Espaciado

| Contexto | Valor |
|---|---|
| Gap entre cards / secciones | `space-y-2.5` o `gap-2.5` |
| Gap entre items de lista | `space-y-1.5` |
| Padding interno de sección | `p-3` |
| Padding interno de item | `px-3 py-2` |
| Margin bottom del header de página | `mb-4` |
| Gap en grids de stats/mosaico | `gap-2.5` |

---

## Modales

Usar `<ModalShell>` de `src/components/ui/ModalShell.tsx` como wrapper.

Estructura interna estándar:
```tsx
<ModalShell onClose={onClose}>
  {/* Header */}
  <div className="flex items-start justify-between p-4">
    <div>
      <SectionHeader label="Kicker" className="mb-1" />
      <h2 className="editorial-panel-title text-[1.05rem]">Título</h2>
    </div>
    <Button variant="subtle" onClick={onClose} className="p-2"><X size={16} /></Button>
  </div>
  {/* Body */}
  <div className="px-4 pb-4 space-y-3">
    ...
  </div>
</ModalShell>
```

---

## Patrones prohibidos

- `fontSize: '25px'` o cualquier `style={{ fontSize }}` inline
- `rounded-2xl` / `rounded-3xl` / `rounded-full` en cards (solo en botones y chips)
- Colores hardcodeados (`#111111`, `#777777`) fuera de `globals.css`
- `text-sm` / `text-xs` / `text-base` — usar siempre `text-[Npx]`
- `.glass` en el dashboard (zona cool) — usar `.glass-cool`
- `background: 'rgba(...)'` inline en botones — usar variantes de `btn-*`
- Kickers con estilos inline — usar siempre `.section-kicker`
- `editorial-title` sin `-panel` para h2/h3 — usar `editorial-panel-title`

---

## Componentes disponibles en `src/components/ui/`

| Componente | Uso |
|---|---|
| `Button` | Botones de acción/secundario/ghost |
| `Card` | Superficie base de sección o ítem |
| `Input` | Campo de texto simple con label |
| `Textarea` | Campo largo con label |
| `StatCard` | Tarjeta de métrica (label + valor + hint) |
| `EmptyState` | Estado vacío de listas |
| `ModalShell` | Wrapper de modales con backdrop |
| `PageHeader` | Header de página con kicker + título + acción |
| `SectionHeader` | Kicker de sección dentro de cards/modales |
| `Badge` | Badge de estado semántico |
| `Avatar` | Iniciales de paciente |
| `PageBlobs` | Decoración de fondo (usar 1 vez por página) |
