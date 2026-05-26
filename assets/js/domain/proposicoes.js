import {
  Labels,
  Prioridade,
  SituacaoApreciacao,
  StatusFluxo,
  TipoConclusao,
  TipoHistorico,
} from "./enums.js";
import { buildHistoryEvent, appendHistory } from "./historico.js";

const PRIORIDADES_VALIDAS = new Set(Object.values(Prioridade));
const PERSONAS_EDITAR_METADADOS = new Set([
  "Corregedor Nacional",
  "Membro Auxiliar da CN",
  "Secretaria Processual da CN",
]);

export const listProposicoes = (state) => [...state.proposicoes];

export const getProposicaoById = (state, id) =>
  state.proposicoes.find((proposicao) => proposicao.id === id) || null;

export const listProposicoesParaAvaliar = (state) =>
  listProposicoes(state).filter(
    (proposicao) => proposicao.statusFluxo === StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO,
  );

export const listProposicoesAguardandoReferendo = (state) =>
  listProposicoes(state).filter(
    (proposicao) => proposicao.statusFluxo === StatusFluxo.AGUARDANDO_REFERENDO_CNMP,
  );

export const listProposicoesAguardandoDecisao = (state) =>
  listProposicoes(state).filter(
    (proposicao) =>
      proposicao.statusFluxo === StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR ||
      proposicao.statusFluxo === StatusFluxo.RASCUNHO_DECISAO_CN,
  );

const EVENTOS_INGRESSO_MESA = new Set([
  TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR,
  TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO,
  TipoHistorico.RASCUNHO_DECISAO_CN_DESCARTADO,
  TipoHistorico.RASCUNHO_DECISAO_CN_SALVO,
]);

export const getTempoAguardandoDecisao = (proposicao) => {
  const eventos = proposicao.historico || [];
  for (let i = eventos.length - 1; i >= 0; i -= 1) {
    if (EVENTOS_INGRESSO_MESA.has(eventos[i].tipo)) {
      return eventos[i].data || null;
    }
  }
  return null;
};

const PRIORIDADE_ORDEM = {
  [Prioridade.URGENTE]: 0,
  [Prioridade.IMPORTANTE]: 1,
  [Prioridade.NORMAL]: 2,
};

export const listMesaDecisaoCN = (state) => {
  const itens = listProposicoesAguardandoDecisao(state).filter(isProposicaoAtiva);
  return itens
    .map((proposicao) => ({
      proposicao,
      tempoAguardando: getTempoAguardandoDecisao(proposicao),
    }))
    .sort((a, b) => {
      const sensDiff =
        (b.proposicao.sensivel ? 1 : 0) - (a.proposicao.sensivel ? 1 : 0);
      if (sensDiff !== 0) return sensDiff;
      const prioDiff =
        (PRIORIDADE_ORDEM[a.proposicao.prioridade] ?? 9) -
        (PRIORIDADE_ORDEM[b.proposicao.prioridade] ?? 9);
      if (prioDiff !== 0) return prioDiff;
      const ta = a.tempoAguardando ? new Date(a.tempoAguardando).getTime() : 0;
      const tb = b.tempoAguardando ? new Date(b.tempoAguardando).getTime() : 0;
      return ta - tb;
    });
};

const aggregateBy = (items, keyFn, extraFn = () => ({})) => {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!key) return;
    const entry = map.get(key) || { total: 0, ...extraFn(item) };
    entry.total += 1;
    map.set(key, entry);
  });
  return Array.from(map.entries())
    .map(([key, entry]) => ({ key, ...entry }))
    .sort((a, b) => b.total - a.total);
};

export const groupByRamoMP = (proposicoes) =>
  aggregateBy(
    proposicoes,
    (p) => p.ramoMP,
    (p) => ({ ramoMP: p.ramoMP, ramoMPNome: p.ramoMPNome || p.ramoMP }),
  );

export const groupByUnidade = (proposicoes) =>
  aggregateBy(
    proposicoes,
    (p) => p.unidade,
    (p) => ({ unidade: p.unidade }),
  );

export const groupByCorreicao = (proposicoes) =>
  aggregateBy(
    proposicoes,
    (p) => p.correicaoId || `correicao:${p.numeroElo || p.ramoMP || "sem-id"}`,
    (p) => ({
      correicaoId: p.correicaoId || null,
      ramoMP: p.ramoMP,
      ramoMPNome: p.ramoMPNome,
      dataInicioCorreicao: p.dataInicioCorreicao,
      dataFimCorreicao: p.dataFimCorreicao,
    }),
  );

export const listCorreicoesAguardandoReferendo = (state) =>
  groupByCorreicao(listProposicoesAguardandoReferendo(state));

export const correicaoEstaReferendada = (state, correicaoId) => {
  if (!correicaoId) return false;
  const proposicoesDaCorreicao = listProposicoes(state).filter(
    (p) => p.correicaoId === correicaoId,
  );
  if (proposicoesDaCorreicao.length === 0) return false;
  return proposicoesDaCorreicao.some(
    (p) => p.statusFluxo !== StatusFluxo.AGUARDANDO_REFERENDO_CNMP,
  );
};

export const filtrarProposicoes = (proposicoes, filtros = {}) => {
  const {
    ramoMP,
    unidade,
    correicaoId,
    prioridade,
    tematica,
    uf,
    idsComRascunho,
    textoBusca,
    statusFluxo,
    situacaoApreciacao,
    tipoConclusao,
    tipo,
    membro,
    dataInicioDe,
    dataFimAte,
    comDiligenciasAbertas,
    comPendenciasSecretaria,
    subStatus,
  } = filtros;

  const termo = typeof textoBusca === "string" ? textoBusca.trim().toLowerCase() : "";
  const statusList = Array.isArray(statusFluxo)
    ? statusFluxo.filter(Boolean)
    : statusFluxo
      ? [statusFluxo]
      : [];

  return proposicoes.filter((p) => {
    if (ramoMP && p.ramoMP !== ramoMP) return false;
    if (unidade && p.unidade !== unidade) return false;
    if (correicaoId && p.correicaoId !== correicaoId) return false;
    if (prioridade && p.prioridade !== prioridade) return false;
    if (tematica && p.tematica !== tematica) return false;
    if (uf && !(p.uf || []).includes(uf)) return false;
    if (idsComRascunho && !idsComRascunho.includes(p.id)) return false;
    if (tipo && p.tipo !== tipo) return false;
    if (membro && p.membro !== membro) return false;
    if (statusList.length > 0 && !statusList.includes(p.statusFluxo)) return false;
    if (situacaoApreciacao) {
      if (situacaoApreciacao === "sem_apreciacao") {
        if (p.apreciacaoDoCN) return false;
      } else if (p.apreciacaoDoCN?.situacao !== situacaoApreciacao) {
        return false;
      }
    }
    if (tipoConclusao && p.apreciacaoDoCN?.tipoConclusao !== tipoConclusao) return false;
    if (dataInicioDe && (!p.dataInicioCorreicao || p.dataInicioCorreicao < dataInicioDe)) return false;
    if (dataFimAte && (!p.dataFimCorreicao || p.dataFimCorreicao > dataFimAte)) return false;
    if (comDiligenciasAbertas && !(p.diligencias || []).some((d) => d.status === "aberta")) return false;
    if (comPendenciasSecretaria && !(p.pendenciasSecretaria || []).some((x) => x.status === "pendente")) return false;
    if (subStatus === "nova" && p.apreciacaoDoCN) return false;
    if (subStatus === "retornada" && p.apreciacaoDoCN?.situacao !== SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES) return false;
    if (termo) {
      const haystack = [p.numero, p.numeroElo, p.descricao, p.observacoesGerais]
        .filter(Boolean)
        .join(" \u0001 ")
        .toLowerCase();
      if (!haystack.includes(termo)) return false;
    }
    return true;
  });
};

export const getAvaliacaoVigente = (proposicao) =>
  proposicao.historico.find((event) => event.id === proposicao.avaliacaoVigenteId) || null;

export const countPendenciasAbertas = (state) =>
  state.proposicoes.flatMap((proposicao) => proposicao.pendenciasSecretaria).filter((item) => item.status === "pendente").length;

export const getDashboardSummary = (state) => {
  const proposicoes = listProposicoes(state);
  return {
    total: proposicoes.length,
    aguardandoReferendo: proposicoes.filter(
      (item) => item.statusFluxo === StatusFluxo.AGUARDANDO_REFERENDO_CNMP,
    ).length,
    aguardandoDecisao: proposicoes.filter(
      (item) => item.statusFluxo === StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR,
    ).length,
    necessitaSecretaria: proposicoes.filter(
      (item) =>
        item.statusFluxo === StatusFluxo.AGUARDANDO_SECRETARIA ||
        item.statusFluxo === StatusFluxo.AGUARDANDO_COMPROVACAO,
    ).length,
    concluidas: proposicoes.filter((item) => item.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA).length,
    pendenciasSecretaria: countPendenciasAbertas(state),
  };
};

export const getStatusBadgeTone = (status) =>
  ({
    [StatusFluxo.AGUARDANDO_REFERENDO_CNMP]: "neutral",
    [StatusFluxo.RASCUNHO_CN]: "neutral",
    [StatusFluxo.AGUARDANDO_SECRETARIA]: "warning",
    [StatusFluxo.AGUARDANDO_COMPROVACAO]: "warning",
    [StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO]: "primary",
    [StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR]: "danger",
    [StatusFluxo.RASCUNHO_DECISAO_CN]: "warning",
    [StatusFluxo.AGUARDANDO_CIENCIA]: "primary",
    [StatusFluxo.BAIXA_DEFINITIVA]: "success",
  }[status] || "neutral");

export const getApreciacaoBadgeTone = (apreciacao) => {
  if (!apreciacao) return "neutral";
  if (apreciacao.situacao === SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES) return "warning";
  if (apreciacao.tipoConclusao === TipoConclusao.NAO_CUMPRIDA) return "danger";
  if (apreciacao.tipoConclusao === TipoConclusao.PARCIALMENTE_CUMPRIDA) return "warning";
  return "success";
};

export const getAvailableActions = (proposicao) => {
  const avaliacaoVigente = getAvaliacaoVigente(proposicao);
  const emReferendo = proposicao.statusFluxo === StatusFluxo.AGUARDANDO_REFERENDO_CNMP;
  const emDecisao =
    proposicao.statusFluxo === StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR ||
    proposicao.statusFluxo === StatusFluxo.RASCUNHO_DECISAO_CN;

  return {
    podeCriarDiligencia: [
      StatusFluxo.AGUARDANDO_SECRETARIA,
      StatusFluxo.RASCUNHO_CN,
    ].includes(proposicao.statusFluxo),
    podeRegistrarComprovacao: proposicao.diligencias.some((diligencia) => diligencia.status === "aberta"),
    podeAvaliarComoMembro:
      proposicao.statusFluxo === StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO ||
      proposicao.statusFluxo === StatusFluxo.AGUARDANDO_COMPROVACAO,
    podeDecidir: emDecisao && Boolean(avaliacaoVigente),
    podeRemoverAvaliacao: emDecisao && Boolean(avaliacaoVigente),
    podeAvaliarDiretamente: emDecisao && !avaliacaoVigente,
    podeEditarProposicao: emReferendo,
    podeApagarProposicao: emReferendo,
    podeGerarRelatorioFinal: emReferendo,
    podeEditarMetadados: proposicao.statusFluxo !== StatusFluxo.BAIXA_DEFINITIVA,
  };
};

export const getAvailableActionsByPersona = (proposicao, persona) => {
  const baseActions = getAvailableActions(proposicao);

  const personaMap = {
    "Corregedor Nacional": {
      ...baseActions,
      podeAvaliarComoMembro: false, // CN não avalia como membro
    },
    "Membro Auxiliar da CN": {
      podeCriarDiligencia: false,
      podeRegistrarComprovacao: false,
      podeAvaliarComoMembro: baseActions.podeAvaliarComoMembro,
      podeDecidir: false,
      podeRemoverAvaliacao: false,
      podeAvaliarDiretamente: false,
      podeEditarProposicao: false,
      podeApagarProposicao: false,
      podeGerarRelatorioFinal: false,
      podeEditarMetadados: baseActions.podeEditarMetadados,
    },
    "Secretaria Processual da CN": {
      podeCriarDiligencia: baseActions.podeCriarDiligencia,
      podeRegistrarComprovacao: false,
      podeAvaliarComoMembro: false,
      podeDecidir: false,
      podeRemoverAvaliacao: false,
      podeAvaliarDiretamente: false,
      podeEditarProposicao: false,
      podeApagarProposicao: false,
      podeGerarRelatorioFinal: false,
      podeEditarMetadados: baseActions.podeEditarMetadados,
    },
    Correicionado: {
      podeCriarDiligencia: false,
      podeRegistrarComprovacao: baseActions.podeRegistrarComprovacao,
      podeAvaliarComoMembro: false,
      podeDecidir: false,
      podeRemoverAvaliacao: false,
      podeAvaliarDiretamente: false,
      podeEditarProposicao: false,
      podeApagarProposicao: false,
      podeGerarRelatorioFinal: false,
      podeEditarMetadados: false,
    },
  };

  return personaMap[persona] || {};
};

export const getHumanSummary = (proposicao) => {
  const apreciacaoDoCN = proposicao.apreciacaoDoCN;
  if (!apreciacaoDoCN) return "Sem decisão do CN registrada.";

  if (apreciacaoDoCN.situacao === SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES) {
    return "A proposição retornou à Secretaria para nova diligência.";
  }

  return `Decisão do CN: ${Labels.tipoConclusao[apreciacaoDoCN.tipoConclusao]}.`;
};

export const findPropWithPendingProvidence = (state) =>
  listProposicoes(state).filter((proposicao) =>
    proposicao.pendenciasSecretaria.some((item) => item.status === "pendente"),
  );

const hasEvent = (proposicao, tipo) =>
  proposicao.historico.some((event) => event.tipo === tipo);

const hasPendenciaSecretariaAberta = (proposicao) =>
  proposicao.pendenciasSecretaria.some((item) => item.status === "pendente");

export const isProposicaoInativa = (proposicao) => {
  const cicloEncerrado =
    hasEvent(proposicao, TipoHistorico.CIENTIFICACAO) ||
    hasEvent(proposicao, TipoHistorico.APAGAMENTO_PROPOSICAO);
  const pendenciasResolvidas = proposicao.pendenciasSecretaria.every(
    (item) => item.status === "cumprida",
  );
  return cicloEncerrado && pendenciasResolvidas;
};

export const isProposicaoAtiva = (proposicao) => !isProposicaoInativa(proposicao);

export const countProposicoesPorAtividade = (state) => {
  const proposicoes = listProposicoes(state);
  const ativas = proposicoes.filter(isProposicaoAtiva).length;
  return {
    total: proposicoes.length,
    ativas,
    inativas: proposicoes.length - ativas,
  };
};

const correicaoKey = (proposicao) =>
  proposicao.correicaoId ||
  `correicao:${proposicao.numeroElo || proposicao.ramoMP || "sem-id"}`;

export const countCorreicoesPorAtividade = (state) => {
  const porCorreicao = new Map();
  listProposicoes(state).forEach((proposicao) => {
    const key = correicaoKey(proposicao);
    const bucket = porCorreicao.get(key) || [];
    bucket.push(proposicao);
    porCorreicao.set(key, bucket);
  });
  let ativas = 0;
  let inativas = 0;
  porCorreicao.forEach((props) => {
    if (props.every(isProposicaoInativa)) {
      inativas += 1;
    } else {
      ativas += 1;
    }
  });
  return { total: porCorreicao.size, ativas, inativas };
};

export const countProposicoesPorRamoMP = (state) => {
  const map = new Map();
  listProposicoes(state).forEach((proposicao) => {
    const key = proposicao.ramoMP || "Sem ramo";
    const entry =
      map.get(key) || {
        ramoMP: key,
        ramoMPNome: proposicao.ramoMPNome || key,
        ativas: 0,
        inativas: 0,
      };
    if (isProposicaoInativa(proposicao)) {
      entry.inativas += 1;
    } else {
      entry.ativas += 1;
    }
    map.set(key, entry);
  });
  return Array.from(map.values()).sort(
    (a, b) => b.ativas + b.inativas - (a.ativas + a.inativas),
  );
};

export const countPendentesDoCorregedor = (state) => {
  const ativas = listProposicoes(state).filter(isProposicaoAtiva);
  return {
    pendentesRascunho: ativas.filter((p) => p.statusFluxo === StatusFluxo.RASCUNHO_CN).length,
    pendentesReferendo: ativas.filter(
      (p) => p.statusFluxo === StatusFluxo.AGUARDANDO_REFERENDO_CNMP,
    ).length,
    pendentesDecisao: ativas.filter(
      (p) => p.statusFluxo === StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR,
    ).length,
    pendentesRascunhoDecisao: ativas.filter(
      (p) => p.statusFluxo === StatusFluxo.RASCUNHO_DECISAO_CN,
    ).length,
  };
};

const pertenceAFilaSecretaria = (proposicao) => {
  // Fila 1: aguardando criação de diligência
  if (proposicao.statusFluxo === StatusFluxo.AGUARDANDO_SECRETARIA) return true;
  // Fila 2: aguardando ciência ao correicionado
  if (proposicao.statusFluxo === StatusFluxo.AGUARDANDO_CIENCIA) return true;
  // Fila 3: providência pendente em paralelo
  if (hasPendenciaSecretariaAberta(proposicao)) return true;
  return false;
};

export const countPendentesPorPersona = (state) => {
  const ativas = listProposicoes(state).filter(isProposicaoAtiva);
  return {
    corregedoria: ativas.filter((p) =>
      [
        StatusFluxo.AGUARDANDO_REFERENDO_CNMP,
        StatusFluxo.RASCUNHO_CN,
        StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR,
        StatusFluxo.RASCUNHO_DECISAO_CN,
      ].includes(p.statusFluxo),
    ).length,
    secretaria: ativas.filter(pertenceAFilaSecretaria).length,
    correicionado: ativas.filter((p) => p.statusFluxo === StatusFluxo.AGUARDANDO_COMPROVACAO)
      .length,
    membroAuxiliar: ativas.filter((p) => p.statusFluxo === StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO)
      .length,
  };
};

export const markPropositionDeleted = (proposicao) => {
  proposicao.statusFluxo = StatusFluxo.BAIXA_DEFINITIVA;
  proposicao.apreciacaoDoCN = {
    situacao: SituacaoApreciacao.CONCLUIDA,
    tipoConclusao: TipoConclusao.ENCERRADA,
    observacoes: "Proposição apagada pela Corregedoria Nacional.",
  };
  proposicao.avaliacaoVigenteId = null;
  proposicao.historico.push({
    id: crypto.randomUUID(),
    tipo: TipoHistorico.APAGAMENTO_PROPOSICAO,
    data: new Date().toISOString(),
    usuario: "Corregedor Nacional",
    descricao: "Proposição apagada e encerrada pela Corregedoria Nacional.",
  });
  return proposicao;
};

export const criarProposicao = (
  state,
  {
    tipo,
    unidade,
    membro,
    descricao,
    prioridade,
    sensivel,
    correicaoId,
    numeroElo,
    ramoMP,
    ramoMPNome,
    tematica,
    uf,
    dataInicioCorreicao,
    dataFimCorreicao,
    observacoesGerais,
  },
) => {
  const numero = `PROP-${String(state.proposicoes.length + 1).padStart(4, "0")}`;
  const correicaoIdFinal = correicaoId || "corr-001";
  const correicaoJaReferendada = correicaoEstaReferendada(state, correicaoIdFinal);
  const statusInicial = correicaoJaReferendada
    ? StatusFluxo.AGUARDANDO_SECRETARIA
    : StatusFluxo.AGUARDANDO_REFERENDO_CNMP;

  const novaProposicao = {
    id: `prop-${crypto.randomUUID().slice(0, 8)}`,
    numero,
    correicaoId: correicaoIdFinal,
    tipo,
    unidade,
    membro,
    descricao,
    prioridade: PRIORIDADES_VALIDAS.has(prioridade) ? prioridade : Prioridade.NORMAL,
    sensivel: Boolean(sensivel),
    numeroElo: numeroElo || "",
    ramoMP: ramoMP || "",
    ramoMPNome: ramoMPNome || "",
    tematica: tematica || "",
    uf: uf || [],
    dataInicioCorreicao: dataInicioCorreicao || "",
    dataFimCorreicao: dataFimCorreicao || "",
    observacoesGerais: observacoesGerais || "",
    statusFluxo: statusInicial,
    apreciacaoDoCN: null,
    avaliacaoVigenteId: null,
    diligencias: [],
    pendenciasSecretaria: [],
    historico: [],
  };

  appendHistory(
    novaProposicao,
    buildHistoryEvent(TipoHistorico.CRIACAO, "Corregedor Nacional", {
      descricao: correicaoJaReferendada
        ? "Proposição criada em correição já referendada; encaminhada diretamente à Secretaria Processual."
        : "Proposição criada pela Corregedoria Nacional.",
    }),
  );

  state.proposicoes.push(novaProposicao);
  return novaProposicao;
};

export const editarMetadados = (proposicao, { prioridade, sensivel }, persona) => {
  if (proposicao.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA) {
    throw new Error("Proposição encerrada não permite edição de metadados.");
  }
  if (!PERSONAS_EDITAR_METADADOS.has(persona)) {
    throw new Error(`Persona "${persona}" não pode editar metadados da proposição.`);
  }
  if (!PRIORIDADES_VALIDAS.has(prioridade)) {
    throw new Error(`Prioridade inválida: ${prioridade}.`);
  }
  if (typeof sensivel !== "boolean") {
    throw new Error("Campo 'sensivel' deve ser booleano.");
  }

  const prioridadeAnterior = proposicao.prioridade;
  const sensivelAnterior = Boolean(proposicao.sensivel);

  if (prioridadeAnterior === prioridade && sensivelAnterior === sensivel) {
    return proposicao;
  }

  proposicao.prioridade = prioridade;
  proposicao.sensivel = sensivel;

  const partes = [];
  if (prioridadeAnterior !== prioridade) {
    partes.push(
      `prioridade: ${Labels.prioridade[prioridadeAnterior] || prioridadeAnterior} → ${Labels.prioridade[prioridade]}`,
    );
  }
  if (sensivelAnterior !== sensivel) {
    partes.push(
      `sensível: ${Labels.sensivel[String(sensivelAnterior)]} → ${Labels.sensivel[String(sensivel)]}`,
    );
  }

  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.EDICAO_METADADOS, persona, {
      descricao: `Metadados atualizados (${partes.join("; ")}).`,
      prioridadeAnterior,
      prioridadeNova: prioridade,
      sensivelAnterior,
      sensivelNovo: sensivel,
    }),
  );

  return proposicao;
};

export const editarProposicao = (proposicao, camposEditaveis) => {
  const camposPermitidos = [
    "tipo",
    "unidade",
    "membro",
    "descricao",
    "prioridade",
    "sensivel",
    "numeroElo",
    "ramoMP",
    "ramoMPNome",
    "tematica",
    "uf",
    "dataInicioCorreicao",
    "dataFimCorreicao",
    "observacoesGerais",
    "correicaoId",
  ];
  camposPermitidos.forEach((campo) => {
    if (camposEditaveis[campo] !== undefined) {
      proposicao[campo] = camposEditaveis[campo];
    }
  });
  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.EDICAO, "Corregedor Nacional", {
      descricao: "Proposição editada pela Corregedoria Nacional.",
    }),
  );
  return proposicao;
};

export const referendarCorreicao = (state, correicaoId, usuario = "Corregedor Nacional") => {
  if (!correicaoId) return 0;
  let afetadas = 0;
  state.proposicoes.forEach((proposicao) => {
    if (
      proposicao.correicaoId === correicaoId &&
      proposicao.statusFluxo === StatusFluxo.AGUARDANDO_REFERENDO_CNMP
    ) {
      proposicao.statusFluxo = StatusFluxo.AGUARDANDO_SECRETARIA;
      appendHistory(
        proposicao,
        buildHistoryEvent(TipoHistorico.REFERENDO_CNMP, usuario, {
          descricao:
            "Correição referendada pelo CNMP; proposição encaminhada à Secretaria Processual.",
          correicaoId,
        }),
      );
      afetadas += 1;
    }
  });
  return afetadas;
};

export const encaminharParaSecretaria = (proposicao) => {
  proposicao.statusFluxo = StatusFluxo.AGUARDANDO_SECRETARIA;
  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.CRIACAO, "Corregedor Nacional", {
      descricao: "Proposição encaminhada para a Secretaria Processual.",
    }),
  );
  return proposicao;
};

export const salvarRascunhoDecisaoCN = (proposicao, apreciacao) => {
  if (
    proposicao.statusFluxo !== StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR &&
    proposicao.statusFluxo !== StatusFluxo.RASCUNHO_DECISAO_CN
  ) {
    throw new Error("Rascunho de decisão só pode ser salvo quando a proposição está aguardando decisão.");
  }
  const entrando = proposicao.statusFluxo === StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR;
  proposicao.rascunhoDecisaoCN = apreciacao;
  proposicao.statusFluxo = StatusFluxo.RASCUNHO_DECISAO_CN;
  if (entrando) {
    appendHistory(
      proposicao,
      buildHistoryEvent(TipoHistorico.RASCUNHO_DECISAO_CN_SALVO, "Corregedor Nacional", {
        descricao: "Rascunho de decisão iniciado pelo Corregedor Nacional.",
      }),
    );
  }
  return proposicao;
};

export const descartarRascunhoDecisaoCN = (proposicao) => {
  if (proposicao.statusFluxo !== StatusFluxo.RASCUNHO_DECISAO_CN) {
    throw new Error("Não há rascunho de decisão ativo para descartar.");
  }
  proposicao.rascunhoDecisaoCN = null;
  proposicao.statusFluxo = StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR;
  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.RASCUNHO_DECISAO_CN_DESCARTADO, "Corregedor Nacional", {
      descricao: "Rascunho de decisão descartado pelo Corregedor Nacional.",
    }),
  );
  return proposicao;
};
