import { Labels, StatusFluxo, getPrioridadeBadgeTone, getStatusCorreicaoBadgeTone } from "../domain/enums.js";
import {
  formatDate,
  formatDateTime,
  formatTempoRelativo,
  parseDateValue,
} from "../app/utils.js";
import { getApreciacaoBadgeTone, getStatusBadgeTone } from "../domain/proposicoes.js";
import {
  CategoriaHistorico,
  LabelsCategoriaHistorico,
  agruparHistoricoPorCiclos,
  categorizarEventoHistorico,
  summarizeHistoryEvent,
} from "../domain/historico.js";
import { getDestinatarioDisplay } from "../domain/filas-operacionais.js";
import { LabelsSeveridadeAviso, SeveridadeAviso } from "../domain/avisos.js";
import { renderIcon } from "./icons.js";

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

// Variante para a decisão atual de uma proposição: baixada sem decisão
// (apagada pela CN ou Encaminhamento convertido) não está aguardando decisão.
const renderApreciacaoAtualBadge = (proposicao) => {
  if (proposicao.apreciacaoDoCN) return renderApreciacaoBadge(proposicao.apreciacaoDoCN);
  if (proposicao.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA) {
    return renderBadge("Sem decisão do CN", "neutral");
  }
  return "";
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
 * (minuta vigente, comprovação, diligência, decisão final). Cartão inset
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
  if (!apreciacao) return `<p class="muted">Sem decisão registrada.</p>`;
  const tipoLabel = apreciacao.tipoConclusao
    ? Labels.tipoConclusao[apreciacao.tipoConclusao]
    : Labels.situacaoApreciacao[apreciacao.situacao];
  const linhaMeta = [autor, data ? formatDateTime(data) : null].filter(Boolean).join(" · ");
  const tipoProvidenciaLabel = apreciacao.tipoProvidencia
    ? Labels.tipoProvidencia[apreciacao.tipoProvidencia] || apreciacao.tipoProvidencia
    : null;
  const descricaoProvidencia =
    apreciacao.descricaoProvidencia || tipoProvidenciaLabel;
  return `
    <div class="judging-anchor__header">
      <strong>${tipoLabel}</strong>
      ${renderApreciacaoBadge(apreciacao)}
    </div>
    ${linhaMeta ? `<p class="muted" style="font-size: 0.85rem;">${linhaMeta}</p>` : ""}
    ${
      apreciacao.existeProvidenciaSecretaria && descricaoProvidencia
        ? `<p><strong>Providência da Secretaria:</strong> ${escapeHtml(descricaoProvidencia)}</p>`
        : ""
    }
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

// KPI dos panoramas das filas operacionais. Com `filtros` e valor > 0 o cartão vira
// botão; quem monta a tela faz o bind de [data-kpi-filtros] -> aplicarFiltros(JSON).
export const renderPanoramaKpi = ({ label, valor, filtros, destaque, title }) => {
  const clicavel = Boolean(filtros) && valor > 0;
  const classes = [
    "panorama-kpi",
    clicavel ? "panorama-kpi--link" : "",
    destaque && valor > 0 ? "panorama-kpi--destaque" : "",
    valor === 0 ? "panorama-kpi--zero" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
  const inner = `
    <span class="panorama-kpi__value">${valor}</span>
    <span class="panorama-kpi__label">${label}</span>`;
  return clicavel
    ? `<button type="button" class="${classes}" data-kpi-filtros="${escapeHtml(
        JSON.stringify(filtros),
      )}"${titleAttr}>${inner}</button>`
    : `<div class="${classes}"${titleAttr}>${inner}</div>`;
};

export const renderPanoramaKpis = (kpis) =>
  `<div class="panorama-kpis">${kpis.map(renderPanoramaKpi).join("")}</div>`;

export const renderChartCard = (title, slices, { showPercent = true, highlight = false, actions = [] } = {}) => {
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

export const renderSoloChartCard = (title, value, { caption, actions = [] } = {}) => {
  const footerHtml = actions.length
    ? `<footer class="chart-card__footer">
        ${actions.map((a) => `<a class="chart-card__action-link" href="${a.href}">${a.label} →</a>`).join("")}
      </footer>`
    : "";
  return `
    <article class="chart-card chart-card--solo">
      <header class="chart-card__header">
        <h3 class="chart-card__title">${title}</h3>
      </header>
      <div class="chart-card__solo">
        <span class="chart-card__solo-value">${value}</span>
        ${caption ? `<span class="chart-card__solo-caption">${caption}</span>` : ""}
      </div>
      ${footerHtml}
    </article>
  `;
};

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

export const renderProposicaoTable = (proposicoes, { origem } = {}) => `
  <div class="panel">
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Tipo</th>
            <th>Unidade</th>
            <th>Status</th>
            <th>Decisão atual</th>
            <th>Pendências</th>
          </tr>
        </thead>
        <tbody>
          ${proposicoes
            .map(
              (item) => `
                <tr>
                  <td>
                    <a href="proposicao-detalhe.html?id=${item.id}${origem ? `&from=${origem}` : ""}">
                      <strong>${item.numero}</strong>
                    </a>
                  </td>
                  <td>${item.tipo}</td>
                  <td>${item.unidade}</td>
                  <td>${renderStatusBadge(item.statusFluxo)}</td>
                  <td>${renderApreciacaoAtualBadge(item)}</td>
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

export const renderAnexoChips = (anexos) =>
  (anexos || [])
    .map(
      (a) => `
        <li class="pill">
          <strong>${a.nome}</strong>
          <span class="muted" style="font-size: 0.8rem;">${a.mimeType || "application/octet-stream"} · ${Math.round((a.tamanhoBytes || 0) / 1024)} KB</span>
        </li>
      `,
    )
    .join("");

const STATUS_DILIGENCIA_BADGE = {
  aberta: { label: "Diligência aberta", tone: "warning" },
  comprovada: { label: "Comprovada", tone: "success" },
  expirada: { label: "Prazo expirado", tone: "danger" },
};

const renderStatusDiligenciaBadge = (diligencia) => {
  const meta = diligencia && STATUS_DILIGENCIA_BADGE[diligencia.status];
  return meta ? renderBadge(meta.label, meta.tone) : "";
};

/** Extras específicos por tipo de evento (prazo/status vivo, anexos, observações do juízo). */
const renderEventoExtras = (event, proposicao) => {
  const extras = [];

  if (event.tipo === "criacao_diligencia") {
    const diligencia = (proposicao.diligencias || []).find((d) => d.id === event.diligenciaId);
    const prazo = event.prazoComprovacao || diligencia?.prazo;
    extras.push(`
      <p class="historico-evento__linha muted">
        ${prazo ? `Prazo para comprovação: ${formatDate(prazo)}` : ""}
      </p>
      ${diligencia ? `<div class="historico-evento__badges">${renderStatusDiligenciaBadge(diligencia)}</div>` : ""}
    `);
  }

  if (event.tipo === "comprovacao") {
    if (event.observacoes) extras.push(`<p class="historico-evento__linha muted">${event.observacoes}</p>`);
    if (event.anexos?.length) {
      extras.push(`<ul class="pill-list historico-evento__anexos">${renderAnexoChips(event.anexos)}</ul>`);
    }
  }

  if (event.tipo === "prazo_comprovacao_expirado" && event.prazoOriginal) {
    extras.push(`<p class="historico-evento__linha muted">Prazo original: ${formatDate(event.prazoOriginal)}</p>`);
  }

  if (event.apreciacao?.observacoes) {
    extras.push(`<p class="historico-evento__linha muted">Fundamentação: ${event.apreciacao.observacoes}</p>`);
  }

  return extras.join("");
};

const renderEventoHistorico = (event, proposicao) => {
  const { categoria, decisorio } = categorizarEventoHistorico(event);
  const summary = summarizeHistoryEvent(event);
  return `
    <article class="historico-evento historico-evento--${categoria}${decisorio ? " historico-evento--decisorio" : ""}">
      <div class="historico-evento__header">
        <span class="historico-evento__title">${summary.title}</span>
        ${decisorio ? renderApreciacaoBadge(event.apreciacao) : ""}
      </div>
      <p class="historico-evento__meta muted">${summary.subtitle}</p>
      <p class="historico-evento__body">${summary.body}</p>
      ${renderEventoExtras(event, proposicao)}
    </article>
  `;
};

/** Faixa "Em aberto": pendentes vivos do caso (diligência aberta + providências da Secretaria). */
const renderHistoricoAbertos = (proposicao, { providenciasEditable }) => {
  const diligenciaAberta = (proposicao.diligencias || []).find((d) => d.status === "aberta");
  const pendentes = (proposicao.pendenciasSecretaria || []).filter((p) => p.status === "pendente");
  if (!diligenciaAberta && pendentes.length === 0) return "";

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const prazoVencido = diligenciaAberta?.prazo && parseDateValue(diligenciaAberta.prazo) < inicioHoje;

  const diligenciaHtml = diligenciaAberta
    ? `
      <article class="historico-aberto-item">
        <div class="historico-aberto-item__badges">
          ${renderBadge("Diligência aberta", "warning")}
          ${prazoVencido ? renderBadge("Prazo vencido", "danger") : ""}
        </div>
        <p><strong>${diligenciaAberta.descricao}</strong></p>
        <p class="muted">Prazo: ${formatDate(diligenciaAberta.prazo)} · aguardando comprovação do correicionado.</p>
      </article>
    `
    : "";

  const pendenciasHtml = pendentes
    .map(
      (item) => `
        <article class="historico-aberto-item">
          <div class="historico-aberto-item__badges">
            ${renderBadge(escapeHtml(Labels.tipoProvidencia[item.tipoProvidencia] || item.descricao), "warning")}
            ${renderBadge("Pendente", "danger")}
          </div>
          <p><strong>${escapeHtml(item.descricao)}</strong></p>
          <p class="muted">Criada em ${formatDateTime(item.dataCriacao)} · cumprida fora do sistema; aqui apenas acompanhada.</p>
          ${
            providenciasEditable
              ? `
                <form class="stack" data-pendencia-form="${proposicao.id}:${item.id}">
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
    .join("");

  return `
    <div class="historico-abertos">
      <p class="acervo-overline">Em aberto</p>
      <div class="historico-abertos__grid">
        ${diligenciaHtml}
        ${pendenciasHtml}
      </div>
    </div>
  `;
};

const renderHistoricoFiltros = (eventos, filtroAtivo) => {
  const contagens = eventos.reduce((acc, event) => {
    const { categoria } = categorizarEventoHistorico(event);
    acc[categoria] = (acc[categoria] || 0) + 1;
    return acc;
  }, {});

  const chips = [
    { value: "todos", label: "Todos", count: eventos.length },
    ...Object.values(CategoriaHistorico).map((categoria) => ({
      value: categoria,
      label: LabelsCategoriaHistorico[categoria],
      count: contagens[categoria] || 0,
    })),
  ].filter((chip) => chip.value === "todos" || chip.count > 0);

  if (chips.length <= 2) return "";

  return `
    <div class="acervo-filter-chips historico-unificado__filtros" aria-label="Filtrar histórico por categoria">
      ${chips
        .map(
          (chip) => `
            <button
              type="button"
              class="acervo-filter-chip${chip.value === filtroAtivo ? " is-active" : ""}"
              data-filtro-historico="${chip.value}"
              aria-pressed="${chip.value === filtroAtivo ? "true" : "false"}"
            >
              <span class="acervo-filter-chip__label">${chip.label}</span>
              <span class="acervo-filter-chip__count">${chip.count}</span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
};

const renderCicloBloco = (bloco, proposicao) => {
  const eventosDesc = [...bloco.eventos].sort((a, b) => new Date(b.data) - new Date(a.data));
  const titulo =
    bloco.tipo === "origem"
      ? "Origem da proposição"
      : `Ciclo ${bloco.numero} · aberto em ${formatDate(bloco.abertoEm)}`;
  const diligencia =
    bloco.tipo === "ciclo"
      ? (proposicao.diligencias || []).find((d) => d.id === bloco.diligenciaId)
      : null;
  const contagem = `${eventosDesc.length} evento${eventosDesc.length === 1 ? "" : "s"}`;

  return `
    <details class="historico-ciclo">
      <summary class="historico-ciclo__summary">
        <span class="historico-ciclo__title">${titulo}</span>
        <span class="historico-ciclo__meta">
          ${renderStatusDiligenciaBadge(diligencia)}
          <span class="historico-ciclo__contagem">${contagem}</span>
        </span>
      </summary>
      <div class="historico-ciclo__eventos">
        ${eventosDesc.map((event) => renderEventoHistorico(event, proposicao)).join("")}
      </div>
    </details>
  `;
};

/**
 * Dossiê unificado da proposição: uma única seção de Histórico com a faixa
 * "Em aberto" (diligência aberta + providências pendentes), chips de filtro
 * por categoria e a linha do tempo agrupada por ciclos de diligência.
 * O histórico recebido já deve vir filtrado pela visibilidade da persona.
 */
export const renderHistoricoUnificado = (
  proposicao,
  { historico = [], nota = "", providenciasEditable = false, filtroAtivo = "todos" } = {},
) => {
  const totalLabel = `${historico.length} evento${historico.length === 1 ? "" : "s"}`;
  const abertosHtml = renderHistoricoAbertos(proposicao, { providenciasEditable });

  let corpoHtml;
  if (historico.length === 0) {
    corpoHtml = renderEmptyState("Sem eventos relevantes nesta proposição.");
  } else {
    const blocos = agruparHistoricoPorCiclos(historico)
      .map((bloco) => ({
        ...bloco,
        eventos:
          filtroAtivo === "todos"
            ? bloco.eventos
            : bloco.eventos.filter((event) => categorizarEventoHistorico(event).categoria === filtroAtivo),
      }))
      .filter((bloco) => bloco.eventos.length > 0)
      .reverse();

    corpoHtml =
      blocos.length === 0
        ? renderEmptyState("Nenhum evento nesta categoria.")
        : `
          <div class="historico-ciclos">
            ${blocos.map((bloco) => renderCicloBloco(bloco, proposicao)).join("")}
          </div>
        `;
  }

  return `
    <section class="panel detail-section historico-unificado">
      <div class="panel__header-row">
        <h3 class="panel__title">Histórico</h3>
        <span class="historico-unificado__contador">${totalLabel}</span>
      </div>
      ${nota ? `<p class="muted" style="font-size: 0.85rem;">${nota}</p>` : ""}
      ${abertosHtml}
      ${renderHistoricoFiltros(historico, filtroAtivo)}
      ${corpoHtml}
    </section>
  `;
};

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

const humanizarChaveContexto = (chave) => {
  const texto = String(chave)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const temInformacaoContexto = (valor) => {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === "string") return valor.trim().length > 0;
  if (Array.isArray(valor)) return valor.some(temInformacaoContexto);
  if (typeof valor === "object") {
    return Object.values(valor).some(temInformacaoContexto);
  }
  return true;
};

/**
 * Render livre do contexto enviado pelo SCI (formato ainda não padronizado pelo
 * time): percorre qualquer JSON e apresenta tudo como texto legível — objetos
 * viram pares rótulo/valor, arrays viram listas. Nunca interpreta nem desenha:
 * um bloco de "gráfico" aparece como seus rótulos e números.
 */
const renderContextoLivre = (valor) => {
  if (valor === null || valor === undefined || valor === "") {
    return `<span class="muted">—</span>`;
  }
  if (typeof valor === "boolean") {
    return valor ? "Sim" : "Não";
  }
  if (Array.isArray(valor)) {
    if (valor.length === 0) return `<span class="muted">—</span>`;
    return `<ul class="contexto-livre__lista">${valor
      .map((item) => `<li>${renderContextoLivre(item)}</li>`)
      .join("")}</ul>`;
  }
  if (typeof valor === "object") {
    return `<div class="contexto-livre__grupo">${Object.entries(valor)
      .map(
        ([chave, filho]) => `
          <div class="contexto-livre__campo">
            <span class="contexto-livre__rotulo">${escapeHtml(humanizarChaveContexto(chave))}</span>
            <div class="contexto-livre__valor">${renderContextoLivre(filho)}</div>
          </div>
        `,
      )
      .join("")}</div>`;
  }
  return escapeHtml(String(valor));
};

/**
 * Seção "Contexto" do detalhe da proposição: a origem do caso na correição
 * (quesito respondido, estatística ou procedimento analisado na entrevista).
 * Sempre disponível e colapsada por padrão; quando não há informação útil,
 * apresenta uma mensagem discreta no corpo do painel.
 */
export const renderContextoSection = (proposicao, { aberto = false } = {}) => {
  const conteudo = temInformacaoContexto(proposicao.contexto)
    ? renderContextoLivre(proposicao.contexto)
    : `<span class="muted">Sem informações de contexto.</span>`;

  return `
    <details class="panel contexto-panel" data-contexto-panel${aberto ? " open" : ""}>
      <summary class="contexto-panel__summary">
        <h3 class="panel__title">Contexto</h3>
      </summary>
      <div class="contexto-panel__body">
        ${conteudo}
      </div>
    </details>
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
        ${renderApreciacaoAtualBadge(proposicao)}
      </div>
    </div>
    <p>${proposicao.descricao}</p>
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

export const renderCnHero = ({
  dateline,
  saudacao,
  headline,
  kpis = [],
  marca = "NAD · CN",
  ariaLabel = "Resumo do dia para o Corregedor Nacional",
}) => {
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
    <section class="cn-hero" aria-label="${escapeHtml(ariaLabel)}">
      <div class="cn-hero__top">
        <p class="cn-hero__dateline">${dateline}</p>
        <span class="cn-hero__mark" aria-hidden="true">${escapeHtml(marca)}</span>
      </div>
      <div class="cn-hero__body">
        <p class="cn-hero__saudacao">${saudacao}</p>
        <p class="cn-hero__headline">${headline}</p>
      </div>
      ${kpis.length ? `<div class="cn-hero__kpis">${kpisHtml}</div>` : ""}
    </section>
  `;
};

// Card de fila operacional da página Início: número grande + contadores
// secundários (links independentes; sem âncoras aninhadas) + CTA "Abrir fila".
export const renderFilaCard = ({
  titulo,
  icone,
  valor,
  href,
  hrefValor = href,
  abrirLabel = "Abrir fila",
  unidadeSingular = "proposição",
  unidadePlural = "proposições",
  secundarios = [],
}) => {
  const unidade = valor === 1 ? unidadeSingular : unidadePlural;
  const tudoEmDia = valor === 0 && secundarios.every((sec) => !sec.valor);
  const secundariosHtml = secundarios
    .map((sec) => {
      const conteudo = `<strong class="fila-card__sec-valor">${sec.valor}</strong> ${sec.label}`;
      if (sec.href && sec.valor > 0) {
        return `<a class="fila-card__sec" href="${sec.href}">${conteudo}</a>`;
      }
      return `<span class="fila-card__sec${sec.valor === 0 ? " fila-card__sec--zero" : ""}">${conteudo}</span>`;
    })
    .join("");
  return `
    <article class="fila-card${tudoEmDia ? " fila-card--em-dia" : ""}">
      <header class="fila-card__header">
        ${icone ? renderIcon(icone, "fila-card__icone") : ""}
        <h3 class="fila-card__titulo">${titulo}</h3>
      </header>
      <a class="fila-card__valor" href="${hrefValor}" aria-label="${escapeHtml(`${titulo}: ${valor} ${unidade} — abrir fila`)}">
        <span class="fila-card__numero" aria-hidden="true">${valor}</span>
        <span class="fila-card__unidade" aria-hidden="true">${unidade}</span>
      </a>
      ${
        tudoEmDia
          ? `<p class="fila-card__em-dia">Em dia — nenhuma pendência.</p>`
          : `<div class="fila-card__secundarios">${secundariosHtml}</div>`
      }
      <footer class="fila-card__footer">
        <a class="button" href="${href}">${abrirLabel}</a>
      </footer>
    </article>
  `;
};

// Avisos institucionais (página Início). Severidade sempre com rótulo textual,
// nunca apenas cor. `critico` usa o banner; os demais, o card da seção Avisos.
const TONS_SEVERIDADE_AVISO = {
  [SeveridadeAviso.CRITICO]: "danger",
  [SeveridadeAviso.ALERTA]: "warning",
  [SeveridadeAviso.INFORMATIVO]: "neutral",
};

export const renderAvisoBanner = (aviso) => `
  <div class="aviso-banner" role="alert">
    ${renderBadge(LabelsSeveridadeAviso[aviso.severidade] || "Aviso", "danger")}
    <div class="aviso-banner__texto">
      <strong>${escapeHtml(aviso.titulo)}</strong>
      ${aviso.corpo ? `<span>${escapeHtml(aviso.corpo)}</span>` : ""}
    </div>
  </div>
`;

export const renderAvisoCard = (aviso) => {
  const tom = TONS_SEVERIDADE_AVISO[aviso.severidade] || "neutral";
  return `
    <article class="aviso-card aviso-card--${aviso.severidade}">
      <div class="aviso-card__meta">
        ${renderBadge(LabelsSeveridadeAviso[aviso.severidade] || "Aviso", tom)}
        <span class="aviso-card__vigencia">Vigente até ${formatDate(aviso.vigenciaFim)}</span>
      </div>
      <h3 class="aviso-card__titulo">${escapeHtml(aviso.titulo)}</h3>
      ${aviso.corpo ? `<p class="aviso-card__corpo">${escapeHtml(aviso.corpo)}</p>` : ""}
      ${
        aviso.link?.href
          ? `<a class="aviso-card__link" href="${aviso.link.href}">${escapeHtml(aviso.link.label || "Saiba mais")} →</a>`
          : ""
      }
    </article>
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
        <h2 class="fila-operacional-header__title">${title}</h2>
        ${contexto ? `<p class="fila-operacional-header__context">${contexto}</p>` : ""}
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

export const renderActiveFilterChip = ({ label, removeHref }) => `
  <a class="acervo-active-chip" href="${removeHref}" title="Remover filtro" aria-label="Remover filtro ${label}">
    <span class="acervo-active-chip__label">${label}</span>
    <span class="acervo-active-chip__remove" aria-hidden="true">×</span>
  </a>
`;

const renderApreciacaoConsultaBadge = (apreciacao) =>
  apreciacao
    ? renderApreciacaoBadge(apreciacao)
    : renderBadge("Sem decisão do CN", "neutral");

const renderDestinatarioConsulta = (item) => {
  const display = getDestinatarioDisplay(item);
  const tipo = Labels.tipoDestinatario[display.tipoDestinatario] || "Destinatário";
  const contexto = display.rotuloSecundario
    ? `${tipo} · Unidade de origem: ${display.rotuloSecundario}`
    : tipo;
  return { ...display, contexto };
};

export const renderProposicaoTableEditorial = (
  proposicoes,
  { origem = "proposicoes-lista", exibirMetadadosInternos = true } = {},
) => {
  if (!proposicoes.length) {
    return "";
  }

  const rows = proposicoes
    .map((item, idx) => {
      const prioClass = exibirMetadadosInternos
        ? PRIORIDADE_CLASS[item.prioridade] || "acervo-row--prio-normal"
        : "acervo-row--sem-prioridade";
      const { capitular, resto } = splitNumeroCapitular(item.numero);
      const destinatario = renderDestinatarioConsulta(item);
      const ultima = getUltimaMovimentacao(item);
      const idade = formatTempoRelativo(ultima);
      const pendencias = contarPendenciasAbertas(item);
      const sens = exibirMetadadosInternos && item.sensivel
        ? `<span class="acervo-row__sensivel" title="Caso sensível" aria-label="Caso sensível">●</span>`
        : "";
      const contextoProposicao = [item.tipo, item.ramoMP, item.tematica]
        .filter(Boolean)
        .join(" · ");
      const delay = Math.min(idx, 24);
      return `
        <tr class="acervo-row ${prioClass}" style="--reveal-delay:${delay * 30}ms;">
          <td class="acervo-row__numero-cell">
            <a href="proposicao-detalhe.html?id=${item.id}&from=${origem}" class="acervo-row__numero">
              <span class="acervo-row__capitular" aria-hidden="true">${capitular}</span>
              <span class="acervo-row__numero-rest">${resto}</span>
            </a>
            <span class="acervo-row__tipo">${contextoProposicao}${sens}</span>
          </td>
          <td class="acervo-row__destinatario">
            <span class="acervo-row__destinatario-name">${destinatario.rotulo}</span>
            <span class="acervo-row__destinatario-meta">${destinatario.contexto}</span>
          </td>
          <td class="acervo-row__status">${renderStatusBadge(item.statusFluxo)}</td>
          <td class="acervo-row__apreciacao">${renderApreciacaoConsultaBadge(item.apreciacaoDoCN)}</td>
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
            <th scope="col">Destinatário</th>
            <th scope="col">Status do fluxo</th>
            <th scope="col">Decisão do CN</th>
            <th scope="col" class="acervo-th-pend">Providências pendentes</th>
            <th scope="col" class="acervo-th-idade">Última movimentação</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

export const renderProposicaoCardGrid = (
  proposicoes,
  { origem = "proposicoes-lista", exibirMetadadosInternos = true } = {},
) => {
  if (!proposicoes.length) {
    return "";
  }
  const cards = proposicoes
    .map((item, idx) => {
      const { capitular, resto } = splitNumeroCapitular(item.numero);
      const prioClass = exibirMetadadosInternos
        ? PRIORIDADE_CLASS[item.prioridade] || "acervo-row--prio-normal"
        : "acervo-row--sem-prioridade";
      const destinatario = renderDestinatarioConsulta(item);
      const ultima = getUltimaMovimentacao(item);
      const idade = formatTempoRelativo(ultima);
      const pendencias = contarPendenciasAbertas(item);
      const sens = exibirMetadadosInternos && item.sensivel
        ? `<span class="acervo-card__sensivel" title="Caso sensível">● Sensível</span>`
        : "";
      const delay = Math.min(idx, 24);
      return `
        <a class="acervo-card ${prioClass}" href="proposicao-detalhe.html?id=${item.id}&from=${origem}" style="--reveal-delay:${delay * 30}ms;">
          <header class="acervo-card__head">
            <div class="acervo-card__numero">
              <span class="acervo-card__capitular" aria-hidden="true">${capitular}</span>
              <span class="acervo-card__numero-rest">${resto}</span>
            </div>
            <div class="acervo-card__badges">
              ${renderStatusBadge(item.statusFluxo)}
              ${renderApreciacaoConsultaBadge(item.apreciacaoDoCN)}
            </div>
          </header>
          <p class="acervo-card__tipo">${[item.tipo, item.ramoMP, item.tematica].filter(Boolean).join(" · ")}${exibirMetadadosInternos && item.prioridade && item.prioridade !== "normal" ? ` · ${Labels.prioridade[item.prioridade]}` : ""}</p>
          <p class="acervo-card__destinatario">${destinatario.rotulo}</p>
          <dl class="acervo-card__meta">
            <div><dt>Tipo de destinatário</dt><dd>${Labels.tipoDestinatario[destinatario.tipoDestinatario] || "—"}</dd></div>
            <div><dt>Unidade de origem</dt><dd>${destinatario.rotuloSecundario || "—"}</dd></div>
            <div><dt>Correição</dt><dd>${item.correicao?.numero || item.correicaoId || "—"}</dd></div>
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
