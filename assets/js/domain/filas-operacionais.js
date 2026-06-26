import { StatusFluxo, TipoDestinatario } from "./enums.js";
import { listProposicoes } from "./proposicoes.js";
import { getDestinatario, getTipoDestinatario } from "./destinatario.js";

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

// Ref de agrupamento por DESTINATÁRIO (orientação da proposição), que define a
// quem ela "segue". Só o membro muda de ref — ele segue a pessoa, não a unidade
// de origem; unidade e administração superior mantêm o ref de unidade (= id:...).
export const getDestinatarioRef = (proposicao) => {
  if (getTipoDestinatario(proposicao) === TipoDestinatario.MEMBRO) {
    const { membroId } = getDestinatario(proposicao);
    return `membro:${membroId || proposicao.membroId || "sem-membro"}`;
  }
  return getUnidadeRef(proposicao);
};

// Campos de exibição do destinatário, derivados dos campos flat já hidratados
// (sem precisar de state). Usados para seccionar/rotular/ordenar as filas.
export const getDestinatarioDisplay = (proposicao) => {
  const tipoDestinatario = getTipoDestinatario(proposicao);
  if (tipoDestinatario === TipoDestinatario.MEMBRO) {
    return {
      tipoDestinatario,
      rotulo: proposicao.membro || "Membro",
      rotuloSecundario: proposicao.unidade || "", // unidade de origem (snapshot)
    };
  }
  // Unidade e administração superior: o flat `unidade` já traz o nome correto
  // (nome da unidade ou nome da adm. superior, via projetarDestinatario).
  return {
    tipoDestinatario,
    rotulo: proposicao.unidade || "—",
    rotuloSecundario: "",
  };
};

export const getGrupoOperacionalKey = (correicaoId, destinatarioRef) =>
  `${correicaoId || "sem-correicao"}::${destinatarioRef || "legado:sem-unidade"}`;

export const getGrupoOperacionalKeyDaProposicao = (proposicao) =>
  getGrupoOperacionalKey(proposicao.correicaoId, getDestinatarioRef(proposicao));

const getCorreicaoRef = (proposicao) =>
  proposicao.correicaoId ||
  `correicao:${proposicao.numeroElo || proposicao.ramoMP || "sem-id"}`;

const getCorreicao = (state, correicaoId) =>
  (state.correicoes || []).find((correicao) => correicao.id === correicaoId) || null;

const getGrupoBase = (state, proposicao) => {
  const correicao = getCorreicao(state, proposicao.correicaoId);
  const destinatarioRef = getDestinatarioRef(proposicao);
  const display = getDestinatarioDisplay(proposicao);
  return {
    key: getGrupoOperacionalKey(proposicao.correicaoId, destinatarioRef),
    correicaoId: proposicao.correicaoId,
    destinatarioRef,
    unidadeRef: destinatarioRef, // alias de compat (deep-links do dashboard, ciência)
    unidadeId: proposicao.unidadeId || null,
    unidade: proposicao.unidade,
    tipoDestinatario: display.tipoDestinatario,
    rotulo: display.rotulo,
    rotuloSecundario: display.rotuloSecundario,
    ramoMP: correicao?.ramoMP || proposicao.ramoMP,
    ramoMPNome: correicao?.ramoMPNome || proposicao.ramoMPNome,
    proposicoes: [],
  };
};

// Agrupa proposições por DESTINATÁRIO (membro / unidade / adm. superior) dentro
// de uma correição. Stateless: lê os campos flat já hidratados. O consumidor
// secciona por `tipoDestinatario` e rotula por `rotulo`/`rotuloSecundario`.
export const groupProposicoesPorUnidadeOperacional = (proposicoes) => {
  const grupos = new Map();
  proposicoes.forEach((proposicao) => {
    const destinatarioRef = getDestinatarioRef(proposicao);
    const display = getDestinatarioDisplay(proposicao);
    const entry =
      grupos.get(destinatarioRef) || {
        key: destinatarioRef,
        destinatarioRef,
        unidadeRef: destinatarioRef, // alias de compat
        unidadeId: proposicao.unidadeId || null,
        unidade: proposicao.unidade,
        tipoDestinatario: display.tipoDestinatario,
        rotulo: display.rotulo,
        rotuloSecundario: display.rotuloSecundario,
        total: 0,
      };
    entry.total += 1;
    grupos.set(destinatarioRef, entry);
  });
  return Array.from(grupos.values()).sort((a, b) =>
    (a.rotulo || "").localeCompare(b.rotulo || ""),
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
  const destinatariosTotalPorCorreicao = new Map();

  gruposAbertos.forEach((grupo) => {
    const correicaoRef = getCorreicaoRef(grupo);
    destinatariosTotalPorCorreicao.set(
      correicaoRef,
      (destinatariosTotalPorCorreicao.get(correicaoRef) || 0) + 1,
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
        destinatariosProntos: 0,
        destinatariosTotal: destinatariosTotalPorCorreicao.get(correicaoRef) || 0,
      };
    entry.proposicoesAguardando += grupo.prontas;
    if (grupo.completo) entry.destinatariosProntos += 1;
    correicoes.set(correicaoRef, entry);
  });

  return Array.from(correicoes.values()).sort(
    (a, b) => b.proposicoesAguardando - a.proposicoesAguardando,
  );
};

