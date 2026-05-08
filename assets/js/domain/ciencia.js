import { StatusFluxo, TipoHistorico } from "./enums.js";
import { appendHistory, buildHistoryEvent } from "./historico.js";

const hasCientificacao = (proposicao) =>
  proposicao.historico.some((event) => event.tipo === TipoHistorico.CIENTIFICACAO);

export const cientificarProposicao = (
  proposicao,
  usuario = "Secretaria Processual da CN",
) => {
  if (hasCientificacao(proposicao)) return proposicao;

  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.CIENTIFICACAO, usuario, {
      descricao: "Correicionado cientificado da decisão conclusiva.",
    }),
  );
  proposicao.statusFluxo = StatusFluxo.BAIXA_DEFINITIVA;

  return proposicao;
};

export const cientificarGrupo = (
  state,
  correicaoId,
  unidade,
  usuario = "Secretaria Processual da CN",
) => {
  const afetadas = [];
  state.proposicoes.forEach((proposicao) => {
    if (proposicao.correicaoId !== correicaoId) return;
    if (proposicao.unidade !== unidade) return;
    if (proposicao.statusFluxo !== StatusFluxo.AGUARDANDO_CIENCIA) return;

    cientificarProposicao(proposicao, usuario);
    afetadas.push(proposicao);
  });
  return afetadas;
};

export const cientificarGruposEmLote = (
  state,
  grupos,
  usuario = "Secretaria Processual da CN",
) => {
  return grupos.map(({ correicaoId, unidade }) => ({
    correicaoId,
    unidade,
    afetadas: cientificarGrupo(state, correicaoId, unidade, usuario),
  }));
};
