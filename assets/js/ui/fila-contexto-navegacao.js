export const FILA_NAVEGACAO_VERSION = 1;
export const CONTEXTO_NAVEGACAO_DECISAO_KEY = "nad-corregedor-decisao-navegacao";
export const CAMINHO_FILA_DECISAO = "/pages/corregedor-decisao.html";

const ORIGEM_INTERNA = "http://nad.local";

const normalizarHrefInterno = (href, caminhoPermitido) => {
  if (!href || !caminhoPermitido) return null;
  try {
    const url = new URL(href, ORIGEM_INTERNA);
    if (url.origin !== ORIGEM_INTERNA || url.pathname !== caminhoPermitido) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
};

const idsValidos = (ids) =>
  Array.isArray(ids) &&
  ids.every((id) => typeof id === "string" && id.trim() && id === id.trim()) &&
  new Set(ids).size === ids.length;

export const salvarContextoNavegacaoFila = ({ storage, key, ids, returnHref }) => {
  if (!storage || !key || !idsValidos(ids)) return false;
  try {
    storage.setItem(
      key,
      JSON.stringify({
        version: FILA_NAVEGACAO_VERSION,
        ids: [...ids],
        returnHref,
      }),
    );
    return true;
  } catch {
    return false;
  }
};

export const lerContextoNavegacaoFila = ({ storage, key, caminhoPermitido }) => {
  if (!storage || !key) return null;
  try {
    const contexto = JSON.parse(storage.getItem(key) || "null");
    if (
      contexto?.version !== FILA_NAVEGACAO_VERSION ||
      !idsValidos(contexto.ids)
    ) {
      return null;
    }
    const returnHref = normalizarHrefInterno(contexto.returnHref, caminhoPermitido);
    if (!returnHref) return null;
    return { ...contexto, returnHref };
  } catch {
    return null;
  }
};

export const resolverDestinoNavegacaoFila = ({ contexto, currentId, validIds }) => {
  if (!contexto || !currentId || !idsValidos(contexto.ids)) return { type: "missing" };
  const currentIndex = contexto.ids.indexOf(currentId);
  if (currentIndex < 0) return { type: "missing" };

  if (currentIndex === contexto.ids.length - 1) {
    return { type: "last", returnHref: contexto.returnHref };
  }

  const validos = new Set(Array.from(validIds || []));
  const nextId = contexto.ids.slice(currentIndex + 1).find((id) => validos.has(id));
  return nextId
    ? { type: "next", nextId, returnHref: contexto.returnHref }
    : { type: "exhausted", returnHref: contexto.returnHref };
};
