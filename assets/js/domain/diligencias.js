import { StatusFluxo, TipoHistorico } from "./enums.js";
import { appendHistory, buildHistoryEvent } from "./historico.js";
import { uid } from "../app/utils.js";

export const criarDiligencia = (proposicao, { descricao, prazo, usuario = "Secretaria Processual da CN" }) => {
  const diligencia = {
    id: uid("dil"),
    descricao,
    prazo,
    status: "aberta",
    criadaEm: new Date().toISOString(),
  };

  proposicao.diligencias.push(diligencia);
  proposicao.statusFluxo = StatusFluxo.AGUARDANDO_COMPROVACAO;

  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.CRIACAO_DILIGENCIA, usuario, {
      descricao: descricao || "Nova diligência criada.",
      prazoComprovacao: prazo,
      diligenciaId: diligencia.id,
    }),
  );

  return proposicao;
};

export const registrarComprovacao = (
  proposicao,
  { descricao, observacoes, usuario = "Correicionado" },
) => {
  const diligenciaAberta = [...proposicao.diligencias].reverse().find((item) => item.status === "aberta");
  if (diligenciaAberta) {
    diligenciaAberta.status = "comprovada";
    diligenciaAberta.comprovadaEm = new Date().toISOString();
  }

  proposicao.statusFluxo = StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO;

  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.COMPROVACAO, usuario, {
      descricao: descricao || "Comprovação registrada pelo correicionado.",
      observacoes,
    }),
  );

  return proposicao;
};
