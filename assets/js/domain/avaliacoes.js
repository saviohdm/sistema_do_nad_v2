import {
  Labels,
  SituacaoApreciacao,
  StatusFluxo,
  TipoHistorico,
  TipoProvidencia,
} from "./enums.js";
import { appendHistory, buildHistoryEvent, removeHistoryEvent } from "./historico.js";
import { criarPendenciaSecretaria } from "./pendencias-secretaria.js";

const cloneJuizo = (juizo) => JSON.parse(JSON.stringify(juizo));

const finalizarOuRetornar = (proposicao, eventType, usuario, juizo, descricao, modo = null) => {
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
  const event = buildHistoryEvent(TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR, usuario, {
    descricao: "Avaliação do membro auxiliar submetida ao Corregedor Nacional.",
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
    throw new Error("Rascunho de avaliação só pode ser salvo enquanto a proposição aguarda avaliação.");
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
        descricao: "Rascunho de avaliação iniciado pelo membro auxiliar.",
      }),
    );
  }
  return proposicao;
};

export const descartarRascunhoAvaliacao = (proposicao, usuario = "Membro Auxiliar da CN") => {
  if (!proposicao.rascunhoAvaliacao) {
    throw new Error("Não há rascunho de avaliação ativo para descartar.");
  }
  proposicao.rascunhoAvaliacao = null;
  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.RASCUNHO_AVALIACAO_DESCARTADO, usuario, {
      descricao: "Rascunho de avaliação descartado pelo membro auxiliar.",
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
    "Decisão de deferimento reproduzindo integralmente as invariantes da avaliação.",
    "deferimento",
  );
};

export const indeferirAvaliacao = (proposicao, juizo, usuario = "Corregedor Nacional") =>
  finalizarOuRetornar(
    proposicao,
    TipoHistorico.DECISAO,
    usuario,
    juizo,
    "Decisão de indeferimento com redefinição integral das invariantes.",
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
      descricao: "Avaliação vigente removida pelo Corregedor Nacional.",
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
    "Avaliação direta do Corregedor Nacional com força de decisão.",
  );
