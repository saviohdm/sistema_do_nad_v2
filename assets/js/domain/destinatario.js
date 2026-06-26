import { TipoDestinatario } from "./enums.js";

// Agregado `Destinatário` da proposição: a quem ela está ORIENTADA (membro XOR
// unidade XOR administração superior). É estável/imutável após ativação. A pessoa
// de carne e osso ("usuário notificado") é RESOLVIDA por comunicação (ver resolver).
//
// Este módulo é a única borda de acesso ao "Banco de Cadastro de Membros e Unidades
// do CNMP" — no protótipo, simulado por `state.diretorioCnmp`. Isolar aqui facilita
// trocar pela integração real depois. Não importa de `correicionados.js` (evita ciclo).

const getMembros = (state) => state?.diretorioCnmp?.membros || [];
const getUnidades = (state) => state?.diretorioCnmp?.unidades || [];
const getAdmSuperiores = (state) => state?.diretorioCnmp?.administracoesSuperiores || [];

export const findMembroById = (state, id) =>
  getMembros(state).find((m) => m.id === id) || null;

export const findUnidadeById = (state, id) =>
  getUnidades(state).find((u) => u.id === id) || null;

// Responsável atual de uma unidade no cadastro: o primeiro membro que a chefia.
// Pode ser null (unidade vaga) — ver decisão de bloqueio na comunicação.
export const findResponsavelAtualUnidade = (state, unidadeId) =>
  getMembros(state).find((m) => (m.chefiaDeUnidadeIds || []).includes(unidadeId)) || null;

export const listAdmSuperiores = (state) => [...getAdmSuperiores(state)];

export const findAdmSuperior = (state, ref = {}) =>
  getAdmSuperiores(state).find(
    (a) => a.ramoMP === ref.ramoMP && a.tipo === ref.tipo,
  ) || null;

export const listUsuariosAdmSuperior = (state, adm) => {
  if (!adm) return [];
  return (adm.usuarioIds || []).map((id) => findMembroById(state, id)).filter(Boolean);
};

// --- Construtores do agregado ---

export const criarDestinatarioMembro = (membroId, unidadeOrigemSnapshot = null) => ({
  tipo: TipoDestinatario.MEMBRO,
  membroId,
  ...(unidadeOrigemSnapshot ? { unidadeOrigemSnapshot } : {}),
});

export const criarDestinatarioUnidade = (unidadeId) => ({
  tipo: TipoDestinatario.UNIDADE,
  unidadeId,
});

export const criarDestinatarioAdmSuperior = (ramoMP, tipo) => ({
  tipo: TipoDestinatario.ADMINISTRACAO_SUPERIOR,
  administracaoSuperior: { ramoMP, tipo },
});

// --- Derivação/normalização (migração de proposições legadas achatadas) ---

// Deriva o agregado a partir dos campos flat antigos: membroId preenchido => membro
// (com a unidade legada virando snapshot de origem); membroId nulo => unidade.
// Administração superior nunca é derivada — precisa de agregado explícito.
export const deriveDestinatario = (proposicao) => {
  if (proposicao?.destinatario) return proposicao.destinatario;
  if (proposicao?.membroId) {
    const snapshot = proposicao.unidadeId
      ? { unidadeId: proposicao.unidadeId, unidade: proposicao.unidade || "" }
      : null;
    return criarDestinatarioMembro(proposicao.membroId, snapshot);
  }
  return criarDestinatarioUnidade(proposicao.unidadeId || null);
};

export const getDestinatario = (proposicao) =>
  proposicao?.destinatario || deriveDestinatario(proposicao);

export const getTipoDestinatario = (proposicao) => getDestinatario(proposicao).tipo;

// Garante que toda proposição em state tenha o agregado materializado (fonte da
// verdade). Idempotente; chamada na borda de carga do state.
export const normalizarProposicoesDestinatario = (state) => {
  (state?.proposicoes || []).forEach((p) => {
    if (!p.destinatario) p.destinatario = deriveDestinatario(p);
  });
  return state;
};

// --- Resolução da pessoa de carne e osso (decisões 3, 7, 8, 10) ---
// Retorna { tipo, sugeridos[], candidatos[], vago }.
// `sugeridos` = quem o cadastro/parametrização indica AGORA (default da comunicação).
// `candidatos` = todos os membros (válvula universal: a Secretaria pode trocar).
// `vago` = não há ninguém indicado (orientação-unidade sem responsável atual).
export const resolverUsuariosDestinatarios = (state, proposicao) => {
  const dest = getDestinatario(proposicao);
  const candidatos = getMembros(state);

  if (dest.tipo === TipoDestinatario.MEMBRO) {
    const membro = findMembroById(state, dest.membroId);
    const sugeridos = membro ? [membro] : [];
    return { tipo: dest.tipo, sugeridos, candidatos, vago: sugeridos.length === 0 };
  }

  if (dest.tipo === TipoDestinatario.UNIDADE) {
    const responsavel = findResponsavelAtualUnidade(state, dest.unidadeId);
    const sugeridos = responsavel ? [responsavel] : [];
    return { tipo: dest.tipo, sugeridos, candidatos, vago: sugeridos.length === 0 };
  }

  const adm = findAdmSuperior(state, dest.administracaoSuperior);
  const sugeridos = listUsuariosAdmSuperior(state, adm);
  return { tipo: dest.tipo, sugeridos, candidatos, vago: sugeridos.length === 0 };
};

// Compat: resolvedor de UM destinatário (primeiro sugerido). Para fluxos antigos
// que ainda esperam um único recebedor.
export const resolverUsuarioDestinatario = (state, proposicao) =>
  resolverUsuariosDestinatarios(state, proposicao).sugeridos[0] || null;

// --- Projeção de exibição (campos flat de compatibilidade) ---
// Deriva unidadeId/unidade/membroId/membro a partir do agregado, para telas e
// agrupamentos que ainda leem os campos antigos. Usar só na borda de leitura.
export const projetarDestinatario = (state, proposicao) => {
  const dest = getDestinatario(proposicao);

  if (dest.tipo === TipoDestinatario.MEMBRO) {
    const membro = findMembroById(state, dest.membroId);
    const snap = dest.unidadeOrigemSnapshot || {};
    return {
      membroId: dest.membroId,
      membro: membro?.nome || proposicao.membro || "",
      unidadeId: snap.unidadeId || null,
      unidade: snap.unidade || "",
    };
  }

  if (dest.tipo === TipoDestinatario.UNIDADE) {
    const unidade = findUnidadeById(state, dest.unidadeId);
    return {
      membroId: null,
      membro: "",
      unidadeId: dest.unidadeId,
      unidade: unidade?.nome || proposicao.unidade || "",
    };
  }

  const adm = findAdmSuperior(state, dest.administracaoSuperior);
  return {
    membroId: null,
    membro: "",
    unidadeId: adm?.id || null,
    unidade: adm?.nome || proposicao.unidade || "",
  };
};
