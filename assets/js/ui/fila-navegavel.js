// Controlador/render compartilhado das filas com drill-down.
//
// Hierarquia: Panorama (Por correição) -> Destinatários da correição -> Fila de proposições.
// Estado vive na URL (pushState + popstate) e é espelhado em sessionStorage. Cada página
// injeta apenas a fonte de dados e suas ações próprias via `config` (ver Hooks abaixo).
//
// Hooks de config:
//   activePage, title, storageKey, persona            -> identidade/guard
//   statusFila                                        -> status contabilizados no panorama
//   subtitlePorModo: { overview, correicao, fila }     -> subtítulo por modo
//   textos                                             -> rótulos/empty-states (ver defaults)
//   getProposicoes(state)                              -> lista já hidratada (obrigatório)
//   prepare(state) -> extras                           -> dados por render (ex.: idsComRascunho)
//   getKpis(proposicoes, ctx)                          -> KPIs do panorama (obrigatório):
//       [{ label, valor, filtros?, destaque?, title? }]. Com `filtros` e valor > 0 o KPI
//       é clicável e aplica os filtros na própria fila (incluir filaForcada: true).
//   renderItens(filtradas, ctx)                        -> HTML dos cards da fila (obrigatório)
//   renderCorreicaoRowAcoes(item, ctx)   (opcional)    -> célula extra de ações nas correições
//   renderOverviewActions(ctx)           (opcional)    -> botões extras no panorama
//   renderFilaHeaderActions(ctx)         (opcional)    -> botões extras no cabeçalho da fila
//   filtrosExtras: [{ key, tipo, label, formatar }]    -> filtros e chips ativos próprios
//   rascunho: { label, detectar(p, ctx), exclusivo } (opcional) -> filtro "Somente com rascunho".
//       Por padrão é "afunilador": filtro OFF mostra tudo, ON restringe aos detectados.
//       Com `exclusivo: true` vira "segregado": os detectados ficam fora do panorama e da
//       fila padrão (filtro OFF), e só aparecem — sozinhos — com o filtro ON.
//   bindExtra(ctx)                       (opcional)    -> handlers próprios da persona
//
// ctx = { filtros, proposicoes, filtradas, extras, state, aplicarFiltros, render }

import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { getCurrentPersona, requireAuth } from "../app/auth.js";
import { filtrarProposicoes } from "../domain/proposicoes.js";
import {
  getDestinatarioRef,
  getDestinatarioDisplay,
  groupProposicoesPorUnidadeOperacional,
  listGruposOperacionaisDaFila,
  listPanoramaFilaPorCorreicao,
} from "../domain/filas-operacionais.js";
import { Labels, TipoDestinatario } from "../domain/enums.js";
import {
  renderBadge,
  renderEmptyState,
  renderFilaEmptyState,
  renderFilaFiltrosAtivos,
  renderFilaOperacionalHeader,
  renderPanoramaKpis,
} from "../ui/components.js";

const escapeAttr = (value) => String(value ?? "").replace(/"/g, "&quot;");
const uniq = (values) => Array.from(new Set(values.filter(Boolean)));
const optionTag = (value, label, selected) =>
  `<option value="${escapeAttr(value)}"${selected === value ? " selected" : ""}>${label}</option>`;

const BASE_KEYS = ["correicaoId", "destinatarioRef", "unidadeRef", "unidade", "prioridade", "sensivel"];

// Seções do painel "Destinatários", em ordem de prioridade (adm. superior no
// topo). Cada uma só é renderizada se tiver ao menos um destinatário.
const SECOES_DESTINATARIO = [
  { tipo: TipoDestinatario.ADMINISTRACAO_SUPERIOR, titulo: "Administração Superior", coluna: "Administração Superior" },
  { tipo: TipoDestinatario.UNIDADE, titulo: "Unidades", coluna: "Unidade" },
  { tipo: TipoDestinatario.MEMBRO, titulo: "Membros", coluna: "Membro" },
];

export function montarFilaNavegavel(config) {
  requireAuth();
  if (config.persona && getCurrentPersona() !== config.persona) {
    window.location.href = "/pages/dashboard.html";
    return;
  }

  const temRascunho = Boolean(config.rascunho);
  const filtrosExtras = config.filtrosExtras || []; // [{ key, tipo: "string" | "bool" }]
  const FILA_KEYS = [
    "destinatarioRef",
    "unidadeRef",
    "unidade",
    "prioridade",
    "sensivel",
    ...(temRascunho ? ["comRascunho"] : []),
    ...filtrosExtras.map((f) => f.key),
  ];
  const textos = config.textos || {};
  const contagemLabel = textos.contagemLabel || "Proposições";
  const itemSingular = textos.itemSingular || "proposição";
  const itemPlural = textos.itemPlural || "proposições";

  // --- URL <-> filtros (tolerante: aceita fila=1 e filaForcada=1; ignora chaves legadas) ---
  const getFiltrosFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const filtros = {};
    BASE_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) filtros[key] = value;
    });
    if (temRascunho && params.get("comRascunho") === "1") filtros.comRascunho = true;
    filtrosExtras.forEach((f) => {
      const value = params.get(f.key);
      if (f.tipo === "bool") {
        if (value === "1") filtros[f.key] = true;
      } else if (value) {
        filtros[f.key] = value;
      }
    });
    if (params.get("fila") === "1" || params.get("filaForcada") === "1") filtros.filaForcada = true;
    return filtros;
  };

  const setFiltrosInUrl = (filtros) => {
    const params = new URLSearchParams();
    BASE_KEYS.forEach((key) => {
      if (filtros[key]) params.set(key, filtros[key]);
    });
    if (temRascunho && filtros.comRascunho) params.set("comRascunho", "1");
    filtrosExtras.forEach((f) => {
      if (!filtros[f.key]) return;
      params.set(f.key, f.tipo === "bool" ? "1" : filtros[f.key]);
    });
    if (filtros.filaForcada) params.set("fila", "1");
    const query = params.toString();
    window.history.pushState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  };

  const persistirFiltros = (filtros) => {
    if (config.storageKey) sessionStorage.setItem(config.storageKey, JSON.stringify(filtros));
  };

  const determinarModo = (filtros) => {
    if (filtros.filaForcada || FILA_KEYS.some((key) => filtros[key])) return "fila";
    if (filtros.correicaoId) return "correicao";
    return "overview";
  };

  const aplicarFiltros = (novos) => {
    setFiltrosInUrl(novos);
    render();
  };

  // --- Panorama: KPIs + tabela "Por correição" ---
  const renderOverview = (proposicoes, ctx) => {
    const correicoes = listPanoramaFilaPorCorreicao(ctx.state, config.statusFila);
    const temAcoes = typeof config.renderCorreicaoRowAcoes === "function";
    const rows = correicoes.length
      ? correicoes
          .map(
            (item) => `
            <tr data-nav-correicao="${escapeAttr(item.correicaoId || "")}">
              <td><strong>${item.correicaoId || "—"}</strong></td>
              <td>${item.ramoMP || "—"}</td>
              <td class="numeric">${item.proposicoesAguardando}</td>
              <td class="numeric">${item.destinatariosProntos} / ${item.destinatariosTotal}</td>
              ${temAcoes ? `<td>${config.renderCorreicaoRowAcoes(item, ctx)}</td>` : ""}
            </tr>`,
          )
          .join("")
      : `<tr><td colspan="${temAcoes ? 5 : 4}">${renderEmptyState(
          textos.emptyCorreicoes || "Nenhuma correição nesta fila.",
        )}</td></tr>`;

    return `
      <section class="stack">
        <div class="panel">
          <h3 class="panel__title">${textos.panoramaTitulo || "Panorama"}</h3>
          ${textos.panoramaIntro ? `<p class="muted">${textos.panoramaIntro}</p>` : ""}
          ${renderPanoramaKpis(config.getKpis(proposicoes, ctx))}
          <div class="button-row" style="margin-top: 1rem;">
            <button class="button" type="button" data-action="ver-todas">Ver todas em uma fila</button>
            ${config.renderOverviewActions ? config.renderOverviewActions(ctx) : ""}
          </div>
        </div>

        <div class="panel">
          <h3 class="panel__title">Por correição</h3>
          <p class="muted">${textos.porCorreicaoHint || "Clique em uma correição para ver seus destinatários."}</p>
          <div class="table-wrap">
            <table class="table table--hover">
              <thead>
                <tr><th>Correição</th><th>Ramo</th><th class="numeric">Proposições aguardando</th><th class="numeric">Destinatários prontos / total</th>${temAcoes ? "<th>Ações</th>" : ""}</tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </section>`;
  };

  // --- Unidades de uma correição ---
  const renderModoCorreicao = (proposicoes, filtros, ctx) => {
    const daCorreicao = proposicoes.filter((p) => p.correicaoId === filtros.correicaoId);
    const destinatarios = groupProposicoesPorUnidadeOperacional(daCorreicao);
    // "Pronto" = mesmo critério do panorama (todas as proposições abertas daquele
    // destinatário estão nesta fila). Ref bate com o agrupamento acima.
    const prontasRefs = new Set(
      listGruposOperacionaisDaFila(ctx.state, config.statusFila)
        .filter((g) => g.correicaoId === filtros.correicaoId && g.completo)
        .map((g) => g.destinatarioRef),
    );
    // Prontos primeiro, depois alfabético pelo rótulo (cópia local).
    const ordenar = (lista) =>
      lista.slice().sort((a, b) => {
        const pa = prontasRefs.has(a.destinatarioRef);
        const pb = prontasRefs.has(b.destinatarioRef);
        if (pa !== pb) return pa ? -1 : 1;
        return (a.rotulo || "").localeCompare(b.rotulo || "");
      });
    const totalProntos = destinatarios.filter((d) => prontasRefs.has(d.destinatarioRef)).length;
    const ramoMP = daCorreicao[0]?.ramoMP || "";
    const ramoMPNome = daCorreicao[0]?.ramoMPNome || "";

    const renderLinha = (item) => {
      const pronta = prontasRefs.has(item.destinatarioRef);
      const secundario = item.rotuloSecundario
        ? `<div class="muted proposicao-card__support">${item.rotuloSecundario}</div>`
        : "";
      return `
            <tr data-nav-destinatario-ref="${escapeAttr(item.destinatarioRef)}"${
              pronta ? ' class="unidade-row--pronta"' : ""
            }>
              <td><strong>${item.rotulo}</strong>${
                pronta ? ` ${renderBadge("Pronta", "success")}` : ""
              }${secundario}</td>
              <td class="numeric">${item.total}</td>
            </tr>`;
    };

    // Subseções em ordem de prioridade; vazias são ocultadas (decisão de grill).
    const subsecoes = SECOES_DESTINATARIO.map((secao) => {
      const itens = ordenar(destinatarios.filter((d) => d.tipoDestinatario === secao.tipo));
      if (itens.length === 0) return "";
      return `
        <div class="fila-destinatarios-secao">
          <p class="fila-operacional-overline">${secao.titulo} · ${itens.length}</p>
          <div class="table-wrap">
            <table class="table table--hover">
              <thead><tr><th>${secao.coluna}</th><th class="numeric">${contagemLabel}</th></tr></thead>
              <tbody>${itens.map(renderLinha).join("")}</tbody>
            </table>
          </div>
        </div>`;
    }).join("");

    return `
      <section class="stack">
        <div class="panel">
          <div class="button-row" style="justify-content: space-between; align-items: baseline;">
            <div>
              <h3 class="panel__title">${filtros.correicaoId || "—"}${ramoMP ? ` — ${ramoMP}` : ""}${
                ramoMPNome ? ` · ${ramoMPNome}` : ""
              }</h3>
              <p class="muted">${daCorreicao.length} proposição(ões) nesta correição.</p>
            </div>
            <div class="button-row">
              <button class="button" type="button" data-action="ver-todas-da-correicao">Ver todas desta correição</button>
              <button class="button button--ghost" type="button" data-action="voltar-overview">Voltar ao panorama</button>
            </div>
          </div>
        </div>

        <div class="panel">
          <h3 class="panel__title">Destinatários</h3>
          <p class="muted">${textos.unidadesHint || "Clique em um destinatário para entrar na fila."}</p>
          ${
            destinatarios.length
              ? `<p class="muted"><strong>${totalProntos}</strong> de ${destinatarios.length} destinatário(s) pronto(s) para esta etapa.</p>`
              : ""
          }
          ${
            destinatarios.length
              ? subsecoes
              : renderEmptyState(textos.emptyUnidades || "Nenhum destinatário nesta correição.")
          }
        </div>
      </section>`;
  };

  // --- Painel de filtros (só atributos da proposição: prioridade, sensível, rascunho) ---
  const renderPainelFiltros = (proposicoes, filtros, ctx) => {
    const prioridades = uniq(proposicoes.map((p) => p.prioridade));
    const prioOpts = prioridades
      .map((v) => optionTag(v, Labels.prioridade[v] || v, filtros.prioridade || ""))
      .join("");
    const rascunhoField = temRascunho
      ? `
        <div class="field">
          <label for="filtro-rascunho">${config.rascunho.label || "Somente com rascunho"}</label>
          <select id="filtro-rascunho" name="comRascunho">
            <option value="">Não</option>
            <option value="1"${filtros.comRascunho ? " selected" : ""}>Sim</option>
          </select>
        </div>`
      : "";

    return `
      <form class="fila-operacional-filtros" id="painel-filtros">
        <header class="fila-operacional-filtros__head">
          <p class="fila-operacional-overline">Refinamento</p>
          <h3 class="fila-operacional-filtros__title">Filtros da fila</h3>
          <p class="fila-operacional-filtros__intro">Refine a seleção sem perder o contexto operacional atual.</p>
        </header>
        <div class="fila-operacional-filtros__fields">
          <div class="field">
            <label for="filtro-prioridade">Prioridade</label>
            <select id="filtro-prioridade" name="prioridade">
              <option value="">Todas</option>
              ${prioOpts}
            </select>
          </div>
          <div class="field">
            <label for="filtro-sensivel">Sensível</label>
            <select id="filtro-sensivel" name="sensivel">
              <option value="">Todas</option>
              ${optionTag("sim", "Sim", filtros.sensivel || "")}
              ${optionTag("nao", "Não", filtros.sensivel || "")}
            </select>
          </div>
          ${rascunhoField}
          ${config.renderFiltrosExtras ? config.renderFiltrosExtras(filtros, ctx) : ""}
        </div>
        <div class="button-row fila-operacional-filtros__actions">
          <button class="button" type="submit">Aplicar filtros</button>
          <button class="button button--ghost" type="button" data-action="limpar-filtros">Limpar filtros</button>
        </div>
      </form>`;
  };

  const buildFiltrosAtivos = (filtros, ctx) => {
    const chips = [];
    if (filtros.prioridade) {
      chips.push({
        key: "prioridade",
        label: `Prioridade: ${Labels.prioridade[filtros.prioridade] || filtros.prioridade}`,
      });
    }
    if (filtros.sensivel) {
      chips.push({
        key: "sensivel",
        label: `Sensível: ${filtros.sensivel === "sim" ? "Sim" : "Não"}`,
      });
    }
    if (temRascunho && filtros.comRascunho) {
      chips.push({
        key: "comRascunho",
        label: config.rascunho.label || "Somente com rascunho",
      });
    }
    filtrosExtras.forEach((filtro) => {
      const value = filtros[filtro.key];
      if (!value) return;
      const formatted = filtro.formatar ? filtro.formatar(value, ctx) : value;
      const label = filtro.label || filtro.key;
      chips.push({
        key: filtro.key,
        label:
          filtro.tipo === "bool"
            ? label
            : filtro.key === "textoBusca"
              ? `Busca: "${formatted}"`
              : `${label}: ${formatted}`,
      });
    });
    return chips;
  };

  const filtrarParaFila = (proposicoes, filtros, ctx) => {
    let lista = filtrarProposicoes(proposicoes, {
      correicaoId: filtros.correicaoId,
      prioridade: filtros.prioridade,
      sensivel: filtros.sensivel,
    });
    // `unidadeRef` é aceito como alias de `destinatarioRef` (deep-links do dashboard
    // apontam id:<unidadeId>, que casa com getDestinatarioRef de unidade/adm. superior).
    const ref = filtros.destinatarioRef || filtros.unidadeRef;
    if (ref) {
      lista = lista.filter((p) => getDestinatarioRef(p) === ref);
    } else if (filtros.unidade) {
      lista = lista.filter((p) => p.unidade === filtros.unidade);
    }
    if (temRascunho) {
      if (config.rascunho.exclusivo) {
        // Segregado: OFF mostra só os não-detectados; ON mostra só os detectados.
        lista = lista.filter((p) =>
          filtros.comRascunho
            ? config.rascunho.detectar(p, ctx)
            : !config.rascunho.detectar(p, ctx),
        );
      } else if (filtros.comRascunho) {
        // Afunilador: ON restringe aos detectados.
        lista = lista.filter((p) => config.rascunho.detectar(p, ctx));
      }
    }
    if (config.aplicarFiltrosExtras) {
      lista = config.aplicarFiltrosExtras(lista, filtros, ctx);
    }
    return lista;
  };

  // --- Fila de proposições ---
  const renderModoFila = (proposicoes, filtros, ctx) => {
    const filtradas = filtrarParaFila(proposicoes, filtros, ctx);
    ctx.filtradas = filtradas;

    let totalUniverso = proposicoes.length;
    if (temRascunho && config.rascunho.exclusivo) {
      totalUniverso = proposicoes.filter((p) =>
        filtros.comRascunho
          ? config.rascunho.detectar(p, ctx)
          : !config.rascunho.detectar(p, ctx),
      ).length;
    }

    const itens = filtradas.length
      ? config.renderItens(filtradas, ctx)
      : renderFilaEmptyState(
          textos.emptyFila || "Nenhuma proposição corresponde aos filtros selecionados.",
        );

    // Rótulo do destinatário selecionado, ciente do tipo (membro / unidade / adm. superior).
    const dispSel = filtradas[0] ? getDestinatarioDisplay(filtradas[0]) : null;
    const tipoLabel = dispSel ? Labels.tipoDestinatario[dispSel.tipoDestinatario] : "Destinatário";
    const temDestinatario = filtros.destinatarioRef || filtros.unidadeRef || filtros.unidade;
    const contexto = [
      filtros.correicaoId ? `Correição: <strong>${filtros.correicaoId}</strong>` : null,
      temDestinatario
        ? `${tipoLabel}: <strong>${
            dispSel?.rotulo || filtros.unidade || filtros.destinatarioRef || filtros.unidadeRef
          }</strong>`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const headerActions = `
      <button class="button button--ghost" type="button" data-action="voltar-overview">Panorama</button>
      ${
        filtros.correicaoId
          ? `<button class="button button--ghost" type="button" data-action="voltar-correicao">Destinatários da correição</button>`
          : ""
      }
      ${config.renderFilaHeaderActions ? config.renderFilaHeaderActions(ctx) : ""}`;
    const filtrosAtivos = buildFiltrosAtivos(filtros, ctx);

    return `
      <section class="stack">
        ${renderFilaOperacionalHeader({
          title: textos.filaTitulo || "Fila",
          intro: textos.filaIntroVazia || "Todas as proposições desta fila.",
          contexto,
          visiveis: filtradas.length,
          total: totalUniverso,
          itemSingular,
          itemPlural,
          actions: headerActions,
        })}
        ${renderFilaFiltrosAtivos(filtrosAtivos)}
        <div class="page-grid page-grid--two fila-operacional-corpo">
          <div class="stack">
            ${config.renderFilaTopo ? config.renderFilaTopo(ctx) : ""}
            <div class="fila-operacional-list">${itens}</div>
            ${config.renderFilaRodape ? config.renderFilaRodape(ctx) : ""}
          </div>

          <aside class="fila-operacional-sidebar">
            ${renderPainelFiltros(proposicoes, filtros, ctx)}
          </aside>
        </div>
      </section>`;
  };

  const render = () => {
    const filtros = getFiltrosFromUrl();
    persistirFiltros(filtros);

    const currentState = state();
    const proposicoes = config.getProposicoes(currentState);
    const extras = config.prepare ? config.prepare(currentState) : {};
    const ctx = { filtros, proposicoes, filtradas: [], extras, state: currentState, aplicarFiltros, render };

    // No modo segregado, os detectados (ex.: rascunhos) ficam fora do panorama e do drill-down
    // por correição; eles só são alcançados pela fila com o filtro "Somente com rascunho".
    const panorama =
      temRascunho && config.rascunho.exclusivo
        ? proposicoes.filter((p) => !config.rascunho.detectar(p, ctx))
        : proposicoes;

    const modo = determinarModo(filtros);
    let content;
    if (modo === "overview") content = renderOverview(panorama, ctx);
    else if (modo === "correicao") content = renderModoCorreicao(panorama, filtros, ctx);
    else content = renderModoFila(proposicoes, filtros, ctx);

    mountPage({
      activePage: config.activePage,
      title: config.title,
      subtitle: (config.subtitlePorModo && config.subtitlePorModo[modo]) || "",
      actions: baseActions,
      content,
    });

    bindHandlers(filtros, ctx);
  };

  const bindHandlers = (filtros, ctx) => {
    document.querySelectorAll("[data-nav-correicao]").forEach((row) => {
      const correicao = row.dataset.navCorreicao;
      if (!correicao) return;
      row.addEventListener("click", () => aplicarFiltros({ correicaoId: correicao }));
    });

    document.querySelectorAll("[data-nav-destinatario-ref]").forEach((row) => {
      row.addEventListener("click", () =>
        aplicarFiltros({
          correicaoId: filtros.correicaoId,
          destinatarioRef: row.dataset.navDestinatarioRef,
        }),
      );
    });

    document.querySelectorAll("[data-kpi-filtros]").forEach((kpi) => {
      kpi.addEventListener("click", () => aplicarFiltros(JSON.parse(kpi.dataset.kpiFiltros)));
    });

    document
      .querySelector("[data-action='ver-todas']")
      ?.addEventListener("click", () => aplicarFiltros({ filaForcada: true }));

    document
      .querySelector("[data-action='ver-todas-da-correicao']")
      ?.addEventListener("click", () =>
        aplicarFiltros({ correicaoId: filtros.correicaoId, filaForcada: true }),
      );

    document
      .querySelector("[data-action='voltar-overview']")
      ?.addEventListener("click", () => aplicarFiltros({}));

    document
      .querySelector("[data-action='voltar-correicao']")
      ?.addEventListener("click", () => aplicarFiltros({ correicaoId: filtros.correicaoId }));

    document.querySelector("[data-action='limpar-filtros']")?.addEventListener("click", () => {
      aplicarFiltros({
        correicaoId: filtros.correicaoId,
        destinatarioRef: filtros.destinatarioRef,
        unidadeRef: filtros.unidadeRef,
        unidade: filtros.unidade,
        filaForcada: !filtros.destinatarioRef && !filtros.unidadeRef && !filtros.unidade,
      });
    });

    document.querySelectorAll("[data-remove-filtro]").forEach((button) => {
      button.addEventListener("click", () => {
        const novos = { ...filtros, filaForcada: true };
        delete novos[button.dataset.removeFiltro];
        aplicarFiltros(novos);
      });
    });

    document.querySelector("#painel-filtros")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const novos = {
        correicaoId: filtros.correicaoId || "",
        destinatarioRef: filtros.destinatarioRef || "",
        unidadeRef: filtros.unidadeRef || "",
        unidade: filtros.unidade || "",
        prioridade: data.get("prioridade") || "",
        sensivel: data.get("sensivel") || "",
        filaForcada: true,
      };
      if (temRascunho) novos.comRascunho = data.get("comRascunho") === "1";
      filtrosExtras.forEach((f) => {
        if (f.tipo === "bool") novos[f.key] = data.get(f.key) === "1";
        else novos[f.key] = data.get(f.key) || "";
      });
      aplicarFiltros(novos);
    });

    if (config.bindExtra) config.bindExtra(ctx);
  };

  window.addEventListener("popstate", render);
  render();
}
