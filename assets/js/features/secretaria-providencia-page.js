import { requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { formatDateTime } from "../app/utils.js";
import { Labels, Prioridade, TipoProvidencia } from "../domain/enums.js";
import { listFilaPendenciasProvidencia } from "../domain/secretaria-filas.js";
import { ehEncaminhamento } from "../domain/proposicoes.js";
import { registrarCumprimentoPendencia } from "../domain/pendencias-secretaria.js";
import {
  renderBadge,
  renderFilaFiltrosAtivos,
  renderFilterToggleChip,
  renderPanoramaKpis,
  renderPrioridadeBadge,
  renderSensivelBadge,
} from "../ui/components.js";

requireAuth();

const LIMITE_ATRASADAS = 10;

const TIPOS_PROVIDENCIA_ORDEM = [
  TipoProvidencia.CORREGEDORIA_LOCAL,
  TipoProvidencia.COCI,
  TipoProvidencia.OUTRA,
];

const LABELS_CURTOS_TIPO = {
  [TipoProvidencia.CORREGEDORIA_LOCAL]: "Corregedoria local",
  [TipoProvidencia.COCI]: "COCI",
  [TipoProvidencia.OUTRA]: "Outra providência",
};

// Estado de UI efêmero: sobrevive aos re-renders, some no F5 (filtros ficam na URL).
let painelFiltrosAberto = false;
const formulariosAbertos = new Set();
let focoBuscaPendente = false;

const escapeAttr = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const diasDesde = (iso, hoje = new Date()) => {
  if (!iso) return null;
  const inicio = new Date(iso);
  if (Number.isNaN(inicio.getTime())) return null;
  return Math.max(0, Math.floor((hoje - inicio) / 86400000));
};

const isAtrasada = (pendencia, hoje) =>
  pendencia.status === "pendente" &&
  (diasDesde(pendencia.dataCriacao, hoje) ?? 0) > LIMITE_ATRASADAS;

// Data local (não usar toISOString: é UTC e vira "amanhã" à noite em BRT).
const hojeInputDate = () => {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
};

const getFiltrosFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    atrasadas: params.get("atrasadas") === "1",
    tipos: params.getAll("tipo"),
    correicaoId: params.get("correicao") || "",
    busca: params.get("q") || "",
  };
};

const setFiltrosInUrl = (filtros, { replace = false } = {}) => {
  const params = new URLSearchParams();
  if (filtros.atrasadas) params.set("atrasadas", "1");
  filtros.tipos.forEach((tipo) => params.append("tipo", tipo));
  if (filtros.correicaoId) params.set("correicao", filtros.correicaoId);
  if (filtros.busca) params.set("q", filtros.busca);
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  const urlAtual = `${window.location.pathname}${window.location.search}`;
  // Digitação usa replace (não polui o histórico); ações discretas usam push,
  // exceto quando nada mudou.
  if (replace || newUrl === urlAtual) {
    window.history.replaceState({}, "", newUrl);
  } else {
    window.history.pushState({}, "", newUrl);
  }
};

const aplicarFiltros = (novos, { replace = false, manterFocoBusca = false } = {}) => {
  focoBuscaPendente = manterFocoBusca;
  setFiltrosInUrl(novos, { replace });
  render();
};

const temFiltroAtivo = (filtros) =>
  filtros.atrasadas ||
  filtros.tipos.length > 0 ||
  Boolean(filtros.correicaoId) ||
  Boolean(filtros.busca);

// Achata uma proposição em N entradas (uma por pendência pendente),
// com referência cruzada à proposição-mãe para enriquecimento de contexto.
const flattenPendencias = (proposicoes) => {
  const itens = [];
  proposicoes.forEach((proposicao) => {
    (proposicao.pendenciasSecretaria || [])
      .filter((p) => p.status === "pendente")
      .forEach((pendencia) => {
        itens.push({ proposicao, pendencia });
      });
  });
  return itens;
};

const aplicarFiltrosNasPendencias = (itens, filtros, hoje) => {
  const tiposAtivos = new Set(filtros.tipos);
  const buscaNorm = normalize(filtros.busca);

  return itens.filter(({ proposicao, pendencia }) => {
    if (filtros.atrasadas && !isAtrasada(pendencia, hoje)) return false;
    if (tiposAtivos.size > 0 && !tiposAtivos.has(pendencia.tipoProvidencia))
      return false;
    if (filtros.correicaoId && proposicao.correicaoId !== filtros.correicaoId)
      return false;
    if (buscaNorm) {
      const haystack = `${proposicao.numero || ""} ${pendencia.descricao || ""}`;
      if (!normalize(haystack).includes(buscaNorm)) return false;
    }
    return true;
  });
};

// Reagrupa itens por proposição preservando ordem global (mais antigo primeiro).
const agruparPorProposicao = (itens, hoje) => {
  const grupos = new Map();
  itens.forEach(({ proposicao, pendencia }) => {
    const entry = grupos.get(proposicao.id) || {
      proposicao,
      pendencias: [],
      maiorDias: -1,
    };
    entry.pendencias.push(pendencia);
    const dias = diasDesde(pendencia.dataCriacao, hoje) ?? 0;
    if (dias > entry.maiorDias) entry.maiorDias = dias;
    grupos.set(proposicao.id, entry);
  });

  return Array.from(grupos.values())
    .map((grupo) => ({
      ...grupo,
      pendencias: grupo.pendencias
        .slice()
        .sort(
          (a, b) =>
            (diasDesde(b.dataCriacao, hoje) ?? 0) -
            (diasDesde(a.dataCriacao, hoje) ?? 0),
        ),
    }))
    .sort((a, b) => b.maiorDias - a.maiorDias);
};

const contarPorTipo = (itens) => {
  const counts = { [TipoProvidencia.CORREGEDORIA_LOCAL]: 0, [TipoProvidencia.COCI]: 0, [TipoProvidencia.OUTRA]: 0 };
  itens.forEach(({ pendencia }) => {
    if (counts[pendencia.tipoProvidencia] !== undefined) {
      counts[pendencia.tipoProvidencia] += 1;
    }
  });
  return counts;
};

const correicoesDistintas = (todas) => {
  const set = new Set();
  todas.forEach((proposicao) => {
    if (proposicao.correicaoId) set.add(proposicao.correicaoId);
  });
  return Array.from(set).sort();
};

const renderConclusaoBadge = (juizo) => {
  if (!juizo || !juizo.tipoConclusao) return "";
  const label = Labels.tipoConclusao[juizo.tipoConclusao] || juizo.tipoConclusao;
  const tone = juizo.tipoConclusao === "nao_cumprida" ? "danger" : "warning";
  return renderBadge(`Conclusão: ${label}`, tone);
};

const renderFundamentos = (proposicao, pendenciaId) => {
  const texto = proposicao.apreciacaoDoCN?.observacoes;
  if (!texto || !String(texto).trim()) {
    return ehEncaminhamento(proposicao)
      ? `<p class="muted">Providência originada de Encaminhamento da correição, convertido no referendo (não há decisão do CN).</p>`
      : `<p class="muted">Sem fundamentos registrados na decisão.</p>`;
  }
  const safe = escapeAttr(texto).replace(/\n/g, "<br />");
  return `
    <details class="fundamentos" data-fundamentos="${pendenciaId}">
      <summary>Fundamentos da decisão que originou a providência</summary>
      <p>${safe}</p>
    </details>
  `;
};

const renderPanorama = (todosItens, hoje) => {
  const atrasadas = todosItens.filter(({ pendencia }) => isAtrasada(pendencia, hoje)).length;
  return `
    <div class="panel">
      <h3 class="panel__title">Panorama das providências</h3>
      ${renderPanoramaKpis([
        {
          label: "Providências pendentes",
          valor: todosItens.length,
          filtros: { atrasadas: false },
          title: "Ver todas as providências pendentes",
        },
        {
          label: `Atrasadas (mais de ${LIMITE_ATRASADAS} dias)`,
          valor: atrasadas,
          filtros: { atrasadas: true },
          destaque: true,
          title: "Ver apenas as providências atrasadas",
        },
      ])}
    </div>
  `;
};

const renderHeaderProposicao = (proposicao) => {
  const badges = [
    renderSensivelBadge(proposicao.sensivel),
    proposicao.prioridade && proposicao.prioridade !== Prioridade.NORMAL
      ? renderPrioridadeBadge(proposicao.prioridade)
      : "",
    renderConclusaoBadge(proposicao.apreciacaoDoCN),
  ]
    .filter(Boolean)
    .join("");

  const metadados = [
    proposicao.correicaoId ? `Correição ${escapeAttr(proposicao.correicaoId)}` : "",
    proposicao.membro ? `Membro: ${escapeAttr(proposicao.membro)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <header class="providencia-group__header">
      <div>
        <h3 class="providencia-group__title">${proposicao.numero} · ${proposicao.unidade || "—"}</h3>
        <p class="muted providencia-group__subtitle">${proposicao.tipo || ""}${
          proposicao.descricao
            ? ` — ${escapeAttr(proposicao.descricao).slice(0, 160)}${proposicao.descricao.length > 160 ? "…" : ""}`
            : ""
        }</p>
        ${metadados ? `<p class="muted providencia-group__meta">${metadados}</p>` : ""}
      </div>
      <a class="button button--ghost button--small" href="proposicao-detalhe.html?id=${escapeAttr(proposicao.id)}&from=secretaria-providencia">Abrir proposição</a>
    </header>
    ${badges ? `<div class="pill-list">${badges}</div>` : ""}
  `;
};

const renderFormCumprimento = (chave) => `
  <form class="providencia-item__form" data-pendencia-form="${chave}">
    <div class="field">
      <label>Data de cumprimento</label>
      <input type="date" name="dataCumprimento" value="${hojeInputDate()}" required />
    </div>
    <div class="field">
      <label>Observações</label>
      <textarea name="observacoes" placeholder="Resumo do despacho externo (ofício, número, destinatário, data efetiva)."></textarea>
    </div>
    <div class="button-row">
      <button class="button button--small" type="submit">Registrar cumprimento</button>
      <button class="button button--ghost button--small" type="button" data-cancel-form="${chave}">Cancelar</button>
    </div>
  </form>
`;

const renderCardPendencia = (proposicao, pendencia, hoje) => {
  const dias = diasDesde(pendencia.dataCriacao, hoje);
  const atrasada = isAtrasada(pendencia, hoje);
  const labelTipo = Labels.tipoProvidencia[pendencia.tipoProvidencia] || pendencia.tipoProvidencia;
  const chave = `${escapeAttr(proposicao.id)}:${escapeAttr(pendencia.id)}`;
  const aberto = formulariosAbertos.has(`${proposicao.id}:${pendencia.id}`);
  const labelDias = dias === 1 ? "Há 1 dia em aberto" : `Há ${dias} dias em aberto`;
  // Evita texto duplicado quando a descrição repete o rótulo do tipo (overline).
  const mostraDescricao = normalize(pendencia.descricao) !== normalize(labelTipo);

  return `
    <article class="providencia-item${atrasada ? " providencia-item--atrasada" : ""}">
      <div class="providencia-item__topline">
        <p class="acervo-overline">${labelTipo}</p>
        ${dias !== null ? renderBadge(labelDias, atrasada ? "danger" : "neutral") : ""}
      </div>
      ${mostraDescricao ? `<h4 class="providencia-item__title">${escapeAttr(pendencia.descricao)}</h4>` : ""}
      <p class="muted providencia-item__meta">Criada em ${formatDateTime(pendencia.dataCriacao)}</p>
      ${renderFundamentos(proposicao, pendencia.id)}
      <div class="providencia-item__actions">
        ${
          aberto
            ? renderFormCumprimento(chave)
            : `<button class="button button--small" type="button" data-toggle-form="${chave}">Registrar cumprimento</button>`
        }
      </div>
    </article>
  `;
};

const renderFila = (grupos, hoje, totalCarregadoSemFiltro) => {
  if (!grupos.length) {
    const msg = totalCarregadoSemFiltro
      ? "Nenhuma providência atende aos filtros selecionados."
      : "Nenhuma providência pendente no momento.";
    return `<div class="empty-state">${msg}</div>`;
  }

  return `
    <div class="stack">
      ${grupos
        .map(
          (grupo) => `
            <section class="providencia-group">
              ${renderHeaderProposicao(grupo.proposicao)}
              <div class="providencia-list">
                ${grupo.pendencias
                  .map((pendencia) => renderCardPendencia(grupo.proposicao, pendencia, hoje))
                  .join("")}
              </div>
            </section>
          `,
        )
        .join("")}
    </div>
  `;
};

const renderToolbar = (filtros, countsTipo, correicoes) => {
  const tiposAtivos = new Set(filtros.tipos);
  const filtrosAvancados = filtros.tipos.length + (filtros.correicaoId ? 1 : 0);

  const chipsTipo = TIPOS_PROVIDENCIA_ORDEM.map((tipo) =>
    renderFilterToggleChip({
      label: LABELS_CURTOS_TIPO[tipo],
      value: tipo,
      count: countsTipo[tipo],
      active: tiposAtivos.has(tipo),
    }),
  ).join("");

  const correicaoOptions = [`<option value="">Todas as correições</option>`]
    .concat(
      correicoes.map(
        (id) =>
          `<option value="${escapeAttr(id)}" ${filtros.correicaoId === id ? "selected" : ""}>${escapeAttr(id)}</option>`,
      ),
    )
    .join("");

  return `
    <div class="providencia-toolbar" data-toolbar>
      <div class="providencia-toolbar__row">
        <form class="acervo-filter-search providencia-toolbar__search" data-busca-form role="search">
          <input id="filtro-busca" name="busca" type="search"
            placeholder="Número da proposição ou descrição"
            aria-label="Buscar por número da proposição ou descrição"
            value="${escapeAttr(filtros.busca)}" />
        </form>
        ${
          temFiltroAtivo(filtros)
            ? `<button class="button button--ghost button--small" type="button" data-action="limpar">Limpar filtros</button>`
            : ""
        }
      </div>
      <details class="providencia-filtros" data-filtros-disclosure${painelFiltrosAberto ? " open" : ""}>
        <summary>Filtros${filtrosAvancados ? `<span class="providencia-filtros__count">${filtrosAvancados}</span>` : ""}</summary>
        <div class="providencia-filtros__body">
          <div class="field providencia-filtros__correicao">
            <label for="filtro-correicao">Correição-mãe</label>
            <select id="filtro-correicao" name="correicao">
              ${correicaoOptions}
            </select>
          </div>
          <div class="field">
            <label id="filtro-tipo-label">Tipo de providência</label>
            <div class="acervo-filter-chips" role="group" aria-labelledby="filtro-tipo-label">${chipsTipo}</div>
          </div>
        </div>
      </details>
    </div>
  `;
};

const buildChipsFiltrosAtivos = (filtros) => {
  const chips = [];
  if (filtros.atrasadas) chips.push({ key: "atrasadas", label: "Somente atrasadas" });
  filtros.tipos.forEach((tipo) =>
    chips.push({ key: `tipo:${tipo}`, label: LABELS_CURTOS_TIPO[tipo] || tipo }),
  );
  if (filtros.correicaoId) chips.push({ key: "correicao", label: `Correição ${filtros.correicaoId}` });
  if (filtros.busca) chips.push({ key: "q", label: `Busca: “${filtros.busca}”` });
  return chips;
};

const bindPanorama = () => {
  document.querySelectorAll("[data-kpi-filtros]").forEach((kpi) => {
    kpi.addEventListener("click", () =>
      aplicarFiltros({ ...getFiltrosFromUrl(), ...JSON.parse(kpi.dataset.kpiFiltros) }),
    );
  });
};

const bindToolbar = () => {
  const toolbar = document.querySelector("[data-toolbar]");
  if (!toolbar) return;

  const buscaInput = toolbar.querySelector("#filtro-busca");
  const buscaForm = toolbar.querySelector("[data-busca-form]");
  if (buscaInput && buscaForm) {
    let debounce = null;
    const aplicarBusca = (opcoes) =>
      aplicarFiltros({ ...getFiltrosFromUrl(), busca: buscaInput.value }, opcoes);

    buscaInput.addEventListener("input", () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(
        () => aplicarBusca({ replace: true, manterFocoBusca: true }),
        300,
      );
    });
    buscaForm.addEventListener("submit", (event) => {
      event.preventDefault();
      window.clearTimeout(debounce);
      aplicarBusca({ manterFocoBusca: true });
    });
  }

  toolbar.querySelector("#filtro-correicao")?.addEventListener("change", (event) => {
    aplicarFiltros({ ...getFiltrosFromUrl(), correicaoId: event.target.value || "" });
  });

  toolbar.querySelectorAll("[data-toggle-status]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const atuais = getFiltrosFromUrl();
      const tipo = chip.dataset.toggleStatus;
      const tipos = atuais.tipos.includes(tipo)
        ? atuais.tipos.filter((item) => item !== tipo)
        : [...atuais.tipos, tipo];
      aplicarFiltros({ ...atuais, tipos });
    });
  });

  toolbar.querySelector("[data-action='limpar']")?.addEventListener("click", () => {
    aplicarFiltros({ atrasadas: false, tipos: [], correicaoId: "", busca: "" });
  });

  // Abrir/fechar o painel só alterna a linha de chips ativos — sem re-render,
  // para não perder o foco do summary.
  const disclosure = toolbar.querySelector("[data-filtros-disclosure]");
  disclosure?.addEventListener("toggle", () => {
    painelFiltrosAberto = disclosure.open;
    const chipsRow = document.querySelector("[data-chips-ativos]");
    if (chipsRow) chipsRow.hidden = painelFiltrosAberto;
  });
};

const bindFiltrosAtivos = () => {
  document.querySelectorAll("[data-remove-filtro]").forEach((botao) => {
    botao.addEventListener("click", () => {
      const atuais = getFiltrosFromUrl();
      const chave = botao.dataset.removeFiltro;
      if (chave === "q") {
        aplicarFiltros({ ...atuais, busca: "" });
      } else if (chave === "correicao") {
        aplicarFiltros({ ...atuais, correicaoId: "" });
      } else if (chave === "atrasadas") {
        aplicarFiltros({ ...atuais, atrasadas: false });
      } else if (chave.startsWith("tipo:")) {
        const tipo = chave.slice("tipo:".length);
        aplicarFiltros({ ...atuais, tipos: atuais.tipos.filter((item) => item !== tipo) });
      }
    });
  });
};

const bindCards = () => {
  document.querySelectorAll("[data-toggle-form]").forEach((botao) => {
    botao.addEventListener("click", () => {
      const chave = botao.dataset.toggleForm;
      formulariosAbertos.add(chave);
      render();
      document
        .querySelector(`[data-pendencia-form="${chave}"] input[name="dataCumprimento"]`)
        ?.focus();
    });
  });

  document.querySelectorAll("[data-cancel-form]").forEach((botao) => {
    botao.addEventListener("click", () => {
      formulariosAbertos.delete(botao.dataset.cancelForm);
      render();
    });
  });

  document.querySelectorAll("[data-pendencia-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const chave = event.currentTarget.dataset.pendenciaForm;
      const [proposicaoId, pendenciaId] = chave.split(":");
      const data = new FormData(event.currentTarget);

      mutateState((draft) => {
        const proposicao = draft.proposicoes.find((item) => item.id === proposicaoId);
        if (!proposicao) return draft;

        registrarCumprimentoPendencia(proposicao, pendenciaId, {
          dataCumprimento: data.get("dataCumprimento"),
          observacoes: data.get("observacoes"),
        });

        return draft;
      });

      formulariosAbertos.delete(chave);
      render();
    });
  });
};

const restaurarFocoBusca = () => {
  if (!focoBuscaPendente) return;
  focoBuscaPendente = false;
  const input = document.querySelector("#filtro-busca");
  if (!input) return;
  const fim = input.value.length;
  input.focus();
  input.setSelectionRange(fim, fim);
};

const render = () => {
  const filtros = getFiltrosFromUrl();
  const currentState = state();
  const hoje = new Date();
  const proposicoesComPendencias = listFilaPendenciasProvidencia(currentState);
  const correicoes = correicoesDistintas(proposicoesComPendencias);

  const todosItens = flattenPendencias(proposicoesComPendencias);
  const itensFiltrados = aplicarFiltrosNasPendencias(todosItens, filtros, hoje);
  const grupos = agruparPorProposicao(itensFiltrados, hoje);
  // Contagem dos chips de tipo: todos os filtros aplicados, exceto o próprio tipo
  // (cada chip mostra o que aquele toggle traria; sem tipo ativo ≡ totalizadores).
  const countsTipo = contarPorTipo(
    aplicarFiltrosNasPendencias(todosItens, { ...filtros, tipos: [] }, hoje),
  );

  const titulo = filtros.atrasadas ? "Providências pendentes atrasadas" : "Providências pendentes";
  const chipsAtivos = buildChipsFiltrosAtivos(filtros);

  mountPage({
    activePage: "secretaria-providencia",
    title: titulo,
    actions: baseActions,
    content: `
      <section class="stack">
        ${renderPanorama(todosItens, hoje)}
        <div class="panel">
          <h2 class="panel__title">${titulo} ${renderBadge(`${itensFiltrados.length}`, itensFiltrados.length ? "warning" : "neutral")}</h2>
          ${renderToolbar(filtros, countsTipo, correicoes)}
          ${
            chipsAtivos.length
              ? `<div data-chips-ativos${painelFiltrosAberto ? " hidden" : ""}>${renderFilaFiltrosAtivos(chipsAtivos)}</div>`
              : ""
          }
        </div>
        ${renderFila(grupos, hoje, todosItens.length)}
      </section>
    `,
  });

  bindPanorama();
  bindToolbar();
  bindFiltrosAtivos();
  bindCards();
  restaurarFocoBusca();
};

window.addEventListener("popstate", render);

render();
