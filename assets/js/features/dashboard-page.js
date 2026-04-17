import { getCurrentPersona, PERSONAS, requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import {
  countCorreicoesPorAtividade,
  countPendentesDoCorregedor,
  countPendentesPorPersona,
  countProposicoesPorAtividade,
  countProposicoesPorRamoMP,
  findPropWithPendingProvidence,
  getDashboardSummary,
  listProposicoes,
} from "../domain/proposicoes.js";
import {
  renderChartCard,
  renderProposicaoTable,
  renderRamoMPTable,
  renderStatCard,
} from "../ui/components.js";

requireAuth();

const currentState = state();
const persona = getCurrentPersona();
const recentes = listProposicoes(currentState).slice(0, 4);
const comPendencia = findPropWithPendingProvidence(currentState);

const pendenciasPanel = `
  <section class="panel">
    <h3 class="panel__title">Pendências abertas da Secretaria</h3>
    ${
      comPendencia.length
        ? `
          <div class="stack">
            ${comPendencia
              .map(
                (item) => `
                  <a class="status-card" href="proposicao-detalhe.html?id=${item.id}">
                    <strong>${item.numero}</strong>
                    <span>${item.unidade}</span>
                  </a>
                `,
              )
              .join("")}
          </div>
        `
        : `<div class="empty-state">Nenhuma pendência aberta no momento.</div>`
    }
  </section>
`;

const atalhosPanel = `
  <section class="panel">
    <h3 class="panel__title">Atalhos operacionais</h3>
    <div class="button-row">
      <a class="button" href="proposicoes-lista.html">Ir para proposições</a>
      <a class="button button--secondary" href="pendencias-secretaria.html">Abrir pendências</a>
      <a class="button button--ghost" href="proposicao-detalhe.html?id=prop-003">Abrir caso com avaliação pendente</a>
    </div>
  </section>
`;

const buildCorregedorContent = () => {
  const proposicoes = countProposicoesPorAtividade(currentState);
  const correicoes = countCorreicoesPorAtividade(currentState);
  const porRamo = countProposicoesPorRamoMP(currentState);
  const pendentesCN = countPendentesDoCorregedor(currentState);
  const pendentesPersona = countPendentesPorPersona(currentState);

  const proposicoesCard = renderChartCard(
    "Proposições",
    [
      { label: "Ativas", value: proposicoes.ativas, color: "var(--chart-1)" },
      { label: "Inativas", value: proposicoes.inativas, color: "var(--chart-inactive)" },
    ],
    { showPercent: false },
  );

  const correicoesCard = renderChartCard(
    "Correições",
    [
      { label: "Ativas", value: correicoes.ativas, color: "var(--chart-1)" },
      { label: "Inativas", value: correicoes.inativas, color: "var(--chart-inactive)" },
    ],
    { showPercent: false },
  );

  const pendentesCNCard = renderChartCard(
    "Pendentes de ação do Corregedor Nacional",
    [
      { label: "Validação", value: pendentesCN.pendentesValidacao, color: "var(--chart-1)" },
      { label: "Decisão", value: pendentesCN.pendentesDecisao, color: "var(--chart-2)" },
      { label: "Diligência", value: pendentesCN.pendentesDiligencia, color: "var(--chart-3)" },
    ],
  );

  const pendentesPersonaCard = renderChartCard(
    "Proposições ativas por persona responsável",
    [
      { label: "Corregedoria Nacional", value: pendentesPersona.corregedoria, color: "var(--chart-1)" },
      { label: "Secretaria Processual", value: pendentesPersona.secretaria, color: "var(--chart-2)" },
      { label: "Correicionado", value: pendentesPersona.correicionado, color: "var(--chart-3)" },
      { label: "Membro Auxiliar", value: pendentesPersona.membroAuxiliar, color: "var(--chart-4)" },
    ],
  );

  return `
    <section class="stack">
      <article class="hero-card">
        <h2>Painel do Corregedor Nacional</h2>
        <p>
          Visão consolidada do acervo de proposições e correições, com destaque para as filas
          que dependem de ação direta da Corregedoria Nacional.
        </p>
      </article>

      <section class="metric-section">
        <header class="metric-section__header">
          <h3 class="panel__title">Visão analítica</h3>
          <p class="muted">
            Acervo ativo e inativo à esquerda; filas de ação e distribuição por persona à direita.
            Proposição inativa: cientificada ou apagada, com todas as providências da Secretaria concluídas.
          </p>
        </header>
        <div class="dashboard-charts-grid">
          ${proposicoesCard}
          ${correicoesCard}
          ${pendentesCNCard}
          ${pendentesPersonaCard}
        </div>
      </section>

      <section class="metric-section">
        <header class="metric-section__header">
          <h3 class="panel__title">Proposições por ramo do MP</h3>
          <p class="muted">Distribuição entre ativas e inativas em cada ramo.</p>
        </header>
        ${renderRamoMPTable(porRamo)}
      </section>
    </section>
  `;
};

const buildDefaultContent = () => {
  const summary = getDashboardSummary(currentState);
  return `
    <section class="stack">
      <article class="hero-card">
        <h2>Fluxo de proposições do NAD</h2>
        <p>
          Painel consolidado das proposições originadas da correição, com tramitação por diligência,
          avaliação técnica, decisão do Corregedor e controle paralelo de providências da Secretaria.
        </p>
      </article>

      <section class="stats-grid">
        ${renderStatCard("Proposições totais", summary.total)}
        ${renderStatCard("Aguardando decisão", summary.aguardandoDecisao)}
        ${renderStatCard("Dependem da Secretaria", summary.necessitaSecretaria)}
        ${renderStatCard("Concluídas", summary.concluidas)}
        ${renderStatCard("Pendências da Secretaria", summary.pendenciasSecretaria)}
      </section>

      <section class="page-grid page-grid--two">
        <div class="stack">
          ${renderProposicaoTable(recentes)}
        </div>
        <div class="stack">
          ${pendenciasPanel}
          ${atalhosPanel}
        </div>
      </section>
    </section>
  `;
};

const isCorregedor = persona === PERSONAS.CORREGEDOR;

mountPage({
  activePage: "dashboard",
  title: "Dashboard",
  subtitle: isCorregedor
    ? "Painel analítico do Corregedor Nacional: acervo, filas e pendências por persona."
    : "Visão geral das proposições, do núcleo decisório do Corregedor Nacional e das pendências paralelas da Secretaria Processual.",
  actions: baseActions,
  content: isCorregedor ? buildCorregedorContent() : buildDefaultContent(),
});
