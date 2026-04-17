import { Labels } from "../domain/enums.js";
import {
  formatDate,
  formatDateTime,
} from "../app/utils.js";
import {
  getHumanSummary,
  getJuizoBadgeTone,
  getStatusBadgeTone,
} from "../domain/proposicoes.js";
import { summarizeHistoryEvent } from "../domain/historico.js";

export const renderBadge = (label, tone = "neutral") =>
  `<span class="badge badge--${tone}">${label}</span>`;

export const renderStatusBadge = (status) =>
  renderBadge(Labels.statusFluxo[status] || status, getStatusBadgeTone(status));

export const renderJuizoBadge = (juizo) => {
  if (!juizo) return renderBadge("Sem juízo", "neutral");
  const label = juizo.tipoConclusao
    ? Labels.tipoConclusao[juizo.tipoConclusao]
    : Labels.situacaoJuizo[juizo.situacao];
  return renderBadge(label, getJuizoBadgeTone(juizo));
};

export const renderStatCard = (label, value) => `
  <article class="stat-card">
    <span class="stat-card__value">${value}</span>
    <span class="stat-card__label">${label}</span>
  </article>
`;

export const renderStatCardSplit = (label, { ativas, inativas }) => `
  <article class="stat-card stat-card--split">
    <span class="stat-card__label">${label}</span>
    <div class="stat-card__split">
      <div class="stat-card__split-item">
        <span class="stat-card__split-value">${ativas}</span>
        <span class="stat-card__split-caption">ativas</span>
      </div>
      <div class="stat-card__split-item">
        <span class="stat-card__split-value">${inativas}</span>
        <span class="stat-card__split-caption">inativas</span>
      </div>
    </div>
  </article>
`;

export const renderMetricSection = (title, cardsHtml, { subtitle } = {}) => `
  <section class="metric-section">
    <header class="metric-section__header">
      <h3 class="panel__title">${title}</h3>
      ${subtitle ? `<p class="muted">${subtitle}</p>` : ""}
    </header>
    <div class="stats-grid">${cardsHtml}</div>
  </section>
`;

export const renderRamoMPTable = (linhas) => `
  <div class="panel">
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Ramo do MP</th>
            <th>Ativas</th>
            <th>Inativas</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${
            linhas.length
              ? linhas
                  .map(
                    (linha) => `
                      <tr>
                        <td>
                          <strong>${linha.ramoMP}</strong>
                          <div class="muted">${linha.ramoMPNome}</div>
                        </td>
                        <td>${linha.ativas}</td>
                        <td>${linha.inativas}</td>
                        <td>${linha.ativas + linha.inativas}</td>
                      </tr>
                    `,
                  )
                  .join("")
              : `<tr><td colspan="4"><div class="empty-state">Sem proposições registradas.</div></td></tr>`
          }
        </tbody>
      </table>
    </div>
  </div>
`;

export const renderProposicaoTable = (proposicoes) => `
  <div class="panel">
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Tipo</th>
            <th>Unidade</th>
            <th>Status</th>
            <th>Juízo atual</th>
            <th>Pendências</th>
          </tr>
        </thead>
        <tbody>
          ${proposicoes
            .map(
              (item) => `
                <tr>
                  <td>
                    <a href="proposicao-detalhe.html?id=${item.id}">
                      <strong>${item.numero}</strong>
                    </a>
                  </td>
                  <td>${item.tipo}</td>
                  <td>${item.unidade}</td>
                  <td>${renderStatusBadge(item.statusFluxo)}</td>
                  <td>${renderJuizoBadge(item.juizoAtual)}</td>
                  <td>${item.pendenciasSecretaria.filter((pendencia) => pendencia.status === "pendente").length}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>
`;

export const renderTimeline = (historico) => `
  <div class="timeline">
    ${historico
      .slice()
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .map((event) => {
        const summary = summarizeHistoryEvent(event);
        return `
          <article class="timeline-item">
            <div class="timeline-item__header">
              <span class="timeline-item__title">${summary.title}</span>
            </div>
            <p class="muted">${summary.subtitle}</p>
            <p>${summary.body}</p>
          </article>
        `;
      })
      .join("")}
  </div>
`;

export const renderMetaList = (items) => `
  <div class="meta-list">
    ${items
      .map(
        ({ label, value }) => `
          <div class="meta-item">
            <span>${label}</span>
            <strong>${value ?? "—"}</strong>
          </div>
        `,
      )
      .join("")}
  </div>
`;

export const renderPendenciasCards = (pendencias) => {
  if (!pendencias.length) {
    return `<div class="empty-state">Nenhuma pendência da Secretaria vinculada a esta proposição.</div>`;
  }

  return `
    <div class="cards-grid">
      ${pendencias
        .map(
          (item) => `
            <article class="panel">
              <div class="button-row">
                ${renderBadge(Labels.tipoProvidencia[item.tipoProvidencia] || item.descricao, item.status === "cumprida" ? "success" : "warning")}
                ${renderBadge(item.status === "cumprida" ? "Cumprida" : "Pendente", item.status === "cumprida" ? "success" : "danger")}
              </div>
              <p><strong>${item.descricao}</strong></p>
              <p class="muted">Criada em ${formatDateTime(item.dataCriacao)}</p>
              <p>Data de cumprimento: ${formatDate(item.dataCumprimento)}</p>
              <p>Observações: ${item.observacoes || "—"}</p>
              ${
                item.status !== "cumprida"
                  ? `
                    <form class="stack" data-pendencia-form="${item.id}">
                      <div class="field">
                        <label for="dataCumprimento-${item.id}">Data de cumprimento</label>
                        <input id="dataCumprimento-${item.id}" name="dataCumprimento" type="date" required />
                      </div>
                      <div class="field">
                        <label for="observacoes-${item.id}">Observações</label>
                        <textarea id="observacoes-${item.id}" name="observacoes"></textarea>
                      </div>
                      <button class="button" type="submit">Registrar cumprimento</button>
                    </form>
                  `
                  : ""
              }
            </article>
          `,
        )
        .join("")}
    </div>
  `;
};

export const renderDiligenciasCards = (diligencias) => {
  if (!diligencias.length) {
    return `<div class="empty-state">Nenhuma diligência registrada.</div>`;
  }

  return `
    <div class="cards-grid">
      ${diligencias
        .map(
          (item) => `
            <article class="status-card">
              <div class="button-row">
                ${renderBadge(item.status === "aberta" ? "Aberta" : "Comprovada", item.status === "aberta" ? "warning" : "success")}
              </div>
              <p><strong>${item.descricao}</strong></p>
              <p class="muted">Prazo: ${formatDate(item.prazo)}</p>
              <p class="muted">Criada em ${formatDateTime(item.criadaEm)}</p>
              <p class="muted">Comprovada em ${formatDateTime(item.comprovadaEm)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
};

export const renderProposicaoHero = (proposicao) => `
  <section class="hero-card detail-hero">
    <div class="detail-hero__header">
      <div>
        <p class="muted">${proposicao.numero} · ${proposicao.tipo}</p>
        <h2 class="detail-hero__title">${proposicao.unidade}</h2>
      </div>
      <div class="pill-list">
        ${renderStatusBadge(proposicao.statusFluxo)}
        ${renderJuizoBadge(proposicao.juizoAtual)}
      </div>
    </div>
    <p>${proposicao.descricao}</p>
    <div class="inline-note">${getHumanSummary(proposicao)}</div>
  </section>
`;

export const renderAlert = (message, type = "info") => `
  <div class="alert alert--${type}" role="alert">
    ${message}
  </div>
`;

export const renderEmptyState = (message) => `
  <div class="empty-state">
    <p>${message}</p>
  </div>
`;

export const renderProposicaoCard = (proposicao) => {
  const statusBadge = renderStatusBadge(proposicao.statusFluxo);
  const juizoBadge = renderJuizoBadge(proposicao.juizoAtual);

  return `
    <a href="/pages/proposicao-detalhe.html?id=${proposicao.id}" class="proposicao-card">
      <div class="proposicao-card__header">
        <div>
          <div class="proposicao-card__numero">${proposicao.numero}</div>
          <div class="proposicao-card__tipo">${proposicao.tipo}</div>
        </div>
        <div class="pill-list">
          ${statusBadge}
          ${juizoBadge}
        </div>
      </div>
      <div class="proposicao-card__content">
        <div><strong>Unidade:</strong> ${proposicao.unidade}</div>
        <div><strong>Membro:</strong> ${proposicao.membro}</div>
        <div class="proposicao-card__descricao">${proposicao.descricao.substring(0, 150)}${proposicao.descricao.length > 150 ? "..." : ""}</div>
      </div>
    </a>
  `;
};
