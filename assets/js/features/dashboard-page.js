import { getCurrentPersona, PERSONAS, requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import {
  countCorreicoesPorAtividade,
  countPendentesPorPersona,
  countProposicoesPorAtividade,
  findPropWithPendingProvidence,
  getDashboardSummary,
  listProposicoes,
} from "../domain/proposicoes.js";
import {
  renderChartCard,
  renderProposicaoTable,
  renderSoloChartCard,
  renderStatCard,
} from "../ui/components.js";

requireAuth();

const persona = getCurrentPersona();

// Personas com página própria de aterrissagem não usam o dashboard.
if (persona === PERSONAS.MEMBRO) {
  window.location.href = "/pages/membro-auxiliar.html";
}
if (persona === PERSONAS.SECRETARIA) {
  window.location.href = "/pages/secretaria-inicio.html";
}

const currentState = state();
const recentes = listProposicoes(currentState).slice(0, 4);
const comPendencia = findPropWithPendingProvidence(currentState);

const pendenciasPanel = `
  <section class="panel">
    <h3 class="panel__title">Providências pendentes da Secretaria</h3>
    ${
      comPendencia.length
        ? `
          <div class="stack">
            ${comPendencia
              .map(
                (item) => `
                  <a class="status-card" href="proposicao-detalhe.html?id=${item.id}&from=dashboard">
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
      <a class="button button--secondary" href="secretaria-diligencia.html">Abrir pendências</a>
      <a class="button button--ghost" href="proposicao-detalhe.html?id=prop-003&from=dashboard">Abrir caso com avaliação pendente</a>
    </div>
  </section>
`;

// A visão do CN é a página "Estatísticas": apenas o Panorama agregado.
// O hero com KPIs operacionais vive na página Início (corregedor-inicio.html).
const buildCorregedorContent = () => {
  const proposicoes = countProposicoesPorAtividade(currentState);
  const correicoes = countCorreicoesPorAtividade(currentState);
  const pendentesPersona = countPendentesPorPersona(currentState);
  const providenciasAbertas = findPropWithPendingProvidence(currentState).length;

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

  const pendentesPersonaCard = renderChartCard(
    "Proposições ativas por persona responsável",
    [
      { label: "Corregedoria Nacional", value: pendentesPersona.corregedoria, color: "var(--chart-1)" },
      { label: "Secretaria Processual", value: pendentesPersona.secretaria, color: "var(--chart-2)" },
      { label: "Correicionado", value: pendentesPersona.correicionado, color: "var(--chart-3)" },
      { label: "Membro Auxiliar", value: pendentesPersona.membroAuxiliar, color: "var(--chart-4)" },
    ],
  );

  const providenciasCard = renderSoloChartCard(
    "Providências paralelas",
    providenciasAbertas,
    {
      caption: providenciasAbertas === 1 ? "proposição com providência em aberto" : "proposições com providência em aberto",
      actions: [{ href: "secretaria-providencia.html", label: "Acompanhar providências" }],
    },
  );

  const panoramaSection = `
    <section class="cn-section">
      <h2 class="cn-section__title">Panorama</h2>
      <div class="cn-panorama-grid">
        ${proposicoesCard}
        ${correicoesCard}
        ${pendentesPersonaCard}
        ${providenciasCard}
      </div>
    </section>
  `;

  return `
    <div class="cn-dashboard">
      ${panoramaSection}
    </div>
  `;
};

const buildDefaultContent = () => {
  const summary = getDashboardSummary(currentState);
  return `
    <section class="stack dashboard-overview">
      <section class="stats-grid">
        ${renderStatCard("Proposições totais", summary.total)}
        ${renderStatCard("Aguardando referendo", summary.aguardandoReferendo)}
        ${renderStatCard("Aguardando decisão", summary.aguardandoDecisao)}
        ${renderStatCard("Dependem da Secretaria", summary.necessitaSecretaria)}
        ${renderStatCard("Concluídas", summary.concluidas)}
        ${renderStatCard("Providências pendentes", summary.pendenciasSecretaria)}
      </section>

      <section class="page-grid page-grid--two">
        <div class="stack">
          ${renderProposicaoTable(recentes, { origem: "dashboard" })}
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
  title: isCorregedor ? "Estatísticas" : "Dashboard",
  actions: baseActions,
  content: isCorregedor ? buildCorregedorContent() : buildDefaultContent(),
});

if (isCorregedor) {
  document.title = "NAD — Estatísticas";
}
