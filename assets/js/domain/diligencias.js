import { StatusFluxo, TipoHistorico } from "./enums.js";
import { appendHistory, buildHistoryEvent } from "./historico.js";
import { uid } from "../app/utils.js";

export const criarDiligencia = (
  proposicao,
  { descricao, prazo, usuario = "Secretaria Processual da CN", loteId },
) => {
  const diligencia = {
    id: uid("dil"),
    descricao,
    prazo,
    status: "aberta",
    criadaEm: new Date().toISOString(),
    ...(loteId ? { loteId } : {}),
  };

  proposicao.diligencias.push(diligencia);
  proposicao.statusFluxo = StatusFluxo.AGUARDANDO_COMPROVACAO;

  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.CRIACAO_DILIGENCIA, usuario, {
      descricao: descricao || "Nova diligência criada.",
      prazoComprovacao: prazo,
      diligenciaId: diligencia.id,
      ...(loteId ? { loteId } : {}),
    }),
  );

  return proposicao;
};

export const criarDiligenciaEmLote = (
  proposicoes,
  { descricao, prazo, usuario = "Secretaria Processual da CN" },
) => {
  const loteId = uid("lote");
  proposicoes.forEach((proposicao) => {
    criarDiligencia(proposicao, { descricao, prazo, usuario, loteId });
  });
  return loteId;
};

export const countDiligenciasPorSituacao = (state, hoje = new Date()) => {
  const inicioHoje = new Date(hoje);
  inicioHoje.setHours(0, 0, 0, 0);
  const limiteProximas = new Date(inicioHoje);
  limiteProximas.setDate(limiteProximas.getDate() + 7);

  const acc = { abertas: 0, vencidas: 0, proximas: 0, comprovadas: 0 };
  for (const prop of state.proposicoes ?? []) {
    for (const dil of prop.diligencias ?? []) {
      if (dil.status === "comprovada") {
        acc.comprovadas++;
        continue;
      }
      if (dil.status !== "aberta") continue;
      acc.abertas++;
      const prazo = dil.prazo ? new Date(dil.prazo) : null;
      if (!prazo) continue;
      if (prazo < inicioHoje) acc.vencidas++;
      else if (prazo <= limiteProximas) acc.proximas++;
    }
  }
  return acc;
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
