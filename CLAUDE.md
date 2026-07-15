# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the NAD (Núcleo de Acompanhamento de Determinações) Propositions System v2 - a workflow management system for tracking and processing propositions originated from the Brazilian National Prosecution Service's (Ministério Público) correctional inspections.

**Current Status**: Working front-end prototype. A static, no-build ES-modules app lives under `pages/` (one HTML shell per screen) and `assets/js/` (`app/` core, `domain/` business rules, `ui/` shared renderers, `features/` page controllers), seeded into `localStorage` from `assets/data/seed.js` (`store.js` owns the versioned storage key). There is no backend; specs in this repository remain the authoritative source for behavior. Dev server: `.claude/dev-server.mjs` (port 8080).

## Domain Context

### Core Entities

**Proposições (Propositions)**: Central entity representing corrective measures or determinations issued during correctional inspections. Each proposition follows a multi-stage lifecycle with strict persona-based access control.

**Correições (Inspections)**: Parent entity that generates propositions. Represents a correctional inspection conducted by the SCI (Sistema de Correição Integrada) that results in one or more propositions.

### Key Personas and Authorities

The system is **persona-oriented** with strict hierarchical authority:

1. **Corregedor Nacional (National Prosecutor)**: Final decision-making authority. Can create, edit, delete propositions, accept, set aside or return auxiliary-member decision drafts, and issue binding decisions.

2. **Membro Auxiliar da CN (Auxiliary Member)**: Produces non-binding decision drafts written in decision-ready, imperative language. A draft only takes effect when the National Prosecutor acts.

3. **Secretaria Processual da CN (Procedural Secretariat)**: Operational role that creates diligences, manages communications, and tracks administrative fulfillment of provisions.

4. **Correicionado (Inspected Party)**: Submits evidence and compliance documentation.

### Critical Workflow Invariants

**Two-Layer Judgment System**: Every decision has two mandatory layers:
- First layer: `necessita mais informações` (needs more info) or `concluída` (concluded)
- Second layer (only when concluded): `cumprida`, `parcialmente cumprida`, `não cumprida`, `prejudicada - perda de objeto`, `encerrada - sem análise de mérito`

**Decision Draft vs Decision**:
- Auxiliary-member decision drafts NEVER produce concrete effects
- Accepting a draft deep-copies its complete wording and invariants without transformation into the National Prosecutor's decision
- Setting a draft aside keeps it in the internal audit trail and requires a complete substitute decision in the same act
- Returning a draft deletes its material content, clears the National Prosecutor's decision draft, records the legacy tombstone and sends the proposition back to the auxiliary-member queue
- A direct decision is an exception only for propositions that already reach the decision desk without a draft
- Legacy identifiers containing `avaliacao`, `deferimento` and `indeferimento` remain unchanged for persisted-state compatibility

**Provision Control** (`providências`):
- All five conclusive results allow additional provisions
- `outra_providencia` requires a non-empty `descricaoProvidencia` on final submission
- Provisions are **administrative control mechanisms only**
- Provisions are fulfilled **entirely outside the system**
- The system only records: `dataCumprimento` (fulfillment date) and `observações` (observations)
- Common provision types: `encaminhamento de informações à Corregedoria local`, `encaminhamento de informações à COCI`, `outras providências`
- The provision tracking creates a **parallel pending item** that doesn't block the main proposition flow

### Lifecycle Flow

```
SCI Inspection → Migration to NAD → Create/Edit (CN) → Diligence (Secretariat)
→ Evidence (Inspected Party) → Decision Draft (Auxiliary Member) → Decision (National Prosecutor)
→ Notification → [Parallel: Provision Tracking if applicable]
```

**Return Loop**: When decision is `necessita mais informações`, the proposition returns to Secretariat for new diligence, restarting the evidence-draft-decision cycle.

**Termination**: Decisions marked `concluída` proceed to notification and close the main flow. Parallel provision tracking continues independently if applicable.

## Architecture Principles

### State Management
- **Apreciação (object)**: Author-agnostic judgment object (`situacao`, `tipoConclusao`, `existeProvidenciaSecretaria`, `tipoProvidencia`, `descricaoProvidencia`, `observacoes`). Both the auxiliary member's draft and the National Prosecutor's decision carry an apreciação. Final submissions require non-empty `observacoes`; only the National Prosecutor's apreciação is binding.
- `statusFluxo`: Reflects current process phase, NOT the conclusive result
- `apreciacaoDoCN`: Holds the binding/conclusive apreciação produced by the National Prosecutor. Empty until the CN acts; the auxiliary member's draft does NOT populate this field.
- `apreciacaoDoCN.existeProvidenciaSecretaria`: Valid for any `tipoConclusao` when `situacao` is `concluida`
- `apreciacaoDoCN.descricaoProvidencia`: Required only when `tipoProvidencia` is `outra_providencia`; otherwise `null`

### Audit Trail (`historico`)
- All relevant events must be recorded with full audit trail
- Minimum event types: `criacao`, `edicao`, `apagamento_proposicao`, `criacao_diligencia`, `comprovacao`, `avaliacao_membro_auxiliar`, `decisao`, `avaliacao_com_forca_de_decisao`, `avaliacao_removida_pelo_corregedor`, `cientificacao`, `cumprimento_pendencia_secretaria`
- When a draft is accepted, both the draft AND the decision remain in internal history with identical wording and invariants
- When a draft is set aside, both the draft AND the divergent substitute decision remain in internal history
- Returned drafts are NOT kept as material content; only the legacy tombstone (`avaliacao_removida_pelo_corregedor`) is recorded
- Inspected parties see only the National Prosecutor's decision with a neutral description, never the internal draft or its disposition

### Deletion Semantics
- `APAGAR proposição`: Terminates the entire proposition lifecycle
- `DEVOLVER minuta`: After confirmation, removes the current draft and any National Prosecutor decision draft, preserves the proposition, and returns it to the auxiliary-member drafting queue

### Pending Items (`pendenciasSecretaria`)
- Array structure containing parallel administrative tasks
- Each pending item includes: `tipo`, `tipoProvidencia`, `descricao`, `status`, `dataCriacao`, `dataCumprimento`, `observacoes`
- Provisions are informational only - the system does not execute or automate provision fulfillment
- The goal is visibility: which provisions are pending vs completed

## Key Documentation Files

**SPECS.md**: Complete functional specification including data modeling, business rules, state consistency rules, and mandatory scenarios. This is the authoritative source for system behavior.

**passos_do_processo_nad.md**: Step-by-step workflow description organized by persona. Details the exact sequence of actions each actor performs throughout the proposition lifecycle.

**Excalidraw.excalidraw**: Visual architecture diagram (requires Excalidraw to view).

**modelagem_dados_historico.md**: Reference for the audit trail data model — common event envelope, per-event-type fields and emitters, embedded `apreciacao` schema, persona visibility rules, and known inconsistencies.

**especificacao_inicio_corregedor.md**: UX/functional specification (sections A–N) of the Corregedor Nacional "Início" homepage, the 5-group sidebar navigation (grouped/iconized/collapsible), the demoted "Estatísticas" page, and the `avisos` (institutional notices) model.

**historias_de_usuario/**: One Markdown file per user story, kept short (~40 lines). Each file follows the same template: Connextra story (Como/eu quero/para que), Ator, Pré-condições, Fluxo principal, Fluxos alternativos, Regras de negócio, Pós-condições, Referências.

### Convenção de nomes em `historias_de_usuario/`

- Padrão: `US-<persona>-<NNN>-<slug>.md`
  - `<persona>`: `corregedor` | `membro` | `secretaria` | `correicionado`
  - `<NNN>`: numeração sequencial por persona, com 3 dígitos (`001`, `002`, ...)
  - `<slug>`: identificador curto em kebab-case do escopo da história
- Exemplos: `US-secretaria-001-aguardando-diligencia.md`, `US-corregedor-002-decisao-com-providencia.md`
- Cada arquivo descreve **uma única jornada**. Para fluxos derivados, criar nova história e referenciá-la em "Fluxos alternativos".
- Referências a código devem usar links Markdown relativos (ex.: `[secretaria-diligencia-page.js](../assets/js/features/secretaria-diligencia-page.js)`).

## Important Constraints

1. **Never violate persona authority**: Auxiliary-member decision drafts cannot produce effects. Only National Prosecutor decisions matter.

2. **Preserve invariant structure**: Decision drafts and decisions must use the identical invariant schema (two-layer judgment + provision flag when applicable) and final acts require non-empty wording/fundamentation.

3. **Honor deletion semantics**: Deleting a proposition and returning a decision draft have entirely different consequences.

4. **Maintain audit integrity**: Keep historical events, except that returning a draft removes its material event and replaces it with the legacy tombstone required by the domain.

5. **Provision independence**: The main proposition flow never waits for provision fulfillment. Provisions run in parallel and are for administrative tracking only.

6. **State consistency**: `apreciacaoDoCN` must respect the rules in SPECS.md regarding situation, conclusion type, and provision existence.

## When Implementing

- Start by reviewing both SPECS.md and passos_do_processo_nad.md completely
- The data models in SPECS.md:144-241 should inform database schema design
- Implement persona-based access control from the start
- Enforce state consistency rules at the database/service layer, not just UI
- Build comprehensive audit logging before any business logic
- Test mandatory scenarios listed in SPECS.md:255-263
