export const RELATORIO_DECISAO_SELECAO_KEY = "nad-corregedor-decisao-relatorio-selecao";

const normalizarIds = (ids) =>
  Array.from(new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === "string" && id) : []));

export const criarEstadoSelecaoRelatorio = ({ ativo = false, ids = [] } = {}) => ({
  ativo: Boolean(ativo),
  ids: normalizarIds(ids),
});

export const carregarEstadoSelecaoRelatorio = (
  storage,
  key = RELATORIO_DECISAO_SELECAO_KEY,
) => {
  try {
    const value = JSON.parse(storage?.getItem(key) || "null");
    return criarEstadoSelecaoRelatorio(value || {});
  } catch {
    try {
      storage?.removeItem(key);
    } catch {
      /* armazenamento indisponível */
    }
    return criarEstadoSelecaoRelatorio();
  }
};

export const salvarEstadoSelecaoRelatorio = (
  storage,
  estado,
  key = RELATORIO_DECISAO_SELECAO_KEY,
) => {
  const normalizado = criarEstadoSelecaoRelatorio(estado);
  try {
    storage?.setItem(key, JSON.stringify(normalizado));
  } catch {
    /* armazenamento indisponível */
  }
  return normalizado;
};

export const reconciliarSelecaoRelatorio = (estado, proposicoes) => {
  const validos = new Set((proposicoes || []).map((proposicao) => proposicao.id));
  const ids = normalizarIds(estado?.ids).filter((id) => validos.has(id));
  return criarEstadoSelecaoRelatorio({ ativo: estado?.ativo, ids });
};

export const atualizarSelecaoVisivel = (ids, proposicoesVisiveis, selecionar) => {
  const resultado = new Set(normalizarIds(ids));
  (proposicoesVisiveis || []).forEach((proposicao) => {
    if (selecionar) resultado.add(proposicao.id);
    else resultado.delete(proposicao.id);
  });
  return Array.from(resultado);
};

export const ordenarProposicoesSelecionadas = (proposicoes, ids) => {
  const selecionados = new Set(normalizarIds(ids));
  return (proposicoes || []).filter((proposicao) => selecionados.has(proposicao.id));
};

export const resumirSelecaoVisivel = (proposicoesVisiveis, ids) => {
  const selecionados = new Set(normalizarIds(ids));
  const visiveis = proposicoesVisiveis || [];
  const selecionadasVisiveis = visiveis.filter((proposicao) => selecionados.has(proposicao.id)).length;
  return {
    totalSelecionadas: selecionados.size,
    selecionadasVisiveis,
    ocultas: Math.max(0, selecionados.size - selecionadasVisiveis),
    estadoTodos:
      visiveis.length === 0 || selecionadasVisiveis === 0
        ? "nenhum"
        : selecionadasVisiveis === visiveis.length
          ? "todos"
          : "parcial",
  };
};
