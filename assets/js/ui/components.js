import { Labels, getPrioridadeBadgeTone } from "../domain/enums.js";
import {
  formatDate,
  formatDateTime,
} from "../app/utils.js";
import {
  getHumanSummary,
  getApreciacaoBadgeTone,
  getStatusBadgeTone,
} from "../domain/proposicoes.js";
import { summarizeHistoryEvent } from "../domain/historico.js";

export const renderBadge = (label, tone = "neutral") =>
  `<span class="badge badge--${tone}">${label}</span>`;

export const renderStatusBadge = (status) =>
  renderBadge(Labels.statusFluxo[status] || status, getStatusBadgeTone(status));

export const renderApreciacaoBadge = (apreciacao) => {
  if (!apreciacao) return renderBadge("Aguardando decisão", "neutral");
  const label = apreciacao.tipoConclusao
    ? Labels.tipoConclusao[apreciacao.tipoConclusao]
    : Labels.situacaoApreciacao[apreciacao.situacao];
  return renderBadge(label, getApreciacaoBadgeTone(apreciacao));
};

export const renderPrioridadeBadge = (prioridade) => {
  if (!prioridade) return "";
  const label = Labels.prioridade[prioridade] || prioridade;
  return renderBadge(`Prioridade ${label.toLowerCase()}`, getPrioridadeBadgeTone(prioridade));
};

export const renderSensivelBadge = (sensivel) => {
  if (!sensivel) return "";
  return `<span class="badge badge--sensivel" title="Caso sinalizado como sensível">⚠ Sensível</span>`;
};

export const renderStatCard = (label, value) => `
  <article class="stat-card">
    <span class="stat-card__value">${value}</span>
    <span class="stat-card__label">${label}</span>
  </article>
`;

export const renderChartCard = (title, slices, { subtitle, showPercent = true, highlight = false, actions = [] } = {}) => {
  const total = slices.reduce((s, d) => s + d.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const cx = 60, cy = 60;
  const strokeWidth = 14;

  const segments = total === 0
    ? `<circle class="chart-card__track" cx="${cx}" cy="${cy}" r="${radius}"></circle>`
    : (() => {
        let cumulative = 0;
        const track = `<circle class="chart-card__track" cx="${cx}" cy="${cy}" r="${radius}"></circle>`;
        const arcs = slices
          .map((slice) => {
            if (!slice.value) return "";
            const ratio = slice.value / total;
            const length = ratio * circumference;
            const dash = `${length} ${circumference - length}`;
            const offset = -cumulative * circumference;
            cumulative += ratio;
            return `<circle
              class="chart-card__segment"
              cx="${cx}"
              cy="${cy}"
              r="${radius}"
              stroke="${slice.color}"
              stroke-dasharray="${dash}"
              stroke-dashoffset="${offset}"
            ></circle>`;
          })
          .join("");
        return track + arcs;
      })();

  const legendItems = slices
    .map((slice) => {
      const pct = total ? Math.round((slice.value / total) * 100) : 0;
      const labelText = showPercent && total ? `${slice.label} (${pct}%)` : slice.label;
      return `
        <div class="chart-card__legend-item">
          <span class="chart-card__legend-dot" style="background:${slice.color}"></span>
          <div>
            <span class="chart-card__legend-value">${slice.value}</span>
            <span class="chart-card__legend-label">${labelText}</span>
          </div>
        </div>`;
    })
    .join("");

  const summary = slices.map((s) => `${s.value} ${s.label}`).join(", ");
  const description = `${title}: ${summary}. Total de ${total}.`;

  const footerHtml = actions.length
    ? `<footer class="chart-card__footer">
        ${actions.map((a) => `<a class="chart-card__action-link" href="${a.href}">${a.label} →</a>`).join("")}
      </footer>`
    : "";

  return `
    <article class="chart-card${highlight ? " chart-card--highlight" : ""}">
      <header class="chart-card__header">
        <h3 class="chart-card__title">${title}</h3>
        ${subtitle ? `<p class="chart-card__subtitle">${subtitle}</p>` : ""}
      </header>
      <div class="chart-card__body">
        <div class="chart-card__viz">
          <svg viewBox="0 0 120 120" role="img" aria-label="${description}">
            ${segments}
          </svg>
          <div class="chart-card__center" aria-hidden="true">
            <span class="chart-card__total">${total}</span>
            <span class="chart-card__caption">total</span>
          </div>
        </div>
        <div class="chart-card__legend">${legendItems}</div>
      </div>
      ${footerHtml}
    </article>
  `;
};

export const renderSoloChartCard = (title, value, { caption, subtitle, actions = [] } = {}) => {
  const footerHtml = actions.length
    ? `<footer class="chart-card__footer">
        ${actions.map((a) => `<a class="chart-card__action-link" href="${a.href}">${a.label} →</a>`).join("")}
      </footer>`
    : "";
  return `
    <article class="chart-card chart-card--solo">
      <header class="chart-card__header">
        <h3 class="chart-card__title">${title}</h3>
        ${subtitle ? `<p class="chart-card__subtitle">${subtitle}</p>` : ""}
      </header>
      <div class="chart-card__solo">
        <span class="chart-card__solo-value">${value}</span>
        ${caption ? `<span class="chart-card__solo-caption">${caption}</span>` : ""}
      </div>
      ${footerHtml}
    </article>
  `;
};

export const renderMetricSection = (title, cardsHtml, { subtitle } = {}) => `
  <section class="metric-section">
    <header class="metric-section__header">
      <h3 class="panel__title">${title}</h3>
      ${subtitle ? `<p class="muted">${subtitle}</p>` : ""}
    </header>
    <div class="stats-grid">${cardsHtml}</div>
  </section>
`;

export const renderRamoMPTable = (linhas) => {
  const maxAtivas = linhas.length ? Math.max(...linhas.map((l) => l.ativas), 1) : 1;
  const rows = linhas.length
    ? linhas
        .map((linha) => {
          const pct = Math.round((linha.ativas / maxAtivas) * 100);
          return `
            <tr>
              <td>
                <strong>${linha.ramoMP}</strong>
                <div class="muted">${linha.ramoMPNome}</div>
              </td>
              <td>
                <div class="table-bar-cell">
                  <span>${linha.ativas}</span>
                  <span class="table-bar" style="width:${pct}%"></span>
                </div>
              </td>
              <td>${linha.inativas}</td>
              <td>${linha.ativas + linha.inativas}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="4"><div class="empty-state">Sem proposições registradas.</div></td></tr>`;

  return `
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
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
};

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
            <th>Apreciação atual</th>
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
                  <td>${renderApreciacaoBadge(item.apreciacaoDoCN)}</td>
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
        ${renderSensivelBadge(proposicao.sensivel)}
        ${renderStatusBadge(proposicao.statusFluxo)}
        ${renderApreciacaoBadge(proposicao.apreciacaoDoCN)}
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

export const renderCnHero = ({ dateline, saudacao, headline, kpis = [] }) => {
  const kpisHtml = kpis
    .map((kpi) => {
      const classes = `cn-kpi${kpi.destaque ? " cn-kpi--destaque" : ""}${kpi.href ? " cn-kpi--link" : ""}`;
      const inner = `
          <span class="cn-kpi__value">${kpi.valor}</span>
          <span class="cn-kpi__label">${kpi.label}</span>`;
      return kpi.href
        ? `<a class="${classes}" href="${kpi.href}">${inner}</a>`
        : `<div class="${classes}">${inner}</div>`;
    })
    .join("");

  return `
    <section class="cn-hero" aria-label="Resumo do dia para o Corregedor Nacional">
      <div class="cn-hero__top">
        <p class="cn-hero__dateline">${dateline}</p>
        <span class="cn-hero__mark" aria-hidden="true">NAD · CN</span>
      </div>
      <div class="cn-hero__body">
        <p class="cn-hero__saudacao">${saudacao}</p>
        <p class="cn-hero__headline">${headline}</p>
      </div>
      <div class="cn-hero__kpis">${kpisHtml}</div>
    </section>
  `;
};


export const renderProposicaoCard = (proposicao) => {
  const statusBadge = renderStatusBadge(proposicao.statusFluxo);
  const apreciacaoBadge = renderApreciacaoBadge(proposicao.apreciacaoDoCN);

  return `
    <a href="/pages/proposicao-detalhe.html?id=${proposicao.id}" class="proposicao-card">
      <div class="proposicao-card__header">
        <div>
          <div class="proposicao-card__numero">${proposicao.numero}</div>
          <div class="proposicao-card__tipo">${proposicao.tipo}</div>
        </div>
        <div class="pill-list">
          ${renderSensivelBadge(proposicao.sensivel)}
          ${statusBadge}
          ${apreciacaoBadge}
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
