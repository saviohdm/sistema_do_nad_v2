import { PERSONAS } from "../app/auth.js";
import { mutateState } from "../app/store.js";
import { montarFilaNavegavel } from "../ui/fila-navegavel.js";
import {
  acolherMinutasDaCorreicao,
  deferirAvaliacao,
  removerAvaliacao,
} from "../domain/avaliacoes.js";
import {
  getAvaliacaoVigente,
  getUltimaComprovacao,
  listProposicoesAguardandoDecisao,
} from "../domain/proposicoes.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { StatusFilaOperacional } from "../domain/filas-operacionais.js";
import {
  renderBadge,
  renderFilaExcertoComprovacao,
  renderFilaExcertoMinuta,
  renderFilaProposicaoEditorial,
} from "../ui/components.js";
import { confirmarEExecutarDevolucaoMinuta } from "../ui/confirmacoes.js";
import { CONTEXTO_NAVEGACAO_DECISAO_KEY } from "../ui/fila-contexto-navegacao.js";

const temAvaliacaoVigente = (proposicao) => Boolean(proposicao.avaliacaoVigenteId);
const temRascunhoDecisao = (proposicao) => Boolean(proposicao.rascunhoDecisaoCN);

const detalheHref = (proposicao, acao) =>
  `/pages/proposicao-detalhe.html?id=${proposicao.id}&from=corregedor-decisao${acao ? `&acao=${acao}` : ""}`;

// Zona de ação do card, condicionada ao estado: acolher/devolver mutam na
// própria fila; afastar/decidir/retomar levam ao detalhe já posicionado (acao=).
const renderAcoesCard = (proposicao) => {
  if (temRascunhoDecisao(proposicao)) {
    return `<a class="button" href="${detalheHref(proposicao, "retomar")}">Retomar decisão</a>`;
  }
  if (temAvaliacaoVigente(proposicao)) {
    const acolher = `<button class="button" type="button" data-action="acolher-minuta" data-proposicao-id="${proposicao.id}">Acolher minuta</button>`;
    const afastar = `<a class="button button--ghost" href="${detalheHref(proposicao, "afastar")}">Afastar e decidir</a>`;
    const devolver = `<button class="button button--danger" type="button" data-action="devolver-minuta" data-proposicao-id="${proposicao.id}">Devolver minuta</button>`;
    return `${acolher}${afastar}${devolver}`;
  }
  return `<a class="button" href="${detalheHref(proposicao, "decidir")}">Decidir diretamente</a>`;
};

const renderCard = (proposicao, index, view) => {
  const comAvaliacao = temAvaliacaoVigente(proposicao);
  const rascunho = temRascunhoDecisao(proposicao);
  const statusBadge = rascunho
    ? renderBadge("Rascunho salvo", "warning")
    : renderBadge(
        comAvaliacao ? "Decidir minuta vigente" : "Decidir diretamente",
        comAvaliacao ? "primary" : "warning",
      );
  // Prévia do insumo da decisão: minuta vigente ou, na decisão direta, a comprovação.
  const excerto = comAvaliacao
    ? renderFilaExcertoMinuta(getAvaliacaoVigente(proposicao), { view })
    : renderFilaExcertoComprovacao(getUltimaComprovacao(proposicao), { view });
  return renderFilaProposicaoEditorial(proposicao, {
    href: detalheHref(proposicao),
    badges: statusBadge,
    actions: renderAcoesCard(proposicao),
    excerto,
    attributes: `data-proposicao-id="${proposicao.id}"`,
    view,
    index,
  });
};

// Triagem do lote por correição: só minutas vigentes sem rascunho de decisão
// do CN entram; as demais são contadas para o aviso e a confirmação.
const classificarMinutasDaCorreicao = (currentState, correicaoId) => {
  const resultado = { elegiveis: 0, semMinuta: 0, comRascunho: 0 };
  listProposicoesAguardandoDecisao(currentState)
    .filter((proposicao) => proposicao.correicaoId === correicaoId)
    .forEach((proposicao) => {
      if (!temAvaliacaoVigente(proposicao)) {
        resultado.semMinuta += 1;
      } else if (temRascunhoDecisao(proposicao)) {
        resultado.comRascunho += 1;
      } else {
        resultado.elegiveis += 1;
      }
    });
  return resultado;
};

const descreverForaDoLote = ({ semMinuta, comRascunho }) => {
  const partes = [];
  if (semMinuta > 0) partes.push(`${semMinuta} sem minuta`);
  if (comRascunho > 0) partes.push(`${comRascunho} com rascunho de decisão seu`);
  return partes;
};

const renderAcoesCorreicao = (correicaoId, ctx) => {
  if (!correicaoId) return "";
  const triagem = classificarMinutasDaCorreicao(ctx.state, correicaoId);
  const bloqueado = triagem.elegiveis === 0;
  const disabled = bloqueado ? " disabled" : "";
  const title = bloqueado
    ? ` title="Nenhuma minuta apta ao acolhimento em lote nesta correição."`
    : ` title="Registra a decisão por acolhimento integral de ${triagem.elegiveis} minuta(s), uma a uma."`;
  const fora = descreverForaDoLote(triagem);
  const aviso = fora.length ? `<span class="muted">Fora do lote: ${fora.join(" · ")}.</span>` : "";
  return `
    <div class="stack">
      <div class="button-row">
        <button class="button" type="button" data-action="acolher-minutas-correicao" data-correicao-id="${correicaoId}"${disabled}${title}>Acolher todas as minutas</button>
      </div>
      ${aviso}
    </div>
  `;
};

const handleAcolherMinuta = (proposicaoId, ctx) => {
  if (!proposicaoId) return;
  const alvo = ctx.state.proposicoes.find((proposicao) => proposicao.id === proposicaoId);
  if (!alvo || !temAvaliacaoVigente(alvo)) return;
  const confirmar = window.confirm(
    `Acolher a minuta de ${alvo.numero} e registrar a decisão do Corregedor Nacional?`,
  );
  if (!confirmar) return;
  mutateState((draft) => {
    const proposicao = draft.proposicoes.find((entry) => entry.id === proposicaoId);
    if (proposicao) deferirAvaliacao(proposicao);
    return draft;
  });
  ctx.render();
};

const handleDevolverMinuta = (proposicaoId, ctx) => {
  if (!proposicaoId) return;
  confirmarEExecutarDevolucaoMinuta({
    confirmar: (mensagem) => window.confirm(mensagem),
    devolver: () => {
      mutateState((draft) => {
        const proposicao = draft.proposicoes.find((entry) => entry.id === proposicaoId);
        if (proposicao) removerAvaliacao(proposicao);
        return draft;
      });
      ctx.render();
    },
  });
};

const handleAcolherMinutasCorreicao = (correicaoId, ctx) => {
  if (!correicaoId) return;
  const triagem = classificarMinutasDaCorreicao(ctx.state, correicaoId);
  if (triagem.elegiveis === 0) {
    window.alert("Nenhuma minuta apta ao acolhimento em lote nesta correição.");
    return;
  }
  const fora = descreverForaDoLote(triagem);
  const confirmar = window.confirm(
    `Acolher ${triagem.elegiveis} minuta(s) da correição ${correicaoId} e registrar as decisões do Corregedor Nacional?${
      fora.length ? ` Ficarão de fora: ${fora.join("; ")}.` : ""
    }`,
  );
  if (!confirmar) return;
  let resultado = { acolhidas: 0, semMinuta: 0, comRascunho: 0 };
  mutateState((draft) => {
    resultado = acolherMinutasDaCorreicao(draft, correicaoId);
    return draft;
  });
  const partes = [`${resultado.acolhidas} minuta(s) acolhida(s) e decisão(ões) registrada(s)`];
  const restantes = descreverForaDoLote(resultado);
  if (restantes.length) partes.push(`Permanecem na fila: ${restantes.join("; ")}`);
  window.alert(`${partes.join(". ")}.`);
  ctx.aplicarFiltros({});
};

montarFilaNavegavel({
  statusFila: StatusFilaOperacional.DECISAO,
  persona: PERSONAS.CORREGEDOR,
  activePage: "corregedor-decisao",
  title: "Aguardando decisão",
  storageKey: "nad-corregedor-decisao-filtros",
  navigationContextKey: CONTEXTO_NAVEGACAO_DECISAO_KEY,
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
  renderCorreicaoRowAcoes: (item, ctx) => renderAcoesCorreicao(item.correicaoId, ctx),
  renderFilaHeaderActions: (ctx) =>
    ctx.filtros.correicaoId &&
    !ctx.filtros.destinatarioRef &&
    !ctx.filtros.unidadeRef &&
    !ctx.filtros.unidade &&
    !ctx.filtros.prioridade &&
    !ctx.filtros.sensivel &&
    !ctx.filtros.comRascunho &&
    !ctx.filtros.avaliacao
      ? renderAcoesCorreicao(ctx.filtros.correicaoId, ctx)
      : "",
  renderItens: (filtradas, ctx) =>
    filtradas.map((proposicao, index) => renderCard(proposicao, index, ctx.view)).join(""),
  bindExtra: (ctx) => {
    document.querySelectorAll("[data-action='acolher-minuta']").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        handleAcolherMinuta(btn.dataset.proposicaoId, ctx);
      });
    });
    document.querySelectorAll("[data-action='devolver-minuta']").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        handleDevolverMinuta(btn.dataset.proposicaoId, ctx);
      });
    });
    document.querySelectorAll("[data-action='acolher-minutas-correicao']").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        handleAcolherMinutasCorreicao(btn.dataset.correicaoId, ctx);
      });
    });
  },
});
