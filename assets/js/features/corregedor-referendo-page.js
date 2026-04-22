import { PERSONAS, getCurrentPersona, requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import {
  filtrarProposicoes,
  groupByCorreicao,
  groupByRamoMP,
  groupByUnidade,
  listProposicoesAguardandoReferendo,
  markPropositionDeleted,
  referendarCorreicao,
} from "../domain/proposicoes.js";
import { renderBadge, renderEmptyState, renderStatCard } from "../ui/components.js";
import { openRelatorioFinalModal } from "../ui/modal.js";

requireAuth();

if (getCurrentPersona() !== PERSONAS.CORREGEDOR) {
  window.location.href = "/pages/dashboard.html";
}

const FILTROS_KEY = "nad-corregedor-referendo-filtros";

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

const renderCardFila = (proposicao) => `
  <article class="proposicao-card proposicao-card--com-acoes" data-proposicao-id="${proposicao.id}">
    <a href="/pages/proposicao-detalhe.html?id=${proposicao.id}&fromCorregedor=referendo" style="text-decoration: none; color: inherit;">
      <div class="proposicao-card__header">
        <div>
          <div class="proposicao-card__numero">${proposicao.numero}</div>
          <div class="proposicao-card__tipo">${proposicao.tipo} · ${proposicao.ramoMP}</div>
        </div>
        <div class="pill-list">
          ${renderBadge(proposicao.prioridade === "alta" ? "Prioridade alta" : "Prioridade normal", proposicao.prioridade === "alta" ? "danger" : "neutral")}
          ${renderBadge(proposicao.correicaoId || "sem correição", "neutral")}
        </div>
      </div>
      <div class="proposicao-card__content">
        <div><strong>Unidade:</strong> ${proposicao.unidade}</div>
        <div><strong>Temática:</strong> ${proposicao.tematica || "—"}</div>
        <div class="proposicao-card__descricao">${(proposicao.descricao || "").substring(0, 150)}${(proposicao.descricao || "").length > 150 ? "..." : ""}</div>
      </div>
    </a>
    <div class="action-bar">
      <a class="button button--ghost" href="/pages/proposicoes-criar.html?id=${proposicao.id}&fromCorregedor=referendo">Editar</a>
      <button class="button button--ghost" type="button" data-action="apagar-proposicao" data-proposicao-id="${proposicao.id}">Apagar</button>
    </div>
  </article>
`;

const renderOverview = (pendentes) => {
  const totalPendentes = pendentes.length;
  const ramos = groupByRamoMP(pendentes);
  const correicoes = groupByCorreicao(pendentes);

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
    : `<tr><td colspan="3">${renderEmptyState("Nenhum ramo com proposições aguardando referendo.")}</td></tr>`;

  const correicaoRows = correicoes.length
    ? correicoes
        .map(
          (item) => `
            <tr>
              <td data-nav-correicao="${item.correicaoId || ""}"><strong>${item.correicaoId || "—"}</strong></td>
              <td data-nav-correicao="${item.correicaoId || ""}">${item.ramoMP || "—"}</td>
              <td class="numeric" data-nav-correicao="${item.correicaoId || ""}">${item.total}</td>
              <td>
                <div class="button-row">
                  <button class="button button--ghost" type="button" data-action="gerar-relatorio" data-correicao-id="${item.correicaoId || ""}">Gerar relatório final</button>
                  <button class="button" type="button" data-action="referendar-correicao" data-correicao-id="${item.correicaoId || ""}">Marcar como referendada</button>
                </div>
              </td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="4">${renderEmptyState("Nenhuma correição aguardando referendo.")}</td></tr>`;

  return `
    <section class="stack">
      <div class="panel">
        <h3 class="panel__title">Panorama do referendo</h3>
        <p class="muted">
          Proposições ainda não referendadas pelo Conselho Nacional do Ministério Público (CNMP).
          Só após o referendo — normalmente realizado em bloco por correição — é que o ciclo de vida
          de cada proposição se inicia na Secretaria Processual.
        </p>
        <div class="cards-grid">
          ${renderStatCard("Proposições aguardando referendo", totalPendentes)}
          ${renderStatCard("Ramos envolvidos", ramos.length)}
          ${renderStatCard("Correições envolvidas", correicoes.length)}
        </div>
        <div class="button-row" style="margin-top: 1rem;">
          <button class="button" type="button" data-action="ver-todas">Ver todas em uma fila</button>
          <a class="button button--ghost" href="/pages/proposicoes-criar.html">Criar nova proposição</a>
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
        <p class="muted">Clique no identificador da correição para abrir a fila, ou use os botões de ação para gerar o relatório final e registrar o referendo do CNMP.</p>
        <div class="table-wrap">
          <table class="table table--hover">
            <thead>
              <tr>
                <th>Correição</th>
                <th>Ramo</th>
                <th class="numeric">Pendentes</th>
                <th>Ações</th>
              </tr>
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
    : `<tr><td colspan="2">${renderEmptyState("Nenhuma unidade neste ramo com proposições aguardando referendo.")}</td></tr>`;

  return `
    <section class="stack">
      <div class="panel">
        <div class="button-row" style="justify-content: space-between; align-items: baseline;">
          <div>
            <h3 class="panel__title">${filtros.ramoMP} — ${nomeRamo}</h3>
            <p class="muted">${daquelaBandeira.length} proposição(ões) aguardando referendo neste ramo.</p>
          </div>
          <div class="button-row">
            <button class="button" type="button" data-action="ver-todas-do-ramo">Ver todas deste ramo</button>
            <button class="button button--ghost" type="button" data-action="voltar-overview">Voltar ao panorama</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel__title">Unidades</h3>
        <p class="muted">Clique em uma linha para entrar na fila de proposições daquela unidade.</p>
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
              <h3 class="panel__title">Fila de referendo</h3>
              <p class="muted">${contextoSelecao || "Todas as proposições aguardando referendo do CNMP."}</p>
            </div>
            <div class="button-row">
              <button class="button button--ghost" type="button" data-action="voltar-overview">Panorama</button>
              ${filtros.ramoMP ? `<button class="button button--ghost" type="button" data-action="voltar-ramo">Unidades do ramo</button>` : ""}
              ${filtros.correicaoId ? `<button class="button button--ghost" type="button" data-action="gerar-relatorio" data-correicao-id="${filtros.correicaoId}">Gerar relatório final</button>` : ""}
              ${filtros.correicaoId ? `<button class="button" type="button" data-action="referendar-correicao" data-correicao-id="${filtros.correicaoId}">Marcar como referendada</button>` : ""}
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
          <p class="muted">Proposições aguardando referendo nesta seleção:</p>
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
  const pendentes = listProposicoesAguardandoReferendo(currentState);

  const modo = determinarModo(filtros);

  let content;
  let subtitle;
  if (modo === "overview") {
    content = renderOverview(pendentes);
    subtitle =
      "Proposições que ainda aguardam referendo do CNMP. Agrupe por ramo ou correição, gere o relatório final e registre o referendo em bloco.";
  } else if (modo === "ramo") {
    content = renderModoRamo(pendentes, filtros);
    subtitle = "Escolha uma unidade dentro do ramo para entrar na fila de proposições aguardando referendo.";
  } else {
    content = renderModoFila(pendentes, filtros);
    subtitle =
      "Revise, edite ou apague cada proposição antes do referendo. A ação de referendar sempre opera em bloco pela correição.";
  }

  mountPage({
    activePage: "corregedor-referendo",
    title: "Aguardando referendo do CNMP",
    subtitle,
    actions: baseActions,
    content,
  });

  bindHandlers(filtros, currentState);
};

const aplicarFiltros = (novosFiltros) => {
  setFiltrosInUrl(novosFiltros);
  render();
};

const handleReferendar = (correicaoId) => {
  if (!correicaoId) {
    window.alert("Correição sem identificador — não é possível referendar.");
    return;
  }
  const confirmar = window.confirm(
    `Marcar a correição ${correicaoId} como referendada pelo CNMP? Todas as proposições associadas serão encaminhadas à Secretaria Processual.`,
  );
  if (!confirmar) return;
  let afetadas = 0;
  mutateState((draft) => {
    afetadas = referendarCorreicao(draft, correicaoId);
    return draft;
  });
  window.alert(
    afetadas > 0
      ? `${afetadas} proposição(ões) encaminhada(s) à Secretaria Processual.`
      : "Nenhuma proposição pendente encontrada para esta correição.",
  );
  aplicarFiltros({});
};

const handleApagar = (proposicaoId) => {
  if (!proposicaoId) return;
  const confirmar = window.confirm(
    "Apagar esta proposição? Esta ação encerra definitivamente seu ciclo de vida e não pode ser desfeita.",
  );
  if (!confirmar) return;
  mutateState((draft) => {
    const prop = draft.proposicoes.find((p) => p.id === proposicaoId);
    if (prop) markPropositionDeleted(prop);
    return draft;
  });
  render();
};

const handleGerarRelatorio = (correicaoId, currentState) => {
  const pendentes = listProposicoesAguardandoReferendo(currentState).filter(
    (p) => p.correicaoId === correicaoId,
  );
  openRelatorioFinalModal({
    correicaoId,
    ramoMP: pendentes[0]?.ramoMP || "",
    proposicoes: pendentes,
  });
};

const bindHandlers = (filtros, currentState) => {
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

  document.querySelectorAll("[data-nav-correicao]").forEach((cell) => {
    const correicao = cell.dataset.navCorreicao;
    if (!correicao) return;
    cell.style.cursor = "pointer";
    cell.addEventListener("click", () => {
      aplicarFiltros({ correicaoId: correicao });
    });
  });

  document.querySelectorAll("[data-action='referendar-correicao']").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      handleReferendar(btn.dataset.correicaoId);
    });
  });

  document.querySelectorAll("[data-action='gerar-relatorio']").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      handleGerarRelatorio(btn.dataset.correicaoId, currentState);
    });
  });

  document.querySelectorAll("[data-action='apagar-proposicao']").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      handleApagar(btn.dataset.proposicaoId);
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
