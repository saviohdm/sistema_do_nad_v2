export const StatusFluxo = {
  AGUARDANDO_REFERENDO_CNMP: "aguardando_referendo_cnmp",
  RASCUNHO_CN: "rascunho_cn",
  AGUARDANDO_SECRETARIA: "aguardando_secretaria",
  AGUARDANDO_COMPROVACAO: "aguardando_comprovacao",
  AGUARDANDO_AVALIACAO_MEMBRO: "aguardando_avaliacao_membro",
  AGUARDANDO_DECISAO_CORREGEDOR: "aguardando_decisao_corregedor",
  AGUARDANDO_CIENCIA: "aguardando_ciencia",
  BAIXA_DEFINITIVA: "baixa_definitiva",
};

export const StatusCorreicao = {
  ATIVO: "ativo",
  REFERENDADA: "referendada",
  ENCERRADA: "encerrada",
};

export const TipoDestinatario = {
  MEMBRO: "membro",
  UNIDADE: "unidade",
  ADMINISTRACAO_SUPERIOR: "administracao_superior",
};

export const TipoAdmSuperior = {
  PGJ: "PGJ",
  CGJ: "CGJ",
};

export const SituacaoApreciacao = {
  NECESSITA_MAIS_INFORMACOES: "necessita_mais_informacoes",
  CONCLUIDA: "concluida",
};

export const TipoConclusao = {
  CUMPRIDA: "cumprida",
  PARCIALMENTE_CUMPRIDA: "parcialmente_cumprida",
  NAO_CUMPRIDA: "nao_cumprida",
  PREJUDICADA: "prejudicada",
  ENCERRADA: "encerrada_sem_analise_de_merito",
};

export const TipoProvidencia = {
  CORREGEDORIA_LOCAL: "encaminhamento_corregedoria_local",
  COCI: "encaminhamento_coci",
  OUTRA: "outra_providencia",
};

export const Prioridade = {
  URGENTE: "urgente",
  IMPORTANTE: "importante",
  NORMAL: "normal",
};

export const TipoHistorico = {
  CRIACAO: "criacao",
  EDICAO: "edicao",
  EDICAO_METADADOS: "edicao_metadados",
  RASCUNHO_CN_CONFIRMADO: "rascunho_cn_confirmado",
  APAGAMENTO_PROPOSICAO: "apagamento_proposicao",
  REFERENDO_CNMP: "referendo_cnmp",
  RELATORIO_FINAL_GERADO: "relatorio_final_gerado",
  CRIACAO_DILIGENCIA: "criacao_diligencia",
  COMPROVACAO: "comprovacao",
  AVALIACAO_MEMBRO_AUXILIAR: "avaliacao_membro_auxiliar",
  DECISAO: "decisao",
  AVALIACAO_COM_FORCA_DE_DECISAO: "avaliacao_com_forca_de_decisao",
  AVALIACAO_REMOVIDA: "avaliacao_removida_pelo_corregedor",
  CIENTIFICACAO: "cientificacao",
  CUMPRIMENTO_PENDENCIA_SECRETARIA: "cumprimento_pendencia_secretaria",
  RASCUNHO_DECISAO_CN_SALVO: "rascunho_decisao_cn_salvo",
  RASCUNHO_DECISAO_CN_DESCARTADO: "rascunho_decisao_cn_descartado",
  RASCUNHO_AVALIACAO_SALVO: "rascunho_avaliacao_salvo",
  RASCUNHO_AVALIACAO_DESCARTADO: "rascunho_avaliacao_descartado",
  RASCUNHO_COMPROVACAO_SALVO: "rascunho_comprovacao_salvo",
  RASCUNHO_COMPROVACAO_DESCARTADO: "rascunho_comprovacao_descartado",
  PRAZO_COMPROVACAO_EXPIRADO: "prazo_comprovacao_expirado",
  EMAIL_DILIGENCIA_ENVIADO: "email_diligencia_enviado",
  EMAIL_CIENCIA_ENVIADO: "email_ciencia_enviado",
  VISUALIZACAO_CIENCIA_CORREICIONADO: "visualizacao_ciencia_correicionado",
};

export const StatusDiligencia = {
  ABERTA: "aberta",
  COMPROVADA: "comprovada",
  EXPIRADA: "expirada",
};

export const TipoCaixaSaida = {
  DILIGENCIA: "diligencia",
  CIENCIA: "ciencia",
};

export const Labels = {
  statusFluxo: {
    [StatusFluxo.AGUARDANDO_REFERENDO_CNMP]: "Aguardando referendo do CNMP",
    [StatusFluxo.RASCUNHO_CN]: "Rascunho da CN",
    [StatusFluxo.AGUARDANDO_SECRETARIA]: "Aguardando Secretaria",
    [StatusFluxo.AGUARDANDO_COMPROVACAO]: "Aguardando comprovação",
    [StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO]: "Aguardando avaliação do membro",
    [StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR]: "Aguardando decisão do Corregedor",
    [StatusFluxo.AGUARDANDO_CIENCIA]: "Aguardando ciência",
    [StatusFluxo.BAIXA_DEFINITIVA]: "Baixa definitiva",
  },
  situacaoApreciacao: {
    [SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES]: "Necessita mais informações",
    [SituacaoApreciacao.CONCLUIDA]: "Concluída",
  },
  tipoConclusao: {
    [TipoConclusao.CUMPRIDA]: "Cumprida",
    [TipoConclusao.PARCIALMENTE_CUMPRIDA]: "Parcialmente cumprida",
    [TipoConclusao.NAO_CUMPRIDA]: "Não cumprida",
    [TipoConclusao.PREJUDICADA]: "Prejudicada - perda de objeto",
    [TipoConclusao.ENCERRADA]: "Encerrada - sem análise de mérito",
  },
  tipoProvidencia: {
    [TipoProvidencia.CORREGEDORIA_LOCAL]: "Encaminhamento à Corregedoria local",
    [TipoProvidencia.COCI]: "Encaminhamento à COCI",
    [TipoProvidencia.OUTRA]: "Outra providência",
  },
  prioridade: {
    [Prioridade.URGENTE]: "Urgente",
    [Prioridade.IMPORTANTE]: "Importante",
    [Prioridade.NORMAL]: "Normal",
  },
  tipoDestinatario: {
    [TipoDestinatario.MEMBRO]: "Membro",
    [TipoDestinatario.UNIDADE]: "Unidade",
    [TipoDestinatario.ADMINISTRACAO_SUPERIOR]: "Administração Superior",
  },
  tipoAdmSuperior: {
    [TipoAdmSuperior.PGJ]: "Procuradoria-Geral de Justiça",
    [TipoAdmSuperior.CGJ]: "Corregedoria-Geral de Justiça",
  },
  sensivel: {
    true: "Sim",
    false: "Não",
  },
  statusCorreicao: {
    [StatusCorreicao.ATIVO]: "Ativa",
    [StatusCorreicao.REFERENDADA]: "Referendada",
    [StatusCorreicao.ENCERRADA]: "Encerrada",
  },
};

export const getPrioridadeBadgeTone = (prioridade) =>
  ({
    [Prioridade.URGENTE]: "danger",
    [Prioridade.IMPORTANTE]: "warning",
    [Prioridade.NORMAL]: "neutral",
  }[prioridade] || "neutral");

export const getStatusCorreicaoBadgeTone = (status) =>
  ({
    [StatusCorreicao.ATIVO]: "warning",
    [StatusCorreicao.REFERENDADA]: "primary",
    [StatusCorreicao.ENCERRADA]: "success",
  }[status] || "neutral");
