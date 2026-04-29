<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI consistency rules

Before writing any UI code, read `.claude/UI_RULES.md`.
All new screens, cards, buttons, forms and modals must follow those rules exactly.
Do not invent inline styles, ad-hoc Tailwind classes, or new color values — use the tokens and components defined there.

# Database: two notes tables — which is active

`clinical_notes` — legacy table defined in `schema.sql`. Used only by the data-export API (for historical compatibility). Do NOT write new code that inserts into this table.

`session_notes` — active table. All new clinical note logic goes here. Managed via `src/lib/notes/actions.ts`. The schema is in `src/lib/supabase/schema.sql`.

If you need to query notes, always use `session_notes`.
