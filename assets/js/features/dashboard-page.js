import { getCurrentPersona, PERSONAS, requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { Labels } from "../domain/enums.js";
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
  listFilaAguardandoCiencia,
  listGruposAguardandoDiligencia,
  listGruposParciaisSecretaria,
  listProvidenciasAtrasadas,
} from "../domain/secretaria-filas.js";
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
    <h3 class="panel__title">Providências pendentes da Secretaria</h3>
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
      <a class="button button--secondary" href="secretaria-diligencia.html">Abrir pendências</a>
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
      { label: "Referendo", value: pendentesCN.pendentesReferendo, color: "var(--chart-4)" },
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
        ${renderStatCard("Aguardando referendo", summary.aguardandoReferendo)}
        ${renderStatCard("Aguardando decisão", summary.aguardandoDecisao)}
        ${renderStatCard("Dependem da Secretaria", summary.necessitaSecretaria)}
        ${renderStatCard("Concluídas", summary.concluidas)}
        ${renderStatCard("Providências pendentes", summary.pendenciasSecretaria)}
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

// ---------------------------------------------------------------------------
// Dashboard da Secretaria Processual
// ---------------------------------------------------------------------------

const TOP_LIMIT = 5;

const SELECAO_DILIGENCIA_KEY = "nad-secretaria-diligencia-selecao";
const SELECAO_CIENCIA_KEY = "nad-secretaria-ciencia-selecao";

const escapeAttr = (value) => String(value || "").replace(/"/g, "&quot;");

const diasDesde = (iso) => {
  if (!iso) return null;
  const inicio = new Date(iso);
  if (Number.isNaN(inicio.getTime())) return null;
  const diff = Date.now() - inicio.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
};

const formatProntoHa = (iso, prefixo = "Pronto") => {
  const dias = diasDesde(iso);
  if (dias === null) return "—";
  if (dias === 0) return `${prefixo} há menos de 1 dia`;
  if (dias === 1) return `${prefixo} há 1 dia`;
  return `${prefixo} há ${dias} dias`;
};

const tomBadgeDias = (dias) => {
  if (dias >= 20) return "danger";
  if (dias >= 15) return "warning";
  return "warning";
};

const labelProvidencia = (tipo) => Labels.tipoProvidencia[tipo] || tipo || "—";

const labelProvidenciaCurta = (tipo) => {
  if (!tipo) return "Outra";
  if (tipo === "encaminhamento_corregedoria_local") return "Local";
  if (tipo === "encaminhamento_coci") return "COCI";
  return "Outras";
};

const renderEmptyMessage = (mensagem) =>
  `<p class="muted secretaria-dashboard__empty">${mensagem}</p>`;

const renderSectionHeader = (titulo, contador, subtitulo) => `
  <header class="secretaria-dashboard__section-header">
    <div>
      <h2 class="secretaria-dashboard__section-title">
        ${titulo}
        ${contador !== null && contador !== undefined ? `<span class="secretaria-dashboard__section-count">${contador}</span>` : ""}
      </h2>
      ${subtitulo ? `<p class="muted">${subtitulo}</p>` : ""}
    </div>
  </header>
`;

const renderBlockHeader = (titulo, contador) => `
  <div class="secretaria-dashboard__block-header">
    <h3 class="secretaria-dashboard__block-title">${titulo}</h3>
    <span class="secretaria-dashboard__block-count">${contador}</span>
  </div>
`;

const renderGrupoDiligenciaRow = (grupo) => `
  <button
    type="button"
    class="secretaria-dashboard__row"
    data-action="abrir-grupo-diligencia"
    data-correicao="${escapeAttr(grupo.correicaoId)}"
    data-unidade="${escapeAttr(grupo.unidade)}"
    data-ids="${escapeAttr(grupo.proposicoes.map((p) => p.id).join(","))}"
  >
    <div class="secretaria-dashboard__row-main">
      <strong>${grupo.unidade || "—"}</strong>
      <span class="muted">${grupo.ramoMPNome || grupo.ramoMP || "—"} · Correição ${grupo.correicaoId || "—"}</span>
    </div>
    <div class="secretaria-dashboard__row-meta">
      <span><strong>${grupo.prontas}</strong> proposição(ões)</span>
      <span class="muted">${grupo.novas} nova(s) · ${grupo.retornadas} retornada(s)</span>
      <span class="badge badge--neutral">${formatProntoHa(grupo.prontoEm)}</span>
    </div>
  </button>
`;

const renderGrupoCienciaRow = (grupo) => {
  const providencia =
    grupo.comProvidencia > 0
      ? `<span class="muted">${grupo.comProvidencia} com pendência paralela</span>`
      : "";
  return `
    <button
      type="button"
      class="secretaria-dashboard__row"
      data-action="abrir-grupo-ciencia"
      data-correicao="${escapeAttr(grupo.correicaoId)}"
      data-unidade="${escapeAttr(grupo.unidade)}"
      data-key="${escapeAttr(grupo.key)}"
    >
      <div class="secretaria-dashboard__row-main">
        <strong>${grupo.unidade || "—"}</strong>
        <span class="muted">${grupo.ramoMPNome || grupo.ramoMP || "—"} · Correição ${grupo.correicaoId || "—"}</span>
      </div>
      <div class="secretaria-dashboard__row-meta">
        <span><strong>${grupo.prontas}</strong> proposição(ões)</span>
        ${providencia}
        <span class="badge badge--neutral">${formatProntoHa(grupo.prontoEm)}</span>
      </div>
    </button>
  `;
};

const renderProvidenciaRow = (item) => {
  const tom = tomBadgeDias(item.diasAberto);
  const descricaoTruncada = (item.descricao || "")
    .substring(0, 80)
    .replace(/</g, "&lt;");
  const reticencias = (item.descricao || "").length > 80 ? "…" : "";
  return `
    <a class="secretaria-dashboard__row" href="proposicao-detalhe.html?id=${escapeAttr(item.proposicaoId)}">
      <div class="secretaria-dashboard__row-main">
        <strong>${item.numero}</strong>
        <span class="muted">${item.unidade || "—"} · Correição ${item.correicaoId || "—"}</span>
        <span class="muted secretaria-dashboard__row-desc">${descricaoTruncada}${reticencias}</span>
      </div>
      <div class="secretaria-dashboard__row-meta">
        <span class="badge badge--neutral">${labelProvidenciaCurta(item.tipoProvidencia)}</span>
        <span class="badge badge--${tom}">Há ${item.diasAberto} dias em aberto</span>
      </div>
    </a>
  `;
};

const renderGrupoParcialRow = (grupo) => {
  const estadoLabel =
    grupo.estadoAlvo === "diligencia" ? "Diligência" : "Ciência";
  return `
    <li class="secretaria-dashboard__row secretaria-dashboard__row--static">
      <div class="secretaria-dashboard__row-main">
        <strong>${grupo.unidade || "—"}</strong>
        <span class="muted">${grupo.ramoMPNome || grupo.ramoMP || "—"} · Correição ${grupo.correicaoId || "—"}</span>
      </div>
      <div class="secretaria-dashboard__row-meta">
        <span><strong>${grupo.prontas}</strong>/${grupo.total} pronta(s)</span>
        <span class="muted">${grupo.percentual}% concluído</span>
        <span class="badge badge--neutral">Aterrissa em ${estadoLabel}</span>
      </div>
    </li>
  `;
};

const renderListaComOverflow = (itens, renderItem, urlVerTodos, rotuloItem) => {
  const total = itens.length;
  const visiveis = itens.slice(0, TOP_LIMIT);
  const restantes = total - visiveis.length;
  const linhas = visiveis.map(renderItem).join("");
  const link =
    restantes > 0 && urlVerTodos
      ? `<a class="secretaria-dashboard__see-all" href="${urlVerTodos}">Ver todos (${total})</a>`
      : "";
  if (total === 0) {
    return `<div class="secretaria-dashboard__list">${renderEmptyMessage(`Nenhum(a) ${rotuloItem}.`)}</div>`;
  }
  return `
    <div class="secretaria-dashboard__list">
      ${linhas}
      ${link}
    </div>
  `;
};

const renderParciais = (parciais) => {
  const total = parciais.length;
  if (total === 0) {
    return `<div class="secretaria-dashboard__list">${renderEmptyMessage("Nenhum grupo parcial em andamento.")}</div>`;
  }

  const visiveis = parciais.slice(0, TOP_LIMIT);
  const escondidos = parciais.slice(TOP_LIMIT);
  const linhasVisiveis = visiveis.map(renderGrupoParcialRow).join("");
  const linhasEscondidas = escondidos.map(renderGrupoParcialRow).join("");

  const expansor =
    escondidos.length > 0
      ? `
        <details class="secretaria-dashboard__expansor">
          <summary>Ver mais (${escondidos.length})</summary>
          <ul class="secretaria-dashboard__list secretaria-dashboard__list--inline">
            ${linhasEscondidas}
          </ul>
        </details>
      `
      : "";

  return `
    <ul class="secretaria-dashboard__list">${linhasVisiveis}</ul>
    ${expansor}
  `;
};

const buildSecretariaContent = () => {
  const grupos = listFilaAguardandoCiencia(currentState);
  const cienciaCompletos = grupos.filter((g) => g.completo);
  const diligenciaGrupos = listGruposAguardandoDiligencia(currentState);
  const diligenciaCompletos = diligenciaGrupos.filter((g) => g.completo);
  const providenciasAtrasadas = listProvidenciasAtrasadas(currentState);
  const parciais = listGruposParciaisSecretaria(currentState);

  const totalHoje =
    diligenciaCompletos.length + cienciaCompletos.length + providenciasAtrasadas.length;

  const hojeContent =
    totalHoje === 0
      ? `
        <div class="panel secretaria-dashboard__panel">
          <div class="secretaria-dashboard__empty-state">
            <p>Sem grupos prontos nem providências atrasadas no momento.</p>
            <a class="button button--ghost" href="proposicoes-lista.html">Ver fila completa</a>
          </div>
        </div>
      `
      : `
        <div class="panel secretaria-dashboard__panel">
          ${renderBlockHeader("Grupos prontos para diligência", diligenciaCompletos.length)}
          ${renderListaComOverflow(
            diligenciaCompletos,
            renderGrupoDiligenciaRow,
            "secretaria-diligencia.html?gruposCompletos=1",
            "grupo pronto para diligência",
          )}
        </div>

        <div class="panel secretaria-dashboard__panel">
          ${renderBlockHeader("Grupos prontos para ciência", cienciaCompletos.length)}
          ${renderListaComOverflow(
            cienciaCompletos,
            renderGrupoCienciaRow,
            "secretaria-ciencia.html?estado=completo&fila=1",
            "grupo pronto para ciência",
          )}
        </div>

        <div class="panel secretaria-dashboard__panel">
          ${renderBlockHeader("Providências atrasadas (>10 dias)", providenciasAtrasadas.length)}
          ${renderListaComOverflow(
            providenciasAtrasadas,
            renderProvidenciaRow,
            "secretaria-providencia.html?atrasadas=1",
            "providência atrasada",
          )}
        </div>
      `;

  return `
    <section class="stack secretaria-dashboard">
      <article class="hero-card">
        <h2>Painel da Secretaria Processual</h2>
        <p>
          Visão operacional do que está pronto para impulso da Secretaria e do que se
          aproxima de aterrissar. Use as listas para abrir o lote já pré-selecionado.
        </p>
      </article>

      <section class="stack">
        ${renderSectionHeader(
          "Hoje",
          totalHoje,
          "Grupos completos e providências atrasadas que precisam de ação imediata.",
        )}
        ${hojeContent}
      </section>

      <section class="stack">
        ${renderSectionHeader(
          "Acompanhar",
          parciais.length,
          "Grupos com proposições aguardando impulso, mas que ainda dependem de outras decisões para virarem prontos.",
        )}
        <div class="panel secretaria-dashboard__panel">
          ${renderBlockHeader("Grupos parciais", parciais.length)}
          ${renderParciais(parciais)}
        </div>
      </section>
    </section>
  `;
};

const bindSecretariaHandlers = () => {
  document.querySelectorAll('[data-action="abrir-grupo-diligencia"]').forEach((row) => {
    row.addEventListener("click", () => {
      const correicao = row.dataset.correicao || "";
      const unidade = row.dataset.unidade || "";
      const ids = (row.dataset.ids || "").split(",").filter(Boolean);
      sessionStorage.setItem(SELECAO_DILIGENCIA_KEY, JSON.stringify(ids));
      const params = new URLSearchParams();
      if (correicao) params.set("correicaoId", correicao);
      if (unidade) params.set("unidade", unidade);
      params.set("fila", "1");
      window.location.href = `secretaria-diligencia.html?${params.toString()}`;
    });
  });

  document.querySelectorAll('[data-action="abrir-grupo-ciencia"]').forEach((row) => {
    row.addEventListener("click", () => {
      const correicao = row.dataset.correicao || "";
      const key = row.dataset.key || "";
      sessionStorage.setItem(SELECAO_CIENCIA_KEY, JSON.stringify([key]));
      const params = new URLSearchParams();
      if (correicao) params.set("correicaoId", correicao);
      params.set("estado", "completo");
      params.set("fila", "1");
      window.location.href = `secretaria-ciencia.html?${params.toString()}`;
    });
  });
};

// ---------------------------------------------------------------------------
// Roteamento por persona
// ---------------------------------------------------------------------------

const isCorregedor = persona === PERSONAS.CORREGEDOR;
const isSecretaria = persona === PERSONAS.SECRETARIA;

let content;
let subtitle;

if (isCorregedor) {
  content = buildCorregedorContent();
  subtitle = "Painel analítico do Corregedor Nacional: acervo, filas e pendências por persona.";
} else if (isSecretaria) {
  content = buildSecretariaContent();
  subtitle =
    "Briefing operacional da Secretaria: ação imediata em \"Hoje\", carga futura em \"Acompanhar\".";
} else {
  content = buildDefaultContent();
  subtitle =
    "Visão geral das proposições, do núcleo decisório do Corregedor Nacional e das pendências paralelas da Secretaria Processual.";
}

mountPage({
  activePage: "dashboard",
  title: "Dashboard",
  subtitle,
  actions: baseActions,
  content,
});

if (isSecretaria) {
  bindSecretariaHandlers();
}
