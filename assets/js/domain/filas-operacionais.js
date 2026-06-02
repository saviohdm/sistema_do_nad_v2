import { StatusFluxo } from "./enums.js";
import { listProposicoes } from "./proposicoes.js";

export const StatusFilaOperacional = {
  REFERENDO: [StatusFluxo.RASCUNHO_CN, StatusFluxo.AGUARDANDO_REFERENDO_CNMP],
  DILIGENCIA: [StatusFluxo.AGUARDANDO_SECRETARIA],
  AVALIACAO: [StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO],
  DECISAO: [StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR, StatusFluxo.RASCUNHO_DECISAO_CN],
  CIENCIA: [StatusFluxo.AGUARDANDO_CIENCIA],
};

export const isFluxoPrincipalAberto = (proposicao) =>
  proposicao.statusFluxo !== StatusFluxo.BAIXA_DEFINITIVA;

export const getUnidadeRef = (proposicao) =>
  proposicao.unidadeId
    ? `id:${proposicao.unidadeId}`
    : `legado:${proposicao.unidade || "sem-unidade"}`;

export const getGrupoOperacionalKey = (correicaoId, unidadeRef) =>
  `${correicaoId || "sem-correicao"}::${unidadeRef || "legado:sem-unidade"}`;

export const getGrupoOperacionalKeyDaProposicao = (proposicao) =>
  getGrupoOperacionalKey(proposicao.correicaoId, getUnidadeRef(proposicao));

const getCorreicaoRef = (proposicao) =>
  proposicao.correicaoId ||
  `correicao:${proposicao.numeroElo || proposicao.ramoMP || "sem-id"}`;

const getCorreicao = (state, correicaoId) =>
  (state.correicoes || []).find((correicao) => correicao.id === correicaoId) || null;

const getGrupoBase = (state, proposicao) => {
  const correicao = getCorreicao(state, proposicao.correicaoId);
  const unidadeRef = getUnidadeRef(proposicao);
  return {
    key: getGrupoOperacionalKey(proposicao.correicaoId, unidadeRef),
    correicaoId: proposicao.correicaoId,
    unidadeId: proposicao.unidadeId || null,
    unidadeRef,
    unidade: proposicao.unidade,
    ramoMP: correicao?.ramoMP || proposicao.ramoMP,
    ramoMPNome: correicao?.ramoMPNome || proposicao.ramoMPNome,
    proposicoes: [],
  };
};

export const groupProposicoesPorUnidadeOperacional = (proposicoes) => {
  const grupos = new Map();
  proposicoes.forEach((proposicao) => {
    const unidadeRef = getUnidadeRef(proposicao);
    const entry =
      grupos.get(unidadeRef) || {
        key: unidadeRef,
        unidadeId: proposicao.unidadeId || null,
        unidadeRef,
        unidade: proposicao.unidade,
        total: 0,
      };
    entry.total += 1;
    grupos.set(unidadeRef, entry);
  });
  return Array.from(grupos.values()).sort((a, b) =>
    (a.unidade || "").localeCompare(b.unidade || ""),
  );
};

export const listGruposAbertosPorUnidade = (state) => {
  const grupos = new Map();
  listProposicoes(state)
    .filter(isFluxoPrincipalAberto)
    .forEach((proposicao) => {
      const key = getGrupoOperacionalKeyDaProposicao(proposicao);
      const entry = grupos.get(key) || getGrupoBase(state, proposicao);
      entry.proposicoes.push(proposicao);
      grupos.set(key, entry);
    });
  return Array.from(grupos.values());
};

export const listGruposOperacionaisDaFila = (state, statusFila) => {
  const statuses = new Set(statusFila);
  return listGruposAbertosPorUnidade(state)
    .map((grupo) => {
      const proposicoes = grupo.proposicoes.filter((p) => statuses.has(p.statusFluxo));
      const prontas = proposicoes.length;
      const total = grupo.proposicoes.length;
      const pendentesNoGrupo = total - prontas;
      return {
        ...grupo,
        proposicoes,
        prontas,
        total,
        pendentesNoGrupo,
        completo: prontas > 0 && pendentesNoGrupo === 0,
      };
    })
    .filter((grupo) => grupo.prontas > 0);
};

export const listPanoramaFilaPorCorreicao = (state, statusFila) => {
  const gruposAbertos = listGruposAbertosPorUnidade(state);
  const gruposFila = listGruposOperacionaisDaFila(state, statusFila);
  const unidadesTotalPorCorreicao = new Map();

  gruposAbertos.forEach((grupo) => {
    const correicaoRef = getCorreicaoRef(grupo);
    unidadesTotalPorCorreicao.set(
      correicaoRef,
      (unidadesTotalPorCorreicao.get(correicaoRef) || 0) + 1,
    );
  });

  const correicoes = new Map();
  gruposFila.forEach((grupo) => {
    const correicaoRef = getCorreicaoRef(grupo);
    const entry =
      correicoes.get(correicaoRef) || {
        key: correicaoRef,
        correicaoId: grupo.correicaoId || null,
        ramoMP: grupo.ramoMP,
        ramoMPNome: grupo.ramoMPNome,
        proposicoesAguardando: 0,
        unidadesProntas: 0,
        unidadesTotal: unidadesTotalPorCorreicao.get(correicaoRef) || 0,
      };
    entry.proposicoesAguardando += grupo.prontas;
    if (grupo.completo) entry.unidadesProntas += 1;
    correicoes.set(correicaoRef, entry);
  });

  return Array.from(correicoes.values()).sort(
    (a, b) => b.proposicoesAguardando - a.proposicoesAguardando,
  );
};

