# Especificação — Página "Início" do Corregedor Nacional

Especificação funcional e de UX da homepage autenticada da persona **Corregedor Nacional** e da
reorganização da navegação lateral associada. Documento derivado de entrevista estruturada
(13 decisões registradas) sobre o protótipo existente. Escopo restrito ao CN: as demais personas
mantêm suas telas e aterrissagens atuais.

Data: 15/07/2026 · Status: aprovada para implementação

---

## A. Sumário executivo

O Corregedor Nacional aterrissava em um "Dashboard" com hero de 4 KPIs e um panorama de gráficos,
e navegava por uma sidebar de 7 itens planos com a mesma hierarquia — sem distinção entre o que é
**trabalho** (as filas), o que é **serviço** (cadastros e configurações) e o que é **estatística**.

Esta especificação define:

1. **"Início"** ([corregedor-inicio.html](pages/corregedor-inicio.html)) — nova aterrissagem do CN.
   Página operacional de orientação: hero contextual com headline dinâmica ("o que fazer agora"),
   dois cards protagonistas para as **filas operacionais** (Aguardando referendo do CNMP e
   Aguardando decisão) carregando os KPIs de pendência, um bloco discreto de **Serviços** e a seção
   de **Avisos** vigentes. Sem gráficos, sem lista de casos individuais, sem dado pessoal.
2. **Navegação em 5 grupos** — Início · Filas operacionais · Serviços · Consulta · Estatísticas —
   com ícones, badges de pendência nas duas filas e sidebar **recolhível** (estado persistido).
3. **"Estatísticas"** — o antigo Dashboard do CN, demovido para o último grupo da navegação,
   contendo exclusivamente o Panorama atual (4 cartões gráficos, inalterados).

Princípios: a homepage é ponto de entrada de trabalho, não painel decorativo; urgência antes de
rotina; cada informação leva a uma ação; zero duplicação de números; dados sensíveis minimizados;
acessibilidade embutida (WCAG 2.2 AA como alvo); reuso integral dos seletores de domínio existentes.

## B. Nome recomendado

**"Início"** (rótulo de menu e título da página).

| Candidato | Avaliação |
| --- | --- |
| **Início** ✅ | Ponto de entrada geral autenticado — exatamente a função da página (orientação + atenção + serviços + avisos). Curto, linguagem simples, escala para as demais personas no futuro. |
| Minha Mesa | Metáfora já existente no domínio ("Sua mesa está limpa"), mas a página é mais ampla que a mesa de decisão e o nome não escala para outras personas. "Mesa" fica reservado a usos internos. |
| Painel / Dashboard | Regra do projeto: usar apenas quando métricas dominam a página — não é o caso; manteria o modelo mental antigo. O termo permanece só na visão da Secretaria. |
| Minhas Tarefas / Fila de Trabalho | A página não é uma fila de processamento; as filas verdadeiras têm páginas próprias. |

## C. Análise de papéis

| Papel | Precisa da homepage | Nesta entrega |
| --- | --- | --- |
| **Corregedor Nacional** | Situar-se; ver o que exige sua ação (decisões, referendos, rascunhos); alcançar as 2 filas em 1 clique; acessar serviços e avisos. NÃO precisa: gráficos, casos individuais, dados de terceiros. | **Página Início completa** (esta espec). |
| Secretaria Processual | Grupos prontos p/ diligência e ciência, providências atrasadas/pendentes. | **Início próprio no mesmo padrão** (3 cards de fila; ver Adendo Fase 2). "Hoje/Acompanhar" aposentados. |
| Membro Auxiliar da CN | Fila de elaboração de minutas com panorama de 3 KPIs. | Mantém `membro-auxiliar.html` como aterrissagem; menu ganha ícones (Fase 2). |
| Correicionado | Comprovações pendentes e ciências. | Mantém `correicionado-comprovacoes.html`; menu ganha ícones (Fase 2). Sem avisos (parte externa; falta campo de audiência). |

Diferença estrutural do CN: é o único papel cuja atividade se divide em **duas filas de mesma
hierarquia** (referendo e decisão) — por isso a homepage as apresenta como protagonistas gêmeas,
em vez de uma fila única embutida.

## D. Arquitetura de informação

### D.1 Página Início (ordem de prioridade, topo → base)

1. **Aviso crítico** (banner) — somente quando existir aviso vigente de severidade `critico`.
2. **Hero contextual** — dateline, saudação, headline dinâmica. Responde "onde estou / o que fazer agora".
3. **Filas operacionais** — 2 cards de mesmo peso com os KPIs de pendência. Responde "o que exige minha ação".
4. **Serviços** — links discretos (Correições · Criar proposição · Administração Superior) + linha de
   links-texto para Consulta e Estatísticas. Responde "onde ficam as demais funções".
5. **Avisos** — vigentes de severidade `alerta`/`informativo`. Seção omitida quando vazia.

### D.2 Navegação lateral do CN (5 grupos)

```
Início                                   ← aterrissagem (getHomeForPersona)
FILAS OPERACIONAIS
  Aguardando referendo do CNMP  [badge]
  Aguardando decisão            [badge]
SERVIÇOS
  Correições
  Criar proposição
  Administração Superior
Consulta de proposições  (lupa)
Estatísticas             (gráfico)       ← antigo Dashboard, demovido
```

As demais personas mantêm menus planos (renderizados como um grupo único sem rótulo).

## E. Especificação detalhada de componentes

### E.1 Hero contextual

- **Propósito**: confirmar contexto (data, persona) e dizer em uma frase a próxima ação mais relevante.
- **Conteúdo**: dateline editorial (`formatDatelineEditorial`), marca "NAD · CN", saudação por hora
  (`saudacaoPorHora`), headline dinâmica.
- **Fonte**: `renderCnHero` ([components.js](assets/js/ui/components.js)) sem KPIs;
  `buildHeadlineCN` migrada de [dashboard-page.js](assets/js/features/dashboard-page.js) — cadeia de
  foco: decisões → rascunhos de decisão → referendos → rascunhos de criação → "Sua mesa está limpa".
- **Regras**: sem linha de KPIs (os números vivem nos cards de fila; decisão de projeto para evitar
  duplicação). Sem mensagem de boas-vindas longa.
- **Estado vazio**: headline "Sua mesa está limpa. Bom trabalho."
- **Acessibilidade**: `<section aria-label="Resumo do dia">`; conteúdo textual puro.

### E.2 Cards de fila (×2) — componente novo `renderFilaCard`

- **Propósito**: apresentar cada fila operacional como unidade de trabalho: volume, decomposição e acesso.
- **Card "Aguardando decisão"** — fonte [proposicoes.js](assets/js/domain/proposicoes.js):
  - Número grande: `countPendentesDoCorregedor().pendentesDecisao`.
  - Secundários: "com minuta submetida" (`listProposicoesAguardandoDecisao` filtrado pelo identificador legado
    `avaliacaoVigenteId`) → fila com filtro; "com rascunho a retomar" (`pendentesRascunhoDecisao`)
    → `corregedor-decisao.html?comRascunho=1`.
  - Ação: título/número e botão "Abrir fila" → `corregedor-decisao.html`.
- **Card "Aguardando referendo do CNMP"**:
  - Número grande: `pendentesReferendo`.
  - Secundários: "correições prontas para referendar" (`groupByCorreicao` das proposições em
    referendo, sem rascunhos na correição — mesma conta da página de fila); "rascunhos de criação
    a confirmar" (`pendentesRascunho`) → `corregedor-referendo.html?comRascunho=1`.
  - Ação: "Abrir fila" → `corregedor-referendo.html`.
- **Ordenação**: cards lado a lado, mesmo peso (a hierarquia entre elas é do fluxo, não da página).
- **Regras**: números idênticos aos exibidos nos panoramas das próprias filas (mesmos seletores);
  sem âncoras aninhadas — o link do título, os secundários e o botão são interativos independentes.
- **Estado vazio (por card)**: número `0` esmaecido + "Em dia — nenhuma pendência." O card permanece.
- **Estado de erro**: seletores são síncronos sobre `localStorage`; falha de estado cai no
  re-seed do [store.js](assets/js/app/store.js) (comportamento global existente).
- **Permissões**: página restrita ao CN (guarda de persona com redirect para `getHomeForPersona()`).
- **Acessibilidade**: card = `<article>` com `<h3>`; número grande com `aria-hidden` e rótulo
  composto no link ("Aguardando decisão: 9 proposições — abrir fila"); foco visível.
- **Responsivo**: grade 2 colunas → 1 coluna abaixo de ~720 px.

### E.3 Serviços

- **Propósito**: dar acesso de segunda linha às funções-cadastro sem competir com as filas.
- **Conteúdo**: 3 links com ícone (Correições · Criar proposição · Administração Superior) e linha
  de links-texto "Consulta de proposições →" / "Estatísticas →".
- **Regras**: visual discreto (sem números, sem cards grandes). Duplicação consciente da sidebar
  para reforço de modelo mental na primeira dobra da adoção.
- **Permissões**: itens fixos do CN (menu já é por persona).

### E.4 Avisos institucionais

- **Propósito**: comunicar mudanças normativas/procedimentais e manutenção que afetam o trabalho.
- **Modelo de dados** (novo, top-level no [seed.js](assets/data/seed.js)):
  `{ id, severidade: "critico"|"alerta"|"informativo", titulo, corpo, vigenciaInicio, vigenciaFim, link? }`.
- **Fonte**: novo [avisos.js](assets/js/domain/avisos.js) — `listAvisosVigentes(state, hoje)`:
  filtra `vigenciaInicio ≤ hoje ≤ vigenciaFim`, ordena crítico → alerta → informativo.
- **Regras**: aviso expirado ou futuro **nunca** renderiza; `critico` vira banner acima do hero;
  `alerta`/`informativo` listam na seção final; seção omitida quando não há vigente; badge com o
  TEXTO da severidade (nunca só cor); vigência exibida ("Vigente até dd/mm/aaaa").
- **Estado vazio**: seção ausente (sem placeholder).
- **Acessibilidade**: banner crítico com `role="alert"`; seção com `<h2>Avisos</h2>`.
- **Conteúdo inicial**: 1 aviso informativo real (novo tipo de proposição **Encaminhamento**,
  cf. [US-corregedor-003](historias_de_usuario/US-corregedor-003-referendar-encaminhamento.md)) e
  1 aviso expirado no seed como prova da regra de vigência.

### E.5 Sidebar agrupada, com ícones e recolhível

- **Propósito**: hierarquizar a navegação (trabalho ≠ serviço ≠ consulta ≠ estatística) e liberar tela.
- **Modelo**: menu do CN em [auth.js](assets/js/app/auth.js) vira lista de grupos
  `{ label?, items: [{ href, label, icon?, badgeKey? }] }`; menus planos das demais personas são
  normalizados para um grupo único sem rótulo (zero mudança visual).
- **Ícones**: novo [icons.js](assets/js/ui/icons.js), ~9 SVGs inline 20×20 stroke
  `currentColor`, `aria-hidden="true"`; sem biblioteca externa.
- **Badges**: chaves novas `pendentesDecisaoCN` e `pendentesReferendoCN` em `computeBadgeValue`
  ([layout.js](assets/js/ui/layout.js)), via `countPendentesDoCorregedor` — mesmo mecanismo dos
  badges existentes da Secretaria e do Correicionado; ocultos quando zero.
- **Recolher**: botão no rodapé da sidebar; classe `app-shell--nav-recolhida`; estado em
  `localStorage["nad-sidebar-recolhida"]`, lido antes do primeiro render (sem flash). Recolhida:
  trilho de ícones com `title` + `aria-label`; rótulos de grupo viram separadores; personas sem
  ícones exibem a inicial do rótulo.
- **Acessibilidade**: botão com `aria-expanded` e rótulo alternante "Recolher menu"/"Expandir
  menu"; navegação 100% por teclado; `aria-current="page"` preservado.
- **Responsivo**: o recolhimento é utilidade de desktop; navegação mobile real fica para release futura (ver L).

### E.6 Página Estatísticas (antigo Dashboard do CN)

- **Propósito**: visão agregada opcional ("como está o acervo"), fora do fluxo de trabalho diário.
- **Conteúdo**: exclusivamente o Panorama atual — donuts Proposições ativas×inativas, Correições
  ativas×inativas, Proposições ativas por persona responsável e o cartão de Providências paralelas
  — **inalterados** ([dashboard-page.js](assets/js/features/dashboard-page.js)).
- **Mudanças**: perde o hero (migrou para o Início); título "Estatísticas" para o CN (a Secretaria
  permanece vendo "Dashboard"); entrada de menu no último grupo.

## F. Wireframe textual — desktop

```
┌──────────────┬────────────────────────────────────────────────────────────┐
│ Logado como  │  Início                    [Restaurar dados iniciais]      │
│ Corregedor   │                                                            │
│ Nacional     │  [BANNER CRÍTICO — apenas se houver aviso crítico vigente] │
│  [Trocar]    │                                                            │
│              │  15 DE JULHO DE 2026 · QUARTA-FEIRA          NAD · CN      │
│ NAD          │  Boa tarde, Corregedor.                                    │
│              │  Você tem 9 decisões para tomar hoje.                      │
│ ▸ Início     │                                                            │
│              │  FILAS OPERACIONAIS                                        │
│ FILAS        │  ┌───────────────────────────┬───────────────────────────┐ │
│ OPERACIONAIS │  │ Aguardando decisão        │ Aguardando referendo do   │ │
│ ⚖ Ag. decisão│  │                           │ CNMP                      │ │
│    [9]       │  │   9  proposições          │   5  proposições          │ │
│ ▣ Ag. refe-  │  │                           │                           │ │
│    rendo [5] │  │ · 6 com minuta submetida  │ · 1 correição pronta      │ │
│              │  │ · 1 com rascunho a retomar│ · 1 rascunho de criação   │ │
│ SERVIÇOS     │  │                           │                           │ │
│ ▤ Correições │  │            [Abrir fila]   │            [Abrir fila]   │ │
│ ✚ Criar prop.│  └───────────────────────────┴───────────────────────────┘ │
│ ⌂ Admin. Sup.│                                                            │
│              │  SERVIÇOS                                                  │
│ 🔍 Consulta   │  ▤ Correições  ✚ Criar proposição  ⌂ Administração Sup.   │
│              │  Consulta de proposições →   Estatísticas →                │
│ 📊 Estatíst.  │                                                            │
│              │  AVISOS                                                    │
│ [« Recolher] │  [Informativo] Novo tipo de proposição: Encaminhamento     │
│              │  Vigente até 30/09/2026 — Proposições do tipo Encaminha-   │
│              │  mento geram providência automática após o referendo. …    │
└──────────────┴────────────────────────────────────────────────────────────┘
```

Sidebar recolhida: trilho de ~64 px só com ícones (tooltips no hover/foco), separadores no lugar
dos rótulos de grupo, botão vira "»".

## G. Wireframe textual — mobile (~375 px)

Prioridade: atenção → filas → serviços → avisos. Uma coluna; sem encolher o desktop.

```
┌──────────────────────────────┐
│ NAD        Corregedor [Troc.]│
│ [BANNER CRÍTICO, se houver]  │
│ Boa tarde, Corregedor.       │
│ Você tem 9 decisões hoje.    │
│                              │
│ FILAS OPERACIONAIS           │
│ ┌──────────────────────────┐ │
│ │ Aguardando decisão    9  │ │
│ │ · 6 com minuta           │ │
│ │ · 1 rascunho             │ │
│ │              [Abrir fila]│ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Ag. referendo CNMP    5  │ │
│ │ · 1 correição pronta     │ │
│ │ · 1 rascunho de criação  │ │
│ │              [Abrir fila]│ │
│ └──────────────────────────┘ │
│                              │
│ SERVIÇOS                     │
│ Correições · Criar proposição│
│ Administração Superior       │
│ Consulta →    Estatísticas → │
│                              │
│ AVISOS                       │
│ [Informativo] Encaminhamento │
└──────────────────────────────┘
```

Nota: o protótipo atual não possui navegação mobile do shell (sidebar em grid fixo); a adaptação
plena do shell é release futura (ver L). Os componentes da página já nascem fluidos.

## H. Design de conteúdo (rótulos e mensagens)

| Elemento | Texto |
| --- | --- |
| Título da página / menu | "Início" |
| Seção de filas | "Filas operacionais" |
| Card decisão — rótulos | "Aguardando decisão" · "com minuta submetida" · "com rascunho a retomar" |
| Card referendo — rótulos | "Aguardando referendo do CNMP" · "correições prontas para referendar" · "rascunhos de criação a confirmar" |
| CTA dos cards | "Abrir fila" |
| Estado vazio do card | "Em dia — nenhuma pendência." |
| Seção de serviços | "Serviços" |
| Links de consulta/estatística | "Consulta de proposições →" · "Estatísticas →" |
| Seção de avisos | "Avisos" |
| Severidades | "Crítico" · "Alerta" · "Informativo" |
| Vigência | "Vigente até dd/mm/aaaa" |
| Botão da sidebar | "Recolher menu" / "Expandir menu" |
| Estatísticas (ex-Dashboard) | Título "Estatísticas"; seção interna permanece "Panorama" |
| Headline vazia | "Sua mesa está limpa. Bom trabalho." |

Proibições (herdadas do briefing): sem linguagem de marketing, sem jargão de banco de dados, sem
abreviações não explicadas, sem porcentagens sem significado operacional, sem textos legais longos.

## I. Checklist de acessibilidade (WCAG 2.2 AA)

- [ ] Hierarquia: `<h1>Início</h1>` → `<h2>` por seção → `<h3>` nos cards; sem saltos.
- [ ] Toda funcionalidade operável por teclado (menu, recolher, cards, links); ordem de foco lógica.
- [ ] Foco visível (`:focus-visible`) em todos os interativos, inclusive na sidebar recolhida.
- [ ] Botão de recolher com `aria-expanded` e rótulo alternante; itens recolhidos com `aria-label`.
- [ ] Nenhuma âncora aninhada; cada alvo interativo ≥ 24×24 px (alvo: 44×44 nos CTAs).
- [ ] Urgência/severidade nunca só por cor: badge com texto + tom.
- [ ] Banner crítico com `role="alert"`; ícones `aria-hidden="true"` com rótulo textual adjacente.
- [ ] Números grandes com rótulo composto acessível ("Aguardando decisão: 9 proposições").
- [ ] Contraste ≥ 4,5:1 (tokens institucionais já auditados; conferir secundários `--muted` sobre `--surface`).
- [ ] Zoom 200% sem perda de conteúdo (unidades relativas; grades fluidas).
- [ ] `prefers-reduced-motion` respeitado (sem novas animações).
- [ ] Idioma `pt-BR` no `<html>`; linguagem simples nos rótulos.

## J. Checklist de privacidade e segurança

- [ ] Nenhum dado de caso individual na home (números agregados apenas) — decisão de projeto.
- [ ] Nenhum nome de correicionado, unidade ou membro na home.
- [ ] Flag "sensível" não aparece na home (só dentro das filas/detalhe, como hoje).
- [ ] Avisos não contêm dados pessoais nem conteúdo de casos.
- [ ] Ações não autorizadas nunca renderizam (menu por persona + guarda de página com redirect).
- [ ] Nenhum dado pessoal em parâmetros de URL gerados pela home.
- [ ] "Trocar" continua limpando `localStorage` e `sessionStorage` integralmente.
- [ ] Sem timeout de sessão no protótipo (sem auth real) — requisito registrado para o produto (ver N).

## K. Avaliação de impacto sobre o sistema existente

| Recomendação | Classificação |
| --- | --- |
| Headline, saudação, dateline (hero) | **Existente** — reuso de `renderCnHero`/`buildHeadlineCN`/`utils` |
| Números dos cards de fila | **Existente** — `countPendentesDoCorregedor`, `listProposicoesAguardandoDecisao/Referendo/RascunhoCN`, `groupByCorreicao` |
| Página Início (HTML + controlador + `renderFilaCard`) | **Frontend menor** — página nova sobre seletores existentes |
| Badges de menu das 2 filas | **Frontend menor** — mecanismo `computeBadgeValue`/`renderNavBadge` já existe; só novas chaves |
| Sidebar: grupos + ícones + recolher | **Frontend menor** — render do shell + CSS + persistência local |
| Avisos (modelo + domínio + render) | **Desenvolvimento novo (frontend)** — não existia mecanismo; no protótipo é seed + filtro de vigência |
| Estatísticas (demoção do Dashboard) | **Configuração/conteúdo** — remoção do hero e retitulação; Panorama intacto |
| Reseed (`STORAGE_KEY` v5→v6) | **Configuração** — chave já versionada |
| Gestão de avisos por interface (CRUD) | **Desenvolvimento futuro** — fora desta entrega |
| Sair/Ajuda/identidade institucional no shell | **Desenvolvimento futuro** — requer conteúdo e/ou auth real |
| Navegação mobile do shell | **Desenvolvimento futuro** |

## L. Prioridades de implementação

**Essencial (esta entrega)**: página Início completa (hero, 2 cards, serviços, avisos), navegação
em 5 grupos com ícones/badges/recolher, Estatísticas Panorama-only, seed de avisos + v6,
acessibilidade embutida, US e documentação.

**Importante (release posterior)**: "Sair" e identidade institucional no shell; Ajuda/explicação de
status; navegação mobile do shell; gestão de avisos; aplicar a ordenação `listMesaDecisaoCN`
(sensível → prioridade → tempo de espera) à própria fila de decisão; campo `audiencia` nos avisos
(pré-requisito para exibi-los ao Correicionado). ~~Homepage das demais personas~~ → entregue na
Fase 2 para a Secretaria (ver Adendo); para Membro/Correicionado decidiu-se conscientemente NÃO
criar Início (as filas deles já são a aterrissagem canônica).

**Opcional**: tempo médio de espera nos cards; atalhos de teclado globais; modo escuro.

**Descartadas (decisão explícita do usuário)**: lista de tarefas na home (KPIs clicáveis bastam;
filas a 1 clique); campo de busca na home (Consulta na sidebar basta); bloco de ações rápidas
(sidebar persistente cobre). Racional comum: eliminar redundância e manter a home enxuta.

## M. Critérios de aceite

1. Login como CN aterrissa em `corregedor-inicio.html` com título "Início".
2. A headline nomeia a pendência mais prioritária na cadeia decisão → rascunho de decisão →
   referendo → rascunho de criação; com tudo zerado, exibe "Sua mesa está limpa".
3. Os números dos 2 cards são idênticos aos panoramas das respectivas filas (mesmos seletores).
4. Cada número/secundário clicável navega para a fila com o filtro correspondente aplicado.
5. Card com pendência zero exibe "Em dia — nenhuma pendência." e permanece visível.
6. Aviso vigente aparece com badge textual de severidade e vigência; aviso expirado ou futuro
   nunca renderiza; sem avisos vigentes, a seção não existe no DOM; aviso crítico rende banner
   `role="alert"` acima do hero.
7. Sidebar do CN exibe os 5 grupos com ícones; badges das 2 filas refletem as contagens e somem
   quando zero; item ativo marcado com `aria-current="page"`.
8. Recolher/expandir funciona por mouse e teclado e persiste após recarregar a página.
9. "Estatísticas" exibe apenas o Panorama (4 cartões), com título "Estatísticas".
10. Regressão: Secretaria continua aterrissando no Dashboard atual (título "Dashboard", menu plano
    idêntico); Membro e Correicionado inalterados.
11. Nenhum dado de caso individual, nome próprio ou conteúdo sensível na home.
12. Teclado: todos os interativos da home alcançáveis e acionáveis; foco sempre visível.
13. Sem erros no console em login → Início → filas → Estatísticas → troca de persona.
14. Larguras 375 px, 768 px e 1280 px sem rolagem horizontal do body.

## N. Perguntas de descoberta (para o produto real, além do protótipo)

1. **Negócio**: a ordem sensível → prioridade → tempo de espera é a regra oficial de urgência da
   mesa de decisão? Existem prazos legais (dias corridos?) para decisão e referendo que devam
   gerar badge de atraso na home?
2. **Negócio**: quem publica avisos institucionais e com que ciclo de aprovação? Severidade
   "crítico" tem definição normativa?
3. **Segurança**: requisitos de autenticação (SSO institucional?), timeout de sessão e auditoria
   de acesso à home; a home pode ser exibida em telões/ambientes compartilhados?
4. **Jurídico/privacidade**: contagens agregadas por unidade/ramo são publicáveis internamente sem
   restrição? Base legal (LGPD) para exibição de nomes nas filas?
5. **Acessibilidade**: há norma vinculante além do eMAG/WCAG 2.2 AA (ex.: requisitos CNMP)?
   Necessidade de declaração de acessibilidade pública?
6. **Operação**: o CN usa dispositivos móveis no dia a dia (define a prioridade da navegação
   mobile do shell)? Frequência real de "Criar proposição" fora do fluxo SCI?
7. **Técnico**: no produto real, os seletores de contagem viram endpoints agregados? Qual SLA de
   atualização (a home do protótipo é síncrona por carga de página, sem tempo real)?

---

## Adendo — Fase 2 (15/07/2026): extensão às demais personas

Decidido em entrevista de 3 perguntas após a entrega do Início do CN.

### Secretaria Processual — Início próprio ([secretaria-inicio.html](pages/secretaria-inicio.html))

Mesmo esqueleto do CN (hero com marca "NAD · Secretaria" → Filas operacionais → Serviços → Avisos),
com **3 cards** espelhando os seletores das próprias filas:

| Card | Nº grande (destino) | Secundários |
| --- | --- | --- |
| Aguardando diligência | grupos prontos → `?gruposCompletos=1` | proposições aguardando; grupos parciais em formação |
| Aguardando ciência | grupos prontos → `?estado=completo&fila=1` | proposições aguardando ciência |
| Providências pendentes | pendências abertas → fila | atrasadas >10 dias → `?atrasadas=1` |

Headline: grupos p/ diligência → grupos p/ ciência → atrasadas → pendentes → "mesa limpa".
Navegação: Início / Filas operacionais (3, com **3 badges**) / Serviços (Administração Superior) /
Consulta. **Sem Estatísticas** (não existia visão gráfica para ela; criar seria função nova).
O dashboard antigo dela ("Hoje"/"Acompanhar") foi **aposentado**: `dashboard.html` redireciona a
Secretaria para o Início; os painéis top-5 e a pré-seleção de checkboxes por grupo deixam de
existir na home (a seleção em lote vive nas filas — mudança consciente registrada em
[US-secretaria-003-inicio.md](historias_de_usuario/US-secretaria-003-inicio.md)).

### Membro Auxiliar e Correicionado — decisão de NÃO criar Início

As aterrissagens atuais (fila de elaboração de minutas; comprovações) já são o padrão canônico
panorama-KPIs + fila. Ganham apenas **ícones no menu** (consistência e legibilidade no modo
recolhido). Sem avisos para o Correicionado enquanto não existir campo `audiencia` no modelo.

### Componentes generalizados na Fase 2

`renderCnHero` ganhou `marca`/`ariaLabel`; `renderFilaCard` ganhou `hrefValor` e
`unidadeSingular/Plural` (cards da Secretaria contam grupos/providências, não proposições).
Novos ícones: diligencia, ciencia, providencia, avaliacao, comprovacao, olho, pasta.

---

Referências: [SPECS.md](SPECS.md) · [passos_do_processo_nad.md](passos_do_processo_nad.md) ·
[US-corregedor-004-inicio.md](historias_de_usuario/US-corregedor-004-inicio.md) ·
[corregedor-inicio-page.js](assets/js/features/corregedor-inicio-page.js) ·
[layout.js](assets/js/ui/layout.js) · [auth.js](assets/js/app/auth.js)
