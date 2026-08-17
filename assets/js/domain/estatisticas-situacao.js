import {
  countCorreicoesPorAtividade,
  countPendentesPorPersona,
  countProposicoesPorAtividade,
  findPropWithPendingProvidence,
} from "./proposicoes.js";

export const VERSAO_ESQUEMA_SITUACAO = "1.0";
export const FUSO_SITUACAO = "America/Sao_Paulo";

const formatarGeracao = (data, fusoHorario) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: fusoHorario,
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);

export const criarSnapshotSituacao = ({
  state,
  agora = new Date(),
  fusoHorario = FUSO_SITUACAO,
} = {}) => {
  const dataGeracao = agora instanceof Date ? new Date(agora.getTime()) : new Date(agora);
  if (Number.isNaN(dataGeracao.getTime())) throw new Error("Data de geração inválida.");

  const estado = { ...(state || {}), proposicoes: state?.proposicoes || [] };
  const proposicoes = countProposicoesPorAtividade(estado);
  const correicoes = countCorreicoesPorAtividade(estado);
  const responsabilidadesBase = countPendentesPorPersona(estado);
  const responsabilidades = {
    ...responsabilidadesBase,
    total: Object.values(responsabilidadesBase).reduce((soma, valor) => soma + valor, 0),
    admiteSobreposicao: true,
  };

  return {
    versaoEsquema: VERSAO_ESQUEMA_SITUACAO,
    tipoRelatorio: "situacao_atual_sistema",
    geracao: {
      geradoEmIso: dataGeracao.toISOString(),
      geradoEmLocal: formatarGeracao(dataGeracao, fusoHorario),
      fusoHorario,
      fonte: "Sistema do NAD",
    },
    universo: {
      nacional: true,
      todosOsExercicios: true,
      retratoAtual: true,
    },
    proposicoes: { ...proposicoes },
    correicoes: { ...correicoes },
    responsabilidades,
    providencias: {
      proposicoesComPendencia: findPropWithPendingProvidence(estado).length,
      unidade: "proposicoes",
    },
  };
};
