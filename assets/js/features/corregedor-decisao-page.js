import { PERSONAS, getCurrentPersona, requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import {
  filtrarProposicoes,
  groupByCorreicao,
  groupByRamoMP,
  groupByUnidade,
  listProposicoesAguardandoDecisao,
} from "../domain/proposicoes.js";
import { renderBadge, renderEmptyState, renderStatCard } from "../ui/components.js";

requireAuth();

if (getCurrentPersona() !== PERSONAS.CORREGEDOR) {
  window.location.href = "/pages/dashboard.html";
}

const FILTROS_KEY = "nad-corregedor-decisao-filtros";

const getFiltrosFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const filtros = {};
  ["ramoMP", "unidade", "correicaoId", "prioridade", "tematica", "uf"].forEach((key) => {
    const value = params.get(key);
    if (value) filtros[key] = value;
  });
  if (params.get("fila") === "1") filtros.filaForcada = true;
  return filtros;
};

const setFiltrosInUrl = (filtros) => {
  const params = new URLSearchParams();
  if (filtros.ramoMP) params.set("ramoMP", filtros.ramoMP);
  if (filtros.unidade) params.set("unidade", filtros.unidade);
  if (filtros.correicaoId) params.set("correicaoId", filtros.correicaoId);
  if (filtros.prioridade) params.set("prioridade", filtros.prioridade);
  if (filtros.tematica) params.set("tematica", filtros.tematica);
  if (filtros.uf) params.set("uf", filtros.uf);
  if (filtros.filaForcada) params.set("fila", "1");
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.pushState({}, "", newUrl);
};

const persistirFiltros = (filtros) => {
  sessionStorage.setItem(FILTROS_KEY, JSON.stringify(filtros));
};

const determinarModo = (filtros) => {
  if (
    filtros.filaForcada ||
    filtros.unidade ||
    filtros.correicaoId ||
    filtros.prioridade ||
    filtros.tematica ||
    filtros.uf
  ) {
    return "fila";
  }
  if (filtros.ramoMP) return "ramo";
  return "overview";
};

const uniq = (values) => Array.from(new Set(values.filter(Boolean)));

const temAvaliacaoVigente = (proposicao) => Boolean(proposicao.avaliacaoVigenteId);

const renderPainelFiltros = (pendentes, filtros) => {
  const prioridades = uniq(pendentes.map((p) => p.prioridade));
  const tematicas = uniq(pendentes.map((p) => p.tematica));
  const ufs = uniq(pendentes.flatMap((p) => p.uf || []));
  const correicoes = uniq(pendentes.map((p) => p.correicaoId));

  const option = (value, label, selected) =>
    `<option value="${value}"${selected === value ? " selected" : ""}>${label}</option>`;

  return `
    <form class="panel stack" id="painel-filtros">
      <h3 class="panel__title">Filtros adicionais</h3>
      <div class="field-grid">
        <div class="field">
          <label for="filtro-prioridade">Prioridade</label>
          <select id="filtro-prioridade" name="prioridade">
            <option value="">Todas</option>
            ${prioridades.map((v) => option(v, v, filtros.prioridade)).join("")}
          </select>
        </div>
        <div class="field">
          <label for="filtro-tematica">Temática</label>
          <select id="filtro-tematica" name="tematica">
            <option value="">Todas</option>
            ${tematicas.map((v) => option(v, v, filtros.tematica)).join("")}
          </select>
        </div>
        <div class="field">
          <label for="filtro-uf">UF</label>
          <select id="filtro-uf" name="uf">
            <option value="">Todas</option>
            ${ufs.map((v) => option(v, v, filtros.uf)).join("")}
          </select>
        </div>
        <div class="field">
          <label for="filtro-correicao">Correição</label>
          <select id="filtro-correicao" name="correicaoId">
            <option value="">Todas</option>
            ${correicoes.map((v) => option(v, v, filtros.correicaoId)).join("")}
          </select>
        </div>
      </div>
      <div class="button-row">
        <button class="button" type="submit">Aplicar filtros</button>
        <button class="button button--ghost" type="button" data-action="limpar-filtros">Limpar filtros adicionais</button>
      </div>
    </form>
  `;
};

const renderCardFila = (proposicao) => {
  const comAvaliacao = temAvaliacaoVigente(proposicao);
  return `
    <a href="/pages/proposicao-detalhe.html?id=${proposicao.id}&fromCorregedor=decisao" class="proposicao-card">
      <div class="proposicao-card__header">
        <div>
          <div class="proposicao-card__numero">${proposicao.numero}</div>
          <div class="proposicao-card__tipo">${proposicao.tipo} · ${proposicao.ramoMP}</div>
        </div>
        <div class="pill-list">
          ${renderBadge(proposicao.prioridade === "alta" ? "Prioridade alta" : "Prioridade normal", proposicao.prioridade === "alta" ? "danger" : "neutral")}
          ${renderBadge(comAvaliacao ? "Decidir avaliação vigente" : "Avaliar diretamente", comAvaliacao ? "primary" : "warning")}
        </div>
      </div>
      <div class="proposicao-card__content">
        <div><strong>Unidade:</strong> ${proposicao.unidade}</div>
        <div><strong>Temática:</strong> ${proposicao.tematica || "—"}</div>
        <div><strong>Correição:</strong> ${proposicao.correicaoId || "—"}</div>
        <div class="proposicao-card__descricao">${(proposicao.descricao || "").substring(0, 150)}${(proposicao.descricao || "").length > 150 ? "..." : ""}</div>
      </div>
    </a>
  `;
};

const renderOverview = (pendentes) => {
  const totalPendentes = pendentes.length;
  const ramos = groupByRamoMP(pendentes);
  const correicoes = groupByCorreicao(pendentes);
  const comAvaliacao = pendentes.filter(temAvaliacaoVigente).length;
  const semAvaliacao = totalPendentes - comAvaliacao;

  const ramoRows = ramos.length
    ? ramos
        .map(
          (item) => `
            <tr data-nav-ramo="${item.ramoMP}">
              <td><strong>${item.ramoMP}</strong></td>
              <td>${item.ramoMPNome || "—"}</td>
              <td class="numeric">${item.total}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="3">${renderEmptyState("Nenhum ramo com proposições aguardando decisão.")}</td></tr>`;

  const correicaoRows = correicoes.length
    ? correicoes
        .map(
          (item) => `
            <tr data-nav-correicao="${item.correicaoId || ""}">
              <td>${item.correicaoId || "—"}</td>
              <td>${item.ramoMP || "—"}</td>
              <td class="numeric">${item.total}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="3">${renderEmptyState("Nenhuma correição com proposições aguardando decisão.")}</td></tr>`;

  return `
    <section class="stack">
      <div class="panel">
        <h3 class="panel__title">Panorama da decisão</h3>
        <p class="muted">
          Proposições que aguardam sua decisão. Quando há avaliação do membro auxiliar submetida,
          você pode deferir (homologa as invariantes) ou indeferir (redefine as invariantes na mesma decisão).
          Sem avaliação vigente, pode avaliar diretamente com força de decisão.
        </p>
        <div class="cards-grid">
          ${renderStatCard("Aguardando decisão", totalPendentes)}
          ${renderStatCard("Com avaliação submetida", comAvaliacao)}
          ${renderStatCard("Sem avaliação (decisão direta)", semAvaliacao)}
        </div>
        <div class="button-row" style="margin-top: 1rem;">
          <button class="button" type="button" data-action="ver-todas">Ver todas em uma fila</button>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel__title">Por ramo do MP</h3>
        <p class="muted">Clique em uma linha para ver as unidades daquele ramo.</p>
        <div class="table-wrap">
          <table class="table table--hover">
            <thead>
              <tr><th>Ramo</th><th>Nome</th><th class="numeric">Pendentes</th></tr>
            </thead>
            <tbody>
              ${ramoRows}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel__title">Por correição</h3>
        <p class="muted">Clique em uma linha para abrir a fila de decisão daquela correição.</p>
        <div class="table-wrap">
          <table class="table table--hover">
            <thead>
              <tr><th>Correição</th><th>Ramo</th><th class="numeric">Pendentes</th></tr>
            </thead>
            <tbody>
              ${correicaoRows}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

const renderModoRamo = (pendentes, filtros) => {
  const daquelaBandeira = pendentes.filter((p) => p.ramoMP === filtros.ramoMP);
  const unidades = groupByUnidade(daquelaBandeira);
  const nomeRamo = daquelaBandeira[0]?.ramoMPNome || filtros.ramoMP;

  const rows = unidades.length
    ? unidades
        .map(
          (item) => `
            <tr data-nav-unidade="${item.unidade}">
              <td><strong>${item.unidade}</strong></td>
              <td class="numeric">${item.total}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="2">${renderEmptyState("Nenhuma unidade neste ramo com proposições aguardando decisão.")}</td></tr>`;

  return `
    <section class="stack">
      <div class="panel">
        <div class="button-row" style="justify-content: space-between; align-items: baseline;">
          <div>
            <h3 class="panel__title">${filtros.ramoMP} — ${nomeRamo}</h3>
            <p class="muted">${daquelaBandeira.length} proposição(ões) aguardando decisão neste ramo.</p>
          </div>
          <div class="button-row">
            <button class="button" type="button" data-action="ver-todas-do-ramo">Ver todas deste ramo</button>
            <button class="button button--ghost" type="button" data-action="voltar-overview">Voltar ao panorama</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel__title">Unidades</h3>
        <p class="muted">Clique em uma linha para entrar na fila de decisão daquela unidade.</p>
        <div class="table-wrap">
          <table class="table table--hover">
            <thead>
              <tr><th>Unidade</th><th class="numeric">Pendentes</th></tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

const renderModoFila = (pendentes, filtros) => {
  const filtrados = filtrarProposicoes(pendentes, filtros);

  const cards = filtrados.length
    ? filtrados.map((p) => renderCardFila(p)).join("")
    : renderEmptyState("Nenhuma proposição corresponde aos filtros selecionados.");

  const contextoSelecao = [
    filtros.ramoMP ? `Ramo: <strong>${filtros.ramoMP}</strong>` : null,
    filtros.unidade ? `Unidade: <strong>${filtros.unidade}</strong>` : null,
    filtros.correicaoId ? `Correição: <strong>${filtros.correicaoId}</strong>` : null,
    filtros.prioridade ? `Prioridade: <strong>${filtros.prioridade}</strong>` : null,
    filtros.tematica ? `Temática: <strong>${filtros.tematica}</strong>` : null,
    filtros.uf ? `UF: <strong>${filtros.uf}</strong>` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <section class="page-grid page-grid--two">
      <div class="stack">
        <div class="panel">
          <div class="button-row" style="justify-content: space-between; align-items: baseline;">
            <div>
              <h3 class="panel__title">Fila de decisão</h3>
              <p class="muted">${contextoSelecao || "Todas as proposições aguardando sua decisão."}</p>
            </div>
            <div class="button-row">
              <button class="button button--ghost" type="button" data-action="voltar-overview">Panorama</button>
              ${filtros.ramoMP ? `<button class="button button--ghost" type="button" data-action="voltar-ramo">Unidades do ramo</button>` : ""}
            </div>
          </div>
        </div>

        <div class="proposicoes-list">
          ${cards}
        </div>
      </div>

      <aside class="stack">
        <div class="panel">
          <h3 class="panel__title">Contador</h3>
          <p class="muted">Restam para decidir com esta seleção:</p>
          <div class="stat-card" style="margin-top: 0.5rem;">
            <span class="stat-card__value">${filtrados.length}</span>
            <span class="stat-card__label">proposição(ões)</span>
          </div>
          <p class="muted" style="margin-top: 1rem;">Total pendente no sistema: <strong>${pendentes.length}</strong></p>
        </div>

        ${renderPainelFiltros(pendentes, filtros)}
      </aside>
    </section>
  `;
};

const render = () => {
  const filtros = getFiltrosFromUrl();
  persistirFiltros(filtros);

  const currentState = state();
  const pendentes = listProposicoesAguardandoDecisao(currentState);

  const modo = determinarModo(filtros);

  let content;
  let subtitle;
  if (modo === "overview") {
    content = renderOverview(pendentes);
    subtitle =
      "Proposições que retornaram com avaliação do membro auxiliar ou que aguardam sua avaliação direta com força de decisão.";
  } else if (modo === "ramo") {
    content = renderModoRamo(pendentes, filtros);
    subtitle = "Escolha uma unidade dentro do ramo para entrar na fila de decisão.";
  } else {
    content = renderModoFila(pendentes, filtros);
    subtitle =
      "Decida cada proposição. Badges indicam se há avaliação submetida (deferir/indeferir) ou se cabe avaliação direta.";
  }

  mountPage({
    activePage: "corregedor-decisao",
    title: "Aguardando decisão",
    subtitle,
    actions: baseActions,
    content,
  });

  bindHandlers(filtros);
};

const aplicarFiltros = (novosFiltros) => {
  setFiltrosInUrl(novosFiltros);
  render();
};

const bindHandlers = (filtros) => {
  document.querySelectorAll("[data-nav-ramo]").forEach((row) => {
    row.addEventListener("click", () => {
      aplicarFiltros({ ramoMP: row.dataset.navRamo });
    });
  });

  document.querySelectorAll("[data-nav-unidade]").forEach((row) => {
    row.addEventListener("click", () => {
      aplicarFiltros({ ramoMP: filtros.ramoMP, unidade: row.dataset.navUnidade });
    });
  });

  document.querySelectorAll("[data-nav-correicao]").forEach((row) => {
    const correicao = row.dataset.navCorreicao;
    if (!correicao) return;
    row.addEventListener("click", () => {
      aplicarFiltros({ correicaoId: correicao });
    });
  });

  document.querySelector("[data-action='ver-todas']")?.addEventListener("click", () => {
    aplicarFiltros({ filaForcada: true });
  });

  document.querySelector("[data-action='ver-todas-do-ramo']")?.addEventListener("click", () => {
    aplicarFiltros({ ramoMP: filtros.ramoMP, filaForcada: true });
  });

  document.querySelector("[data-action='voltar-overview']")?.addEventListener("click", () => {
    aplicarFiltros({});
  });

  document.querySelector("[data-action='voltar-ramo']")?.addEventListener("click", () => {
    aplicarFiltros({ ramoMP: filtros.ramoMP });
  });

  document.querySelector("[data-action='limpar-filtros']")?.addEventListener("click", () => {
    const manterFila = !filtros.unidade && !filtros.correicaoId;
    aplicarFiltros({
      ramoMP: filtros.ramoMP,
      unidade: filtros.unidade,
      correicaoId: filtros.correicaoId,
      filaForcada: manterFila,
    });
  });

  document.querySelector("#painel-filtros")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const novos = {
      ramoMP: filtros.ramoMP || "",
      unidade: filtros.unidade || "",
      correicaoId: data.get("correicaoId") || filtros.correicaoId || "",
      prioridade: data.get("prioridade") || "",
      tematica: data.get("tematica") || "",
      uf: data.get("uf") || "",
    };
    aplicarFiltros(novos);
  });
};

window.addEventListener("popstate", render);

render();
