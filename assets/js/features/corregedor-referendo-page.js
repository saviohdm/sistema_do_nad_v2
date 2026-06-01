import { PERSONAS } from "../app/auth.js";
import { mutateState } from "../app/store.js";
import { montarFilaNavegavel } from "../ui/fila-navegavel.js";
import {
  groupByCorreicao,
  groupByRamoMP,
  listProposicoesAguardandoReferendo,
  markPropositionDeleted,
  referendarCorreicao,
} from "../domain/proposicoes.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import {
  renderBadge,
  renderPrioridadeBadge,
  renderSensivelBadge,
  renderStatCard,
} from "../ui/components.js";
import { openRelatorioFinalModal } from "../ui/modal.js";

const renderCard = (proposicao) => `
  <article class="proposicao-card proposicao-card--com-acoes" data-proposicao-id="${proposicao.id}">
    <a href="/pages/proposicao-detalhe.html?id=${proposicao.id}&fromCorregedor=referendo" style="text-decoration: none; color: inherit;">
      <div class="proposicao-card__header">
        <div>
          <div class="proposicao-card__numero">${proposicao.numero}</div>
          <div class="proposicao-card__tipo">${proposicao.tipo} · ${proposicao.ramoMP}</div>
        </div>
        <div class="pill-list">
          ${renderSensivelBadge(proposicao.sensivel)}
          ${renderPrioridadeBadge(proposicao.prioridade)}
          ${renderBadge(proposicao.correicao?.numero || proposicao.correicaoId || "sem correição", "neutral")}
        </div>
      </div>
      <div class="proposicao-card__content">
        <div><strong>Unidade:</strong> ${proposicao.unidade}</div>
        <div><strong>Temática:</strong> ${proposicao.tematica || "—"}</div>
        <div class="proposicao-card__descricao">${(proposicao.descricao || "").substring(0, 150)}${(proposicao.descricao || "").length > 150 ? "..." : ""}</div>
      </div>
    </a>
    <div class="action-bar">
      <a class="button button--ghost" href="/pages/proposicoes-criar.html?id=${proposicao.id}&fromCorregedor=referendo">Editar</a>
      <button class="button button--ghost" type="button" data-action="apagar-proposicao" data-proposicao-id="${proposicao.id}">Apagar</button>
    </div>
  </article>
`;

const renderAcoesCorreicao = (correicaoId) => `
  <div class="button-row">
    <button class="button button--ghost" type="button" data-action="gerar-relatorio" data-correicao-id="${correicaoId || ""}">Gerar relatório final</button>
    <button class="button" type="button" data-action="referendar-correicao" data-correicao-id="${correicaoId || ""}">Marcar como referendada</button>
  </div>
`;

const handleReferendar = (correicaoId, ctx) => {
  if (!correicaoId) {
    window.alert("Correição sem identificador — não é possível referendar.");
    return;
  }
  const confirmar = window.confirm(
    `Marcar a correição ${correicaoId} como referendada pelo CNMP? Todas as proposições associadas serão encaminhadas à Secretaria Processual.`,
  );
  if (!confirmar) return;
  let afetadas = 0;
  mutateState((draft) => {
    afetadas = referendarCorreicao(draft, correicaoId);
    return draft;
  });
  window.alert(
    afetadas > 0
      ? `${afetadas} proposição(ões) encaminhada(s) à Secretaria Processual.`
      : "Nenhuma proposição aguardando referendo encontrada para esta correição.",
  );
  ctx.aplicarFiltros({});
};

const handleApagar = (proposicaoId, ctx) => {
  if (!proposicaoId) return;
  const confirmar = window.confirm(
    "Apagar esta proposição? Esta ação encerra definitivamente seu ciclo de vida e não pode ser desfeita.",
  );
  if (!confirmar) return;
  mutateState((draft) => {
    const prop = draft.proposicoes.find((p) => p.id === proposicaoId);
    if (prop) markPropositionDeleted(prop);
    return draft;
  });
  ctx.render();
};

const handleGerarRelatorio = (correicaoId, ctx) => {
  const proposicoes = listProposicoesAguardandoReferendo(ctx.state)
    .map((p) => hydrateProposicao(ctx.state, p))
    .filter((p) => p.correicaoId === correicaoId);
  openRelatorioFinalModal({
    correicaoId,
    ramoMP: proposicoes[0]?.ramoMP || "",
    proposicoes,
  });
};

montarFilaNavegavel({
  persona: PERSONAS.CORREGEDOR,
  activePage: "corregedor-referendo",
  title: "Aguardando referendo do CNMP",
  storageKey: "nad-corregedor-referendo-filtros",
  subtitlePorModo: {
    overview:
      "Proposições que ainda aguardam referendo do CNMP. Agrupe por correição, gere o relatório final e registre o referendo em bloco.",
    correicao:
      "Escolha uma unidade dentro da correição para entrar na fila de proposições aguardando referendo.",
    fila: "Revise, edite ou apague cada proposição antes do referendo. A ação de referendar sempre opera em bloco pela correição.",
  },
  textos: {
    panoramaTitulo: "Panorama do referendo",
    panoramaIntro:
      "Proposições ainda não referendadas pelo Conselho Nacional do Ministério Público (CNMP). Só após o referendo — normalmente realizado em bloco por correição — é que o ciclo de vida de cada proposição se inicia na Secretaria Processual.",
    contagemLabel: "Proposições",
    porCorreicaoHint:
      "Clique em uma correição para ver suas unidades, ou use os botões de ação para gerar o relatório final e registrar o referendo do CNMP.",
    unidadesHint: "Clique em uma unidade para entrar na fila de proposições aguardando referendo.",
    filaTitulo: "Fila de referendo",
    filaIntroVazia: "Todas as proposições aguardando referendo do CNMP.",
    emptyCorreicoes: "Nenhuma correição aguardando referendo.",
    emptyUnidades: "Nenhuma unidade nesta correição com proposições aguardando referendo.",
    emptyFila: "Nenhuma proposição corresponde aos filtros selecionados.",
    contadorIntro: "Proposições aguardando referendo nesta seleção:",
    totalSistemaLabel: "Aguardando referendo no sistema",
  },
  getProposicoes: (state) =>
    listProposicoesAguardandoReferendo(state).map((p) => hydrateProposicao(state, p)),
  renderStats: (proposicoes) => {
    const ramos = groupByRamoMP(proposicoes);
    const correicoes = groupByCorreicao(proposicoes);
    return `
      ${renderStatCard("Proposições aguardando referendo", proposicoes.length)}
      ${renderStatCard("Ramos envolvidos", ramos.length)}
      ${renderStatCard("Correições envolvidas", correicoes.length)}
    `;
  },
  renderOverviewActions: () =>
    `<a class="button button--ghost" href="/pages/proposicoes-criar.html">Criar nova proposição</a>`,
  renderCorreicaoRowAcoes: (item) => renderAcoesCorreicao(item.correicaoId),
  renderFilaHeaderActions: (ctx) =>
    ctx.filtros.correicaoId ? renderAcoesCorreicao(ctx.filtros.correicaoId) : "",
  renderItens: (filtradas) => filtradas.map(renderCard).join(""),
  bindExtra: (ctx) => {
    document.querySelectorAll("[data-action='referendar-correicao']").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        handleReferendar(btn.dataset.correicaoId, ctx);
      });
    });
    document.querySelectorAll("[data-action='gerar-relatorio']").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        handleGerarRelatorio(btn.dataset.correicaoId, ctx);
      });
    });
    document.querySelectorAll("[data-action='apagar-proposicao']").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        handleApagar(btn.dataset.proposicaoId, ctx);
      });
    });
  },
});
