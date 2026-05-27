import { StatusFluxo, TipoHistorico } from "./enums.js";
import { appendHistory, buildHistoryEvent } from "./historico.js";
import { adicionarEmailCiencia } from "./caixa-de-saida.js";
import { resolveDestinatarioCorreicionado } from "./correicionados.js";

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

  enviarEmailsAgregados(state, afetadas, usuario);
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

export const enviarEmailsAgregados = (state, proposicoes, usuario) => {
  const buckets = new Map();
  proposicoes.forEach((proposicao) => {
    const destinatario = resolveDestinatarioCorreicionado(state, proposicao);
    const chave = destinatario?.id || `sem-destinatario:${proposicao.unidadeId}`;
    const bucket = buckets.get(chave) || { destinatario, proposicoes: [] };
    bucket.proposicoes.push(proposicao);
    buckets.set(chave, bucket);
  });

  const entries = [];
  buckets.forEach(({ destinatario, proposicoes: lote }) => {
    const entry = adicionarEmailCiencia(state, lote, destinatario, usuario);
    entries.push(entry);
  });
  return entries;
};
