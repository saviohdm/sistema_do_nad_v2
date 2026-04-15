import { seedState } from "../../data/seed.js";

const STORAGE_KEY = "nad-prototipo-state-v1";

const clone = (value) => JSON.parse(JSON.stringify(value));

export const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initial = clone(seedState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(stored);
  } catch {
    const fallback = clone(seedState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
};

export const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const resetState = () => {
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
