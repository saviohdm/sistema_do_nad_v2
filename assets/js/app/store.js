import { seedState } from "../../data/seed.js";
import { expirarDiligenciasVencidas } from "../domain/diligencias.js";

const STORAGE_KEY = "nad-sistema-state-v2";

const clone = (value) => JSON.parse(JSON.stringify(value));

let expirationDoneThisPageLoad = false;

const aplicarExpiracaoLazy = (state) => {
  if (expirationDoneThisPageLoad) return state;
  expirationDoneThisPageLoad = true;
  const afetadas = expirarDiligenciasVencidas(state);
  if (afetadas.length > 0) {
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
