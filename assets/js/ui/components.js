import { Labels, getPrioridadeBadgeTone, getStatusCorreicaoBadgeTone } from "../domain/enums.js";
import {
  formatDate,
  formatDateTime,
  formatTempoRelativo,
} from "../app/utils.js";
import {
  getHumanSummary,
  getApreciacaoBadgeTone,
  getStatusBadgeTone,
} from "../domain/proposicoes.js";
import { summarizeHistoryEvent } from "../domain/historico.js";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderBadge = (label, tone = "neutral") =>
  `<span class="badge badge--${tone}">${label}</span>`;

export const renderStatusBadge = (status) =>
  renderBadge(Labels.statusFluxo[status] || status, getStatusBadgeTone(status));

export const renderStatusCorreicaoBadge = (status) =>
  renderBadge(Labels.statusCorreicao[status] || status, getStatusCorreicaoBadgeTone(status));

export const renderApreciacaoBadge = (apreciacao) => {
  if (!apreciacao) return renderBadge("Aguardando decisão", "neutral");
  const label = apreciacao.tipoConclusao
    ? Labels.tipoConclusao[apreciacao.tipoConclusao]
    : Labels.situacaoApreciacao[apreciacao.situacao];
  return renderBadge(label, getApreciacaoBadgeTone(apreciacao));
};

/**
 * Zona de ação ("Sua vez") do detalhe — painel de trabalho com acento, de
 * largura plena. Hospeda a peça em julgamento e o(s) formulário(s) da persona.
 */
export const renderDetailActionZone = ({ overline, title, children }) => `
  <section class="detail-action">
    ${overline ? `<p class="detail-action__overline">${overline}</p>` : ""}
    ${title ? `<h3 class="detail-action__title">${title}</h3>` : ""}
    ${children}
  </section>
`;

/**
 * A "peça em julgamento": o item específico que a persona vai julgar/responder
 * (avaliação vigente, comprovação, diligência, apreciação final). Cartão inset
 * legível, posicionado dentro da zona de ação.
 */
export const renderJudgingAnchor = ({ overline, children }) => `
  <article class="judging-anchor">
    ${overline ? `<p class="acervo-overline">${overline}</p>` : ""}
    ${children}
  </article>
`;

/** Render legível de uma apreciação (juízo) para usar dentro de uma âncora ou cartão. */
export const renderApreciacaoResumo = (apreciacao, { autor, data } = {}) => {
  if (!apreciacao) return `<p class="muted">Sem apreciação registrada.</p>`;
  const tipoLabel = apreciacao.tipoConclusao
    ? Labels.tipoConclusao[apreciacao.tipoConclusao]
    : Labels.situacaoApreciacao[apreciacao.situacao];
  const linhaMeta = [autor, data ? formatDateTime(data) : null].filter(Boolean).join(" · ");
  return `
    <div class="judging-anchor__header">
      <strong>${tipoLabel}</strong>
      ${renderApreciacaoBadge(apreciacao)}
    </div>
    ${linhaMeta ? `<p class="muted" style="font-size: 0.85rem;">${linhaMeta}</p>` : ""}
    ${apreciacao.observacoes ? `<p>${apreciacao.observacoes}</p>` : ""}
  `;
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

export const renderPendenciasCards = (pendencias, { editable = true } = {}) => {
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
                editable && item.status !== "cumprida"
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

export const renderEditorialOverline = (text, { tag = "p", className = "" } = {}) => {
  const classes = ["acervo-overline", className].filter(Boolean).join(" ");
  return `<${tag} class="${classes}">${text}</${tag}>`;
};

const PRIORIDADE_CLASS = {
  urgente: "acervo-row--prio-urgente",
  importante: "acervo-row--prio-importante",
  normal: "acervo-row--prio-normal",
};

const getUltimaMovimentacao = (proposicao) => {
  const eventos = proposicao.historico || [];
  if (eventos.length === 0) return null;
  const ordenados = [...eventos].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  );
  return ordenados[0]?.data || null;
};

const contarPendenciasAbertas = (proposicao) =>
  (proposicao.pendenciasSecretaria || []).filter((p) => p.status === "pendente").length;

const splitNumeroCapitular = (numero) => {
  const str = String(numero || "");
  const match = str.match(/^([A-Za-z]+)(.*)$/);
  if (match) {
    return { capitular: match[1].charAt(0), resto: match[1].slice(1) + match[2] };
  }
  return { capitular: str.charAt(0) || "·", resto: str.slice(1) };
};

const FILA_PRIORIDADE_CLASS = {
  urgente: "fila-operacional-item--prio-urgente",
  importante: "fila-operacional-item--prio-importante",
  normal: "fila-operacional-item--prio-normal",
};

export const renderFilaProposicaoEditorial = (
  proposicao,
  {
    href,
    checkboxHtml = "",
    badges = "",
    actions = "",
    footerExtras = "",
    cta = "Abrir proposição",
    selecionado = false,
    desabilitado = false,
    className = "",
    attributes = "",
    index = 0,
    descriptionLimit = 180,
  } = {},
) => {
  const { capitular, resto } = splitNumeroCapitular(proposicao.numero);
  const prioridadeClass =
    FILA_PRIORIDADE_CLASS[proposicao.prioridade] || FILA_PRIORIDADE_CLASS.normal;
  const descricao = proposicao.descricao || "";
  const descricaoResumo =
    descricao.length > descriptionLimit
      ? `${descricao.substring(0, descriptionLimit)}...`
      : descricao;
  const idade = formatTempoRelativo(getUltimaMovimentacao(proposicao));
  const delay = Math.min(index, 18) * 28;
  const classes = [
    "fila-operacional-item",
    prioridadeClass,
    checkboxHtml ? "fila-operacional-item--selecionavel" : "",
    selecionado ? "is-selected" : "",
    desabilitado ? "is-disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const sensivel = proposicao.sensivel
    ? `<span class="fila-operacional-item__sensivel">● Sensível</span>`
    : "";
  const prioridade =
    proposicao.prioridade && proposicao.prioridade !== "normal"
      ? `<span class="fila-operacional-item__prioridade">${Labels.prioridade[proposicao.prioridade]}</span>`
      : "";
  const content = `
    <header class="fila-operacional-item__header">
      <div>
        <div class="fila-operacional-item__numero">
          <span class="fila-operacional-item__capitular" aria-hidden="true">${capitular}</span>
          <span>${resto}</span>
        </div>
        <p class="fila-operacional-item__tipo">${proposicao.tipo || "Proposição"}${proposicao.ramoMP ? ` · ${proposicao.ramoMP}` : ""}</p>
      </div>
      ${badges ? `<div class="fila-operacional-item__badges">${badges}</div>` : ""}
    </header>
    <p class="fila-operacional-item__unidade">${proposicao.unidade || "—"}</p>
    ${descricaoResumo ? `<p class="fila-operacional-item__descricao">${descricaoResumo}</p>` : ""}
    <dl class="fila-operacional-item__meta">
      <div><dt>Temática</dt><dd>${proposicao.tematica || "—"}</dd></div>
      <div><dt>Membro</dt><dd>${proposicao.membro || "—"}</dd></div>
      <div><dt>Correição</dt><dd>${proposicao.correicao?.numero || proposicao.correicaoId || "—"}</dd></div>
      <div><dt>Última movimentação</dt><dd>${idade}</dd></div>
    </dl>
    <footer class="fila-operacional-item__footer">
      <div class="fila-operacional-item__signals">${sensivel}${prioridade}${footerExtras}</div>
      ${cta ? `<span class="fila-operacional-item__cta" aria-hidden="true">${cta} →</span>` : ""}
    </footer>`;

  return `
    <article class="${classes}" ${attributes} style="--reveal-delay:${delay}ms;">
      ${checkboxHtml ? `<div class="fila-operacional-item__selector">${checkboxHtml}</div>` : ""}
      <div class="fila-operacional-item__body">
        ${
          href
            ? `<a class="fila-operacional-item__link" href="${href}" aria-label="Abrir proposição ${proposicao.numero}">${content}</a>`
            : `<div class="fila-operacional-item__link">${content}</div>`
        }
        ${actions ? `<div class="fila-operacional-item__actions">${actions}</div>` : ""}
      </div>
    </article>`;
};

export const renderFilaOperacionalHeader = ({
  title,
  intro,
  contexto = "",
  visiveis,
  total,
  itemSingular = "proposição",
  itemPlural = "proposições",
  actions = "",
}) => {
  const visiveisLabel = visiveis === 1 ? itemSingular : itemPlural;
  const totalLabel = total === 1 ? itemSingular : itemPlural;
  const visibilidadeLabel = visiveis === 1 ? "visível" : "visíveis";
  return `
    <header class="fila-operacional-header">
      <div class="fila-operacional-header__content">
        <p class="fila-operacional-overline">Fila operacional</p>
        <h2 class="fila-operacional-header__title">${title}</h2>
        <p class="fila-operacional-header__intro">${contexto || intro || ""}</p>
      </div>
      <div class="fila-operacional-header__summary" aria-label="Resumo da fila">
        <div class="fila-operacional-header__metric">
          <strong>${visiveis}</strong>
          <span>${visiveisLabel} ${visibilidadeLabel}</span>
        </div>
        <div class="fila-operacional-header__metric">
          <strong>${total}</strong>
          <span>${totalLabel} na fila</span>
        </div>
      </div>
      ${actions ? `<div class="fila-operacional-header__actions button-row">${actions}</div>` : ""}
    </header>`;
};

export const renderFilaFiltrosAtivos = (chips) => {
  if (!chips.length) return "";
  return `
    <div class="fila-operacional-active-filters" aria-label="Filtros ativos">
      <span class="fila-operacional-active-filters__label">Filtros ativos</span>
      ${chips
        .map(
          ({ key, label }) => `
            <button class="fila-operacional-active-filter" type="button" data-remove-filtro="${escapeHtml(key)}" aria-label="Remover filtro ${escapeHtml(label)}">
              <span>${escapeHtml(label)}</span>
              <span aria-hidden="true">×</span>
            </button>`,
        )
        .join("")}
    </div>`;
};

export const renderFilaEmptyState = (message) => `
  <div class="fila-operacional-empty">
    <span class="fila-operacional-empty__mark" aria-hidden="true">∅</span>
    <div>
      <h3>Nenhum item nesta seleção</h3>
      <p>${message}</p>
    </div>
  </div>
`;

export const renderFilterToggleChip = ({ label, value, count, active }) => `
  <button
    type="button"
    class="acervo-filter-chip${active ? " is-active" : ""}"
    data-toggle-status="${value}"
    aria-pressed="${active ? "true" : "false"}"
  >
    <span class="acervo-filter-chip__label">${label}</span>
    ${typeof count === "number" ? `<span class="acervo-filter-chip__count">${count}</span>` : ""}
  </button>
`;

export const renderPresetChip = ({ label, href, count, icon = "›" }) => `
  <a class="acervo-preset-chip" href="${href}">
    <span class="acervo-preset-chip__mark" aria-hidden="true">${icon}</span>
    <span class="acervo-preset-chip__label">${label}</span>
    ${typeof count === "number" ? `<span class="acervo-preset-chip__count">${count}</span>` : ""}
  </a>
`;

export const renderActiveFilterChip = ({ label, removeHref }) => `
  <a class="acervo-active-chip" href="${removeHref}" title="Remover filtro" aria-label="Remover filtro ${label}">
    <span class="acervo-active-chip__label">${label}</span>
    <span class="acervo-active-chip__remove" aria-hidden="true">×</span>
  </a>
`;

export const renderProposicaoTableEditorial = (proposicoes) => {
  if (!proposicoes.length) {
    return "";
  }

  const rows = proposicoes
    .map((item, idx) => {
      const prioClass = PRIORIDADE_CLASS[item.prioridade] || "acervo-row--prio-normal";
      const { capitular, resto } = splitNumeroCapitular(item.numero);
      const ultima = getUltimaMovimentacao(item);
      const idade = formatTempoRelativo(ultima);
      const pendencias = contarPendenciasAbertas(item);
      const sens = item.sensivel
        ? `<span class="acervo-row__sensivel" title="Caso sensível" aria-label="Caso sensível">●</span>`
        : "";
      const delay = Math.min(idx, 24);
      return `
        <tr class="acervo-row ${prioClass}" style="--reveal-delay:${delay * 30}ms;">
          <td class="acervo-row__numero-cell">
            <a href="proposicao-detalhe.html?id=${item.id}" class="acervo-row__numero">
              <span class="acervo-row__capitular" aria-hidden="true">${capitular}</span>
              <span class="acervo-row__numero-rest">${resto}</span>
            </a>
            <span class="acervo-row__tipo">${item.tipo}${sens}</span>
          </td>
          <td class="acervo-row__unidade">
            <span class="acervo-row__unidade-name">${item.unidade}</span>
            <span class="acervo-row__unidade-meta">${item.ramoMP || ""}${item.tematica ? ` · ${item.tematica}` : ""}</span>
          </td>
          <td class="acervo-row__membro">${item.membro || "—"}</td>
          <td class="acervo-row__status">${renderStatusBadge(item.statusFluxo)}</td>
          <td class="acervo-row__apreciacao">${renderApreciacaoBadge(item.apreciacaoDoCN)}</td>
          <td class="acervo-row__pend">
            ${
              pendencias > 0
                ? `<span class="acervo-row__pend-count" title="Pendências abertas">${pendencias}</span>`
                : `<span class="acervo-row__pend-zero">—</span>`
            }
          </td>
          <td class="acervo-row__idade">${idade}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="acervo-table-wrap">
      <table class="acervo-table-editorial">
        <thead>
          <tr>
            <th scope="col" class="acervo-th-numero">Proposição</th>
            <th scope="col">Unidade</th>
            <th scope="col">Membro</th>
            <th scope="col">Status</th>
            <th scope="col">Apreciação do CN</th>
            <th scope="col" class="acervo-th-pend">Pend.</th>
            <th scope="col" class="acervo-th-idade">Última movimentação</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

export const renderProposicaoCardGrid = (proposicoes) => {
  if (!proposicoes.length) {
    return "";
  }
  const cards = proposicoes
    .map((item, idx) => {
      const { capitular, resto } = splitNumeroCapitular(item.numero);
      const prioClass = PRIORIDADE_CLASS[item.prioridade] || "acervo-row--prio-normal";
      const ultima = getUltimaMovimentacao(item);
      const idade = formatTempoRelativo(ultima);
      const pendencias = contarPendenciasAbertas(item);
      const sens = item.sensivel
        ? `<span class="acervo-card__sensivel" title="Caso sensível">● Sensível</span>`
        : "";
      const delay = Math.min(idx, 24);
      return `
        <a class="acervo-card ${prioClass}" href="proposicao-detalhe.html?id=${item.id}" style="--reveal-delay:${delay * 30}ms;">
          <header class="acervo-card__head">
            <div class="acervo-card__numero">
              <span class="acervo-card__capitular" aria-hidden="true">${capitular}</span>
              <span class="acervo-card__numero-rest">${resto}</span>
            </div>
            <div class="acervo-card__badges">
              ${renderStatusBadge(item.statusFluxo)}
              ${renderApreciacaoBadge(item.apreciacaoDoCN)}
            </div>
          </header>
          <p class="acervo-card__tipo">${item.tipo}${item.prioridade && item.prioridade !== "normal" ? ` · ${Labels.prioridade[item.prioridade]}` : ""}</p>
          <p class="acervo-card__unidade">${item.unidade}</p>
          <dl class="acervo-card__meta">
            <div><dt>Ramo</dt><dd>${item.ramoMP || "—"}</dd></div>
            <div><dt>Temática</dt><dd>${item.tematica || "—"}</dd></div>
            <div><dt>Membro</dt><dd>${item.membro || "—"}</dd></div>
            <div><dt>Última mov.</dt><dd>${idade}</dd></div>
          </dl>
          <footer class="acervo-card__foot">
            ${sens}
            ${pendencias > 0 ? `<span class="acervo-card__pend">${pendencias} pendência${pendencias > 1 ? "s" : ""}</span>` : ""}
            <span class="acervo-card__cta" aria-hidden="true">Abrir →</span>
          </footer>
        </a>
      `;
    })
    .join("");
  return `<div class="acervo-card-grid">${cards}</div>`;
};
