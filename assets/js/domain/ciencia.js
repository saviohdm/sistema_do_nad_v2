import { StatusFluxo, TipoHistorico } from "./enums.js";
import { appendHistory, buildHistoryEvent } from "./historico.js";
import { adicionarEmailCiencia } from "./caixa-de-saida.js";
import { resolveDestinatarioCorreicionado } from "./correicionados.js";
import { getUnidadeRef, isFluxoPrincipalAberto } from "./filas-operacionais.js";

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
  unidadeRef,
  usuario = "Secretaria Processual da CN",
) => {
  const grupoAberto = state.proposicoes.filter(
    (proposicao) =>
      proposicao.correicaoId === correicaoId &&
      getUnidadeRef(proposicao) === unidadeRef &&
      isFluxoPrincipalAberto(proposicao),
  );
  if (
    grupoAberto.length === 0 ||
    grupoAberto.some((proposicao) => proposicao.statusFluxo !== StatusFluxo.AGUARDANDO_CIENCIA)
  ) {
    throw new Error("Ciência só pode ser registrada quando todas as proposições abertas da unidade estão prontas.");
  }

  const afetadas = [];
  state.proposicoes.forEach((proposicao) => {
    if (proposicao.correicaoId !== correicaoId) return;
    if (getUnidadeRef(proposicao) !== unidadeRef) return;
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
  return grupos.map(({ correicaoId, unidadeRef }) => ({
    correicaoId,
    unidadeRef,
    afetadas: cientificarGrupo(state, correicaoId, unidadeRef, usuario),
  }));
};

export const enviarEmailsAgregados = (state, proposicoes, usuario) => {
  const buckets = new Map();
  proposicoes.forEach((proposicao) => {
    const destinatario = resolveDestinatarioCorreicionado(state, proposicao);
    const chave = destinatario?.id || `sem-destinatario:${proposicao.unidadeId || proposicao.unidade}`;
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
