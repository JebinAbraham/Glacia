## Quick orientation

- Project type: Vite + React (React 19) + TypeScript + Tailwind CSS. Entry is `src/main.tsx` which mounts `App` (`App.tsx`).
- Build/dev scripts (from `package.json`):
  - `npm run dev` — starts Vite dev server
  - `npm run build` — runs `tsc -b` then `vite build` (TypeScript project references are used)
  - `npm run preview` — preview built site

## What matters to an AI coding agent here

- Source layout:
  - `src/` contains the app entry (`src/main.tsx`).
  - Top-level component files: `App.tsx`, `components/` holds pages and composite components (e.g. `components/Dashboard.tsx`).
  - UI primitives are under `ui/` (button, input, dialog, etc.). These are small, reusable pieces using Radix + Tailwind.
  - `styles/globals.css` and `tailwind.config.ts` control global styling.
  - `imports/` holds shared assets/components (logo, svg helpers, image fallback).

- Conventions discovered (follow these when editing or generating code):
  - Many components exist with both `.tsx` and `.js` variants (for example `ui/button.tsx` and `ui/button.js`). Treat `.tsx` as the source-of-truth for new/typed code; the `.js` files appear to be JS-compatible variants. Prefer editing/adding `.tsx` first and mirror changes only if necessary.
  - UI uses Radix primitives and utility classes (Tailwind). When creating components: prefer composition of `ui/*` primitives, use `class-variance-authority`/`clsx` patterns already present.
  - Type checking is enforced at build time via `tsc -b`. Small changes should be validated by running `npm run build` (or at least `tsc -b`) to avoid breaking the build.

## Build / dev / debug workflows

- Local dev: `npm install` then `npm run dev`. Vite hot-reloads on changes; open browser at the address Vite prints.
- Production build: `npm run build` (runs `tsc -b` then `vite build`). If `tsc -b` fails, fix type issues in `.ts/.tsx` files or adjust tsconfig references.
- Quick sanity check: after changes run `npm run dev` and verify the UI; `src/main.tsx` mounts the app and imports `styles/globals.css`.

## Integration points & external deps

- Dependencies from `package.json` to be aware of: lots of Radix UI packages, `tailwindcss`, `vite`, `react`/`react-dom`, `class-variance-authority`, `vaul` (third-party lib present). There are no discoverable backend/API modules in this repo — network/backend integrations are likely external or in other packages.

## Examples / actionable patterns (copyable guidance)

- To add a new UI primitive:
  1. Create `ui/<name>.tsx` exporting a typed React component that composes Radix primitives and Tailwind classes.
  2. If existing files include a `.js` sibling, add/update it only when necessary for downstream consumers.
  3. Run `npm run dev` and `tsc -b` to verify no type errors.

- To change global styles: edit `styles/globals.css` and update `tailwind.config.ts` if you need new utilities.

## What not to assume

- There are currently no tests or CI config files to infer test commands — do not add CI steps that run non-existent tests without adding test infrastructure.
- The README references an AWS Glacier product narrative; there are no direct code files implementing AWS integrations in this repo snapshot. Search/add integrations explicitly if requested.

## Important file references

- Entry: `src/main.tsx`
- App root: `App.tsx`
- Composite components: `components/` (e.g., `components/Dashboard.tsx`)
- UI primitives: `ui/` (e.g., `ui/button.tsx`, `ui/input.tsx`)
- Styles: `styles/globals.css`, `tailwind.config.ts`, `postcss.config.js`
- Scripts: `package.json` (dev/build/preview)

If any section is unclear or you'd like the instructions to include examples for generator prompts or CI snippets, tell me which area to expand and I'll iterate.
