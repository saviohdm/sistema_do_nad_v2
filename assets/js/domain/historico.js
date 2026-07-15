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
        [TipoHistorico.RASCUNHO_CN_CONFIRMADO]: "Rascunho de criação confirmado",
        [TipoHistorico.APAGAMENTO_PROPOSICAO]: "Apagamento da proposição",
        [TipoHistorico.REFERENDO_CNMP]: "Referendo do CNMP",
        [TipoHistorico.CONVERSAO_ENCAMINHAMENTO]:
          "Baixa definitiva — Encaminhamento convertido em providência",
        [TipoHistorico.RELATORIO_FINAL_GERADO]: "Relatório final gerado",
        [TipoHistorico.CRIACAO_DILIGENCIA]: "Criação de diligência",
        [TipoHistorico.COMPROVACAO]: "Comprovação",
        [TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR]: "Avaliação do membro auxiliar",
        [TipoHistorico.DECISAO]: "Decisão do Corregedor",
        [TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO]: "Avaliação com força de decisão",
        [TipoHistorico.AVALIACAO_REMOVIDA]: "Avaliação removida",
        [TipoHistorico.CIENTIFICACAO]: "Cientificação",
        [TipoHistorico.CUMPRIMENTO_PENDENCIA_SECRETARIA]: "Cumprimento de providência da Secretaria",
        [TipoHistorico.RASCUNHO_DECISAO_CN_SALVO]: "Rascunho de decisão salvo",
        [TipoHistorico.RASCUNHO_DECISAO_CN_DESCARTADO]: "Rascunho de decisão descartado",
        [TipoHistorico.RASCUNHO_AVALIACAO_SALVO]: "Rascunho de avaliação salvo",
        [TipoHistorico.RASCUNHO_AVALIACAO_DESCARTADO]: "Rascunho de avaliação descartado",
        [TipoHistorico.RASCUNHO_COMPROVACAO_SALVO]: "Rascunho de comprovação salvo",
        [TipoHistorico.RASCUNHO_COMPROVACAO_DESCARTADO]: "Rascunho de comprovação descartado",
        [TipoHistorico.PRAZO_COMPROVACAO_EXPIRADO]: "Prazo de comprovação expirado",
        [TipoHistorico.EMAIL_DILIGENCIA_ENVIADO]: "E-mail de diligência enviado",
        [TipoHistorico.EMAIL_CIENCIA_ENVIADO]: "E-mail de ciência enviado",
        [TipoHistorico.VISUALIZACAO_CIENCIA_CORREICIONADO]: "Ciência visualizada pelo correicionado",
      }[event.tipo] || event.tipo,
    subtitle: `${event.usuario} · ${formatDateTime(event.data)}`,
    body: partes.join(" · ") || "Sem observações adicionais.",
  };
};

export const CategoriaHistorico = {
  FLUXO: "fluxo",
  COMUNICACAO: "comunicacao",
  PROVIDENCIA: "providencia",
  RASCUNHO: "rascunho",
};

export const LabelsCategoriaHistorico = {
  [CategoriaHistorico.FLUXO]: "Fluxo principal",
  [CategoriaHistorico.COMUNICACAO]: "Comunicações",
  [CategoriaHistorico.PROVIDENCIA]: "Providências",
  [CategoriaHistorico.RASCUNHO]: "Rascunhos",
};

const CATEGORIA_POR_TIPO = {
  [TipoHistorico.CRIACAO]: CategoriaHistorico.FLUXO,
  [TipoHistorico.EDICAO]: CategoriaHistorico.FLUXO,
  [TipoHistorico.EDICAO_METADADOS]: CategoriaHistorico.FLUXO,
  [TipoHistorico.RASCUNHO_CN_CONFIRMADO]: CategoriaHistorico.FLUXO,
  [TipoHistorico.APAGAMENTO_PROPOSICAO]: CategoriaHistorico.FLUXO,
  [TipoHistorico.REFERENDO_CNMP]: CategoriaHistorico.FLUXO,
  [TipoHistorico.CONVERSAO_ENCAMINHAMENTO]: CategoriaHistorico.FLUXO,
  [TipoHistorico.RELATORIO_FINAL_GERADO]: CategoriaHistorico.FLUXO,
  [TipoHistorico.CRIACAO_DILIGENCIA]: CategoriaHistorico.FLUXO,
  [TipoHistorico.COMPROVACAO]: CategoriaHistorico.FLUXO,
  [TipoHistorico.PRAZO_COMPROVACAO_EXPIRADO]: CategoriaHistorico.FLUXO,
  [TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR]: CategoriaHistorico.FLUXO,
  [TipoHistorico.DECISAO]: CategoriaHistorico.FLUXO,
  [TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO]: CategoriaHistorico.FLUXO,
  [TipoHistorico.AVALIACAO_REMOVIDA]: CategoriaHistorico.FLUXO,
  [TipoHistorico.CIENTIFICACAO]: CategoriaHistorico.COMUNICACAO,
  [TipoHistorico.EMAIL_DILIGENCIA_ENVIADO]: CategoriaHistorico.COMUNICACAO,
  [TipoHistorico.EMAIL_CIENCIA_ENVIADO]: CategoriaHistorico.COMUNICACAO,
  [TipoHistorico.VISUALIZACAO_CIENCIA_CORREICIONADO]: CategoriaHistorico.COMUNICACAO,
  [TipoHistorico.CUMPRIMENTO_PENDENCIA_SECRETARIA]: CategoriaHistorico.PROVIDENCIA,
  [TipoHistorico.RASCUNHO_DECISAO_CN_SALVO]: CategoriaHistorico.RASCUNHO,
  [TipoHistorico.RASCUNHO_DECISAO_CN_DESCARTADO]: CategoriaHistorico.RASCUNHO,
  [TipoHistorico.RASCUNHO_AVALIACAO_SALVO]: CategoriaHistorico.RASCUNHO,
  [TipoHistorico.RASCUNHO_AVALIACAO_DESCARTADO]: CategoriaHistorico.RASCUNHO,
  [TipoHistorico.RASCUNHO_COMPROVACAO_SALVO]: CategoriaHistorico.RASCUNHO,
  [TipoHistorico.RASCUNHO_COMPROVACAO_DESCARTADO]: CategoriaHistorico.RASCUNHO,
};

const TIPOS_DECISORIOS = new Set([
  TipoHistorico.DECISAO,
  TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO,
]);

export const categorizarEventoHistorico = (event) => ({
  categoria: CATEGORIA_POR_TIPO[event.tipo] || CategoriaHistorico.FLUXO,
  decisorio: TIPOS_DECISORIOS.has(event.tipo),
});

/**
 * Particiona o histórico em blocos narrativos: "origem" (eventos anteriores à
 * primeira diligência) e um "ciclo" por diligência aberta (do evento de criação
 * da diligência até a véspera da próxima). Blocos retornam em ordem ascendente;
 * cada ciclo carrega o número sequencial e a diligência que o abriu.
 */
export const agruparHistoricoPorCiclos = (historico) => {
  const ordenado = [...(historico || [])].sort((a, b) => new Date(a.data) - new Date(b.data));
  const blocos = [{ tipo: "origem", numero: 0, abertoEm: null, diligenciaId: null, eventos: [] }];

  ordenado.forEach((event) => {
    if (event.tipo === TipoHistorico.CRIACAO_DILIGENCIA) {
      blocos.push({
        tipo: "ciclo",
        numero: blocos.filter((b) => b.tipo === "ciclo").length + 1,
        abertoEm: event.data,
        diligenciaId: event.diligenciaId || null,
        eventos: [event],
      });
      return;
    }
    blocos[blocos.length - 1].eventos.push(event);
  });

  return blocos.filter((bloco) => bloco.eventos.length > 0);
};
