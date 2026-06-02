import { PERSONAS } from "../app/auth.js";
import { montarFilaNavegavel } from "../ui/fila-navegavel.js";
import {
  groupByCorreicao,
  groupByRamoMP,
  listProposicoesParaAvaliar,
} from "../domain/proposicoes.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { StatusFilaOperacional } from "../domain/filas-operacionais.js";
import { listarIdsComRascunho } from "../domain/rascunhos-avaliacao.js";
import {
  renderBadge,
  renderPrioridadeBadge,
  renderSensivelBadge,
  renderStatCard,
} from "../ui/components.js";

const renderCard = (proposicao, temRascunho) => `
  <a href="/pages/proposicao-detalhe.html?id=${proposicao.id}&fromMembro=1" class="proposicao-card">
    <div class="proposicao-card__header">
      <div>
        <div class="proposicao-card__numero">${proposicao.numero}</div>
        <div class="proposicao-card__tipo">${proposicao.tipo} · ${proposicao.ramoMP}</div>
      </div>
      <div class="pill-list">
        ${renderSensivelBadge(proposicao.sensivel)}
        ${renderPrioridadeBadge(proposicao.prioridade)}
        ${temRascunho ? renderBadge("Rascunho salvo", "warning") : ""}
      </div>
    </div>
    <div class="proposicao-card__content">
      <div><strong>Unidade:</strong> ${proposicao.unidade}</div>
      <div><strong>Temática:</strong> ${proposicao.tematica || "—"}</div>
      <div class="proposicao-card__descricao">${(proposicao.descricao || "").substring(0, 150)}${(proposicao.descricao || "").length > 150 ? "..." : ""}</div>
    </div>
  </a>
`;

montarFilaNavegavel({
  statusFila: StatusFilaOperacional.AVALIACAO,
  persona: PERSONAS.MEMBRO,
  activePage: "membro-auxiliar",
  title: "Minha fila de avaliação",
  storageKey: "nad-membro-auxiliar-filtros",
  subtitlePorModo: {
    overview:
      "Panorama das proposições que dependem da sua avaliação. Escolha uma correição ou siga direto para a fila completa.",
    correicao:
      "Escolha uma unidade dentro da correição para entrar na fila ou use o atalho para ver todas desta correição.",
    fila: "Avalie cada proposição uma a uma. Use os filtros da direita para refinar a seleção.",
  },
  textos: {
    panoramaTitulo: "Panorama",
    contagemLabel: "Pendentes",
    porCorreicaoHint: "Clique em uma correição para avaliar as proposições daquela correição.",
    unidadesHint: "Clique em uma unidade para entrar na fila de avaliação daquela unidade.",
    filaTitulo: "Fila de avaliação",
    filaIntroVazia: "Todas as proposições pendentes de avaliação.",
    emptyCorreicoes: "Nenhuma correição com avaliações pendentes.",
    emptyUnidades: "Nenhuma unidade com avaliações pendentes nesta correição.",
    emptyFila: "Nenhuma proposição corresponde aos filtros selecionados.",
    contadorIntro: "Restam para avaliar com esta seleção:",
    totalSistemaLabel: "Total pendente no sistema",
  },
  getProposicoes: (state) =>
    listProposicoesParaAvaliar(state).map((p) => hydrateProposicao(state, p)),
  prepare: () => ({ idsComRascunho: listarIdsComRascunho() }),
  rascunho: {
    label: "Somente com rascunho",
    detectar: (proposicao, ctx) => ctx.extras.idsComRascunho.includes(proposicao.id),
  },
  renderStats: (proposicoes) => {
    const ramos = groupByRamoMP(proposicoes);
    const correicoes = groupByCorreicao(proposicoes);
    return `
      ${renderStatCard("Pendentes de avaliação", proposicoes.length)}
      ${renderStatCard("Ramos envolvidos", ramos.length)}
      ${renderStatCard("Correições envolvidas", correicoes.length)}
    `;
  },
  renderItens: (filtradas, ctx) =>
    filtradas
      .map((p) => renderCard(p, ctx.extras.idsComRascunho.includes(p.id)))
      .join(""),
});
