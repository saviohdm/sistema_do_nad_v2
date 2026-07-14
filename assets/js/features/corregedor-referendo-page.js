import { PERSONAS } from "../app/auth.js";
import { mutateState } from "../app/store.js";
import { montarFilaNavegavel } from "../ui/fila-navegavel.js";
import {
  confirmarRascunhoCN,
  groupByCorreicao,
  listProposicoesAguardandoReferendo,
  listProposicoesRascunhoCN,
  markPropositionDeleted,
  referendarCorreicao,
} from "../domain/proposicoes.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { StatusFluxo } from "../domain/enums.js";
import { StatusFilaOperacional } from "../domain/filas-operacionais.js";
import { renderBadge, renderFilaProposicaoEditorial } from "../ui/components.js";
import { openRelatorioFinalModal } from "../ui/modal.js";

const ehRascunho = (proposicao) => proposicao.statusFluxo === StatusFluxo.RASCUNHO_CN;

const contarRascunhos = (proposicoes) => proposicoes.filter(ehRascunho).length;

const renderAcoesCard = (proposicao) => {
  const apagar = `<button class="button button--ghost" type="button" data-action="apagar-proposicao" data-proposicao-id="${proposicao.id}">Apagar</button>`;
  if (ehRascunho(proposicao)) {
    const retomar = `<a class="button button--ghost" href="/pages/proposicoes-criar.html?id=${proposicao.id}&from=corregedor-referendo">Retomar criação</a>`;
    const confirmar = `<button class="button" type="button" data-action="confirmar-rascunho" data-proposicao-id="${proposicao.id}">Confirmar e encaminhar</button>`;
    return `${retomar}${confirmar}${apagar}`;
  }
  const editar = `<a class="button button--ghost" href="/pages/proposicoes-criar.html?id=${proposicao.id}&from=corregedor-referendo">Editar</a>`;
  return `${editar}${apagar}`;
};

const renderCard = (proposicao, index) =>
  renderFilaProposicaoEditorial(proposicao, {
    href: `/pages/proposicao-detalhe.html?id=${proposicao.id}&from=corregedor-referendo`,
    badges: ehRascunho(proposicao) ? renderBadge("Rascunho salvo", "warning") : "",
    actions: renderAcoesCard(proposicao),
    attributes: `data-proposicao-id="${proposicao.id}"`,
    index,
  });

const getRascunhosDaCorreicao = (currentState, correicaoId) =>
  listProposicoesRascunhoCN(currentState).filter((p) => p.correicaoId === correicaoId);

const renderAcoesCorreicao = (correicaoId, ctx) => {
  const rascunhos = getRascunhosDaCorreicao(ctx.state, correicaoId);
  const bloqueada = rascunhos.length > 0;
  const disabled = bloqueada ? " disabled" : "";
  const title = bloqueada
    ? ` title="Confirme ou apague ${rascunhos.length} rascunho(s) antes de concluir a correição."`
    : "";
  const aviso = bloqueada
    ? `<span class="muted">${rascunhos.length} rascunho(s) bloqueiam relatório e referendo.</span>`
    : "";
  return `
    <div class="stack">
      <div class="button-row">
        <button class="button button--ghost" type="button" data-action="gerar-relatorio" data-correicao-id="${correicaoId || ""}"${disabled}${title}>Gerar relatório final</button>
        <button class="button" type="button" data-action="referendar-correicao" data-correicao-id="${correicaoId || ""}"${disabled}${title}>Marcar como referendada</button>
      </div>
      ${aviso}
    </div>
  `;
};

const handleReferendar = (correicaoId, ctx) => {
  if (!correicaoId) {
    window.alert("Correição sem identificador — não é possível referendar.");
    return;
  }
  if (getRascunhosDaCorreicao(ctx.state, correicaoId).length > 0) {
    window.alert("Confirme ou apague os rascunhos da correição antes de registrar o referendo.");
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

const handleConfirmarRascunho = (proposicaoId, ctx) => {
  if (!proposicaoId) return;
  const confirmar = window.confirm(
    "Confirmar este rascunho? Ele deixa de ser rascunho e passa a aguardar o referendo do CNMP (ou segue à Secretaria, se a correição já estiver referendada).",
  );
  if (!confirmar) return;
  mutateState((draft) => {
    const prop = draft.proposicoes.find((p) => p.id === proposicaoId);
    if (prop) confirmarRascunhoCN(draft, prop);
    return draft;
  });
  ctx.render();
};

const handleGerarRelatorio = (correicaoId, ctx) => {
  if (getRascunhosDaCorreicao(ctx.state, correicaoId).length > 0) {
    window.alert("Confirme ou apague os rascunhos da correição antes de gerar o relatório final.");
    return;
  }
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
  statusFila: StatusFilaOperacional.REFERENDO,
  persona: PERSONAS.CORREGEDOR,
  activePage: "corregedor-referendo",
  title: "Aguardando referendo do CNMP",
  storageKey: "nad-corregedor-referendo-filtros",
  textos: {
    panoramaTitulo: "Panorama do referendo",
    contagemLabel: "Proposições",
    filaTitulo: "Fila de referendo",
    emptyCorreicoes: "Nenhuma correição aguardando referendo.",
    emptyUnidades: "Nenhum destinatário nesta correição com proposições aguardando referendo.",
    emptyFila: "Nenhuma proposição corresponde aos filtros selecionados.",
    contadorIntro: "Proposições nesta seleção:",
    totalSistemaLabel: "Total nesta visão",
  },
  getProposicoes: (state) =>
    [
      ...listProposicoesAguardandoReferendo(state),
      ...listProposicoesRascunhoCN(state),
    ].map((p) => hydrateProposicao(state, p)),
  rascunho: {
    label: "Somente com rascunho",
    detectar: (proposicao) => ehRascunho(proposicao),
  },
  getKpis: (proposicoes, ctx) => {
    const aguardando = proposicoes.filter((p) => !ehRascunho(p));
    const correicoesProntas = groupByCorreicao(aguardando).filter(
      (c) => c.correicaoId && getRascunhosDaCorreicao(ctx.state, c.correicaoId).length === 0,
    ).length;
    return [
      {
        label: "Proposições aguardando referendo",
        valor: aguardando.length,
        filtros: { filaForcada: true },
      },
      {
        label: "Correições prontas para referendar",
        valor: correicoesProntas,
        destaque: true,
        title: "Correições sem rascunho pendente — referende em bloco na tabela Por correição.",
      },
      {
        label: "Rascunhos a confirmar",
        valor: contarRascunhos(ctx.proposicoes),
        filtros: { comRascunho: true },
      },
    ];
  },
  renderOverviewActions: () =>
    `<a class="button button--ghost" href="/pages/proposicoes-criar.html">Criar nova proposição</a>`,
  renderCorreicaoRowAcoes: (item, ctx) => renderAcoesCorreicao(item.correicaoId, ctx),
  renderFilaHeaderActions: (ctx) =>
    ctx.filtros.correicaoId &&
    !ctx.filtros.destinatarioRef &&
    !ctx.filtros.unidadeRef &&
    !ctx.filtros.unidade &&
    !ctx.filtros.prioridade &&
    !ctx.filtros.sensivel &&
    !ctx.filtros.comRascunho
      ? renderAcoesCorreicao(ctx.filtros.correicaoId, ctx)
      : "",
  renderItens: (filtradas) =>
    filtradas.map((proposicao, index) => renderCard(proposicao, index)).join(""),
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
    document.querySelectorAll("[data-action='confirmar-rascunho']").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        handleConfirmarRascunho(btn.dataset.proposicaoId, ctx);
      });
    });
  },
});
