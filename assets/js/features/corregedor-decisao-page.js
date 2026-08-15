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
import {
  criarSnapshotRelatorioDecisao,
  ModoRecorteRelatorioDecisao,
} from "../domain/relatorio-decisao.js";
import { openRelatorioDecisaoModal } from "../ui/relatorio-decisao-modal.js";
import {
  atualizarSelecaoVisivel,
  carregarEstadoSelecaoRelatorio,
  ordenarProposicoesSelecionadas,
  reconciliarSelecaoRelatorio,
  resumirSelecaoVisivel,
  salvarEstadoSelecaoRelatorio,
} from "../ui/relatorio-decisao-selecao.js";

const temAvaliacaoVigente = (proposicao) => Boolean(proposicao.avaliacaoVigenteId);
const temRascunhoDecisao = (proposicao) => Boolean(proposicao.rascunhoDecisaoCN);
const escapeAttr = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

let estadoSelecaoRelatorio = carregarEstadoSelecaoRelatorio(sessionStorage);
let focoAposRender = null;
let removerHandlersMenuRelatorio = () => {};

const persistirEstadoSelecao = (proximoEstado) => {
  estadoSelecaoRelatorio = salvarEstadoSelecaoRelatorio(sessionStorage, proximoEstado);
};

const reconciliarSelecao = (proposicoes) => {
  const reconciliado = reconciliarSelecaoRelatorio(estadoSelecaoRelatorio, proposicoes);
  if (reconciliado.ids.join("\u0000") !== estadoSelecaoRelatorio.ids.join("\u0000")) {
    persistirEstadoSelecao(reconciliado);
  }
  return proposicoes;
};

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
    checkboxHtml: estadoSelecaoRelatorio.ativo
      ? `<input type="checkbox" data-relatorio-proposicao-checkbox="${escapeAttr(proposicao.id)}" ${
          estadoSelecaoRelatorio.ids.includes(proposicao.id) ? "checked" : ""
        } aria-label="Selecionar proposição ${escapeAttr(proposicao.numero)} para o relatório" />`
      : "",
    badges: statusBadge,
    actions: renderAcoesCard(proposicao),
    excerto,
    selecionado:
      estadoSelecaoRelatorio.ativo && estadoSelecaoRelatorio.ids.includes(proposicao.id),
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

const renderAcoesCabecalhoFila = (ctx) => {
  const semProposicoes = ctx.proposicoes.length === 0;
  const totalSelecionadas = estadoSelecaoRelatorio.ids.length;
  const gerarRelatorio = `
    <div class="relatorio-action-menu" data-relatorio-action-menu>
      <button
        class="button button--secondary fila-relatorio-button relatorio-action-menu__trigger"
        type="button"
        id="relatorio-action-menu-trigger"
        data-action="toggle-relatorio-menu"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="relatorio-action-menu-options"
        ${semProposicoes ? 'disabled title="Nenhuma proposição disponível para incluir no relatório."' : 'title="Escolha entre as proposições filtradas ou uma seleção manual."'}
      >Gerar relatório <span aria-hidden="true">⌄</span></button>
      <div class="relatorio-action-menu__options" id="relatorio-action-menu-options" role="menu" hidden>
        <button type="button" role="menuitem" data-action="gerar-relatorio-filtradas" ${
          ctx.filtradas.length === 0 ? "disabled" : ""
        }>
          <strong>Gerar das filtradas (${ctx.filtradas.length})</strong>
          <span>Usa exatamente o recorte visível da fila.</span>
        </button>
        <button type="button" role="menuitem" data-action="alternar-selecao-relatorio">
          <strong>${
            estadoSelecaoRelatorio.ativo
              ? `Cancelar seleção (${totalSelecionadas})`
              : "Selecionar proposições…"
          }</strong>
          <span>${
            estadoSelecaoRelatorio.ativo
              ? "Limpa os itens marcados e encerra o modo de seleção."
              : "Escolha uma ou algumas proposições nos cartões."
          }</span>
        </button>
      </div>
    </div>`;
  const acoesDaCorreicao =
    ctx.filtros.correicaoId &&
    !ctx.filtros.destinatarioRef &&
    !ctx.filtros.unidadeRef &&
    !ctx.filtros.unidade &&
    !ctx.filtros.prioridade &&
    !ctx.filtros.sensivel &&
    !ctx.filtros.comRascunho &&
    !ctx.filtros.avaliacao
      ? renderAcoesCorreicao(ctx.filtros.correicaoId, ctx)
      : "";
  return `${gerarRelatorio}${acoesDaCorreicao}`;
};

const handleGerarRelatorioFiltradas = (ctx) => {
  if (!ctx.filtradas.length) return;
  const snapshot = criarSnapshotRelatorioDecisao({
    proposicoes: ctx.filtradas,
    filtros: ctx.filtros,
    modoRecorte: ModoRecorteRelatorioDecisao.FILTRADAS,
  });
  openRelatorioDecisaoModal(snapshot);
};

const handleGerarRelatorioSelecionadas = (ctx) => {
  const selecionadas = ordenarProposicoesSelecionadas(
    ctx.proposicoes,
    estadoSelecaoRelatorio.ids,
  );
  if (!selecionadas.length) return;
  const snapshot = criarSnapshotRelatorioDecisao({
    proposicoes: selecionadas,
    modoRecorte: ModoRecorteRelatorioDecisao.SELECIONADAS,
  });
  openRelatorioDecisaoModal(snapshot);
};

const renderSelecionarTodos = (filtradas) => {
  if (!estadoSelecaoRelatorio.ativo || filtradas.length === 0) return "";
  const resumo = resumirSelecaoVisivel(filtradas, estadoSelecaoRelatorio.ids);
  const texto =
    resumo.estadoTodos === "todos"
      ? `Desmarcar todas as ${filtradas.length} visíveis`
      : resumo.estadoTodos === "parcial"
        ? `${resumo.selecionadasVisiveis} de ${filtradas.length} visíveis selecionadas — marcar restantes`
        : `Selecionar todas as ${filtradas.length} visíveis`;
  return `
    <label class="select-all-row relatorio-select-all">
      <input id="relatorio-select-all" type="checkbox" data-relatorio-select-all data-select-all-state="${resumo.estadoTodos}" ${
        resumo.estadoTodos === "todos" ? "checked" : ""
      } />
      <span><strong>${texto}</strong><small> A seleção será mantida ao alterar os filtros.</small></span>
    </label>`;
};

const renderBarraSelecao = (ctx) => {
  if (!estadoSelecaoRelatorio.ativo) return "";
  const resumo = resumirSelecaoVisivel(ctx.filtradas, estadoSelecaoRelatorio.ids);
  const contador = `${resumo.totalSelecionadas} ${
    resumo.totalSelecionadas === 1 ? "proposição selecionada" : "proposições selecionadas"
  }`;
  return `
    <div class="batch-bar relatorio-selection-bar" id="relatorio-selection-bar" aria-live="polite">
      <div class="batch-bar__header">
        <span class="batch-bar__counter">${contador}</span>
        ${
          resumo.ocultas > 0
            ? `<span class="batch-bar__hint">${resumo.ocultas} ${resumo.ocultas === 1 ? "oculta" : "ocultas"} pelos filtros atuais</span>`
            : '<span class="batch-bar__hint">Seleção manual para PDF e JSON</span>'
        }
      </div>
      <div class="button-row relatorio-selection-bar__actions">
        <button class="button" type="button" data-action="gerar-relatorio-selecionadas" ${
          resumo.totalSelecionadas === 0 ? "disabled" : ""
        }>Gerar relatório das selecionadas</button>
        <button class="button button--ghost" type="button" data-action="cancelar-selecao-relatorio">Cancelar seleção</button>
      </div>
    </div>`;
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
    reconciliarSelecao(
      listProposicoesAguardandoDecisao(state).map((p) => hydrateProposicao(state, p)),
    ),
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
  renderFilaHeaderActions: renderAcoesCabecalhoFila,
  renderItens: (filtradas, ctx) =>
    filtradas.map((proposicao, index) => renderCard(proposicao, index, ctx.view)).join(""),
  renderFilaTopo: (ctx) => renderSelecionarTodos(ctx.filtradas),
  renderFilaRodape: renderBarraSelecao,
  bindExtra: (ctx) => {
    removerHandlersMenuRelatorio();
    removerHandlersMenuRelatorio = () => {};

    const menuRoot = document.querySelector("[data-relatorio-action-menu]");
    const menuTrigger = menuRoot?.querySelector("[data-action='toggle-relatorio-menu']");
    const menu = menuRoot?.querySelector("[role='menu']");
    const getItensMenu = () =>
      Array.from(menu?.querySelectorAll("[role='menuitem']:not([disabled])") || []);
    const fecharMenu = ({ devolverFoco = false } = {}) => {
      if (!menu || !menuTrigger) return;
      menu.hidden = true;
      menuTrigger.setAttribute("aria-expanded", "false");
      if (devolverFoco) menuTrigger.focus();
    };
    const abrirMenu = (foco = "primeiro") => {
      if (!menu || !menuTrigger) return;
      menu.hidden = false;
      menuTrigger.setAttribute("aria-expanded", "true");
      const itens = getItensMenu();
      const alvo = foco === "ultimo" ? itens.at(-1) : itens[0];
      alvo?.focus();
    };

    const handleClickForaMenu = (event) => {
      if (menu && !menu.hidden && !menuRoot?.contains(event.target)) fecharMenu();
    };
    const handleKeydownMenu = (event) => {
      if (!menu || menu.hidden) return;
      const itens = getItensMenu();
      const atual = itens.indexOf(document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        fecharMenu({ devolverFoco: true });
      } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        let proximo = atual;
        if (event.key === "Home") proximo = 0;
        else if (event.key === "End") proximo = itens.length - 1;
        else if (event.key === "ArrowDown") proximo = (atual + 1 + itens.length) % itens.length;
        else proximo = (atual - 1 + itens.length) % itens.length;
        itens[proximo]?.focus();
      }
    };

    menuTrigger?.addEventListener("click", () => {
      if (menu.hidden) abrirMenu();
      else fecharMenu();
    });
    menuTrigger?.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        abrirMenu(event.key === "ArrowUp" ? "ultimo" : "primeiro");
      }
    });
    menu?.addEventListener("keydown", handleKeydownMenu);
    document.addEventListener("click", handleClickForaMenu);
    removerHandlersMenuRelatorio = () => {
      document.removeEventListener("click", handleClickForaMenu);
    };

    document
      .querySelector("[data-action='gerar-relatorio-filtradas']")
      ?.addEventListener("click", () => {
        fecharMenu();
        menuTrigger?.focus();
        handleGerarRelatorioFiltradas(ctx);
      });
    document
      .querySelector("[data-action='alternar-selecao-relatorio']")
      ?.addEventListener("click", () => {
        const ativar = !estadoSelecaoRelatorio.ativo;
        persistirEstadoSelecao({ ativo: ativar, ids: ativar ? estadoSelecaoRelatorio.ids : [] });
        focoAposRender = ativar ? "selecao" : "menu";
        ctx.render();
      });

    document.querySelectorAll("[data-relatorio-proposicao-checkbox]").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        const ids = new Set(estadoSelecaoRelatorio.ids);
        const id = event.currentTarget.dataset.relatorioProposicaoCheckbox;
        if (event.currentTarget.checked) ids.add(id);
        else ids.delete(id);
        persistirEstadoSelecao({ ativo: true, ids: Array.from(ids) });
        ctx.render();
      });
    });

    const selecionarTodas = document.querySelector("[data-relatorio-select-all]");
    if (selecionarTodas) {
      selecionarTodas.indeterminate = selecionarTodas.dataset.selectAllState === "parcial";
      selecionarTodas.addEventListener("change", (event) => {
        const ids = atualizarSelecaoVisivel(
          estadoSelecaoRelatorio.ids,
          ctx.filtradas,
          event.currentTarget.checked,
        );
        persistirEstadoSelecao({ ativo: true, ids });
        focoAposRender = "selecao";
        ctx.render();
      });
    }

    document
      .querySelector("[data-action='gerar-relatorio-selecionadas']")
      ?.addEventListener("click", () => handleGerarRelatorioSelecionadas(ctx));
    document
      .querySelector("[data-action='cancelar-selecao-relatorio']")
      ?.addEventListener("click", () => {
        persistirEstadoSelecao({ ativo: false, ids: [] });
        focoAposRender = "menu";
        ctx.render();
      });

    if (focoAposRender) {
      const seletor =
        focoAposRender === "selecao"
          ? "[data-relatorio-select-all], [data-relatorio-proposicao-checkbox]"
          : "[data-action='toggle-relatorio-menu']";
      focoAposRender = null;
      setTimeout(() => document.querySelector(seletor)?.focus(), 0);
    }

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
