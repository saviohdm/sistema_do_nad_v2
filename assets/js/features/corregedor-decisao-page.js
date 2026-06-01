import { PERSONAS } from "../app/auth.js";
import { montarFilaNavegavel } from "../ui/fila-navegavel.js";
import { listProposicoesAguardandoDecisao } from "../domain/proposicoes.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import {
  renderBadge,
  renderPrioridadeBadge,
  renderSensivelBadge,
  renderStatCard,
} from "../ui/components.js";

const temAvaliacaoVigente = (proposicao) => Boolean(proposicao.avaliacaoVigenteId);
const temRascunhoDecisao = (proposicao) => Boolean(proposicao.rascunhoDecisaoCN);

const renderCard = (proposicao) => {
  const comAvaliacao = temAvaliacaoVigente(proposicao);
  const rascunho = temRascunhoDecisao(proposicao);
  const statusBadge = rascunho
    ? renderBadge("Rascunho de decisão", "warning")
    : renderBadge(
        comAvaliacao ? "Decidir avaliação vigente" : "Avaliar diretamente",
        comAvaliacao ? "primary" : "warning",
      );
  return `
    <a href="/pages/proposicao-detalhe.html?id=${proposicao.id}&fromCorregedor=decisao" class="proposicao-card">
      <div class="proposicao-card__header">
        <div>
          <div class="proposicao-card__numero">${proposicao.numero}</div>
          <div class="proposicao-card__tipo">${proposicao.tipo} · ${proposicao.ramoMP}</div>
        </div>
        <div class="pill-list">
          ${renderSensivelBadge(proposicao.sensivel)}
          ${renderPrioridadeBadge(proposicao.prioridade)}
          ${statusBadge}
        </div>
      </div>
      <div class="proposicao-card__content">
        <div><strong>Unidade:</strong> ${proposicao.unidade}</div>
        <div><strong>Temática:</strong> ${proposicao.tematica || "—"}</div>
        <div><strong>Correição:</strong> ${proposicao.correicaoId || "—"}</div>
        <div class="proposicao-card__descricao">${(proposicao.descricao || "").substring(0, 150)}${(proposicao.descricao || "").length > 150 ? "..." : ""}</div>
      </div>
    </a>
  `;
};

montarFilaNavegavel({
  persona: PERSONAS.CORREGEDOR,
  activePage: "corregedor-decisao",
  title: "Aguardando decisão",
  storageKey: "nad-corregedor-decisao-filtros",
  subtitlePorModo: {
    overview:
      "Proposições que retornaram com avaliação do membro auxiliar ou que aguardam sua avaliação direta com força de decisão.",
    correicao: "Escolha uma unidade dentro da correição para entrar na fila de decisão.",
    fila: "Decida cada proposição. Badges indicam se há avaliação submetida (deferir/indeferir), rascunho de decisão em andamento, ou se cabe avaliação direta.",
  },
  textos: {
    panoramaTitulo: "Panorama da decisão",
    panoramaIntro:
      "Proposições que aguardam sua decisão. Quando há avaliação do membro auxiliar submetida, você pode deferir (homologa as invariantes) ou indeferir (redefine as invariantes na mesma decisão). Sem avaliação vigente, pode avaliar diretamente com força de decisão.",
    contagemLabel: "Aguardando decisão",
    porCorreicaoHint: "Clique em uma correição para ver suas unidades.",
    unidadesHint: "Clique em uma unidade para entrar na fila de decisão daquela unidade.",
    filaTitulo: "Fila de decisão",
    filaIntroVazia: "Todas as proposições aguardando sua decisão.",
    emptyCorreicoes: "Nenhuma correição com proposições aguardando decisão.",
    emptyUnidades: "Nenhuma unidade nesta correição com proposições aguardando decisão.",
    emptyFila: "Nenhuma proposição corresponde aos filtros selecionados.",
    contadorIntro: "Restam para decidir com esta seleção:",
    totalSistemaLabel: "Total aguardando decisão no sistema",
  },
  getProposicoes: (state) =>
    listProposicoesAguardandoDecisao(state).map((p) => hydrateProposicao(state, p)),
  rascunho: {
    label: "Somente com rascunho",
    detectar: (proposicao) => Boolean(proposicao.rascunhoDecisaoCN),
  },
  renderStats: (proposicoes) => {
    const comAvaliacao = proposicoes.filter(temAvaliacaoVigente).length;
    const semAvaliacao = proposicoes.length - comAvaliacao;
    return `
      ${renderStatCard("Aguardando decisão", proposicoes.length)}
      ${renderStatCard("Com avaliação submetida", comAvaliacao)}
      ${renderStatCard("Sem avaliação (decisão direta)", semAvaliacao)}
    `;
  },
  renderItens: (filtradas) => filtradas.map(renderCard).join(""),
});
