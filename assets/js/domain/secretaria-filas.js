import { StatusFluxo, TipoHistorico } from "./enums.js";
import { listProposicoes } from "./proposicoes.js";

const grupoKey = (correicaoId, unidade) =>
  `${correicaoId || "sem-correicao"}::${unidade || "sem-unidade"}`;

const isAguardandoCiencia = (proposicao) =>
  proposicao.statusFluxo === StatusFluxo.AGUARDANDO_CIENCIA;

const isFinalizada = (proposicao) =>
  proposicao.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA;

// Bloqueia o grupo: ainda não chegou a aguardando_ciencia nem foi finalizada.
const isPendenteParaCiencia = (proposicao) =>
  !isAguardandoCiencia(proposicao) && !isFinalizada(proposicao);

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

const contarComProvidencia = (proposicoes) =>
  proposicoes.filter((p) => p.juizoAtual?.existeProvidenciaSecretaria === true).length;

export const listFilaAguardandoDiligencia = (state) =>
  listProposicoes(state).filter(
    (proposicao) => proposicao.statusFluxo === StatusFluxo.AGUARDANDO_SECRETARIA,
  );

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
