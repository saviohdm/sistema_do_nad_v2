import { PERSONAS, getCurrentPersona, requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { Labels, SituacaoApreciacao } from "../domain/enums.js";
import {
  filtrarProposicoes,
  groupByCorreicao,
  groupByRamoMP,
  groupByUnidade,
} from "../domain/proposicoes.js";
import {
  listFilaAguardandoDiligencia,
  listGruposAguardandoDiligencia,
} from "../domain/secretaria-filas.js";
import { criarDiligenciaEmLote } from "../domain/diligencias.js";
import { adicionarEmailDiligencia, previewEmailDiligencia } from "../domain/caixa-de-saida.js";
import { resolveDestinatarioCorreicionado } from "../domain/correicionados.js";
import {
  renderBadge,
  renderEmptyState,
  renderPrioridadeBadge,
  renderSensivelBadge,
  renderStatCard,
} from "../ui/components.js";
import { closeModal } from "../ui/modal.js";

requireAuth();

if (getCurrentPersona() !== PERSONAS.SECRETARIA) {
  window.location.href = "/pages/dashboard.html";
}

const FILTROS_KEY = "nad-secretaria-diligencia-filtros";
const SELECAO_KEY = "nad-secretaria-diligencia-selecao";
const MODAL_ROOT_ID = "nad-modal-root";

const FILTRO_KEYS_URL = [
  "ramoMP",
  "unidade",
  "correicaoId",
  "prioridade",
  "tematica",
  "uf",
  "membro",
  "subStatus",
  "textoBusca",
];

const FILTRO_FLAGS_URL = ["gruposCompletos"];

const selecaoIds = new Set();

const persistirSelecao = () => {
  sessionStorage.setItem(SELECAO_KEY, JSON.stringify(Array.from(selecaoIds)));
};

const hidratarSelecao = () => {
  const raw = sessionStorage.getItem(SELECAO_KEY);
  if (!raw) return;
  try {
    const ids = JSON.parse(raw);
    if (Array.isArray(ids)) ids.forEach((id) => selecaoIds.add(id));
  } catch {
    sessionStorage.removeItem(SELECAO_KEY);
  }
};

hidratarSelecao();

const escapeAttr = (value) => String(value).replace(/"/g, "&quot;");
const uniq = (values) => Array.from(new Set(values.filter(Boolean))).sort();

const isRetornada = (p) =>
  p.apreciacaoDoCN?.situacao === SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES;

const getFiltrosFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const filtros = {};
  FILTRO_KEYS_URL.forEach((key) => {
    const value = params.get(key);
    if (value) filtros[key] = value;
  });
  if (params.get("fila") === "1") filtros.filaForcada = true;
  FILTRO_FLAGS_URL.forEach((flag) => {
    if (params.get(flag) === "1") filtros[flag] = true;
  });
  return filtros;
};

const setFiltrosInUrl = (filtros) => {
  const params = new URLSearchParams();
  FILTRO_KEYS_URL.forEach((key) => {
    if (filtros[key]) params.set(key, filtros[key]);
  });
  if (filtros.filaForcada) params.set("fila", "1");
  FILTRO_FLAGS_URL.forEach((flag) => {
    if (filtros[flag]) params.set(flag, "1");
  });
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.pushState({}, "", newUrl);
};

const persistirFiltros = (filtros) => {
  sessionStorage.setItem(FILTROS_KEY, JSON.stringify(filtros));
};

const determinarModo = (filtros) => {
  const filtrosDeFila =
    filtros.unidade ||
    filtros.correicaoId ||
    filtros.prioridade ||
    filtros.tematica ||
    filtros.uf ||
    filtros.membro ||
    filtros.subStatus ||
    filtros.textoBusca ||
    filtros.gruposCompletos;
  if (filtros.filaForcada || filtrosDeFila) return "fila";
  if (filtros.ramoMP) return "ramo";
  return "overview";
};

const aplicarFiltros = (novosFiltros) => {
  setFiltrosInUrl(novosFiltros);
  render();
};

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

const renderOverview = (aguardandoDiligencia) => {
  const total = aguardandoDiligencia.length;
  const novas = aguardandoDiligencia.filter((p) => !p.apreciacaoDoCN).length;
  const retornadas = aguardandoDiligencia.filter(isRetornada).length;
  const ramos = groupByRamoMP(aguardandoDiligencia);
  const correicoes = groupByCorreicao(aguardandoDiligencia);

  const ramoRows = ramos.length
    ? ramos
        .map(
          (item) => `
            <tr data-nav-ramo="${escapeAttr(item.ramoMP)}">
              <td><strong>${item.ramoMP}</strong></td>
              <td>${item.ramoMPNome || "—"}</td>
              <td class="numeric">${item.total}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="3">${renderEmptyState("Nenhum ramo com proposições aguardando diligência.")}</td></tr>`;

  const correicaoRows = correicoes.length
    ? correicoes
        .map(
          (item) => `
            <tr data-nav-correicao="${escapeAttr(item.correicaoId || "")}">
              <td>${item.correicaoId || "—"}</td>
              <td>${item.ramoMP || "—"}</td>
              <td class="numeric">${item.total}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="3">${renderEmptyState("Nenhuma correição com proposições aguardando diligência.")}</td></tr>`;

  return `
    <section class="stack">
      <div class="panel">
        <h3 class="panel__title">Panorama da fila</h3>
        <p class="muted">
          Proposições que aguardam criação de diligência pela Secretaria — recém-referendadas
          (novas) ou que retornaram após decisão "necessita mais informações".
        </p>
        <div class="cards-grid">
          ${renderStatCard("Total aguardando diligência", total)}
          ${renderStatCard("Novas", novas)}
          ${renderStatCard("Retornadas (necessita mais informações)", retornadas)}
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
              <tr><th>Ramo</th><th>Nome</th><th class="numeric">Aguardando diligência</th></tr>
            </thead>
            <tbody>${ramoRows}</tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel__title">Por correição</h3>
        <p class="muted">Clique em uma linha para abrir a fila daquela correição.</p>
        <div class="table-wrap">
          <table class="table table--hover">
            <thead>
              <tr><th>Correição</th><th>Ramo</th><th class="numeric">Aguardando diligência</th></tr>
            </thead>
            <tbody>${correicaoRows}</tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

// ---------------------------------------------------------------------------
// Modo Ramo
// ---------------------------------------------------------------------------

const renderModoRamo = (aguardandoDiligencia, filtros) => {
  const doRamo = aguardandoDiligencia.filter((p) => p.ramoMP === filtros.ramoMP);
  const unidades = groupByUnidade(doRamo);
  const nomeRamo = doRamo[0]?.ramoMPNome || filtros.ramoMP;

  const rows = unidades.length
    ? unidades
        .map(
          (item) => `
            <tr data-nav-unidade="${escapeAttr(item.unidade)}">
              <td><strong>${item.unidade}</strong></td>
              <td class="numeric">${item.total}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="2">${renderEmptyState("Nenhuma unidade neste ramo com proposições aguardando diligência.")}</td></tr>`;

  return `
    <section class="stack">
      <div class="panel">
        <div class="button-row" style="justify-content: space-between; align-items: baseline;">
          <div>
            <h3 class="panel__title">${filtros.ramoMP} — ${nomeRamo}</h3>
            <p class="muted">${doRamo.length} proposição(ões) aguardando diligência neste ramo.</p>
          </div>
          <div class="button-row">
            <button class="button" type="button" data-action="ver-todas-do-ramo">Ver todas deste ramo</button>
            <button class="button button--ghost" type="button" data-action="voltar-overview">Voltar ao panorama</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel__title">Unidades</h3>
        <p class="muted">Clique em uma linha para entrar na fila daquela unidade.</p>
        <div class="table-wrap">
          <table class="table table--hover">
            <thead>
              <tr><th>Unidade</th><th class="numeric">Aguardando diligência</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

// ---------------------------------------------------------------------------
// Modo Fila — filtros laterais
// ---------------------------------------------------------------------------

const option = (value, label, selected) =>
  `<option value="${escapeAttr(value)}"${selected === value ? " selected" : ""}>${label}</option>`;

const renderPainelFiltros = (aguardandoDiligencia, filtros) => {
  const prioridades = uniq(aguardandoDiligencia.map((p) => p.prioridade));
  const tematicas = uniq(aguardandoDiligencia.map((p) => p.tematica));
  const ufs = uniq(aguardandoDiligencia.flatMap((p) => p.uf || []));
  const correicoes = uniq(aguardandoDiligencia.map((p) => p.correicaoId));
  const membros = uniq(aguardandoDiligencia.map((p) => p.membro));

  const selectSimples = (id, name, label, lista, valor) => `
    <div class="field">
      <label for="${id}">${label}</label>
      <select id="${id}" name="${name}">
        <option value="">Todas</option>
        ${lista.map((v) => option(v, v, valor || "")).join("")}
      </select>
    </div>
  `;

  const prioridadeSelect = `
    <div class="field">
      <label for="filtro-prioridade">Prioridade</label>
      <select id="filtro-prioridade" name="prioridade">
        <option value="">Todas</option>
        ${prioridades.map((v) => option(v, Labels.prioridade[v] || v, filtros.prioridade || "")).join("")}
      </select>
    </div>
  `;

  return `
    <form class="panel stack" id="painel-filtros">
      <h3 class="panel__title">Filtros adicionais</h3>
      <div class="field-grid">
        ${prioridadeSelect}
        ${selectSimples("filtro-tematica", "tematica", "Temática", tematicas, filtros.tematica)}
        ${selectSimples("filtro-uf", "uf", "UF", ufs, filtros.uf)}
        ${selectSimples("filtro-correicao", "correicaoId", "Correição", correicoes, filtros.correicaoId)}
        ${selectSimples("filtro-membro", "membro", "Membro responsável", membros, filtros.membro)}
        <div class="field">
          <label for="filtro-substatus">Sub-status</label>
          <select id="filtro-substatus" name="subStatus">
            <option value="">Todas</option>
            ${option("nova", "Nova", filtros.subStatus || "")}
            ${option("retornada", "Retornada (necessita mais informações)", filtros.subStatus || "")}
          </select>
        </div>
        <div class="field" style="grid-column: span 2;">
          <label for="filtro-texto">Busca textual</label>
          <input id="filtro-texto" name="textoBusca" type="text"
            placeholder="Número, número ELO, descrição ou observações"
            value="${escapeAttr(filtros.textoBusca || "")}" />
        </div>
      </div>
      <div class="button-row">
        <button class="button" type="submit">Aplicar filtros</button>
        <button class="button button--ghost" type="button" data-action="limpar-filtros">Limpar filtros adicionais</button>
      </div>
    </form>
  `;
};

const renderGruposCompletoToggle = (countCompletos, ativo) => `
  <div class="grupos-toggle${ativo ? " is-active" : ""}">
    <label class="grupos-toggle__label" for="toggle-grupos-completos">
      <span class="grupos-toggle__info">
        <strong class="grupos-toggle__title">Somente grupos completos</strong>
        <small class="grupos-toggle__sub">todas as prop. da unidade prontas para diligência</small>
      </span>
      <span class="grupos-toggle__badge">${countCompletos}</span>
    </label>
    <div class="grupos-toggle__control">
      <input
        type="checkbox"
        id="toggle-grupos-completos"
        data-action="toggle-grupos-completos"
        ${ativo ? "checked" : ""}
        aria-label="Filtrar somente grupos completos"
      />
      <span class="grupos-toggle__switch" aria-hidden="true"></span>
    </div>
  </div>
`;

// ---------------------------------------------------------------------------
// Modo Fila — cards e sticky bar
// ---------------------------------------------------------------------------

const renderCardSelecionavel = (proposicao) => {
  const selecionado = selecaoIds.has(proposicao.id);
  const subStatusBadge = isRetornada(proposicao)
    ? renderBadge("Retornou · necessita mais informações", "warning")
    : renderBadge("Nova proposição", "primary");
  const prioridadeBadge = renderPrioridadeBadge(proposicao.prioridade);
  const sensivelBadge = renderSensivelBadge(proposicao.sensivel);

  return `
    <article class="proposicao-card proposicao-card--selecionavel ${selecionado ? "proposicao-card--selected" : ""}">
      <input type="checkbox" data-prop-checkbox="${escapeAttr(proposicao.id)}" ${selecionado ? "checked" : ""} aria-label="Selecionar proposição ${proposicao.numero}" />
      <div>
        <div class="proposicao-card__header">
          <div>
            <div class="proposicao-card__numero">${proposicao.numero}</div>
            <div class="proposicao-card__tipo">${proposicao.tipo} · ${proposicao.ramoMP || "—"}</div>
          </div>
          <div class="pill-list">
            ${sensivelBadge}
            ${prioridadeBadge}
            ${subStatusBadge}
          </div>
        </div>
        <div class="proposicao-card__content">
          <div><strong>Unidade:</strong> ${proposicao.unidade}</div>
          <div><strong>Correição:</strong> ${proposicao.correicaoId || "—"}</div>
          <div><strong>Membro:</strong> ${proposicao.membro || "—"}</div>
          <div class="proposicao-card__descricao">${(proposicao.descricao || "").substring(0, 200)}${(proposicao.descricao || "").length > 200 ? "..." : ""}</div>
        </div>
        <div class="button-row proposicao-card__actions">
          <a class="button button--ghost button--small" href="/pages/proposicao-detalhe.html?id=${proposicao.id}">Abrir detalhe</a>
        </div>
      </div>
    </article>
  `;
};

const renderSelectAllRow = (filtrados) => {
  const total = filtrados.length;
  if (total === 0) return "";

  const selecionadosVisiveis = filtrados.reduce(
    (acc, p) => acc + (selecaoIds.has(p.id) ? 1 : 0),
    0,
  );

  let estado;
  let texto;
  if (selecionadosVisiveis === 0) {
    estado = "nenhum";
    texto = `Selecionar todos os ${total} visíveis`;
  } else if (selecionadosVisiveis === total) {
    estado = "todos";
    texto = `Desmarcar todos os ${total} visíveis`;
  } else {
    estado = "parcial";
    texto = `${selecionadosVisiveis} de ${total} visíveis selecionados — marcar restantes`;
  }

  return `
    <label class="select-all-row">
      <input type="checkbox" data-select-all data-select-all-state="${estado}" ${estado === "todos" ? "checked" : ""} />
      <span><strong>${texto}</strong></span>
    </label>
  `;
};

const renderStickyBar = (totalSelecionados, ocultas) => {
  if (totalSelecionados === 0) return "";
  const hoje = new Date().toISOString().slice(0, 10);
  const hint =
    ocultas > 0
      ? `<span class="batch-bar__hint">${ocultas} oculta(s) pelo filtro atual</span>`
      : "";

  return `
    <div class="batch-bar" id="batch-bar">
      <div class="batch-bar__header">
        <span class="batch-bar__counter">${totalSelecionados} proposição(ões) selecionada(s)</span>
        ${hint}
      </div>
      <form class="batch-bar__form" id="batch-form">
        <div class="field">
          <label for="batch-prazo">Prazo da diligência</label>
          <input id="batch-prazo" name="prazo" type="date" min="${hoje}" required />
        </div>
        <div class="field">
          <label for="batch-descricao">Descrição (aplicada a todas)</label>
          <textarea id="batch-descricao" name="descricao" required rows="2"></textarea>
        </div>
        <div class="button-row" style="align-items: stretch;">
          <button class="button button--primary" type="submit">Criar diligências (${totalSelecionados})</button>
          <button class="button button--ghost" type="button" data-action="limpar-selecao">Limpar seleção</button>
        </div>
      </form>
    </div>
  `;
};

// ---------------------------------------------------------------------------
// Modo Fila — orquestração
// ---------------------------------------------------------------------------

const renderModoFila = (aguardandoDiligencia, filtros, gruposCompletoCount) => {
  const filtrados = filtrarProposicoes(aguardandoDiligencia, filtros);
  const idsFiltradosSet = new Set(filtrados.map((p) => p.id));
  const ocultas = Array.from(selecaoIds).filter((id) => !idsFiltradosSet.has(id)).length;

  const cards = filtrados.length
    ? filtrados.map(renderCardSelecionavel).join("")
    : renderEmptyState("Nenhuma proposição corresponde aos filtros selecionados.");

  const contextoSelecao = [
    filtros.ramoMP ? `Ramo: <strong>${filtros.ramoMP}</strong>` : null,
    filtros.unidade ? `Unidade: <strong>${filtros.unidade}</strong>` : null,
    filtros.correicaoId ? `Correição: <strong>${filtros.correicaoId}</strong>` : null,
    filtros.prioridade ? `Prioridade: <strong>${Labels.prioridade[filtros.prioridade] || filtros.prioridade}</strong>` : null,
    filtros.tematica ? `Temática: <strong>${filtros.tematica}</strong>` : null,
    filtros.uf ? `UF: <strong>${filtros.uf}</strong>` : null,
    filtros.membro ? `Membro: <strong>${filtros.membro}</strong>` : null,
    filtros.subStatus
      ? `Sub-status: <strong>${filtros.subStatus === "nova" ? "Nova" : "Retornada"}</strong>`
      : null,
    filtros.gruposCompletos ? `<strong>Somente grupos completos</strong>` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <section class="page-grid page-grid--two">
      <div class="stack">
        <div class="queue-header">
          <div>
            <h3 class="queue-header__title">Fila de diligência</h3>
            <p class="muted queue-header__context">${contextoSelecao || "Todas as proposições aguardando diligência."}</p>
          </div>
          <div class="button-row queue-header__actions">
            <button class="button button--ghost" type="button" data-action="voltar-overview">Panorama</button>
            ${filtros.ramoMP ? `<button class="button button--ghost" type="button" data-action="voltar-ramo">Unidades do ramo</button>` : ""}
          </div>
        </div>

        ${renderSelectAllRow(filtrados)}
        <div class="stack" id="lista-cards">${cards}</div>
        ${renderStickyBar(selecaoIds.size, ocultas)}
      </div>

      <aside class="stack">
        <div class="panel queue-sidebar-card">
          <h3 class="panel__title">Contador</h3>
          <p class="muted">Visíveis com os filtros atuais:</p>
          <div class="stat-card">
            <span class="stat-card__value">${filtrados.length}</span>
            <span class="stat-card__label">proposição(ões)</span>
          </div>
          ${renderGruposCompletoToggle(gruposCompletoCount, !!filtros.gruposCompletos)}
          <p class="muted queue-sidebar-card__footer">Total aguardando diligência no sistema: <strong>${aguardandoDiligencia.length}</strong></p>
        </div>

        ${renderPainelFiltros(aguardandoDiligencia, filtros)}
      </aside>
    </section>
  `;
};

// ---------------------------------------------------------------------------
// Modal de confirmação
// ---------------------------------------------------------------------------

const formatBR = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const ensureModalRoot = () => {
  let root = document.getElementById(MODAL_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = MODAL_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
};

const abrirModalConfirmacao = (proposicoesSelecionadas, prazo, descricao) => {
  const root = ensureModalRoot();
  const currentState = state();
  const itens = proposicoesSelecionadas
    .map((p) => {
      const destinatario = resolveDestinatarioCorreicionado(currentState, p);
      const dest = destinatario
        ? `${destinatario.nome} &lt;${destinatario.email}&gt;`
        : `<em>(sem destinatário cadastrado — unidade ${p.unidade})</em>`;
      return `<li><strong>${p.numero}</strong> · ${p.unidade} · ${p.ramoMP || "—"}<br><span class="muted" style="font-size: 0.85rem;">E-mail para: ${dest}</span></li>`;
    })
    .join("");

  const semDestinatario = proposicoesSelecionadas.filter(
    (p) => !resolveDestinatarioCorreicionado(currentState, p),
  );

  const avisoSemDestinatario = semDestinatario.length > 0
    ? `<div class="alert alert--warning" role="alert" style="margin-top: var(--space-3);">
        ${semDestinatario.length} proposição(ões) não têm destinatário identificável no diretório CNMP. O e-mail será registrado na caixa de saída como "sem destinatário", e o evento de envio constará no histórico para auditoria.
      </div>`
    : "";

  const body = `
    <p>Você está prestes a criar <strong>${proposicoesSelecionadas.length}</strong> diligência(s) com os seguintes dados:</p>
    <p><strong>Prazo:</strong> ${formatBR(prazo)}</p>
    <p><strong>Descrição:</strong></p>
    <blockquote class="muted" style="border-left: 3px solid var(--line); padding-left: var(--space-3); margin: var(--space-2) 0;">${descricao.replace(/\n/g, "<br>")}</blockquote>
    <p><strong>Cada proposição também disparará um e-mail ao correicionado:</strong></p>
    <div class="lote-resumo-list">
      <ul>${itens}</ul>
    </div>
    ${avisoSemDestinatario}
    <div class="button-row" style="justify-content: flex-end; margin-top: var(--space-4);">
      <button class="button button--ghost" type="button" data-modal-close>Cancelar</button>
      <button class="button button--primary" type="button" data-action="confirmar-lote">Confirmar criação e envio</button>
    </div>
  `;

  root.innerHTML = `
    <div class="modal-overlay" data-modal-overlay>
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="Confirmar criação em lote">
        <header class="modal-header">
          <h2 class="modal-title">Confirmar criação em lote</h2>
          <button class="modal-close" type="button" data-modal-close aria-label="Fechar">×</button>
        </header>
        <div class="modal-body">${body}</div>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-modal-close]").forEach((btn) =>
    btn.addEventListener("click", closeModal),
  );
  root.querySelector("[data-modal-overlay]")?.addEventListener("click", (event) => {
    if (event.target.matches("[data-modal-overlay]")) closeModal();
  });
  root.querySelector("[data-action='confirmar-lote']")?.addEventListener("click", () => {
    confirmarCriacaoEmLote(prazo, descricao);
  });
};

const confirmarCriacaoEmLote = (prazo, descricao) => {
  const idsParaCriar = Array.from(selecaoIds);
  mutateState((draft) => {
    const proposicoesAlvo = draft.proposicoes.filter((p) => idsParaCriar.includes(p.id));
    if (proposicoesAlvo.length === 0) return draft;
    const { criadas } = criarDiligenciaEmLote(proposicoesAlvo, { prazo, descricao });
    criadas.forEach(({ proposicao, diligencia }) => {
      const destinatario = resolveDestinatarioCorreicionado(draft, proposicao);
      adicionarEmailDiligencia(draft, proposicao, diligencia, destinatario);
    });
    return draft;
  });
  selecaoIds.clear();
  persistirSelecao();
  closeModal();
  render();
};

// ---------------------------------------------------------------------------
// Render principal e bind handlers
// ---------------------------------------------------------------------------

const render = () => {
  const filtros = getFiltrosFromUrl();
  persistirFiltros(filtros);

  const currentState = state();
  let aguardandoDiligencia = listFilaAguardandoDiligencia(currentState);
  const todosGrupos = listGruposAguardandoDiligencia(currentState);
  const gruposCompletoCount = todosGrupos.filter((g) => g.completo).length;
  if (filtros.gruposCompletos) {
    const idsCompletos = new Set(
      todosGrupos.filter((g) => g.completo).flatMap((g) => g.proposicoes.map((p) => p.id)),
    );
    aguardandoDiligencia = aguardandoDiligencia.filter((p) => idsCompletos.has(p.id));
  }
  const idsValidos = new Set(aguardandoDiligencia.map((p) => p.id));
  let podou = false;
  for (const id of Array.from(selecaoIds)) {
    if (!idsValidos.has(id)) {
      selecaoIds.delete(id);
      podou = true;
    }
  }
  if (podou) persistirSelecao();

  const modo = determinarModo(filtros);

  let content;
  let subtitle;
  if (modo === "overview") {
    content = renderOverview(aguardandoDiligencia);
    subtitle =
      "Proposições recém-referendadas ou que retornaram com apreciação \"necessita mais informações\".";
  } else if (modo === "ramo") {
    content = renderModoRamo(aguardandoDiligencia, filtros);
    subtitle = "Escolha uma unidade dentro do ramo para entrar na fila.";
  } else {
    content = renderModoFila(aguardandoDiligencia, filtros, gruposCompletoCount);
    subtitle =
      "Selecione múltiplas proposições e crie diligências em lote com um único prazo e descrição.";
  }

  mountPage({
    activePage: "secretaria-diligencia",
    title: "Aguardando diligência",
    subtitle,
    actions: baseActions,
    content,
  });

  bindHandlers(filtros, aguardandoDiligencia);
};

const bindHandlers = (filtros, aguardandoDiligencia) => {
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

  document.querySelector("[data-action='toggle-grupos-completos']")?.addEventListener("change", (e) => {
    const novosFiltros = { ...filtros };
    if (e.target.checked) {
      novosFiltros.gruposCompletos = true;
    } else {
      delete novosFiltros.gruposCompletos;
    }
    aplicarFiltros(novosFiltros);
  });

  document.querySelector("[data-action='limpar-filtros']")?.addEventListener("click", () => {
    aplicarFiltros({
      ramoMP: filtros.ramoMP,
      unidade: filtros.unidade,
      correicaoId: filtros.correicaoId,
      filaForcada: !filtros.unidade && !filtros.correicaoId ? true : false,
    });
  });

  document.querySelector("#painel-filtros")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    aplicarFiltros({
      ramoMP: filtros.ramoMP || "",
      unidade: filtros.unidade || "",
      correicaoId: data.get("correicaoId") || filtros.correicaoId || "",
      prioridade: data.get("prioridade") || "",
      tematica: data.get("tematica") || "",
      uf: data.get("uf") || "",
      membro: data.get("membro") || "",
      subStatus: data.get("subStatus") || "",
      textoBusca: (data.get("textoBusca") || "").toString().trim(),
      gruposCompletos: data.get("gruposCompletos") === "1",
    });
  });

  // Seleção em lote
  document.querySelectorAll("[data-prop-checkbox]").forEach((cb) => {
    cb.addEventListener("change", (event) => {
      const id = event.currentTarget.dataset.propCheckbox;
      if (event.currentTarget.checked) {
        selecaoIds.add(id);
      } else {
        selecaoIds.delete(id);
      }
      persistirSelecao();
      render();
    });
  });

  const selectAllCheckbox = document.querySelector("[data-select-all]");
  if (selectAllCheckbox) {
    selectAllCheckbox.indeterminate = selectAllCheckbox.dataset.selectAllState === "parcial";
    selectAllCheckbox.addEventListener("change", (event) => {
      const filtrados = filtrarProposicoes(aguardandoDiligencia, filtros);
      if (event.currentTarget.checked) {
        filtrados.forEach((p) => selecaoIds.add(p.id));
      } else {
        filtrados.forEach((p) => selecaoIds.delete(p.id));
      }
      persistirSelecao();
      render();
    });
  }

  document.querySelector("[data-action='limpar-selecao']")?.addEventListener("click", () => {
    selecaoIds.clear();
    persistirSelecao();
    render();
  });

  document.querySelector("#batch-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const prazo = (data.get("prazo") || "").toString();
    const descricao = (data.get("descricao") || "").toString().trim();
    if (!prazo || !descricao) return;
    const hoje = new Date().toISOString().slice(0, 10);
    if (prazo < hoje) return;
    const proposicoesSelecionadas = aguardandoDiligencia.filter((p) => selecaoIds.has(p.id));
    if (proposicoesSelecionadas.length === 0) return;
    abrirModalConfirmacao(proposicoesSelecionadas, prazo, descricao);
  });
};

window.addEventListener("popstate", render);

render();
