import { requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { findPropWithPendingProvidence, getDashboardSummary, listProposicoes } from "../domain/proposicoes.js";
import { renderProposicaoTable, renderStatCard } from "../ui/components.js";

requireAuth();

const currentState = state();
const summary = getDashboardSummary(currentState);
const recentes = listProposicoes(currentState).slice(0, 4);
const comPendencia = findPropWithPendingProvidence(currentState);

mountPage({
  activePage: "dashboard",
  title: "Dashboard",
  subtitle:
    "Visão geral das proposições, do núcleo decisório do Corregedor Nacional e das pendências paralelas da Secretaria Processual.",
  actions: baseActions,
  content: `
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
          <section class="panel">
            <h3 class="panel__title">Atalhos operacionais</h3>
            <div class="button-row">
              <a class="button" href="proposicoes-lista.html">Ir para proposições</a>
              <a class="button button--secondary" href="pendencias-secretaria.html">Abrir pendências</a>
              <a class="button button--ghost" href="proposicao-detalhe.html?id=prop-003">Abrir caso com avaliação pendente</a>
            </div>
          </section>
        </div>
      </section>
    </section>
  `,
});
