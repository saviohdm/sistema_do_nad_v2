import { StatusFluxo, TipoHistorico } from "./enums.js";
import { appendHistory, buildHistoryEvent } from "./historico.js";
import { adicionarEmailCiencia } from "./caixa-de-saida.js";
import { resolverUsuariosDestinatarios } from "./destinatario.js";
import { getDestinatarioRef, isFluxoPrincipalAberto } from "./filas-operacionais.js";

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
  destinatarioRef,
  usuario = "Secretaria Processual da CN",
) => {
  const grupoAberto = state.proposicoes.filter(
    (proposicao) =>
      proposicao.correicaoId === correicaoId &&
      getDestinatarioRef(proposicao) === destinatarioRef &&
      isFluxoPrincipalAberto(proposicao),
  );
  if (
    grupoAberto.length === 0 ||
    grupoAberto.some((proposicao) => proposicao.statusFluxo !== StatusFluxo.AGUARDANDO_CIENCIA)
  ) {
    throw new Error("Ciência só pode ser registrada quando todas as proposições abertas do destinatário estão prontas.");
  }

  const afetadas = [];
  state.proposicoes.forEach((proposicao) => {
    if (proposicao.correicaoId !== correicaoId) return;
    if (getDestinatarioRef(proposicao) !== destinatarioRef) return;
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
  return grupos.map(({ correicaoId, destinatarioRef }) => ({
    correicaoId,
    destinatarioRef,
    afetadas: cientificarGrupo(state, correicaoId, destinatarioRef, usuario),
  }));
};

export const enviarEmailsAgregados = (state, proposicoes, usuario) => {
  const buckets = new Map();
  proposicoes.forEach((proposicao) => {
    const { sugeridos } = resolverUsuariosDestinatarios(state, proposicao);
    // Administração superior pode mapear vários usuários -> uma comunicação por
    // usuário. Unidade vaga (sugeridos vazio) -> bucket placeholder por proposição.
    const destinatarios = sugeridos.length > 0 ? sugeridos : [null];
    destinatarios.forEach((destinatario) => {
      const chave = destinatario?.id || `sem-destinatario:${proposicao.id}`;
      const bucket = buckets.get(chave) || { destinatario, proposicoes: [] };
      bucket.proposicoes.push(proposicao);
      buckets.set(chave, bucket);
    });
  });

  const entries = [];
  buckets.forEach(({ destinatario, proposicoes: lote }) => {
    entries.push(adicionarEmailCiencia(state, lote, destinatario, usuario));
  });
  return entries;
};
