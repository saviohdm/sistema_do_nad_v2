const PREFIX = "nad-rascunho-avaliacao-";

const rascunhoKey = (proposicaoId) => `${PREFIX}${proposicaoId}`;

export const salvarRascunhoAvaliacao = (proposicaoId, juizo) => {
  const payload = { juizo, savedAt: new Date().toISOString() };
  localStorage.setItem(rascunhoKey(proposicaoId), JSON.stringify(payload));
  return payload;
};

export const obterRascunhoAvaliacao = (proposicaoId) => {
  const raw = localStorage.getItem(rascunhoKey(proposicaoId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const removerRascunhoAvaliacao = (proposicaoId) => {
  localStorage.removeItem(rascunhoKey(proposicaoId));
};

export const listarIdsComRascunho = () => {
  const ids = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) {
      ids.push(key.slice(PREFIX.length));
    }
  }
  return ids;
};
