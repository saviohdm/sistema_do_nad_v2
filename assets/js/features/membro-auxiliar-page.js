import { PERSONAS } from "../app/auth.js";
import { montarFilaNavegavel } from "../ui/fila-navegavel.js";
import { listProposicoesParaAvaliar } from "../domain/proposicoes.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { Prioridade } from "../domain/enums.js";
import { StatusFilaOperacional } from "../domain/filas-operacionais.js";
import { renderBadge, renderFilaProposicaoEditorial } from "../ui/components.js";

const renderCard = (proposicao, temRascunho, index) =>
  renderFilaProposicaoEditorial(proposicao, {
    href: `/pages/proposicao-detalhe.html?id=${proposicao.id}&from=membro-auxiliar`,
    badges: temRascunho ? renderBadge("Rascunho salvo", "warning") : "",
    cta: temRascunho ? "Retomar avaliação" : "Avaliar proposição",
    index,
  });

montarFilaNavegavel({
  statusFila: StatusFilaOperacional.AVALIACAO,
  persona: PERSONAS.MEMBRO,
  activePage: "membro-auxiliar",
  title: "Minha fila de avaliação",
  storageKey: "nad-membro-auxiliar-filtros",
  textos: {
    panoramaTitulo: "Panorama da avaliação",
    contagemLabel: "Pendentes",
    filaTitulo: "Fila de avaliação",
    emptyCorreicoes: "Nenhuma correição com avaliações pendentes.",
    emptyUnidades: "Nenhum destinatário com avaliações pendentes nesta correição.",
    emptyFila: "Nenhuma proposição corresponde aos filtros selecionados.",
    contadorIntro: "Restam para avaliar com esta seleção:",
    totalSistemaLabel: "Total pendente no sistema",
  },
  getProposicoes: (state) =>
    listProposicoesParaAvaliar(state).map((p) => hydrateProposicao(state, p)),
  rascunho: {
    label: "Somente com rascunho",
    detectar: (proposicao) => Boolean(proposicao.rascunhoAvaliacao),
  },
  getKpis: (proposicoes) => [
    {
      label: "Pendentes de avaliação",
      valor: proposicoes.length,
      filtros: { filaForcada: true },
    },
    {
      label: "Com rascunho a retomar",
      valor: proposicoes.filter((p) => Boolean(p.rascunhoAvaliacao)).length,
      filtros: { comRascunho: true },
      destaque: true,
      title: "Avaliações iniciadas e ainda não submetidas.",
    },
    {
      label: "Urgentes",
      valor: proposicoes.filter((p) => p.prioridade === Prioridade.URGENTE).length,
      filtros: { prioridade: Prioridade.URGENTE, filaForcada: true },
      title: "Proposições com prioridade urgente — avalie primeiro.",
    },
  ],
  renderItens: (filtradas) =>
    filtradas
      .map((p, index) => renderCard(p, Boolean(p.rascunhoAvaliacao), index))
      .join(""),
});
