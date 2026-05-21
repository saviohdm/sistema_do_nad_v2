import { SituacaoApreciacao, StatusFluxo, TipoHistorico } from "./enums.js";
import { listProposicoes } from "./proposicoes.js";

const grupoKey = (correicaoId, unidade) =>
  `${correicaoId || "sem-correicao"}::${unidade || "sem-unidade"}`;

const isAguardandoSecretaria = (proposicao) =>
  proposicao.statusFluxo === StatusFluxo.AGUARDANDO_SECRETARIA;

const isAguardandoCiencia = (proposicao) =>
  proposicao.statusFluxo === StatusFluxo.AGUARDANDO_CIENCIA;

const isFinalizada = (proposicao) =>
  proposicao.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA;

const isEstadoSecretaria = (proposicao) =>
  isAguardandoSecretaria(proposicao) || isAguardandoCiencia(proposicao);

// Bloqueia o grupo de ciência: ainda não chegou a aguardando_ciencia nem foi finalizada.
const isPendenteParaCiencia = (proposicao) =>
  !isAguardandoCiencia(proposicao) && !isFinalizada(proposicao);

// Bloqueia o grupo de diligência: ainda não chegou a aguardando_secretaria nem foi finalizada.
const isPendenteParaDiligencia = (proposicao) =>
  !isAguardandoSecretaria(proposicao) && !isFinalizada(proposicao);

const dataDecisaoMaisRecente = (proposicao) => {
  for (let i = proposicao.historico.length - 1; i >= 0; i -= 1) {
    const evento = proposicao.historico[i];
    if (
      evento.tipo === TipoHistorico.DECISAO ||
      evento.tipo === TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO
    ) {
      return evento.data;
    }
  }
  return null;
};

// Data em que a proposição passou a aguardar a Secretaria.
// Retornadas: última DECISAO (que decidiu pelo retorno). Novas: primeira CRIACAO.
const dataAguardandoSecretaria = (proposicao) => {
  const isRetornada = proposicao.apreciacaoAtual?.situacao === SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES;
  if (isRetornada) return dataDecisaoMaisRecente(proposicao);
  const evento = proposicao.historico.find((e) => e.tipo === TipoHistorico.CRIACAO);
  return evento?.data || null;
};

const contarComProvidencia = (proposicoes) =>
  proposicoes.filter((p) => p.apreciacaoAtual?.existeProvidenciaSecretaria === true).length;

export const listFilaAguardandoDiligencia = (state) =>
  listProposicoes(state).filter(
    (proposicao) => proposicao.statusFluxo === StatusFluxo.AGUARDANDO_SECRETARIA,
  );

const isRetornada = (proposicao) =>
  proposicao.apreciacaoAtual?.situacao === SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES;

// Agrupa proposições em AGUARDANDO_SECRETARIA por (correicaoId, unidade),
// adicionando metadados sobre o grupo inteiro (completo se todas não-finalizadas
// da mesma unidade+correição também estão aguardando a Secretaria).
export const listGruposAguardandoDiligencia = (state) => {
  const todas = listProposicoes(state);
  const alvos = todas.filter(isAguardandoSecretaria);

  const grupos = new Map();
  alvos.forEach((proposicao) => {
    const key = grupoKey(proposicao.correicaoId, proposicao.unidade);
    const entry =
      grupos.get(key) || {
        key,
        correicaoId: proposicao.correicaoId,
        unidade: proposicao.unidade,
        ramoMP: proposicao.ramoMP,
        ramoMPNome: proposicao.ramoMPNome,
        proposicoes: [],
      };
    entry.proposicoes.push(proposicao);
    grupos.set(key, entry);
  });

  return Array.from(grupos.values())
    .map((grupo) => {
      const outrasDaUnidade = todas.filter(
        (p) =>
          p.correicaoId === grupo.correicaoId &&
          p.unidade === grupo.unidade &&
          !grupo.proposicoes.includes(p),
      );
      const pendentesNoGrupo = outrasDaUnidade.filter(isPendenteParaDiligencia).length;
      const finalizadasNoGrupo = outrasDaUnidade.filter(isFinalizada).length;
      const totalNaUnidadeCorreicao =
        grupo.proposicoes.length + pendentesNoGrupo + finalizadasNoGrupo;
      const prontas = grupo.proposicoes.length;
      const novas = grupo.proposicoes.filter((p) => !isRetornada(p)).length;
      const retornadas = grupo.proposicoes.filter(isRetornada).length;
      const datas = grupo.proposicoes
        .map(dataAguardandoSecretaria)
        .filter(Boolean)
        .sort();
      const prontoEm = datas.length ? datas[datas.length - 1] : null;
      return {
        ...grupo,
        prontas,
        total: totalNaUnidadeCorreicao,
        pendentesNoGrupo,
        finalizadasNoGrupo,
        completo: pendentesNoGrupo === 0,
        prontoEm,
        novas,
        retornadas,
      };
    })
    .sort((a, b) => {
      if (a.completo !== b.completo) return a.completo ? -1 : 1;
      if (a.completo && b.completo) {
        const da = a.prontoEm || "";
        const db = b.prontoEm || "";
        if (da !== db) return da.localeCompare(db);
      }
      return (a.unidade || "").localeCompare(b.unidade || "");
    });
};

// Lista grupos (correicaoId, unidade) com pelo menos uma proposição em
// estado-Secretaria (AGUARDANDO_SECRETARIA ou AGUARDANDO_CIENCIA) E pelo menos
// uma proposição ainda em fluxo anterior. Ordenado por % de conclusão decrescente.
export const listGruposParciaisSecretaria = (state) => {
  const todas = listProposicoes(state);
  const grupos = new Map();

  todas.forEach((proposicao) => {
    if (isFinalizada(proposicao)) return;
    const key = grupoKey(proposicao.correicaoId, proposicao.unidade);
    const entry =
      grupos.get(key) || {
        key,
        correicaoId: proposicao.correicaoId,
        unidade: proposicao.unidade,
        ramoMP: proposicao.ramoMP,
        ramoMPNome: proposicao.ramoMPNome,
        proposicoes: [],
      };
    entry.proposicoes.push(proposicao);
    grupos.set(key, entry);
  });

  return Array.from(grupos.values())
    .map((grupo) => {
      const emSecretaria = grupo.proposicoes.filter(isAguardandoSecretaria).length;
      const emCiencia = grupo.proposicoes.filter(isAguardandoCiencia).length;
      const prontas = emSecretaria + emCiencia;
      const total = grupo.proposicoes.length;
      const pendentes = total - prontas;
      const percentual = total > 0 ? Math.round((prontas / total) * 100) : 0;
      const estadoAlvo = emSecretaria >= emCiencia ? "diligencia" : "ciencia";
      return {
        ...grupo,
        prontas,
        total,
        pendentes,
        percentual,
        estadoAlvo,
      };
    })
    .filter((grupo) => grupo.prontas > 0 && grupo.pendentes > 0)
    .sort((a, b) => {
      if (b.percentual !== a.percentual) return b.percentual - a.percentual;
      return (a.unidade || "").localeCompare(b.unidade || "");
    });
};

// Lista pendências de providência abertas há mais de 10 dias.
// Retorna itens "achatados" com referência à proposição.
export const listProvidenciasAtrasadas = (state, hoje = new Date()) => {
  const limite = 10;
  const itens = [];
  listProposicoes(state).forEach((proposicao) => {
    (proposicao.pendenciasSecretaria || []).forEach((pendencia) => {
      if (pendencia.status !== "pendente") return;
      if (!pendencia.dataCriacao) return;
      const inicio = new Date(pendencia.dataCriacao);
      const diasAberto = Math.floor((hoje - inicio) / 86400000);
      if (diasAberto <= limite) return;
      itens.push({
        proposicaoId: proposicao.id,
        numero: proposicao.numero,
        correicaoId: proposicao.correicaoId,
        unidade: proposicao.unidade,
        ramoMP: proposicao.ramoMP,
        ramoMPNome: proposicao.ramoMPNome,
        pendenciaId: pendencia.id,
        tipoProvidencia: pendencia.tipoProvidencia,
        descricao: pendencia.descricao,
        dataCriacao: pendencia.dataCriacao,
        diasAberto,
      });
    });
  });
  return itens.sort((a, b) => b.diasAberto - a.diasAberto);
};

export const listFilaAguardandoCiencia = (state) => {
  const todas = listProposicoes(state);
  const alvos = todas.filter(isAguardandoCiencia);

  const grupos = new Map();
  alvos.forEach((proposicao) => {
    const key = grupoKey(proposicao.correicaoId, proposicao.unidade);
    const entry =
      grupos.get(key) || {
        key,
        correicaoId: proposicao.correicaoId,
        unidade: proposicao.unidade,
        ramoMP: proposicao.ramoMP,
        ramoMPNome: proposicao.ramoMPNome,
        proposicoes: [],
      };
    entry.proposicoes.push(proposicao);
    grupos.set(key, entry);
  });

  return Array.from(grupos.values())
    .map((grupo) => {
      const outrasDaUnidade = todas.filter(
        (p) =>
          p.correicaoId === grupo.correicaoId &&
          p.unidade === grupo.unidade &&
          !grupo.proposicoes.includes(p),
      );
      const pendentesNoGrupo = outrasDaUnidade.filter(isPendenteParaCiencia).length;
      const finalizadasNoGrupo = outrasDaUnidade.filter(isFinalizada).length;
      const totalNaUnidadeCorreicao =
        grupo.proposicoes.length + pendentesNoGrupo + finalizadasNoGrupo;
      const prontas = grupo.proposicoes.length;
      const datasDecisao = grupo.proposicoes
        .map(dataDecisaoMaisRecente)
        .filter(Boolean)
        .sort();
      const prontoEm = datasDecisao.length ? datasDecisao[datasDecisao.length - 1] : null;
      const comProvidencia = contarComProvidencia(grupo.proposicoes);
      return {
        ...grupo,
        prontas,
        total: totalNaUnidadeCorreicao,
        pendentesNoGrupo,
        finalizadasNoGrupo,
        completo: pendentesNoGrupo === 0,
        prontoEm,
        comProvidencia,
      };
    })
    .sort((a, b) => {
      // Completos primeiro; entre completos, prontoEm desc.
      if (a.completo !== b.completo) return a.completo ? -1 : 1;
      if (a.completo && b.completo) {
        const da = a.prontoEm || "";
        const db = b.prontoEm || "";
        if (db !== da) return db.localeCompare(da);
      }
      return (a.unidade || "").localeCompare(b.unidade || "");
    });
};

export const listFilaPendenciasProvidencia = (state) =>
  listProposicoes(state).filter((proposicao) =>
    proposicao.pendenciasSecretaria.some((item) => item.status === "pendente"),
  );

export const countGruposCompletosProntos = (state) =>
  listFilaAguardandoCiencia(state).filter((grupo) => grupo.completo).length;

export const countFilasSecretaria = (state) => {
  const grupos = listFilaAguardandoCiencia(state);
  return {
    aguardandoDiligencia: listFilaAguardandoDiligencia(state).length,
    aguardandoCiencia: grupos.reduce(
      (sum, grupo) => sum + grupo.proposicoes.length,
      0,
    ),
    gruposCompletosProntos: grupos.filter((grupo) => grupo.completo).length,
    pendenciasProvidencia: listFilaPendenciasProvidencia(state).length,
  };
};
