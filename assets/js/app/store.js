import { seedState } from "../../data/seed.js";
import { expirarDiligenciasVencidas } from "../domain/diligencias.js";
import { normalizarProposicoesDestinatario } from "../domain/destinatario.js";
import { migrarConteudoProposicoesLongas } from "../domain/migracao-conteudo-proposicoes.js";

// v6: acrescenta o catálogo top-level `avisos` (página Início do CN).
const STORAGE_KEY = "nad-sistema-state-v6";

// Migração legada: o rascunho de minuta deixou de viver em chaves próprias do
// localStorage e passou a integrar o estado (proposicao.rascunhoAvaliacao).
const LEGADO_RASCUNHO_AVALIACAO_PREFIX = "nad-rascunho-avaliacao-";
const limparChavesLegadasRascunhoAvaliacao = () => {
  const legadas = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(LEGADO_RASCUNHO_AVALIACAO_PREFIX)) legadas.push(key);
  }
  legadas.forEach((key) => localStorage.removeItem(key));
};
limparChavesLegadasRascunhoAvaliacao();

const clone = (value) => JSON.parse(JSON.stringify(value));

let expirationDoneThisPageLoad = false;

const aplicarExpiracaoLazy = (state) => {
  // Materializa o agregado Destinatário em proposições legadas (idempotente).
  normalizarProposicoesDestinatario(state);
  const conteudoMigrado = migrarConteudoProposicoesLongas(state);
  if (expirationDoneThisPageLoad) {
    if (conteudoMigrado) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }
  expirationDoneThisPageLoad = true;
  const afetadas = expirarDiligenciasVencidas(state);
  if (conteudoMigrado || afetadas.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  return state;
};

export const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initial = clone(seedState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return aplicarExpiracaoLazy(initial);
  }

  try {
    return aplicarExpiracaoLazy(JSON.parse(stored));
  } catch {
    const fallback = clone(seedState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return aplicarExpiracaoLazy(fallback);
  }
};

export const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const resetState = () => {
  expirationDoneThisPageLoad = false;
  const fresh = clone(seedState);
  saveState(fresh);
  return fresh;
};

export const mutateState = (mutator) => {
  const state = loadState();
  const next = mutator(clone(state)) || state;
  saveState(next);
  return next;
};
