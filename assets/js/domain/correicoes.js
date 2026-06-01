import { StatusCorreicao } from "./enums.js";
import { isProposicaoInativa } from "./proposicoes.js";

const CAMPOS_DESCRITIVOS = [
  "ramoMP",
  "ramoMPNome",
  "tematica",
  "numeroElo",
  "tipo",
  "mp",
  "uf",
  "dataInicio",
  "dataFim",
  "observacoes",
];

export const listCorreicoes = (state) => [...(state.correicoes || [])];

export const getCorreicaoById = (state, id) =>
  (state.correicoes || []).find((correicao) => correicao.id === id) || null;

export const getProposicoesDaCorreicao = (state, correicaoId) =>
  (state.proposicoes || []).filter((p) => p.correicaoId === correicaoId);

const normalizarUf = (uf) => {
  if (Array.isArray(uf)) return uf.map((item) => String(item).trim().toUpperCase()).filter(Boolean);
  if (typeof uf === "string") {
    return uf
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
  }
  return [];
};

const validarCorreicao = ({ ramoMP, ramoMPNome, tematica, numeroElo, dataInicio, dataFim }) => {
  const obrigatorios = { ramoMP, ramoMPNome, tematica, numeroElo, dataInicio, dataFim };
  Object.entries(obrigatorios).forEach(([campo, valor]) => {
    if (!valor || !String(valor).trim()) {
      throw new Error(`Campo obrigatório ausente na correição: ${campo}.`);
    }
  });
  if (dataInicio > dataFim) {
    throw new Error("A data de início da correição não pode ser posterior à data de fim.");
  }
};

export const criarCorreicao = (state, dados) => {
  validarCorreicao(dados);
  const numero = `COR-2026-${String((state.correicoes || []).length + 1).padStart(2, "0")}`;
  const novaCorreicao = {
    id: `corr-${crypto.randomUUID().slice(0, 8)}`,
    numero,
    ramoMP: dados.ramoMP,
    ramoMPNome: dados.ramoMPNome,
    tematica: dados.tematica,
    numeroElo: dados.numeroElo,
    tipo: dados.tipo || "Ordinária",
    mp: dados.mp || "",
    uf: normalizarUf(dados.uf),
    status: StatusCorreicao.ATIVO,
    dataInicio: dados.dataInicio,
    dataFim: dados.dataFim,
    observacoes: dados.observacoes || "",
  };
  if (!state.correicoes) state.correicoes = [];
  state.correicoes.push(novaCorreicao);
  return novaCorreicao;
};

export const editarCorreicao = (correicao, campos) => {
  CAMPOS_DESCRITIVOS.forEach((campo) => {
    if (campos[campo] === undefined) return;
    if (campo === "uf") {
      correicao.uf = normalizarUf(campos.uf);
    } else {
      correicao[campo] = campos[campo];
    }
  });
  validarCorreicao(correicao);
  return correicao;
};

export const marcarReferendada = (correicao) => {
  if (!correicao) return correicao;
  correicao.status = StatusCorreicao.REFERENDADA;
  return correicao;
};

// `status` armazenado guarda apenas ativo/referendada. "encerrada" é derivado:
// a correição encerra quando todas as suas proposições estão inativas.
export const getCorreicaoStatusEfetivo = (state, correicao) => {
  if (!correicao) return StatusCorreicao.ATIVO;
  const proposicoes = getProposicoesDaCorreicao(state, correicao.id);
  if (proposicoes.length > 0 && proposicoes.every(isProposicaoInativa)) {
    return StatusCorreicao.ENCERRADA;
  }
  return correicao.status || StatusCorreicao.ATIVO;
};

// Projeção transitória dos campos descritivos da correição sobre a proposição.
// Deve ser chamada na borda de leitura (render/filtro), NUNCA dentro de mutateState.
export const hydrateProposicao = (state, proposicao) => {
  if (!proposicao) return proposicao;
  const correicao = getCorreicaoById(state, proposicao.correicaoId);
  if (!correicao) return proposicao;
  return {
    ...proposicao,
    ramoMP: correicao.ramoMP,
    ramoMPNome: correicao.ramoMPNome,
    tematica: correicao.tematica,
    numeroElo: correicao.numeroElo,
    uf: correicao.uf || [],
    dataInicioCorreicao: correicao.dataInicio,
    dataFimCorreicao: correicao.dataFim,
    correicao,
  };
};

export const hydrateProposicoes = (state, proposicoes) =>
  proposicoes.map((p) => hydrateProposicao(state, p));
