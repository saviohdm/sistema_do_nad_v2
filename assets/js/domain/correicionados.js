import { StatusFluxo, TipoHistorico } from "./enums.js";
import { appendHistory, buildHistoryEvent } from "./historico.js";
import { listProposicoes } from "./proposicoes.js";

const VISIBLE_TO_CORREICIONADO = new Set([
  TipoHistorico.CRIACAO,
  TipoHistorico.EDICAO,
  TipoHistorico.REFERENDO_CNMP,
  TipoHistorico.CRIACAO_DILIGENCIA,
  TipoHistorico.COMPROVACAO,
  TipoHistorico.PRAZO_COMPROVACAO_EXPIRADO,
  TipoHistorico.DECISAO,
  TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO,
  TipoHistorico.CIENTIFICACAO,
  TipoHistorico.CUMPRIMENTO_PENDENCIA_SECRETARIA,
  TipoHistorico.EMAIL_DILIGENCIA_ENVIADO,
  TipoHistorico.EMAIL_CIENCIA_ENVIADO,
  TipoHistorico.APAGAMENTO_PROPOSICAO,
]);

export const filtrarHistoricoParaCorreicionado = (historico) =>
  (historico || []).filter((event) => VISIBLE_TO_CORREICIONADO.has(event.tipo));

export const proposicaoVisivelPara = (proposicao, user) => {
  if (!proposicao || !user) return false;
  if (proposicao.membroId && proposicao.membroId === user.id) return true;
  const chefias = user.chefiaDeUnidadeIds || [];
  return chefias.includes(proposicao.unidadeId);
};

export const listProposicoesCorreicionado = (state, user) =>
  listProposicoes(state).filter((p) => proposicaoVisivelPara(p, user));

export const listProposicoesCorreicionadoPendentes = (state, user) =>
  listProposicoesCorreicionado(state, user).filter(
    (p) => p.statusFluxo === StatusFluxo.AGUARDANDO_COMPROVACAO,
  );

const hasEmailCiencia = (proposicao) =>
  (proposicao.historico || []).some(
    (event) => event.tipo === TipoHistorico.EMAIL_CIENCIA_ENVIADO,
  );

export const listProposicoesCorreicionadoCiencias = (state, user) =>
  listProposicoesCorreicionado(state, user).filter(
    (p) => p.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA && hasEmailCiencia(p),
  );

const findVisualizacaoEvent = (proposicao, userId) =>
  (proposicao.historico || []).find(
    (event) =>
      event.tipo === TipoHistorico.VISUALIZACAO_CIENCIA_CORREICIONADO &&
      event.userIdCorreicionado === userId,
  ) || null;

export const cienciaJaVisualizadaPor = (proposicao, userId) =>
  Boolean(findVisualizacaoEvent(proposicao, userId));

export const getDataVisualizacaoCiencia = (proposicao, userId) => {
  const event = findVisualizacaoEvent(proposicao, userId);
  return event ? event.data : null;
};

export const registrarVisualizacaoCiencia = (proposicao, user) => {
  if (!proposicao || !user) return proposicao;
  if (proposicao.statusFluxo !== StatusFluxo.BAIXA_DEFINITIVA) return proposicao;
  if (cienciaJaVisualizadaPor(proposicao, user.id)) return proposicao;

  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.VISUALIZACAO_CIENCIA_CORREICIONADO, user.nome, {
      descricao: `Ciência visualizada por ${user.nome} (${user.cargo || ""}).`,
      userIdCorreicionado: user.id,
    }),
  );
  return proposicao;
};

export const getEmailCienciaEvent = (proposicao) =>
  [...(proposicao.historico || [])]
    .reverse()
    .find((event) => event.tipo === TipoHistorico.EMAIL_CIENCIA_ENVIADO) || null;

export const getEmailDiligenciaEvent = (proposicao, diligenciaId) =>
  [...(proposicao.historico || [])]
    .reverse()
    .find(
      (event) =>
        event.tipo === TipoHistorico.EMAIL_DILIGENCIA_ENVIADO &&
        (!diligenciaId || event.diligenciaId === diligenciaId),
    ) || null;

const findMembroById = (state, id) =>
  (state.diretorioCnmp?.membros || []).find((m) => m.id === id) || null;

const findChefeDaUnidade = (state, unidadeId) =>
  (state.diretorioCnmp?.membros || []).find((m) =>
    (m.chefiaDeUnidadeIds || []).includes(unidadeId),
  ) || null;

export const resolveDestinatarioCorreicionado = (state, proposicao) => {
  if (proposicao.membroId) {
    const membro = findMembroById(state, proposicao.membroId);
    if (membro) return membro;
  }
  return findChefeDaUnidade(state, proposicao.unidadeId);
};

export const listMembros = (state) => state.diretorioCnmp?.membros || [];

export const listUnidades = (state) => state.diretorioCnmp?.unidades || [];

export const findUnidadeById = (state, id) =>
  (state.diretorioCnmp?.unidades || []).find((u) => u.id === id) || null;
