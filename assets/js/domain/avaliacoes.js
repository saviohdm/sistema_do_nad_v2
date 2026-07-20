import {
  Labels,
  SituacaoApreciacao,
  StatusFluxo,
  TipoConclusao,
  TipoHistorico,
  TipoProvidencia,
} from "./enums.js";
import { appendHistory, buildHistoryEvent, removeHistoryEvent } from "./historico.js";
import { criarPendenciaSecretaria } from "./pendencias-secretaria.js";

const cloneJuizo = (juizo) => JSON.parse(JSON.stringify(juizo));

const TIPOS_CONCLUSAO_VALIDOS = new Set(Object.values(TipoConclusao));
const TIPOS_PROVIDENCIA_VALIDOS = new Set(Object.values(TipoProvidencia));

const validarApreciacaoDefinitiva = (juizo) => {
  if (!juizo || !Object.values(SituacaoApreciacao).includes(juizo.situacao)) {
    throw new Error("Defina uma situação válida para o ato.");
  }
  if (!juizo.observacoes?.trim()) {
    throw new Error("A redação ou fundamentação é obrigatória no ato definitivo.");
  }

  if (juizo.situacao === SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES) {
    if (
      juizo.tipoConclusao ||
      juizo.existeProvidenciaSecretaria ||
      juizo.tipoProvidencia ||
      juizo.descricaoProvidencia
    ) {
      throw new Error("O ato que necessita mais informações não admite conclusão ou providência.");
    }
    return;
  }

  if (!TIPOS_CONCLUSAO_VALIDOS.has(juizo.tipoConclusao)) {
    throw new Error("Selecione um tipo de conclusão válido.");
  }
  if (!juizo.existeProvidenciaSecretaria) {
    if (juizo.tipoProvidencia || juizo.descricaoProvidencia) {
      throw new Error("Providência só pode ser informada quando sua existência estiver marcada.");
    }
    return;
  }
  if (!TIPOS_PROVIDENCIA_VALIDOS.has(juizo.tipoProvidencia)) {
    throw new Error("Selecione um tipo de providência válido.");
  }
  if (
    juizo.tipoProvidencia === TipoProvidencia.OUTRA &&
    !juizo.descricaoProvidencia?.trim()
  ) {
    throw new Error("Descreva a outra providência.");
  }
};

const finalizarOuRetornar = (proposicao, eventType, usuario, juizo, descricao, modo = null) => {
  validarApreciacaoDefinitiva(juizo);
  const event = buildHistoryEvent(eventType, usuario, {
    descricao,
    modo,
    apreciacao: cloneJuizo(juizo),
  });

  appendHistory(proposicao, event);
  proposicao.rascunhoDecisaoCN = null;
  proposicao.rascunhoAvaliacao = null;
  proposicao.apreciacaoDoCN = cloneJuizo(juizo);
  proposicao.avaliacaoVigenteId = eventType === TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR ? event.id : null;

  if (juizo.situacao === SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES) {
    proposicao.statusFluxo = StatusFluxo.AGUARDANDO_SECRETARIA;
    return proposicao;
  }

  proposicao.statusFluxo = StatusFluxo.AGUARDANDO_CIENCIA;

  if (juizo.existeProvidenciaSecretaria && juizo.tipoProvidencia) {
    const descricaoProvidencia =
      juizo.tipoProvidencia === TipoProvidencia.OUTRA
        ? juizo.descricaoProvidencia?.trim() || Labels.tipoProvidencia[TipoProvidencia.OUTRA]
        : Labels.tipoProvidencia[juizo.tipoProvidencia] || "Outra providência";
    criarPendenciaSecretaria(proposicao, {
      tipoProvidencia: juizo.tipoProvidencia,
      descricao: descricaoProvidencia,
    });
  }

  return proposicao;
};

export const salvarAvaliacaoMembro = (
  proposicao,
  juizo,
  usuario = "Membro Auxiliar da CN",
) => {
  validarApreciacaoDefinitiva(juizo);
  const event = buildHistoryEvent(TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR, usuario, {
    descricao: "Minuta de decisão submetida ao Corregedor Nacional.",
    apreciacao: cloneJuizo(juizo),
  });

  appendHistory(proposicao, event);
  proposicao.avaliacaoVigenteId = event.id;
  proposicao.rascunhoAvaliacao = null;
  proposicao.statusFluxo = StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR;
  return proposicao;
};

export const salvarRascunhoAvaliacao = (
  proposicao,
  apreciacao,
  usuario = "Membro Auxiliar da CN",
) => {
  if (
    proposicao.statusFluxo !== StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO &&
    proposicao.statusFluxo !== StatusFluxo.AGUARDANDO_COMPROVACAO
  ) {
    throw new Error("Rascunho de minuta só pode ser salvo enquanto a proposição aguarda elaboração de minuta.");
  }
  const entrando = !proposicao.rascunhoAvaliacao;
  proposicao.rascunhoAvaliacao = {
    apreciacao: cloneJuizo(apreciacao),
    salvoEm: new Date().toISOString(),
    salvoPor: usuario,
    salvoPorId: null,
  };
  if (entrando) {
    appendHistory(
      proposicao,
      buildHistoryEvent(TipoHistorico.RASCUNHO_AVALIACAO_SALVO, usuario, {
        descricao: "Rascunho de minuta iniciado pelo membro auxiliar.",
      }),
    );
  }
  return proposicao;
};

export const descartarRascunhoAvaliacao = (proposicao, usuario = "Membro Auxiliar da CN") => {
  if (!proposicao.rascunhoAvaliacao) {
    throw new Error("Não há rascunho de minuta ativo para descartar.");
  }
  proposicao.rascunhoAvaliacao = null;
  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.RASCUNHO_AVALIACAO_DESCARTADO, usuario, {
      descricao: "Rascunho de minuta descartado pelo membro auxiliar.",
    }),
  );
  return proposicao;
};

export const deferirAvaliacao = (proposicao, usuario = "Corregedor Nacional") => {
  const avaliacao = proposicao.historico.find((event) => event.id === proposicao.avaliacaoVigenteId);
  if (!avaliacao?.apreciacao) return proposicao;

  return finalizarOuRetornar(
    proposicao,
    TipoHistorico.DECISAO,
    usuario,
    avaliacao.apreciacao,
    "Decisão do Corregedor Nacional por acolhimento integral da minuta.",
    "deferimento",
  );
};

// Lote de deferimentos por correição: cada acolhimento é um ato individual
// (evento `decisao` próprio, modo deferimento). Ficam fora as proposições sem
// minuta vigente e as com rascunho de decisão do CN, para não descartar
// trabalho em andamento do Corregedor.
export const acolherMinutasDaCorreicao = (state, correicaoId, usuario = "Corregedor Nacional") => {
  const resultado = { acolhidas: 0, semMinuta: 0, comRascunho: 0 };
  if (!correicaoId) return resultado;
  state.proposicoes.forEach((proposicao) => {
    if (
      proposicao.correicaoId !== correicaoId ||
      proposicao.statusFluxo !== StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR
    ) {
      return;
    }
    if (!proposicao.avaliacaoVigenteId) {
      resultado.semMinuta += 1;
      return;
    }
    if (proposicao.rascunhoDecisaoCN) {
      resultado.comRascunho += 1;
      return;
    }
    deferirAvaliacao(proposicao, usuario);
    resultado.acolhidas += 1;
  });
  return resultado;
};

export const indeferirAvaliacao = (proposicao, juizo, usuario = "Corregedor Nacional") =>
  finalizarOuRetornar(
    proposicao,
    TipoHistorico.DECISAO,
    usuario,
    juizo,
    "Decisão do Corregedor Nacional com afastamento da minuta e redefinição integral das invariantes.",
    "indeferimento",
  );

export const removerAvaliacao = (proposicao, usuario = "Corregedor Nacional") => {
  if (!proposicao.avaliacaoVigenteId) return proposicao;

  const avaliacaoId = proposicao.avaliacaoVigenteId;
  removeHistoryEvent(proposicao, avaliacaoId);
  proposicao.avaliacaoVigenteId = null;
  proposicao.rascunhoDecisaoCN = null;
  proposicao.rascunhoAvaliacao = null;
  proposicao.statusFluxo = StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO;

  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.AVALIACAO_REMOVIDA, usuario, {
      descricao: "Minuta devolvida pelo Corregedor Nacional.",
      avaliacaoRemovidaId: avaliacaoId,
    }),
  );

  return proposicao;
};

export const registrarAvaliacaoComForcaDeDecisao = (
  proposicao,
  juizo,
  usuario = "Corregedor Nacional",
) =>
  finalizarOuRetornar(
    proposicao,
    TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO,
    usuario,
    juizo,
    "Decisão direta proferida pelo Corregedor Nacional.",
  );
