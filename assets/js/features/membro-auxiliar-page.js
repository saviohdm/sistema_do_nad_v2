import { PERSONAS } from "../app/auth.js";
import { mutateState } from "../app/store.js";
import { montarFilaNavegavel } from "../ui/fila-navegavel.js";
import { getUltimaComprovacao, listProposicoesParaAvaliar } from "../domain/proposicoes.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { Prioridade } from "../domain/enums.js";
import { StatusFilaOperacional } from "../domain/filas-operacionais.js";
import {
  MINUTA_PADRAO_CUMPRIDA,
  podeSubmeterMinutaPadrao,
  salvarAvaliacaoMembro,
} from "../domain/avaliacoes.js";
import {
  renderBadge,
  renderFilaExcertoComprovacao,
  renderFilaProposicaoEditorial,
} from "../ui/components.js";
import { confirmarEExecutarSubmissaoMinutaPadrao } from "../ui/confirmacoes.js";
import { CONTEXTO_NAVEGACAO_MINUTA_KEY } from "../ui/fila-contexto-navegacao.js";

const renderAcoesCard = (proposicao) =>
  podeSubmeterMinutaPadrao(proposicao)
    ? `<button class="button" type="button" data-action="submeter-minuta" data-proposicao-id="${proposicao.id}">Submeter minuta</button>`
    : "";

const renderCard = (proposicao, temRascunho, index, view) =>
  renderFilaProposicaoEditorial(proposicao, {
    href: `/pages/proposicao-detalhe.html?id=${proposicao.id}&from=membro-auxiliar`,
    badges: temRascunho ? renderBadge("Rascunho salvo", "warning") : "",
    cta: temRascunho ? "Retomar minuta" : "Elaborar minuta",
    actions: renderAcoesCard(proposicao),
    excerto: renderFilaExcertoComprovacao(getUltimaComprovacao(proposicao), { view }),
    attributes: `data-proposicao-id="${proposicao.id}"`,
    view,
    index,
  });

const handleSubmeterMinuta = (proposicaoId, ctx) => {
  if (!proposicaoId) return;
  const alvo = ctx.state.proposicoes.find((proposicao) => proposicao.id === proposicaoId);
  if (!podeSubmeterMinutaPadrao(alvo)) {
    ctx.render();
    return;
  }

  confirmarEExecutarSubmissaoMinutaPadrao({
    numero: alvo.numero,
    confirmar: (mensagem) => window.confirm(mensagem),
    submeter: () => {
      try {
        let submetida = false;
        mutateState((draft) => {
          const proposicao = draft.proposicoes.find((item) => item.id === proposicaoId);
          if (!podeSubmeterMinutaPadrao(proposicao)) return draft;
          salvarAvaliacaoMembro(proposicao, MINUTA_PADRAO_CUMPRIDA);
          submetida = true;
          return draft;
        });
        if (!submetida) {
          window.alert(
            "A minuta não está mais disponível para submissão rápida. A fila será atualizada.",
          );
        }
        ctx.render();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Não foi possível submeter a minuta.");
      }
    },
  });
};

montarFilaNavegavel({
  statusFila: StatusFilaOperacional.AVALIACAO,
  persona: PERSONAS.MEMBRO,
  activePage: "membro-auxiliar",
  title: "Minha fila de elaboração de minutas",
  storageKey: "nad-membro-auxiliar-filtros",
  navigationContextKey: CONTEXTO_NAVEGACAO_MINUTA_KEY,
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
  bindExtra: (ctx) => {
    document.querySelectorAll("[data-action='submeter-minuta']").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        handleSubmeterMinuta(btn.dataset.proposicaoId, ctx);
      });
    });
  },
});
