import { TipoHistorico } from "./enums.js";
import { appendHistory, buildHistoryEvent } from "./historico.js";
import { uid } from "../app/utils.js";

export const criarPendenciaSecretaria = (proposicao, { tipoProvidencia, descricao }) => {
  proposicao.pendenciasSecretaria.push({
    id: uid("pend"),
    tipo: "cumprimento_providencia",
    tipoProvidencia,
    descricao,
    status: "pendente",
    dataCriacao: new Date().toISOString(),
    dataCumprimento: null,
    observacoes: null,
  });

  return proposicao;
};

export const registrarCumprimentoPendencia = (
  proposicao,
  pendenciaId,
  { dataCumprimento, observacoes, usuario = "Secretaria Processual da CN" },
) => {
  const pendencia = proposicao.pendenciasSecretaria.find((item) => item.id === pendenciaId);
  if (!pendencia) return proposicao;

  pendencia.status = "cumprida";
  pendencia.dataCumprimento = dataCumprimento || new Date().toISOString();
  pendencia.observacoes = observacoes || null;

  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.CUMPRIMENTO_PENDENCIA_SECRETARIA, usuario, {
      descricao: `Providência registrada como cumprida: ${pendencia.descricao}.`,
      observacoes,
      dataCumprimento: pendencia.dataCumprimento,
    }),
  );

  return proposicao;
};
