import {
  Labels,
  SituacaoApreciacao,
  StatusCorreicao,
  StatusFluxo,
  TipoConclusao,
  TipoHistorico,
} from "./enums.js";

export const VERSAO_ESQUEMA_RELATORIO_ESTATISTICO = "1.0";
export const FUSO_RELATORIO_ESTATISTICO = "America/Sao_Paulo";

export const METRICAS_RELATORIO_ESTATISTICO = [
  { codigo: "ativadas", rotulo: "Proposições ativadas", rotuloCurto: "Ativadas", cor: "#8f1d24" },
  { codigo: "diligencias", rotulo: "Diligências expedidas", rotuloCurto: "Diligências", cor: "#b85f4d" },
  { codigo: "minutas", rotulo: "Minutas submetidas", rotuloCurto: "Minutas", cor: "#d09a67" },
  { codigo: "decisoes", rotulo: "Decisões do Corregedor", rotuloCurto: "Decisões", cor: "#5f1117" },
  { codigo: "baixas", rotulo: "Baixas após ciência", rotuloCurto: "Baixas", cor: "#6f7762" },
];

const STATUS_ACERVO = [
  StatusFluxo.RASCUNHO_CN,
  StatusFluxo.AGUARDANDO_REFERENDO_CNMP,
  StatusFluxo.AGUARDANDO_SECRETARIA,
  StatusFluxo.AGUARDANDO_COMPROVACAO,
  StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO,
  StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR,
  StatusFluxo.AGUARDANDO_CIENCIA,
];

export const RESULTADOS_DECISAO = [
  { codigo: "necessitaMaisInformacoes", rotulo: "Necessita mais informações", cor: "#c47d31" },
  { codigo: "cumprida", rotulo: "Cumprida", cor: "#38664f" },
  { codigo: "parcialmenteCumprida", rotulo: "Parcialmente cumprida", cor: "#8a7653" },
  { codigo: "naoCumprida", rotulo: "Não cumprida", cor: "#9a2c2c" },
  { codigo: "prejudicada", rotulo: "Prejudicada - perda de objeto", cor: "#68717a" },
  { codigo: "encerrada", rotulo: "Encerrada - sem análise de mérito", cor: "#8e8580" },
  { codigo: "semClassificacao", rotulo: "Sem classificação", cor: "#b6ada8" },
];

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const TIPOS_DECISAO = new Set([
  TipoHistorico.DECISAO,
  TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO,
]);

const TIPOS_FLUXO_POSTERIOR = new Set([
  TipoHistorico.CONVERSAO_ENCAMINHAMENTO,
  TipoHistorico.CRIACAO_DILIGENCIA,
  TipoHistorico.COMPROVACAO,
  TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR,
  TipoHistorico.DECISAO,
  TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO,
  TipoHistorico.CIENTIFICACAO,
]);

const pad2 = (value) => String(value).padStart(2, "0");
const chaveMes = (ano, mes) => `${ano}-${pad2(mes)}`;
const zeroMetricas = () => Object.fromEntries(METRICAS_RELATORIO_ESTATISTICO.map(({ codigo }) => [codigo, 0]));
const clone = (value) => JSON.parse(JSON.stringify(value));

const dataValida = (value) => {
  const data = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(data.getTime()) ? null : data;
};

const partesNoFuso = (value, fusoHorario) => {
  const data = dataValida(value);
  if (!data) return null;
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const valor = (tipo) => Number(partes.find((parte) => parte.type === tipo)?.value);
  return {
    ano: valor("year"),
    mes: valor("month"),
    dia: valor("day"),
    hora: valor("hour"),
    minuto: valor("minute"),
    segundo: valor("second"),
  };
};

const chaveMesDaData = (value, fusoHorario) => {
  const partes = partesNoFuso(value, fusoHorario);
  return partes ? chaveMes(partes.ano, partes.mes) : null;
};

const compararMes = (anoA, mesA, anoB, mesB) => anoA * 12 + mesA - (anoB * 12 + mesB);

export const getPeriodoPadraoRelatorioEstatistico = ({
  agora = new Date(),
  fusoHorario = FUSO_RELATORIO_ESTATISTICO,
} = {}) => {
  const partes = partesNoFuso(agora, fusoHorario);
  if (!partes) throw new Error("Data de referência inválida.");
  if (partes.mes === 1) return { ano: partes.ano - 1, mesCorte: 12 };
  return { ano: partes.ano, mesCorte: partes.mes - 1 };
};

export const listarExerciciosRelatorioEstatistico = (
  state,
  { agora = new Date(), fusoHorario = FUSO_RELATORIO_ESTATISTICO } = {},
) => {
  const anos = new Set([getPeriodoPadraoRelatorioEstatistico({ agora, fusoHorario }).ano]);
  (state?.proposicoes || []).forEach((proposicao) => {
    (proposicao.historico || []).forEach((evento) => {
      const partes = partesNoFuso(evento.data, fusoHorario);
      if (partes) anos.add(partes.ano);
      const partesMinuta = partesNoFuso(evento.minutaSubmetidaEm, fusoHorario);
      if (partesMinuta) anos.add(partesMinuta.ano);
    });
  });
  return [...anos].sort((a, b) => b - a);
};

const validarPeriodoFechado = ({ ano, mesCorte, agora, fusoHorario }) => {
  const anoNumero = Number(ano);
  const mesNumero = Number(mesCorte);
  if (!Number.isInteger(anoNumero) || anoNumero < 2000 || anoNumero > 9999) {
    throw new Error("Exercício inválido.");
  }
  if (!Number.isInteger(mesNumero) || mesNumero < 1 || mesNumero > 12) {
    throw new Error("Mês de corte inválido.");
  }
  const atual = partesNoFuso(agora, fusoHorario);
  if (!atual) throw new Error("Data de geração inválida.");
  if (compararMes(anoNumero, mesNumero, atual.ano, atual.mes) >= 0) {
    throw new Error("O relatório aceita somente meses já encerrados.");
  }
  return { ano: anoNumero, mesCorte: mesNumero, atual };
};

const correicaoReferendada = (state, proposicao) =>
  (state?.correicoes || []).some(
    (correicao) =>
      correicao.id === proposicao.correicaoId && correicao.status === StatusCorreicao.REFERENDADA,
  );

const getAtivacao = (state, proposicao) => {
  const eventos = [...(proposicao.historico || [])]
    .filter((evento) => dataValida(evento.data))
    .sort((a, b) => new Date(a.data) - new Date(b.data));
  const marcada = eventos.find((evento) => evento.entradaFluxo === true);
  if (marcada) return { data: marcada.data, inferida: false };

  const referendo = eventos.find((evento) => evento.tipo === TipoHistorico.REFERENDO_CNMP);
  if (referendo) return { data: referendo.data, inferida: true };

  const passouDoPortao = ![
    StatusFluxo.RASCUNHO_CN,
    StatusFluxo.AGUARDANDO_REFERENDO_CNMP,
  ].includes(proposicao.statusFluxo);
  const temFluxoPosterior = eventos.some((evento) => TIPOS_FLUXO_POSTERIOR.has(evento.tipo));
  const apagadaSemFluxo =
    proposicao.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA &&
    eventos.some((evento) => evento.tipo === TipoHistorico.APAGAMENTO_PROPOSICAO) &&
    !temFluxoPosterior;
  if ((!passouDoPortao || apagadaSemFluxo) && !temFluxoPosterior) return null;
  if (!temFluxoPosterior && !correicaoReferendada(state, proposicao)) return null;

  const confirmacao = [...eventos]
    .reverse()
    .find((evento) => evento.tipo === TipoHistorico.RASCUNHO_CN_CONFIRMADO);
  const criacao = eventos.find((evento) => evento.tipo === TipoHistorico.CRIACAO);
  const candidato = confirmacao || criacao;
  return candidato ? { data: candidato.data, inferida: true } : null;
};

const coletarAtos = (state) => {
  const atos = [];
  let ativacoesInferidas = 0;
  let minutasSemData = 0;

  (state?.proposicoes || []).forEach((proposicao) => {
    const ativacao = getAtivacao(state, proposicao);
    if (ativacao) {
      atos.push({ metrica: "ativadas", data: ativacao.data });
      if (ativacao.inferida) ativacoesInferidas += 1;
    }

    (proposicao.historico || []).forEach((evento) => {
      if (evento.tipo === TipoHistorico.CRIACAO_DILIGENCIA) {
        atos.push({ metrica: "diligencias", data: evento.data });
      }
      if (evento.tipo === TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR) {
        atos.push({ metrica: "minutas", data: evento.data });
      }
      if (TIPOS_DECISAO.has(evento.tipo)) {
        atos.push({ metrica: "decisoes", data: evento.data, evento });
      }
      if (evento.tipo === TipoHistorico.CIENTIFICACAO) {
        atos.push({ metrica: "baixas", data: evento.data });
      }
      if (evento.tipo === TipoHistorico.AVALIACAO_REMOVIDA) {
        if (dataValida(evento.minutaSubmetidaEm)) {
          atos.push({ metrica: "minutas", data: evento.minutaSubmetidaEm, recuperada: true });
        } else {
          minutasSemData += 1;
        }
      }
    });
  });

  return { atos, ativacoesInferidas, minutasSemData };
};

const contarMes = (atos, ano, mes, fusoHorario) => {
  const valores = zeroMetricas();
  const alvo = chaveMes(ano, mes);
  atos.forEach((ato) => {
    if (chaveMesDaData(ato.data, fusoHorario) === alvo) valores[ato.metrica] += 1;
  });
  return valores;
};

const somarMetricas = (destino, origem) => {
  METRICAS_RELATORIO_ESTATISTICO.forEach(({ codigo }) => {
    destino[codigo] += origem[codigo];
  });
  return destino;
};

const totalAtos = (valores) =>
  METRICAS_RELATORIO_ESTATISTICO.reduce((total, { codigo }) => total + valores[codigo], 0);

const variacao = (atual, anterior) => {
  if (anterior === 0) {
    return {
      percentual: null,
      direcao: atual === 0 ? "estavel" : "sem_base",
      rotulo: atual === 0 ? "sem variação" : "sem base comparável",
    };
  }
  const percentual = Math.round(((atual - anterior) / anterior) * 100);
  return {
    percentual,
    direcao: percentual > 0 ? "alta" : percentual < 0 ? "queda" : "estavel",
    rotulo: percentual === 0 ? "sem variação" : `${percentual > 0 ? "+" : ""}${percentual}% vs. mês anterior`,
  };
};

const getResultadoDecisao = (evento) => {
  const apreciacao = evento.apreciacao;
  if (!apreciacao) return "semClassificacao";
  if (apreciacao.situacao === SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES) {
    return "necessitaMaisInformacoes";
  }
  return {
    [TipoConclusao.CUMPRIDA]: "cumprida",
    [TipoConclusao.PARCIALMENTE_CUMPRIDA]: "parcialmenteCumprida",
    [TipoConclusao.NAO_CUMPRIDA]: "naoCumprida",
    [TipoConclusao.PREJUDICADA]: "prejudicada",
    [TipoConclusao.ENCERRADA]: "encerrada",
  }[apreciacao.tipoConclusao] || "semClassificacao";
};

const contarResultados = (state, ano, mesCorte, fusoHorario) => {
  const valores = Object.fromEntries(RESULTADOS_DECISAO.map(({ codigo }) => [codigo, 0]));
  (state?.proposicoes || []).forEach((proposicao) => {
    (proposicao.historico || []).forEach((evento) => {
      if (!TIPOS_DECISAO.has(evento.tipo)) return;
      const partes = partesNoFuso(evento.data, fusoHorario);
      if (!partes || partes.ano !== ano || partes.mes > mesCorte) return;
      valores[getResultadoDecisao(evento)] += 1;
    });
  });
  return RESULTADOS_DECISAO.filter(
    ({ codigo }) => codigo !== "semClassificacao" || valores[codigo] > 0,
  ).map((item) => ({ ...item, valor: valores[item.codigo] }));
};

const contarAcervo = (state) => {
  const proposicoes = state?.proposicoes || [];
  const porStatus = STATUS_ACERVO.map((status) => ({
    codigo: status,
    rotulo: Labels.statusFluxo[status],
    valor: proposicoes.filter((proposicao) => proposicao.statusFluxo === status).length,
  }));
  return {
    totalAberto: porStatus.reduce((total, item) => total + item.valor, 0),
    porStatus,
  };
};

const contarProvidenciasPendentes = (state) =>
  (state?.proposicoes || []).reduce(
    (total, proposicao) =>
      total + (proposicao.pendenciasSecretaria || []).filter((item) => item.status === "pendente").length,
    0,
  );

const formatarGeracao = (data, fusoHorario) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: fusoHorario,
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);

const construirSintese = ({ acumulado, valoresMes, valoresAnterior, mesCorte, ano }) => {
  const partes = [
    `${acumulado.ativadas} proposições ativadas`,
    `${acumulado.diligencias} diligências expedidas`,
    `${acumulado.minutas} minutas submetidas`,
    `${acumulado.decisoes} decisões proferidas`,
    `${acumulado.baixas} baixas após ciência`,
  ];
  const totalMes = totalAtos(valoresMes);
  const totalAnterior = totalAtos(valoresAnterior);
  const comparacao = variacao(totalMes, totalAnterior);
  const maior = METRICAS_RELATORIO_ESTATISTICO.reduce((atual, metrica) =>
    valoresMes[metrica.codigo] > valoresMes[atual.codigo] ? metrica : atual,
  );
  const fraseMes =
    totalMes === 0
      ? `Em ${MESES[mesCorte - 1]}, não houve atos registrados nos cinco marcos acompanhados.`
      : `Em ${MESES[mesCorte - 1]}, foram registrados ${totalMes} atos internos; ${comparacao.rotulo}. O maior volume mensal foi de ${valoresMes[maior.codigo]} ${maior.rotuloCurto.toLowerCase()}.`;
  return `De janeiro a ${MESES[mesCorte - 1]} de ${ano}, o NAD registrou ${partes.join(", ")}. ${fraseMes}`;
};

export const criarSnapshotRelatorioEstatistico = ({
  state,
  ano,
  mesCorte,
  agora = new Date(),
  fusoHorario = FUSO_RELATORIO_ESTATISTICO,
} = {}) => {
  const dataGeracao = dataValida(agora);
  if (!dataGeracao) throw new Error("Data de geração inválida.");
  const padrao = getPeriodoPadraoRelatorioEstatistico({ agora: dataGeracao, fusoHorario });
  const periodo = validarPeriodoFechado({
    ano: ano ?? padrao.ano,
    mesCorte: mesCorte ?? padrao.mesCorte,
    agora: dataGeracao,
    fusoHorario,
  });
  const { atos, ativacoesInferidas, minutasSemData } = coletarAtos(state);
  const serieMensal = [];
  const acumulado = zeroMetricas();
  for (let mes = 1; mes <= periodo.mesCorte; mes += 1) {
    const valores = contarMes(atos, periodo.ano, mes, fusoHorario);
    somarMetricas(acumulado, valores);
    serieMensal.push({
      mes,
      chave: chaveMes(periodo.ano, mes),
      rotulo: MESES[mes - 1],
      rotuloCurto: MESES_CURTOS[mes - 1],
      valores,
      totalAtos: totalAtos(valores),
    });
  }
  const anterior = periodo.mesCorte === 1
    ? { ano: periodo.ano - 1, mes: 12 }
    : { ano: periodo.ano, mes: periodo.mesCorte - 1 };
  const valoresMes = contarMes(atos, periodo.ano, periodo.mesCorte, fusoHorario);
  const valoresAnterior = contarMes(atos, anterior.ano, anterior.mes, fusoHorario);
  const indicadores = METRICAS_RELATORIO_ESTATISTICO.map((metrica) => ({
    ...metrica,
    mes: valoresMes[metrica.codigo],
    acumulado: acumulado[metrica.codigo],
    anterior: valoresAnterior[metrica.codigo],
    variacao: variacao(valoresMes[metrica.codigo], valoresAnterior[metrica.codigo]),
  }));
  const avisosQualidade = [];
  if (ativacoesInferidas > 0) {
    avisosQualidade.push(
      `${ativacoesInferidas} ${ativacoesInferidas === 1 ? "ativação legada foi inferida" : "ativações legadas foram inferidas"} a partir do histórico disponível.`,
    );
  }
  if (minutasSemData > 0) {
    avisosQualidade.push(
      `${minutasSemData} ${minutasSemData === 1 ? "minuta devolvida não possui" : "minutas devolvidas não possuem"} data original preservada e não integra a série mensal.`,
    );
  }

  return {
    versaoEsquema: VERSAO_ESQUEMA_RELATORIO_ESTATISTICO,
    tipoRelatorio: "relatorio_estatistico_proposicoes",
    titulo: "Relatório estatístico das proposições",
    subtitulo: "Corregedoria Nacional · NAD · função correicional",
    geracao: {
      geradoEmIso: dataGeracao.toISOString(),
      geradoEmLocal: formatarGeracao(dataGeracao, fusoHorario),
      fusoHorario,
      fonte: "Sistema do NAD",
    },
    periodo: {
      ano: periodo.ano,
      mesCorte: periodo.mesCorte,
      mesCorteRotulo: MESES[periodo.mesCorte - 1],
      rotulo: `Janeiro a ${MESES[periodo.mesCorte - 1]} de ${periodo.ano}`,
      fechado: true,
      comparacao: { ano: anterior.ano, mes: anterior.mes, rotulo: `${MESES[anterior.mes - 1]} de ${anterior.ano}` },
    },
    indicadores,
    serieMensal,
    acumulado: clone(acumulado),
    resultadosDecisoes: contarResultados(state, periodo.ano, periodo.mesCorte, fusoHorario),
    acervoAtual: contarAcervo(state),
    providenciasPendentes: contarProvidenciasPendentes(state),
    sintese: construirSintese({ acumulado, valoresMes, valoresAnterior, mesCorte: periodo.mesCorte, ano: periodo.ano }),
    avisosQualidade,
  };
};

export const criarNomeRelatorioEstatistico = (snapshot) => {
  const partes = partesNoFuso(snapshot.geracao.geradoEmIso, snapshot.geracao.fusoHorario);
  const carimbo = `${partes.ano}-${pad2(partes.mes)}-${pad2(partes.dia)}_${pad2(partes.hora)}-${pad2(partes.minuto)}`;
  return `relatorio-estatistico-proposicoes_${snapshot.periodo.ano}-ate-${pad2(snapshot.periodo.mesCorte)}_${carimbo}`;
};
