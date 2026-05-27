import { Labels, TipoHistorico } from "./enums.js";
import { formatDateTime, uid } from "../app/utils.js";

export const buildHistoryEvent = (tipo, usuario, extras = {}) => ({
  id: uid("hist"),
  tipo,
  data: new Date().toISOString(),
  usuario,
  ...extras,
});

export const appendHistory = (proposicao, event) => {
  proposicao.historico.push(event);
  proposicao.historico.sort((a, b) => new Date(a.data) - new Date(b.data));
  return proposicao;
};

export const removeHistoryEvent = (proposicao, eventId) => {
  proposicao.historico = proposicao.historico.filter((event) => event.id !== eventId);
  return proposicao;
};

export const summarizeHistoryEvent = (event) => {
  const apreciacao = event.apreciacao;
  const partes = [];

  if (event.descricao) partes.push(event.descricao);
  if (apreciacao?.situacao) partes.push(Labels.situacaoApreciacao[apreciacao.situacao]);
  if (apreciacao?.tipoConclusao) partes.push(Labels.tipoConclusao[apreciacao.tipoConclusao]);

  return {
    title:
      {
        [TipoHistorico.CRIACAO]: "Criação",
        [TipoHistorico.EDICAO]: "Edição",
        [TipoHistorico.EDICAO_METADADOS]: "Edição de metadados",
        [TipoHistorico.APAGAMENTO_PROPOSICAO]: "Apagamento da proposição",
        [TipoHistorico.CRIACAO_DILIGENCIA]: "Criação de diligência",
        [TipoHistorico.COMPROVACAO]: "Comprovação",
        [TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR]: "Avaliação do membro auxiliar",
        [TipoHistorico.DECISAO]: "Decisão do Corregedor",
        [TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO]: "Avaliação com força de decisão",
        [TipoHistorico.AVALIACAO_REMOVIDA]: "Avaliação removida",
        [TipoHistorico.CIENTIFICACAO]: "Cientificação",
        [TipoHistorico.CUMPRIMENTO_PENDENCIA_SECRETARIA]: "Cumprimento de providência da Secretaria",
        [TipoHistorico.RASCUNHO_COMPROVACAO_SALVO]: "Rascunho de comprovação salvo",
        [TipoHistorico.PRAZO_COMPROVACAO_EXPIRADO]: "Prazo de comprovação expirado",
        [TipoHistorico.EMAIL_DILIGENCIA_ENVIADO]: "E-mail de diligência enviado",
        [TipoHistorico.EMAIL_CIENCIA_ENVIADO]: "E-mail de ciência enviado",
        [TipoHistorico.VISUALIZACAO_CIENCIA_CORREICIONADO]: "Ciência visualizada pelo correicionado",
      }[event.tipo] || event.tipo,
    subtitle: `${event.usuario} · ${formatDateTime(event.data)}`,
    body: partes.join(" · ") || "Sem observações adicionais.",
  };
};
