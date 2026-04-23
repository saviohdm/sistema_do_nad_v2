import {
  Labels,
  SituacaoJuizo,
  StatusFluxo,
  TipoHistorico,
} from "./enums.js";
import { appendHistory, buildHistoryEvent, removeHistoryEvent } from "./historico.js";
import { criarPendenciaSecretaria } from "./pendencias-secretaria.js";

const cloneJuizo = (juizo) => JSON.parse(JSON.stringify(juizo));

const finalizarOuRetornar = (proposicao, eventType, usuario, juizo, descricao, modo = null) => {
  const event = buildHistoryEvent(eventType, usuario, {
    descricao,
    modo,
    juizo: cloneJuizo(juizo),
  });

  appendHistory(proposicao, event);
  proposicao.juizoAtual = cloneJuizo(juizo);
  proposicao.avaliacaoVigenteId = eventType === TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR ? event.id : null;

  if (juizo.situacao === SituacaoJuizo.NECESSITA_MAIS_INFORMACOES) {
    proposicao.statusFluxo = StatusFluxo.AGUARDANDO_SECRETARIA;
    return proposicao;
  }

  proposicao.statusFluxo = StatusFluxo.CONCLUIDA;

  if (juizo.existeProvidenciaSecretaria && juizo.tipoProvidencia) {
    criarPendenciaSecretaria(proposicao, {
      tipoProvidencia: juizo.tipoProvidencia,
      descricao: Labels.tipoProvidencia[juizo.tipoProvidencia] || "Outra providência",
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
    juizo: cloneJuizo(juizo),
  });

  appendHistory(proposicao, event);
  proposicao.avaliacaoVigenteId = event.id;
  proposicao.statusFluxo = StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR;
  return proposicao;
};

export const deferirAvaliacao = (proposicao, usuario = "Corregedor Nacional") => {
  const avaliacao = proposicao.historico.find((event) => event.id === proposicao.avaliacaoVigenteId);
  if (!avaliacao?.juizo) return proposicao;

  return finalizarOuRetornar(
    proposicao,
    TipoHistorico.DECISAO,
    usuario,
    avaliacao.juizo,
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
