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
    ? renderBadge("Rascunho salvo", "warning")
    : renderBadge(
        comAvaliacao ? "Decidir minuta vigente" : "Decidir diretamente",
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
  textos: {
    panoramaTitulo: "Panorama da decisão",
    contagemLabel: "Aguardando decisão",
    filaTitulo: "Fila de decisão",
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
      label: "Minuta",
      formatar: (value) => (value === "com" ? "Com minuta submetida" : "Sem minuta"),
    },
  ],
  aplicarFiltrosExtras: (lista, filtros) => {
    if (filtros.avaliacao === "com") return lista.filter(temAvaliacaoVigente);
    if (filtros.avaliacao === "sem") return lista.filter((p) => !temAvaliacaoVigente(p));
    return lista;
  },
  renderFiltrosExtras: (filtros) => `
    <div class="field">
      <label for="filtro-avaliacao">Minuta do membro</label>
      <select id="filtro-avaliacao" name="avaliacao">
        <option value="">Todas</option>
        <option value="com"${filtros.avaliacao === "com" ? " selected" : ""}>Com minuta submetida</option>
        <option value="sem"${filtros.avaliacao === "sem" ? " selected" : ""}>Sem minuta (decisão direta)</option>
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
        label: "Com minuta submetida",
        valor: comAvaliacao,
        filtros: { avaliacao: "com", filaForcada: true },
        title: "Prontas para acolher, afastar ou devolver a minuta do membro auxiliar.",
      },
      {
        label: "Com rascunho a retomar",
        valor: proposicoes.filter(temRascunhoDecisao).length,
        filtros: { comRascunho: true },
        destaque: true,
        title: "Decisões iniciadas e ainda não concluídas.",
      },
    ];
  },
  renderItens: (filtradas) =>
    filtradas.map((proposicao, index) => renderCard(proposicao, index)).join(""),
});
