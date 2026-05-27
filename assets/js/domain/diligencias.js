import { StatusDiligencia, StatusFluxo, TipoHistorico } from "./enums.js";
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
    status: StatusDiligencia.ABERTA,
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

  return { proposicao, diligencia };
};

export const criarDiligenciaEmLote = (
  proposicoes,
  { descricao, prazo, usuario = "Secretaria Processual da CN" },
) => {
  const loteId = uid("lote");
  const criadas = proposicoes.map((proposicao) => {
    const result = criarDiligencia(proposicao, { descricao, prazo, usuario, loteId });
    return { proposicao, diligencia: result.diligencia };
  });
  return { loteId, criadas };
};

export const countDiligenciasPorSituacao = (state, hoje = new Date()) => {
  const inicioHoje = new Date(hoje);
  inicioHoje.setHours(0, 0, 0, 0);
  const limiteProximas = new Date(inicioHoje);
  limiteProximas.setDate(limiteProximas.getDate() + 7);

  const acc = { abertas: 0, vencidas: 0, proximas: 0, comprovadas: 0, expiradas: 0 };
  for (const prop of state.proposicoes ?? []) {
    for (const dil of prop.diligencias ?? []) {
      if (dil.status === StatusDiligencia.COMPROVADA) {
        acc.comprovadas++;
        continue;
      }
      if (dil.status === StatusDiligencia.EXPIRADA) {
        acc.expiradas++;
        continue;
      }
      if (dil.status !== StatusDiligencia.ABERTA) continue;
      acc.abertas++;
      const prazo = dil.prazo ? new Date(dil.prazo) : null;
      if (!prazo) continue;
      if (prazo < inicioHoje) acc.vencidas++;
      else if (prazo <= limiteProximas) acc.proximas++;
    }
  }
  return acc;
};

const findDiligenciaAberta = (proposicao) =>
  [...proposicao.diligencias]
    .reverse()
    .find((item) => item.status === StatusDiligencia.ABERTA);

const sanitizeAnexos = (anexos) =>
  (Array.isArray(anexos) ? anexos : [])
    .filter((a) => a && a.nome)
    .map((a) => ({
      nome: String(a.nome),
      tamanhoBytes: Number(a.tamanhoBytes || 0),
      mimeType: String(a.mimeType || "application/octet-stream"),
      anexadoEm: a.anexadoEm || new Date().toISOString(),
    }));

export const salvarRascunhoComprovacao = (
  proposicao,
  { descricao, observacoes, anexos = [] },
  user,
) => {
  if (proposicao.statusFluxo !== StatusFluxo.AGUARDANDO_COMPROVACAO) {
    throw new Error("Rascunho de comprovação só pode ser salvo enquanto a proposição aguarda comprovação.");
  }
  const entrando = !proposicao.rascunhoComprovacao;
  proposicao.rascunhoComprovacao = {
    descricao: descricao || "",
    observacoes: observacoes || "",
    anexos: sanitizeAnexos(anexos),
    salvoEm: new Date().toISOString(),
    salvoPor: user?.nome || "Correicionado",
    salvoPorId: user?.id || null,
  };
  if (entrando) {
    appendHistory(
      proposicao,
      buildHistoryEvent(
        TipoHistorico.RASCUNHO_COMPROVACAO_SALVO,
        user?.nome || "Correicionado",
        { descricao: "Rascunho de comprovação iniciado pelo correicionado." },
      ),
    );
  }
  return proposicao;
};

export const descartarRascunhoComprovacao = (proposicao) => {
  proposicao.rascunhoComprovacao = null;
  return proposicao;
};

export const registrarComprovacao = (
  proposicao,
  { descricao, observacoes, anexos = [], usuario = "Correicionado" } = {},
) => {
  const diligenciaAberta = findDiligenciaAberta(proposicao);
  if (!diligenciaAberta) {
    throw new Error("Não há diligência aberta para comprovar.");
  }

  const rascunho = proposicao.rascunhoComprovacao || {};
  const descricaoFinal = descricao ?? rascunho.descricao ?? "";
  const observacoesFinal = observacoes ?? rascunho.observacoes ?? "";
  const anexosFinal = sanitizeAnexos(
    anexos.length > 0 ? anexos : rascunho.anexos || [],
  );

  diligenciaAberta.status = StatusDiligencia.COMPROVADA;
  diligenciaAberta.comprovadaEm = new Date().toISOString();
  proposicao.statusFluxo = StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO;
  proposicao.rascunhoComprovacao = null;

  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.COMPROVACAO, usuario, {
      descricao: descricaoFinal || "Comprovação registrada pelo correicionado.",
      observacoes: observacoesFinal,
      anexos: anexosFinal,
      diligenciaId: diligenciaAberta.id,
    }),
  );

  return proposicao;
};

export const expirarDiligenciasVencidas = (state, hoje = new Date()) => {
  const inicioHoje = new Date(hoje);
  inicioHoje.setHours(0, 0, 0, 0);
  const afetadas = [];

  (state.proposicoes || []).forEach((proposicao) => {
    if (proposicao.statusFluxo !== StatusFluxo.AGUARDANDO_COMPROVACAO) return;
    const diligencia = findDiligenciaAberta(proposicao);
    if (!diligencia) return;
    const prazo = diligencia.prazo ? new Date(diligencia.prazo) : null;
    if (!prazo || prazo >= inicioHoje) return;

    const rascunhoExistia = Boolean(proposicao.rascunhoComprovacao);
    diligencia.status = StatusDiligencia.EXPIRADA;
    diligencia.expiradaEm = new Date().toISOString();
    proposicao.statusFluxo = StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO;

    appendHistory(
      proposicao,
      buildHistoryEvent(TipoHistorico.PRAZO_COMPROVACAO_EXPIRADO, "Sistema", {
        descricao: rascunhoExistia
          ? "Prazo de comprovação expirado. O correicionado havia iniciado um rascunho que não foi submetido."
          : "Prazo de comprovação expirado sem manifestação do correicionado.",
        diligenciaId: diligencia.id,
        prazoOriginal: diligencia.prazo,
        rascunhoExistia,
      }),
    );

    afetadas.push(proposicao);
  });

  return afetadas;
};
