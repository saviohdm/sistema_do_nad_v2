export const StatusFluxo = {
  RASCUNHO_CN: "rascunho_cn",
  AGUARDANDO_SECRETARIA: "aguardando_secretaria",
  AGUARDANDO_COMPROVACAO: "aguardando_comprovacao",
  AGUARDANDO_AVALIACAO_MEMBRO: "aguardando_avaliacao_membro",
  AGUARDANDO_DECISAO_CORREGEDOR: "aguardando_decisao_corregedor",
  CONCLUIDA: "concluida",
};

export const SituacaoJuizo = {
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

export const TipoHistorico = {
  CRIACAO: "criacao",
  EDICAO: "edicao",
  APAGAMENTO_PROPOSICAO: "apagamento_proposicao",
  CRIACAO_DILIGENCIA: "criacao_diligencia",
  COMPROVACAO: "comprovacao",
  AVALIACAO_MEMBRO_AUXILIAR: "avaliacao_membro_auxiliar",
  DECISAO: "decisao",
  AVALIACAO_COM_FORCA_DE_DECISAO: "avaliacao_com_forca_de_decisao",
  AVALIACAO_REMOVIDA: "avaliacao_removida_pelo_corregedor",
  CIENTIFICACAO: "cientificacao",
  CUMPRIMENTO_PENDENCIA_SECRETARIA: "cumprimento_pendencia_secretaria",
};

export const Labels = {
  statusFluxo: {
    [StatusFluxo.RASCUNHO_CN]: "Rascunho da CN",
    [StatusFluxo.AGUARDANDO_SECRETARIA]: "Aguardando Secretaria",
    [StatusFluxo.AGUARDANDO_COMPROVACAO]: "Aguardando comprovação",
    [StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO]: "Aguardando avaliação do membro",
    [StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR]: "Aguardando decisão do Corregedor",
    [StatusFluxo.CONCLUIDA]: "Concluída",
  },
  situacaoJuizo: {
    [SituacaoJuizo.NECESSITA_MAIS_INFORMACOES]: "Necessita mais informações",
    [SituacaoJuizo.CONCLUIDA]: "Concluída",
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
};
