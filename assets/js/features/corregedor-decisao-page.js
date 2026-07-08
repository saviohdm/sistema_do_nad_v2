import { PERSONAS } from "../app/auth.js";
import { montarFilaNavegavel } from "../ui/fila-navegavel.js";
import { listProposicoesAguardandoDecisao } from "../domain/proposicoes.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { StatusFilaOperacional } from "../domain/filas-operacionais.js";
import { renderBadge, renderFilaProposicaoEditorial } from "../ui/components.js";

const temAvaliacaoVigente = (proposicao) => Boolean(proposicao.avaliacaoVigenteId);
const temRascunhoDecisao = (proposicao) => Boolean(proposicao.rascunhoDecisaoCN);

const renderCard = (proposicao, index) => {
  const comAvaliacao = temAvaliacaoVigente(proposicao);
  const rascunho = temRascunhoDecisao(proposicao);
  const statusBadge = rascunho
    ? renderBadge("Rascunho de decisão", "warning")
    : renderBadge(
        comAvaliacao ? "Decidir avaliação vigente" : "Avaliar diretamente",
        comAvaliacao ? "primary" : "warning",
      );
  return renderFilaProposicaoEditorial(proposicao, {
    href: `/pages/proposicao-detalhe.html?id=${proposicao.id}&from=corregedor-decisao`,
    badges: statusBadge,
    cta: rascunho ? "Retomar decisão" : "Abrir para decidir",
    index,
  });
};

montarFilaNavegavel({
  statusFila: StatusFilaOperacional.DECISAO,
  persona: PERSONAS.CORREGEDOR,
  activePage: "corregedor-decisao",
  title: "Aguardando decisão",
  storageKey: "nad-corregedor-decisao-filtros",
  subtitlePorModo: {
    overview:
      "Proposições que retornaram com avaliação do membro auxiliar ou que aguardam sua avaliação direta com força de decisão.",
    correicao: "Escolha um destinatário dentro da correição para entrar na fila de decisão.",
    fila: "Decida cada proposição. Badges indicam se há avaliação submetida (deferir/indeferir), rascunho de decisão em andamento, ou se cabe avaliação direta.",
  },
  textos: {
    panoramaTitulo: "Panorama da decisão",
    panoramaIntro:
      "Proposições que aguardam sua decisão. Quando há avaliação do membro auxiliar submetida, você pode deferir (homologa as invariantes) ou indeferir (redefine as invariantes na mesma decisão). Sem avaliação vigente, pode avaliar diretamente com força de decisão.",
    contagemLabel: "Aguardando decisão",
    porCorreicaoHint: "Clique em uma correição para ver seus destinatários.",
    unidadesHint: "Clique em um destinatário para entrar na fila de decisão.",
    filaTitulo: "Fila de decisão",
    filaIntroVazia: "Todas as proposições aguardando sua decisão.",
    emptyCorreicoes: "Nenhuma correição com proposições aguardando decisão.",
    emptyUnidades: "Nenhum destinatário nesta correição com proposições aguardando decisão.",
    emptyFila: "Nenhuma proposição corresponde aos filtros selecionados.",
    contadorIntro: "Restam para decidir com esta seleção:",
    totalSistemaLabel: "Total aguardando decisão no sistema",
  },
  getProposicoes: (state) =>
    listProposicoesAguardandoDecisao(state).map((p) => hydrateProposicao(state, p)),
  rascunho: {
    label: "Somente com rascunho",
    detectar: (proposicao) => Boolean(proposicao.rascunhoDecisaoCN),
  },
  filtrosExtras: [
    {
      key: "avaliacao",
      tipo: "string",
      label: "Avaliação",
      formatar: (value) => (value === "com" ? "Com avaliação submetida" : "Sem avaliação"),
    },
  ],
  aplicarFiltrosExtras: (lista, filtros) => {
    if (filtros.avaliacao === "com") return lista.filter(temAvaliacaoVigente);
    if (filtros.avaliacao === "sem") return lista.filter((p) => !temAvaliacaoVigente(p));
    return lista;
  },
  renderFiltrosExtras: (filtros) => `
    <div class="field">
      <label for="filtro-avaliacao">Avaliação do membro</label>
      <select id="filtro-avaliacao" name="avaliacao">
        <option value="">Todas</option>
        <option value="com"${filtros.avaliacao === "com" ? " selected" : ""}>Com avaliação submetida</option>
        <option value="sem"${filtros.avaliacao === "sem" ? " selected" : ""}>Sem avaliação (decisão direta)</option>
      </select>
    </div>
  `,
  getKpis: (proposicoes) => {
    const comAvaliacao = proposicoes.filter(temAvaliacaoVigente).length;
    return [
      {
        label: "Aguardando sua decisão",
        valor: proposicoes.length,
        filtros: { filaForcada: true },
      },
      {
        label: "Com avaliação submetida",
        valor: comAvaliacao,
        filtros: { avaliacao: "com", filaForcada: true },
        title: "Prontas para deferir ou indeferir a avaliação do membro auxiliar.",
      },
      {
        label: "Sem avaliação (decisão direta)",
        valor: proposicoes.length - comAvaliacao,
        filtros: { avaliacao: "sem", filaForcada: true },
        title: "Exigem avaliação direta com força de decisão.",
      },
    ];
  },
  renderItens: (filtradas) =>
    filtradas.map((proposicao, index) => renderCard(proposicao, index)).join(""),
});
