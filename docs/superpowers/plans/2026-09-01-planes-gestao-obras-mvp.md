# Planes Gestão de Obras MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um MVP web responsivo da plataforma Planes Gestão de Obras, com login, dados reais de Japaratinga, planejamento, operação de campo, validação e painel executivo.

**Architecture:** Aplicação React/TypeScript organizada por funcionalidades e contratos de repositório. Um processo de importação converte células e objetos gráficos das planilhas em um conjunto JSON versionado; a aplicação lê esse conjunto e persiste alterações da demonstração no navegador. Autenticação, marca e acesso a dados são abstraídos para permitir futura substituição por serviços multitenant.

**Tech Stack:** Site scaffold oficial, React, TypeScript, Tailwind CSS, componentes shadcn, Vitest, Testing Library, IndexedDB/localStorage, biblioteca de gráficos compatível com o scaffold e scripts Python apenas para extração das planilhas.

**Spec:** `docs/superpowers/specs/2026-09-01-planes-gestao-obras-mvp-design.md`

## Global Constraints

- Obra piloto: `Japaratinga Resort – Expansão 3`.
- Fontes: `LINHA DE BALANÇO_PLANEJAMENTO JAPARATINGA_16.03.26.xlsx` e `MÉDIO PRAZO JAPARATINGA R4.xlsx`.
- Hierarquia: `Obra > Área/Frente > Bloco/Torre > Pavimento/Local > Disciplina > Atividade`.
- Toda entidade de negócio deve conter `tenantId` e `projectId`.
- O branding visível deve ser integralmente da Planes; white label aparece apenas como capacidade arquitetural.
- O primeiro acesso usa contas locais de demonstração e não deve ser apresentado como autenticação de produção.
- Dados operacionais criados devem sobreviver ao recarregamento e poder ser restaurados ao estado inicial.
- Indicadores derivados devem expor numerador, denominador, fonte e premissas.
- Itens ambíguos da importação não podem ser inventados ou descartados silenciosamente.
- O campo deve priorizar três ações: produção, material e impedimento.

---

## File Structure

```text
app/
  layout.tsx                     metadados e shell do produto
  page.tsx                       redirecionamento inicial
  login/page.tsx                 acesso Planes
  (protected)/layout.tsx         proteção e navegação autenticada
  (protected)/dashboard/page.tsx painel executivo
  (protected)/estrutura/page.tsx árvore da obra
  (protected)/planejamento/page.tsx Gantt e baseline
  (protected)/linha-balanco/page.tsx linha de balanço
  (protected)/lookahead/page.tsx horizonte 2–6 semanas
  (protected)/plano-semanal/page.tsx compromissos
  (protected)/minha-obra/page.tsx experiência mobile
  (protected)/validacoes/page.tsx fila do engenheiro
  (protected)/restricoes/page.tsx impedimentos
components/
  brand/                         logo, assinatura e tokens visuais
  shell/                         sidebar, cabeçalho e navegação mobile
  charts/                        Gantt, linha de balanço e indicadores
  forms/                         produção, material e impedimento
features/
  auth/                          sessão, credenciais e permissões
  project/                       hierarquia e seleção de contexto
  schedule/                      cronograma, lookahead e plano semanal
  field/                         apontamentos e anexos
  validation/                    aprovação e devolução
  constraints/                   restrições
  dashboard/                     cálculos e atenções
lib/
  domain/types.ts                tipos canônicos
  repositories/contracts.ts     contratos de persistência
  repositories/local/           implementações locais
  storage/database.ts            schema e versionamento local
  brand/tenant-brand.ts          configuração Planes
data/japaratinga/
  manifest.json                  versão e qualidade da importação
  locations.json                 hierarquia normalizada
  activities.json                atividades canônicas
  schedule.json                  baseline e intervalos
  lookahead.json                 cartões de médio prazo
  constraints.json               restrições extraídas
scripts/import/
  extract_line_balance.py        leitura de células e estilos
  extract_medium_term.py         leitura de formas, âncoras e texto
  normalize_japaratinga.py       normalização e deduplicação
tests/
  import/                        fixtures e reconciliação
  domain/                        cálculos puros
  features/                      fluxos e permissões
  e2e/                           jornada crítica
```

---

### Task 1: Scaffold, tema Planes e shell responsivo

**Files:**
- Create: scaffold oficial do Site no diretório de trabalho
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `lib/brand/tenant-brand.ts`
- Create: `components/brand/planes-logo.tsx`
- Create: `components/shell/app-shell.tsx`
- Create: `components/shell/sidebar.tsx`
- Create: `components/shell/mobile-nav.tsx`
- Test: `tests/features/app-shell.test.tsx`

**Interfaces:**
- Produces: `TenantBrand`, `planesBrand`, `AppShellProps`, navegação por perfil.

- [ ] **Step 1: Inicializar o Site com shadcn e instalar dependências**

Run the pinned scaffold command required by the Sites environment, preserving its package manager and `.openai/hosting.json`.

- [ ] **Step 2: Write the failing theme test**

```tsx
it('renders the Planes identity and pilot project', () => {
  render(<AppShell user={engineerUser}><div>Conteúdo</div></AppShell>)
  expect(screen.getByLabelText('Planes Engenharia')).toBeInTheDocument()
  expect(screen.getByText('Japaratinga Resort – Expansão 3')).toBeInTheDocument()
})
```

- [ ] **Step 3: Run the test and verify failure**

Run: `pnpm test tests/features/app-shell.test.tsx`
Expected: FAIL because `AppShell` and `engineerUser` do not exist.

- [ ] **Step 4: Define brand tokens and shell**

```ts
export type TenantBrand = {
  tenantId: string
  companyName: string
  productName: string
  logoLabel: string
  colors: { primary: string; primaryDark: string; accent: string }
}

export const planesBrand: TenantBrand = {
  tenantId: 'planes',
  companyName: 'Planes Engenharia',
  productName: 'Planes Gestão',
  logoLabel: 'Planes Engenharia',
  colors: { primary: '#0B4A6F', primaryDark: '#062F49', accent: '#E8B84A' },
}
```

Implement desktop sidebar and compact mobile navigation with the same route model. Set metadata title to `Planes Gestão` and description to `Planejamento, execução e inteligência em tempo real`.

- [ ] **Step 5: Apply shared theme tokens**

Define CSS variables for background, foreground, primary, accent, success, warning and danger before styling page components. Ensure focus rings and state colors meet readable contrast.

- [ ] **Step 6: Run the test and build**

Run: `pnpm test tests/features/app-shell.test.tsx && pnpm build`
Expected: PASS and production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add app components lib tests package.json pnpm-lock.yaml .openai/hosting.json
git commit -m "feat: establish Planes product shell"
```

---

### Task 2: Domain model and local repository contracts

**Files:**
- Create: `lib/domain/types.ts`
- Create: `lib/repositories/contracts.ts`
- Create: `lib/storage/database.ts`
- Create: `lib/repositories/local/local-repositories.ts`
- Test: `tests/domain/repositories.test.ts`

**Interfaces:**
- Produces: `Project`, `LocationNode`, `Activity`, `ScheduleItem`, `LookaheadItem`, `WeeklyCommitment`, `ProductionEntry`, `MaterialEntry`, `PhotoAttachment`, `Constraint`, `Validation`, `ImportBatch`.
- Produces: `ActivityRepository`, `FieldRepository`, `ValidationRepository`, `ConstraintRepository`, `DemoRepository`.

- [ ] **Step 1: Write the failing persistence test**

```ts
it('persists an approved production entry across repository instances', async () => {
  const first = createLocalRepositories(memoryStorage)
  const entry = await first.field.addProduction(sampleProduction)
  await first.validation.decide({ entryId: entry.id, decision: 'approved', comment: '' })
  const second = createLocalRepositories(memoryStorage)
  expect(await second.field.getProduction(entry.id)).toMatchObject({ id: entry.id })
})
```

- [ ] **Step 2: Run the test and verify failure**

Run: `pnpm test tests/domain/repositories.test.ts`
Expected: FAIL because contracts and repository factory do not exist.

- [ ] **Step 3: Define canonical types**

```ts
export type EntityScope = { tenantId: string; projectId: string }
export type ActivityStatus = 'not_started' | 'in_progress' | 'completed' | 'late'
export type ValidationDecision = 'pending' | 'approved' | 'returned'

export type Activity = EntityScope & {
  id: string
  locationId: string
  disciplineId: string
  name: string
  sourceText: string
  unit: string | null
  plannedQuantity: number | null
  dataQuality: 'confirmed' | 'normalized' | 'ambiguous'
}
```

Define the remaining entities from the spec with ISO date strings and immutable IDs.

- [ ] **Step 4: Implement versioned local storage**

Create storage key prefix `planes:v1:`. Repositories must clone returned objects, scope every query by `tenantId` and `projectId`, and expose `resetDemo(): Promise<void>`.

- [ ] **Step 5: Run persistence tests**

Run: `pnpm test tests/domain/repositories.test.ts`
Expected: PASS, including reset and tenant isolation cases.

- [ ] **Step 6: Commit**

```bash
git add lib tests/domain
git commit -m "feat: add scoped local data repositories"
```

---

### Task 3: Import the Linha de Balanço workbook

**Files:**
- Create: `scripts/import/extract_line_balance.py`
- Create: `tests/import/test_line_balance.py`
- Create: `tests/import/fixtures/line-balance-sample.json`
- Create: `data/japaratinga/line-balance.raw.json`

**Interfaces:**
- Consumes: source workbook path.
- Produces: JSON records shaped as `{sheet, area, location, activityLabel, startDate, endDate, fillColor, sourceCells}`.

- [ ] **Step 1: Write failing extraction tests**

```py
def test_extracts_real_sheet_names(workbook_path):
    result = extract_line_balance(workbook_path)
    assert {item.sheet for item in result.sheets} == {
        'GERAL', 'INFRA', 'ARENA', 'BLOCO APTOS', 'PRÉDIOS ', 'ÁREA DA PISCINA'
    }

def test_maps_tower_and_floor_labels(workbook_path):
    result = extract_line_balance(workbook_path)
    assert result.contains_location('TORRE 1', 'P1')
```

- [ ] **Step 2: Run tests and verify failure**

Run: `python -m pytest tests/import/test_line_balance.py -v`
Expected: FAIL because the extractor does not exist.

- [ ] **Step 3: Implement workbook extraction**

Read workbook XML/styles without rewriting the source. Detect date-header rows, map colored execution cells to their date columns, preserve merged-cell labels and emit source coordinates for auditability.

- [ ] **Step 4: Add reconciliation assertions**

Assert that the source has 6 sheets, `GERAL` reaches 482 columns, daily calendar starts on `2026-03-02`, and representative locations include `ARENA`, `TORRE 1`, `TORRE 2`, `TORRE 3`, `RECEPÇÃO`, `PISCINA` and `INFRA DE ÁGUA`.

- [ ] **Step 5: Export raw JSON and run tests**

Run: `python scripts/import/extract_line_balance.py <source-xlsx> data/japaratinga/line-balance.raw.json && python -m pytest tests/import/test_line_balance.py -v`
Expected: JSON created and all assertions pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/import tests/import data/japaratinga/line-balance.raw.json
git commit -m "feat: extract Japaratinga line balance"
```

---

### Task 4: Import the Médio Prazo workbook and restrictions

**Files:**
- Create: `scripts/import/extract_medium_term.py`
- Create: `tests/import/test_medium_term.py`
- Create: `data/japaratinga/medium-term.raw.json`

**Interfaces:**
- Produces: `{sheet, text, fromRow, toRow, fromColumn, toColumn, weekStart, weekEnd, fill, classification}`.
- Classification values: `activity`, `constraint`, `summary`, `note`.

- [ ] **Step 1: Write failing object extraction tests**

```py
def test_extracts_drawing_text_and_anchor(workbook_path):
    result = extract_medium_term(workbook_path)
    item = result.find_text('QUADRA COBERTA CONCRETO MAGRO SAPATAS 34/34')
    assert item.sheet == ' MAR E ABR 26'
    assert item.week_start == '2026-03-11'

def test_classifies_restrictions(workbook_path):
    result = extract_medium_term(workbook_path)
    assert any(i.classification == 'constraint' and 'RESTRIÇÃO' in i.text for i in result.items)
```

- [ ] **Step 2: Run tests and verify failure**

Run: `python -m pytest tests/import/test_medium_term.py -v`
Expected: FAIL because the extractor does not exist.

- [ ] **Step 3: Parse workbook drawings**

Read `xl/drawings/drawing*.xml`, join text runs, capture anchor coordinates and solid fills. Map each drawing to its sheet through workbook relationships. Derive week ranges from the visible weekly headers, including cross-month intervals.

- [ ] **Step 4: Parse operational text**

Use explicit parsers for terminal percentages (`50%`), fractions (`501 / 1079`), quantities (`517M2`) and team descriptions (`4P+2AJ`). Preserve `sourceText` even after normalization.

- [ ] **Step 5: Reconcile the real workbook**

Assert four sheets and exactly 1,334 text-bearing shapes in the source snapshot. Confirm representative constraints such as project restriction, budget overrun and scope notes are retained.

- [ ] **Step 6: Export raw JSON and run tests**

Run: `python scripts/import/extract_medium_term.py <source-xlsx> data/japaratinga/medium-term.raw.json && python -m pytest tests/import/test_medium_term.py -v`
Expected: JSON created and all assertions pass.

- [ ] **Step 7: Commit**

```bash
git add scripts/import tests/import data/japaratinga/medium-term.raw.json
git commit -m "feat: extract Japaratinga medium-term plan"
```

---

### Task 5: Normalize and seed the Japaratinga project

**Files:**
- Create: `scripts/import/normalize_japaratinga.py`
- Create: `tests/import/test_normalization.py`
- Create: `data/japaratinga/manifest.json`
- Create: `data/japaratinga/locations.json`
- Create: `data/japaratinga/activities.json`
- Create: `data/japaratinga/schedule.json`
- Create: `data/japaratinga/lookahead.json`
- Create: `data/japaratinga/constraints.json`
- Create: `features/project/demo-seed.ts`

**Interfaces:**
- Consumes: both raw JSON files.
- Produces: canonical domain JSON plus `seedJaparatinga(repositories): Promise<void>`.

- [ ] **Step 1: Write failing normalization tests**

```py
def test_all_entities_are_scoped(normalized):
    for collection in normalized.collections:
        assert all(x['tenantId'] == 'planes' for x in collection)
        assert all(x['projectId'] == 'japaratinga-expansao-3' for x in collection)

def test_ambiguity_is_reported(normalized):
    assert normalized.manifest['quality']['ambiguous'] >= 0
    assert 'assumptions' in normalized.manifest
```

- [ ] **Step 2: Run tests and verify failure**

Run: `python -m pytest tests/import/test_normalization.py -v`
Expected: FAIL because the normalizer does not exist.

- [ ] **Step 3: Implement deterministic IDs and hierarchy**

Normalize accents and spacing only for stable IDs; keep display labels intact. Resolve known aliases such as `TERREO INT` and `TÉRREO INT` to one location while recording both source labels.

- [ ] **Step 4: Deduplicate medium-term revisions**

Match on normalized activity, location and overlapping week. Keep the newest source window as current and retain prior entries in `sourceHistory`. Mark uncertain matches as separate ambiguous activities.

- [ ] **Step 5: Produce quality manifest**

The manifest must contain source filenames, import timestamp, record counts, confirmed/normalized/ambiguous counts, unlinked constraints, duplicate candidates and calculation assumptions.

- [ ] **Step 6: Seed through repository contracts**

```ts
export async function seedJaparatinga(repositories: Repositories) {
  if (await repositories.demo.isSeeded('japaratinga-expansao-3')) return
  await repositories.demo.importBundle(japaratingaBundle)
}
```

- [ ] **Step 7: Run import and repository tests**

Run: `python scripts/import/normalize_japaratinga.py && pnpm test tests/domain/repositories.test.ts`
Expected: canonical JSON created and seed is idempotent.

- [ ] **Step 8: Commit**

```bash
git add scripts/import tests/import data/japaratinga features/project
git commit -m "feat: normalize and seed Japaratinga data"
```

---

### Task 6: Login, session and role permissions

**Files:**
- Create: `features/auth/types.ts`
- Create: `features/auth/demo-users.ts`
- Create: `features/auth/auth-repository.ts`
- Create: `features/auth/auth-provider.tsx`
- Create: `features/auth/route-guard.tsx`
- Create: `features/auth/permissions.ts`
- Create: `app/login/page.tsx`
- Modify: `app/(protected)/layout.tsx`
- Test: `tests/features/auth.test.tsx`

**Interfaces:**
- Produces: `UserRole = 'admin' | 'engineer' | 'field' | 'executive'`.
- Produces: `useAuth()`, `can(user, permission)`, `RouteGuard`.

- [ ] **Step 1: Write failing login and permission tests**

```tsx
it('starts an engineer session with valid demo credentials', async () => {
  const result = await authRepository.signIn('engenharia@planes.demo', 'Planes2026!')
  expect(result.user.role).toBe('engineer')
})

it('prevents field users from opening validations', () => {
  expect(can(fieldUser, 'validation:decide')).toBe(false)
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm test tests/features/auth.test.tsx`
Expected: FAIL because authentication modules do not exist.

- [ ] **Step 3: Implement demo accounts**

Create one account per role. Keep credentials in the demo repository, show them only in a development/demo helper panel, never in protected content or logs.

- [ ] **Step 4: Implement session lifecycle**

Store only `{userId, issuedAt, expiresAt}` under `planes:v1:session`. Support sign-in, sign-out, expiration and safe redirect to `/login`.

- [ ] **Step 5: Implement login page**

Include branded logo, email, password, show/hide control, submit state and generic invalid-credentials message. Make keyboard submission and visible labels work.

- [ ] **Step 6: Implement navigation permissions**

Field users default to `/minha-obra`; executives default to `/dashboard`; engineers and admins default to `/dashboard`. Hide unauthorized links and reject direct unauthorized navigation.

- [ ] **Step 7: Run auth tests**

Run: `pnpm test tests/features/auth.test.tsx`
Expected: PASS for valid, invalid, expired and unauthorized cases.

- [ ] **Step 8: Commit**

```bash
git add features/auth app/login app/'(protected)'/layout.tsx tests/features/auth.test.tsx
git commit -m "feat: add branded demo authentication"
```

---

### Task 7: Project hierarchy, filters and planning views

**Files:**
- Create: `features/project/project-context.tsx`
- Create: `features/project/location-tree.tsx`
- Create: `features/schedule/selectors.ts`
- Create: `components/charts/gantt-chart.tsx`
- Create: `components/charts/line-balance-chart.tsx`
- Create: `app/(protected)/estrutura/page.tsx`
- Create: `app/(protected)/planejamento/page.tsx`
- Create: `app/(protected)/linha-balanco/page.tsx`
- Test: `tests/features/planning.test.tsx`

**Interfaces:**
- Produces: `useProjectContext()`, `filterSchedule(items, filters)`, `buildLineBalanceSeries(items, locations)`.

- [ ] **Step 1: Write failing selector tests**

```ts
it('filters schedule by tower, floor and discipline', () => {
  const result = filterSchedule(schedule, {
    locationIds: ['torre-1-p1'], disciplineIds: ['alvenaria'], statuses: []
  })
  expect(result.every(x => x.locationId === 'torre-1-p1')).toBe(true)
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm test tests/features/planning.test.tsx`
Expected: FAIL because selectors and components do not exist.

- [ ] **Step 3: Implement shared project context and filters**

Selection must be reflected in the URL query string so filtered views are linkable. The same filters drive hierarchy, Gantt and Line of Balance.

- [ ] **Step 4: Implement the Gantt**

Render activity labels, baseline interval, current planned interval and validated progress. Add accessible tabular fallback. Highlight late activities and show baseline variance in days.

- [ ] **Step 5: Implement the Line of Balance**

Build series only for activities with two or more comparable locations. Display time horizontally and ordered locations vertically, with planned and realized trajectories.

- [ ] **Step 6: Render real pilot data**

Show Arena, Infrastructure, Towers 1–3 and Pool-related records from the canonical import. No invented sample activity may appear in production UI.

- [ ] **Step 7: Run planning tests and build**

Run: `pnpm test tests/features/planning.test.tsx && pnpm build`
Expected: PASS and both views compile.

- [ ] **Step 8: Commit**

```bash
git add features/project features/schedule components/charts app/'(protected)' tests/features/planning.test.tsx
git commit -m "feat: add hierarchy and planning views"
```

---

### Task 8: Lookahead and weekly plan

**Files:**
- Create: `features/schedule/lookahead-service.ts`
- Create: `features/schedule/weekly-plan-service.ts`
- Create: `app/(protected)/lookahead/page.tsx`
- Create: `app/(protected)/plano-semanal/page.tsx`
- Test: `tests/features/weekly-planning.test.tsx`

**Interfaces:**
- Produces: `getLookahead({startDate, weeks, filters})` where weeks is `2 | 3 | 4 | 5 | 6`.
- Produces: `promoteToWeeklyPlan(lookaheadItemId, weekStart)`.

- [ ] **Step 1: Write failing horizon and promotion tests**

```ts
it('returns only activities inside a four-week horizon', async () => {
  const items = await service.getLookahead({ startDate: '2026-08-03', weeks: 4, filters: {} })
  expect(items.every(x => x.weekStart >= '2026-08-03' && x.weekStart <= '2026-08-30')).toBe(true)
})

it('promotes a ready item once', async () => {
  await service.promoteToWeeklyPlan('lookahead-1', '2026-08-03')
  await service.promoteToWeeklyPlan('lookahead-1', '2026-08-03')
  expect(await weeklyRepository.list()).toHaveLength(1)
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm test tests/features/weekly-planning.test.tsx`
Expected: FAIL because services do not exist.

- [ ] **Step 3: Implement lookahead service and page**

Provide horizon selector, week grouping, readiness indicator, linked restrictions, responsible party and real source text.

- [ ] **Step 4: Implement weekly commitments**

Allow engineers to promote ready items, set target quantity and assign a responsible user. Preserve source activity and lookahead links.

- [ ] **Step 5: Display transparent weekly adherence**

Show `validated completed commitments / commitments due this week`, including both numbers beside the percentage.

- [ ] **Step 6: Run tests**

Run: `pnpm test tests/features/weekly-planning.test.tsx`
Expected: PASS for horizons, restrictions and idempotent promotion.

- [ ] **Step 7: Commit**

```bash
git add features/schedule app/'(protected)'/lookahead app/'(protected)'/plano-semanal tests/features/weekly-planning.test.tsx
git commit -m "feat: add lookahead and weekly commitments"
```

---

### Task 9: Mobile Minha Obra and field entries

**Files:**
- Create: `features/field/field-service.ts`
- Create: `components/forms/production-form.tsx`
- Create: `components/forms/material-form.tsx`
- Create: `components/forms/constraint-form.tsx`
- Create: `components/forms/photo-input.tsx`
- Create: `app/(protected)/minha-obra/page.tsx`
- Test: `tests/features/field-entry.test.tsx`

**Interfaces:**
- Produces: `addProduction`, `addMaterial`, `addConstraint`, `saveDraft`, `submitEntry`.

- [ ] **Step 1: Write failing mobile flow test**

```tsx
it('submits production with a photo for engineering validation', async () => {
  render(<MinhaObraPage />)
  await user.click(screen.getByRole('button', { name: 'Registrar produção' }))
  await user.type(screen.getByLabelText('Quantidade executada'), '12')
  await user.upload(screen.getByLabelText('Foto'), sampleImage)
  await user.click(screen.getByRole('button', { name: 'Enviar para validação' }))
  expect(await screen.findByText('Apontamento enviado')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm test tests/features/field-entry.test.tsx`
Expected: FAIL because the page and forms do not exist.

- [ ] **Step 3: Implement mobile task list**

Show today and current-week commitments assigned to the signed-in user. Keep primary actions visible without horizontal scrolling at 360px width.

- [ ] **Step 4: Implement short prefilled forms**

Prefill project, location, activity, date and author. Require positive production/material quantity and description for an impediment.

- [ ] **Step 5: Implement photo handling and drafts**

Accept images, reject unsupported types and files over the configured limit, create local object previews and persist metadata/blob through the local field repository. Save incomplete forms as drafts.

- [ ] **Step 6: Run field tests**

Run: `pnpm test tests/features/field-entry.test.tsx`
Expected: PASS for production, material, constraint, invalid photo and draft restoration.

- [ ] **Step 7: Commit**

```bash
git add features/field components/forms app/'(protected)'/minha-obra tests/features/field-entry.test.tsx
git commit -m "feat: add mobile field reporting"
```

---

### Task 10: Engineering validation and restrictions

**Files:**
- Create: `features/validation/validation-service.ts`
- Create: `features/constraints/constraint-service.ts`
- Create: `app/(protected)/validacoes/page.tsx`
- Create: `app/(protected)/restricoes/page.tsx`
- Test: `tests/features/validation.test.tsx`

**Interfaces:**
- Produces: `approveEntry(id, correction?)`, `returnEntry(id, comment)`, `updateConstraint(id, patch)`.

- [ ] **Step 1: Write failing approval test**

```ts
it('counts production in official progress only after approval', async () => {
  const entry = await field.addProduction(sampleProduction)
  expect(await progress.validatedQuantity(entry.activityId)).toBe(0)
  await validation.approveEntry(entry.id)
  expect(await progress.validatedQuantity(entry.activityId)).toBe(sampleProduction.quantity)
})
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm test tests/features/validation.test.tsx`
Expected: FAIL because services do not exist.

- [ ] **Step 3: Implement validation queue**

Group pending entries by activity and submission time. Display production, materials, photos, constraints and recent approved history.

- [ ] **Step 4: Implement decisions**

Approval accepts an optional corrected quantity and records the original value. Return requires a comment. Both create immutable validation history records.

- [ ] **Step 5: Implement restrictions page**

Filter by type, status, owner, due date and location. Prioritize overdue restrictions and those linked to activities inside the selected lookahead horizon.

- [ ] **Step 6: Run validation tests**

Run: `pnpm test tests/features/validation.test.tsx`
Expected: PASS for approve, correction, return, permission and history cases.

- [ ] **Step 7: Commit**

```bash
git add features/validation features/constraints app/'(protected)'/validacoes app/'(protected)'/restricoes tests/features/validation.test.tsx
git commit -m "feat: add engineering validation and constraints"
```

---

### Task 11: Executive dashboard and decision alerts

**Files:**
- Create: `features/dashboard/metrics.ts`
- Create: `features/dashboard/attention-service.ts`
- Create: `components/charts/progress-card.tsx`
- Create: `components/charts/adherence-card.tsx`
- Create: `components/charts/schedule-variance.tsx`
- Create: `app/(protected)/dashboard/page.tsx`
- Test: `tests/domain/metrics.test.ts`
- Test: `tests/features/dashboard.test.tsx`

**Interfaces:**
- Produces: `calculatePhysicalProgress`, `calculateWeeklyAdherence`, `calculateScheduleVariance`, `buildAttentionItems`.

- [ ] **Step 1: Write failing metric tests**

```ts
it('calculates validated weighted physical progress', () => {
  expect(calculatePhysicalProgress([
    { weight: 2, plannedQuantity: 10, validatedQuantity: 5 },
    { weight: 1, plannedQuantity: 10, validatedQuantity: 10 },
  ])).toMatchObject({ value: 2 / 3, assumption: null })
})

it('falls back to uniform weight and exposes the assumption', () => {
  const result = calculatePhysicalProgress([{ weight: null, plannedQuantity: 10, validatedQuantity: 5 }])
  expect(result.assumption).toContain('peso uniforme')
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm test tests/domain/metrics.test.ts`
Expected: FAIL because metric functions do not exist.

- [ ] **Step 3: Implement transparent metrics**

Every metric returns `{value, numerator, denominator, sourceIds, assumption}`. Guard zero denominators and exclude returned/pending production from official progress.

- [ ] **Step 4: Implement attention ranking**

Rank overdue restrictions, late activities, missed weekly commitments and pending validations by severity and date proximity. Each attention item includes destination route and filters.

- [ ] **Step 5: Build the dashboard first viewport**

Show physical progress, planned progress, weekly adherence, schedule variance, open/overdue restrictions and pending validations above the fold. Place a short `Atenções para decisão` list beneath them.

- [ ] **Step 6: Run dashboard tests**

Run: `pnpm test tests/domain/metrics.test.ts tests/features/dashboard.test.tsx`
Expected: PASS and card drill-down links include the right filters.

- [ ] **Step 7: Commit**

```bash
git add features/dashboard components/charts app/'(protected)'/dashboard tests/domain tests/features/dashboard.test.tsx
git commit -m "feat: add traceable executive dashboard"
```

---

### Task 12: Demo reset, full-flow verification and delivery

**Files:**
- Create: `app/(protected)/configuracoes/page.tsx`
- Create: `tests/e2e/critical-flow.test.ts`
- Modify: `README.md`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: all prior public interfaces.
- Produces: complete hosted MVP and documented demo accounts.

- [ ] **Step 1: Write the failing critical-flow test**

```ts
test('field report becomes validated executive progress', async ({ page }) => {
  await signInAs(page, 'field')
  await submitProduction(page, { activity: realPilotActivity, quantity: 12, photo: samplePhoto })
  await signOut(page)
  await signInAs(page, 'engineer')
  await approveLatestProduction(page)
  await page.goto('/dashboard')
  await expect(page.getByText('Produção validada')).toContainText('12')
})
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm test:e2e tests/e2e/critical-flow.test.ts`
Expected: FAIL until reset/settings and full integration are complete.

- [ ] **Step 3: Implement demo reset**

Admin-only action requires explicit confirmation, removes only `planes:v1:` keys and reseeds the Japaratinga bundle. Show success only after reseeding finishes.

- [ ] **Step 4: Complete metadata and social preview**

Set Planes-specific Open Graph/X title and description. Generate and wire a branded social image only if none exists, ensuring no credentials or private data appear.

- [ ] **Step 5: Document the demo**

README must list purpose, supported profiles, source workbook names, import command, local run command, test command, reset behavior and the disclaimer that demo authentication is not production security.

- [ ] **Step 6: Run all automated verification**

Run: `python -m pytest tests/import -v && pnpm test && pnpm test:e2e && pnpm build`
Expected: all suites pass and production build completes.

- [ ] **Step 7: Verify the real-data reconciliation report**

Check manifest counts against both extractors; inspect at least one representative record from every source sheet and one example each of activity, constraint, percentage, quantity and team parsing.

- [ ] **Step 8: Verify responsive critical flows**

At desktop width, validate dashboard, Gantt, line of balance, lookahead and validation. At 360px width, validate login, Minha Obra, the three primary actions, photo selection and confirmation feedback. Confirm no horizontal scroll in the mobile operational flow.

- [ ] **Step 9: Publish and verify the hosted URL**

Deploy through Sites, open the deployed URL in the existing preview tab, verify login and the critical flow once against the hosted build, then stop the local development server.

- [ ] **Step 10: Commit**

```bash
git add app README.md tests/e2e
git commit -m "feat: complete Planes Japaratinga MVP"
```

