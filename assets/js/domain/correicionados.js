import { StatusFluxo, TipoDestinatario, TipoHistorico } from "./enums.js";
import { appendHistory, buildHistoryEvent } from "./historico.js";
import { listProposicoes } from "./proposicoes.js";
import {
  getDestinatario,
  resolverUsuariosDestinatarios,
  resolverUsuarioDestinatario,
} from "./destinatario.js";

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
  (historico || [])
    .filter((event) => VISIBLE_TO_CORREICIONADO.has(event.tipo))
    .map((event) => {
      if (
        event.tipo !== TipoHistorico.DECISAO &&
        event.tipo !== TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO
      ) {
        return event;
      }
      const { modo: _modoInterno, ...decisaoPublica } = event;
      return {
        ...decisaoPublica,
        descricao: "Decisão proferida pelo Corregedor Nacional.",
      };
    });

// Quem já foi recebedor concreto de alguma comunicação (diligência/ciência) desta
// proposição — mantém acesso ao que atuou (parte "histórica" da visibilidade híbrida).
export const usuarioFoiNotificado = (state, proposicao, userId) => {
  if (!userId || !proposicao) return false;
  const naCaixa = (state?.caixaDeSaida || []).some(
    (e) =>
      e.usuarioNotificadoId === userId &&
      (e.proposicaoIds || []).includes(proposicao.id),
  );
  if (naCaixa) return true;
  return (proposicao.historico || []).some(
    (ev) =>
      ev.usuarioNotificadoId === userId &&
      (ev.tipo === TipoHistorico.EMAIL_DILIGENCIA_ENVIADO ||
        ev.tipo === TipoHistorico.EMAIL_CIENCIA_ENVIADO),
  );
};

// Visibilidade híbrida (substitui o Modelo C): audiência da orientação resolvida
// AO VIVO (membro -> o membro; unidade -> responsável atual; adm superior -> todos
// os mapeados) MAIS quem já foi recebedor concreto. Para orientação-unidade, também
// vale qualquer chefe atual da unidade (cobre múltiplas chefias no cadastro).
export const proposicaoVisivelPara = (state, proposicao, user) => {
  if (!proposicao || !user) return false;
  const { sugeridos } = resolverUsuariosDestinatarios(state, proposicao);
  if (sugeridos.some((m) => m.id === user.id)) return true;
  const dest = getDestinatario(proposicao);
  if (dest.tipo === TipoDestinatario.UNIDADE) {
    const chefias = user.chefiaDeUnidadeIds || [];
    if (dest.unidadeId && chefias.includes(dest.unidadeId)) return true;
  }
  return usuarioFoiNotificado(state, proposicao, user.id);
};

export const listProposicoesCorreicionado = (state, user) =>
  listProposicoes(state).filter((p) => proposicaoVisivelPara(state, p, user));

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

// Compat: resolve UM destinatário concreto (primeiro sugerido pela orientação
// atual). Novos fluxos com múltiplos recebedores (adm superior) devem usar
// resolverUsuariosDestinatarios de destinatario.js.
export const resolveDestinatarioCorreicionado = (state, proposicao) =>
  resolverUsuarioDestinatario(state, proposicao);

export const listMembros = (state) => state.diretorioCnmp?.membros || [];

export const listUnidades = (state) => state.diretorioCnmp?.unidades || [];

export const findUnidadeById = (state, id) =>
  (state.diretorioCnmp?.unidades || []).find((u) => u.id === id) || null;
