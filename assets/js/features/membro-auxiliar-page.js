import { PERSONAS } from "../app/auth.js";
import { montarFilaNavegavel } from "../ui/fila-navegavel.js";
import { getUltimaComprovacao, listProposicoesParaAvaliar } from "../domain/proposicoes.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { Prioridade } from "../domain/enums.js";
import { StatusFilaOperacional } from "../domain/filas-operacionais.js";
import {
  renderBadge,
  renderFilaExcertoComprovacao,
  renderFilaProposicaoEditorial,
} from "../ui/components.js";

const renderCard = (proposicao, temRascunho, index, view) =>
  renderFilaProposicaoEditorial(proposicao, {
    href: `/pages/proposicao-detalhe.html?id=${proposicao.id}&from=membro-auxiliar`,
    badges: temRascunho ? renderBadge("Rascunho salvo", "warning") : "",
    cta: temRascunho ? "Retomar minuta" : "Elaborar minuta",
    excerto: renderFilaExcertoComprovacao(getUltimaComprovacao(proposicao), { view }),
    view,
    index,
  });

montarFilaNavegavel({
  statusFila: StatusFilaOperacional.AVALIACAO,
  persona: PERSONAS.MEMBRO,
  activePage: "membro-auxiliar",
  title: "Minha fila de elaboração de minutas",
  storageKey: "nad-membro-auxiliar-filtros",
  textos: {
    panoramaTitulo: "Panorama da elaboração de minutas",
    contagemLabel: "Pendentes",
    filaTitulo: "Fila de elaboração de minutas",
    emptyCorreicoes: "Nenhuma correição com minutas pendentes.",
    emptyUnidades: "Nenhum destinatário com minutas pendentes nesta correição.",
    emptyFila: "Nenhuma proposição corresponde aos filtros selecionados.",
    contadorIntro: "Restam para elaborar com esta seleção:",
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
      label: "Minutas a elaborar",
      valor: proposicoes.length,
      filtros: { filaForcada: true },
    },
    {
      label: "Com rascunho a retomar",
      valor: proposicoes.filter((p) => Boolean(p.rascunhoAvaliacao)).length,
      filtros: { comRascunho: true },
      destaque: true,
      title: "Minutas iniciadas e ainda não submetidas.",
    },
    {
      label: "Urgentes",
      valor: proposicoes.filter((p) => p.prioridade === Prioridade.URGENTE).length,
      filtros: { prioridade: Prioridade.URGENTE, filaForcada: true },
      title: "Proposições com prioridade urgente — elabore primeiro.",
    },
  ],
  renderItens: (filtradas, ctx) =>
    filtradas
      .map((p, index) => renderCard(p, Boolean(p.rascunhoAvaliacao), index, ctx.view))
      .join(""),
});
