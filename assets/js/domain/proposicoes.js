import { Labels, SituacaoJuizo, StatusFluxo, TipoConclusao, TipoHistorico } from "./enums.js";
import { buildHistoryEvent, appendHistory } from "./historico.js";

export const listProposicoes = (state) => [...state.proposicoes];

export const getProposicaoById = (state, id) =>
  state.proposicoes.find((proposicao) => proposicao.id === id) || null;

export const listProposicoesParaAvaliar = (state) =>
  listProposicoes(state).filter(
    (proposicao) => proposicao.statusFluxo === StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO,
  );

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

export const filtrarProposicoes = (proposicoes, filtros = {}) => {
  const { ramoMP, unidade, correicaoId, prioridade, tematica, uf, idsComRascunho } = filtros;
  return proposicoes.filter((p) => {
    if (ramoMP && p.ramoMP !== ramoMP) return false;
    if (unidade && p.unidade !== unidade) return false;
    if (correicaoId && p.correicaoId !== correicaoId) return false;
    if (prioridade && p.prioridade !== prioridade) return false;
    if (tematica && p.tematica !== tematica) return false;
    if (uf && !(p.uf || []).includes(uf)) return false;
    if (idsComRascunho && !idsComRascunho.includes(p.id)) return false;
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
    aguardandoDecisao: proposicoes.filter(
      (item) => item.statusFluxo === StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR,
    ).length,
    necessitaSecretaria: proposicoes.filter(
      (item) =>
        item.statusFluxo === StatusFluxo.AGUARDANDO_SECRETARIA ||
        item.statusFluxo === StatusFluxo.AGUARDANDO_COMPROVACAO,
    ).length,
    concluidas: proposicoes.filter((item) => item.statusFluxo === StatusFluxo.CONCLUIDA).length,
    pendenciasSecretaria: countPendenciasAbertas(state),
  };
};

export const getStatusBadgeTone = (status) =>
  ({
    [StatusFluxo.RASCUNHO_CN]: "neutral",
    [StatusFluxo.AGUARDANDO_SECRETARIA]: "warning",
    [StatusFluxo.AGUARDANDO_COMPROVACAO]: "warning",
    [StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO]: "primary",
    [StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR]: "danger",
    [StatusFluxo.CONCLUIDA]: "success",
  }[status] || "neutral");

export const getJuizoBadgeTone = (juizo) => {
  if (!juizo) return "neutral";
  if (juizo.situacao === SituacaoJuizo.NECESSITA_MAIS_INFORMACOES) return "warning";
  if (juizo.tipoConclusao === TipoConclusao.NAO_CUMPRIDA) return "danger";
  if (juizo.tipoConclusao === TipoConclusao.PARCIALMENTE_CUMPRIDA) return "warning";
  return "success";
};

export const getAvailableActions = (proposicao) => {
  const avaliacaoVigente = getAvaliacaoVigente(proposicao);

  return {
    podeCriarDiligencia: [
      StatusFluxo.AGUARDANDO_SECRETARIA,
      StatusFluxo.RASCUNHO_CN,
    ].includes(proposicao.statusFluxo),
    podeRegistrarComprovacao: proposicao.diligencias.some((diligencia) => diligencia.status === "aberta"),
    podeAvaliarComoMembro:
      proposicao.statusFluxo === StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO ||
      proposicao.statusFluxo === StatusFluxo.AGUARDANDO_COMPROVACAO,
    podeDecidir: Boolean(avaliacaoVigente),
    podeRemoverAvaliacao: Boolean(avaliacaoVigente),
    podeAvaliarDiretamente: !avaliacaoVigente,
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
    },
    "Secretaria Processual da CN": {
      podeCriarDiligencia: baseActions.podeCriarDiligencia,
      podeRegistrarComprovacao: false,
      podeAvaliarComoMembro: false,
      podeDecidir: false,
      podeRemoverAvaliacao: false,
      podeAvaliarDiretamente: false,
    },
    Correicionado: {
      podeCriarDiligencia: false,
      podeRegistrarComprovacao: baseActions.podeRegistrarComprovacao,
      podeAvaliarComoMembro: false,
      podeDecidir: false,
      podeRemoverAvaliacao: false,
      podeAvaliarDiretamente: false,
    },
  };

  return personaMap[persona] || {};
};

export const getHumanSummary = (proposicao) => {
  const juizoAtual = proposicao.juizoAtual;
  if (!juizoAtual) return "Sem juízo final registrado.";

  if (juizoAtual.situacao === SituacaoJuizo.NECESSITA_MAIS_INFORMACOES) {
    return "A proposição retornou à Secretaria para nova diligência.";
  }

  return `Juízo final: ${Labels.tipoConclusao[juizoAtual.tipoConclusao]}.`;
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
  const intermediarios = [
    StatusFluxo.AGUARDANDO_SECRETARIA,
    StatusFluxo.AGUARDANDO_COMPROVACAO,
    StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO,
  ];
  return {
    pendentesValidacao: ativas.filter((p) => p.statusFluxo === StatusFluxo.RASCUNHO_CN).length,
    pendentesDecisao: ativas.filter(
      (p) => p.statusFluxo === StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR,
    ).length,
    pendentesDiligencia: ativas.filter((p) => intermediarios.includes(p.statusFluxo)).length,
  };
};

export const countPendentesPorPersona = (state) => {
  const ativas = listProposicoes(state).filter(isProposicaoAtiva);
  return {
    corregedoria: ativas.filter((p) =>
      [StatusFluxo.RASCUNHO_CN, StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR].includes(p.statusFluxo),
    ).length,
    secretaria: ativas.filter(
      (p) =>
        p.statusFluxo === StatusFluxo.AGUARDANDO_SECRETARIA ||
        (p.statusFluxo === StatusFluxo.CONCLUIDA && !hasEvent(p, TipoHistorico.CIENTIFICACAO)) ||
        hasPendenciaSecretariaAberta(p),
    ).length,
    correicionado: ativas.filter((p) => p.statusFluxo === StatusFluxo.AGUARDANDO_COMPROVACAO)
      .length,
    membroAuxiliar: ativas.filter((p) => p.statusFluxo === StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO)
      .length,
  };
};

export const markPropositionDeleted = (proposicao) => {
  proposicao.statusFluxo = StatusFluxo.CONCLUIDA;
  proposicao.juizoAtual = {
    situacao: SituacaoJuizo.CONCLUIDA,
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

  const novaProposicao = {
    id: `prop-${crypto.randomUUID().slice(0, 8)}`,
    numero,
    correicaoId: correicaoId || "corr-001",
    tipo,
    unidade,
    membro,
    descricao,
    prioridade: prioridade || "normal",
    numeroElo: numeroElo || "",
    ramoMP: ramoMP || "",
    ramoMPNome: ramoMPNome || "",
    tematica: tematica || "",
    uf: uf || [],
    dataInicioCorreicao: dataInicioCorreicao || "",
    dataFimCorreicao: dataFimCorreicao || "",
    observacoesGerais: observacoesGerais || "",
    statusFluxo: StatusFluxo.RASCUNHO_CN,
    juizoAtual: null,
    avaliacaoVigenteId: null,
    diligencias: [],
    pendenciasSecretaria: [],
    historico: [],
  };

  appendHistory(
    novaProposicao,
    buildHistoryEvent(TipoHistorico.CRIACAO, "Corregedor Nacional", {
      descricao: "Proposição criada pela Corregedoria Nacional.",
    }),
  );

  state.proposicoes.push(novaProposicao);
  return novaProposicao;
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
