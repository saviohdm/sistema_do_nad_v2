import { SituacaoJuizo, StatusFluxo, TipoHistorico } from "./enums.js";
import { listProposicoes } from "./proposicoes.js";

const grupoKey = (correicaoId, unidade) => `${correicaoId || "sem-correicao"}::${unidade || "sem-unidade"}`;

const hasCientificacao = (proposicao) =>
  proposicao.historico.some((event) => event.tipo === TipoHistorico.CIENTIFICACAO);

const hasJuizoConclusivo = (proposicao) =>
  proposicao.juizoAtual?.situacao === SituacaoJuizo.CONCLUIDA;

export const listFilaAguardandoDiligencia = (state) =>
  listProposicoes(state).filter(
    (proposicao) => proposicao.statusFluxo === StatusFluxo.AGUARDANDO_SECRETARIA,
  );

export const listFilaAguardandoCiencia = (state) => {
  const todas = listProposicoes(state);

  const alvos = todas.filter(
    (proposicao) => hasJuizoConclusivo(proposicao) && !hasCientificacao(proposicao),
  );

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
      const pendentesNoGrupo = outrasDaUnidade.filter(
        (p) => !hasCientificacao(p) && !hasJuizoConclusivo(p),
      ).length;
      const totalNaUnidadeCorreicao = grupo.proposicoes.length + outrasDaUnidade.length;
      const prontas = grupo.proposicoes.length;
      return {
        ...grupo,
        prontas,
        total: totalNaUnidadeCorreicao,
        pendentesNoGrupo,
        completo: pendentesNoGrupo === 0,
      };
    })
    .sort((a, b) => (a.unidade || "").localeCompare(b.unidade || ""));
};

export const listFilaPendenciasProvidencia = (state) =>
  listProposicoes(state).filter((proposicao) =>
    proposicao.pendenciasSecretaria.some((item) => item.status === "pendente"),
  );

export const countFilasSecretaria = (state) => ({
  aguardandoDiligencia: listFilaAguardandoDiligencia(state).length,
  aguardandoCiencia: listFilaAguardandoCiencia(state).reduce(
    (sum, grupo) => sum + grupo.proposicoes.length,
    0,
  ),
  pendenciasProvidencia: listFilaPendenciasProvidencia(state).length,
});
