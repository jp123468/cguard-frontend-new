# C-Guard Pro — Design-System Rollout Plan (20 phases)

Goal: **100% adoption** of the design system (`memory/design-system.md`, `@/components/kit`, `/style-guide`)
across all **397 `.tsx`** files — every page, sub-page, and modal — with **zero functional regressions**.

## Method — the per-file recipe (applied in every phase)
Each file is converted with the SAME checklist (presentation only; logic untouched):
1. Page body → `<PageContainer>`; component bodies stay components.
2. Heading/toolbar → `<PageHeader icon title subtitle actions badges>`.
3. Panels/`<Card>` → `<Section title icon action>`.
4. KPI numbers → `<StatCard>` inside `<Stagger className="grid…">`.
5. Buttons → `<Button>`; primary CTA → `variant="brand"`. Remove hardcoded `#C8860A` → `primary` token.
6. Status pills → `<StatusBadge tone>`.
7. Lists: loading → `<SkeletonCards>`, empty → `<EmptyState>`.
8. Modals/dialogs → kit `<Modal>` (or Dialog already restyled).
9. Tables → Section-wrapped, consistent header/row styling.
10. Entrance motion → `<FadeIn>` / `<Stagger>` / `.animate-fade-up`.
11. Preserve every import, hook, service call, handler, route. **tsc must pass.**

**Definition of done (per file):** recipe applied · no hardcoded hex · modals via kit · logic identical ·
`tsc` + `vite build` green · page loads + its primary action/modal smoke-tested.

## Execution model
- **Parallel agents per phase**: partition the phase's files across 6–10 agents (distinct files → no
  conflicts). Each applies the recipe + returns a summary.
- **Gate (every phase, owned by orchestrator):** `tsc --noEmit` → `vite build` → functional smoke test of
  each touched page (load + primary action + open one modal) → visual spot-check → **one commit per phase**
  → deploy. Never deploy a phase with build errors. One commit/phase = clean rollback.
- **Tracking:** this doc's checklist + `docs/design-rollout-progress.md` (file → todo/done/verified),
  updated each phase. Mirror status in memory.
- **Guardrail (Phase 1):** ESLint rule forbidding new hardcoded hex in `className` + a convention that new
  pages import from `@/components/kit`, so adoption never regresses.

## Phases (sequenced by leverage → dependency → traffic)

| # | Phase | Scope (files) | Why here |
|--|--|--|--|
| 0 | **Foundation** ✅ DONE | tokens, Poppins, primitives, kit, style guide, memory | everything depends on it |
| 1 | **Audit + tooling** | inventory script (per file: kit? hex? raw Dialog?), progress doc, ESLint guardrail | builds the backlog + stops regressions |
| 2 | **Global chrome — layouts** | `src/layouts/*` (9): AppLayout, sidebar, topbar, GuardsLayout, client/auth layouts, Breadcrumb | appears on EVERY page → highest leverage |
| 3 | **Shared components** | `src/components/*` non-ui (75): DataTable, MobileCardList, filters, pickers, confirmDialog, widgets | reused everywhere; DataTable drives most lists |
| 4 | **Auth surface** | `src/pages/auth/*` (6) + public/idioma (2) | first impression / login |
| 5 | **Dashboard** | `dashboard/*` (13) incl. WidgetsBoard + charts | landing, highest visibility |
| 6 | **Post-sites** (split 6a/6b/6c) | `post-sites/*` (43): list+profile / station-detail+tabs / wizards+forms+modals | biggest area |
| 7 | **Clientes** | `clientes/*` (14): list, detail tabs, forms, modals | core entity |
| 8 | **Nómina / asistencia** | `nomina/*` (8) + modals | core ops |
| 9 | **Visitas & activos** | visitor-management (3), vehicles (2), vehicle-patrol (1), inventory (1) | |
| 10 | **Programación** | programmer (6), routes (5), dispatcher (5) | scheduling cluster |
| 11 | **Operaciones** | analytics (5), gps-tracker (2), actividades (1), messenger (1) | |
| 12 | **Seguridad/incidentes** | alarm (6), security (3), radio (1+1) | |
| 13 | **Trabajo/formación** | tasks (2), memos (1), projects (3), training (7) | |
| 14 | **Reports** | `Reports/*` (26) | deep, many report types → own block |
| 15 | **Configuración — pt 1** | settings shell + general/empresa/usuarios/roles (~30) | 62-file area, split in two |
| 16 | **Configuración — pt 2** | comunicaciones/billing/integraciones/guards-settings/etc. (~32) | |
| 17 | **Admin restantes** | administrative-office-users (4), Subscription (2), stragglers | |
| 18 | **Portal cliente + guard CRM** | client/ (1) + client-facing, guard/ (6) | distinct surfaces |
| 19 | **Superadmin app** | the separate `superadmin/` codebase | own repo; port the kit |
| 20 | **QA + pulido transversal** | modals sweep (66 → Modal kit), dark-mode pass, a11y (focus/contrast/aria), responsive/mobile, motion consistency, empty/loading audit, bundle/chunks, final per-area visual QA, lock guardrail, sign-off | hardening |

## Cross-cutting (verified in Phase 20, but watched throughout)
- **Dark mode**: every renovated surface checked in `.dark`.
- **Responsive**: hero/sections/stat-grids collapse cleanly on mobile.
- **Accessibility**: focus rings (`.cg-focus`), color contrast, dialog aria, keyboard nav.
- **Motion**: respect `prefers-reduced-motion` (already in globals); no jank on big lists.
- **Performance**: watch bundle size (chunk warning today) — consider route-level code-split during Phase 20.
- **i18n**: reuse existing `t()` keys; new labels `t('key') || 'Spanish'`.

## Estimate / cadence
~397 files. Phases 5–18 are the bulk (~6–10 agents each, 1–2 phases per working session, deployed
incrementally). Realistic cadence: **2–4 phases per session**, each independently shipped & reversible.
Phases 0 (done) + 1–4 are the foundation/chrome that make the rest fast and consistent.
