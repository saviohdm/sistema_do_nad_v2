import { PERSONAS, getCurrentPersona, requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { listFilaAguardandoCiencia } from "../domain/secretaria-filas.js";
import { cientificarGrupo } from "../domain/ciencia.js";
import { StatusFluxo, TipoDestinatario } from "../domain/enums.js";
import { resolverUsuariosDestinatarios } from "../domain/destinatario.js";
import {
  renderBadge,
  renderEmptyState,
  renderFilaEmptyState,
  renderFilaFiltrosAtivos,
  renderFilaOperacionalHeader,
  renderPanoramaKpis,
} from "../ui/components.js";
import { closeModal } from "../ui/modal.js";
import { showToast } from "../ui/toast.js";
import {
  renderDestinatarioControl,
  lerOverridesDestinatario,
  temAdmSuperiorVago,
} from "../ui/destinatario-control.js";
import {
  StatusFilaOperacional,
  getGrupoOperacionalKey,
  getDestinatarioRef,
  listPanoramaFilaPorCorreicao,
} from "../domain/filas-operacionais.js";

// Seções do agrupamento por destinatário, em ordem de prioridade (vazias ocultas).
const SECOES_CIENCIA = [
  { tipo: TipoDestinatario.ADMINISTRACAO_SUPERIOR, titulo: "Administração Superior" },
  { tipo: TipoDestinatario.UNIDADE, titulo: "Unidades" },
  { tipo: TipoDestinatario.MEMBRO, titulo: "Membros" },
];

requireAuth();

if (getCurrentPersona() !== PERSONAS.SECRETARIA) {
  window.location.href = "/pages/dashboard.html";
}

const FILTROS_KEY = "nad-secretaria-ciencia-filtros";
const SELECAO_KEY = "nad-secretaria-ciencia-selecao";
const MODAL_ROOT_ID = "nad-modal-root";

const FILTRO_KEYS_URL = ["correicaoId", "estado", "prontoEm"];

const selecaoKeys = new Set();

const persistirSelecao = () => {
  sessionStorage.setItem(SELECAO_KEY, JSON.stringify(Array.from(selecaoKeys)));
};

const hidratarSelecao = () => {
  const raw = sessionStorage.getItem(SELECAO_KEY);
  if (!raw) return;
  try {
    const keys = JSON.parse(raw);
    if (Array.isArray(keys)) keys.forEach((k) => selecaoKeys.add(k));
  } catch {
    sessionStorage.removeItem(SELECAO_KEY);
  }
};

hidratarSelecao();

const escapeAttr = (value) => String(value).replace(/"/g, "&quot;");
const grupoKey = (g) => g.key || getGrupoOperacionalKey(g.correicaoId, g.destinatarioRef);

const getFiltrosFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const filtros = {};
  FILTRO_KEYS_URL.forEach((key) => {
    const value = params.get(key);
    if (value) filtros[key] = value;
  });
  if (params.get("fila") === "1") filtros.filaForcada = true;
  return filtros;
};

const setFiltrosInUrl = (filtros) => {
  const params = new URLSearchParams();
  FILTRO_KEYS_URL.forEach((key) => {
    if (filtros[key]) params.set(key, filtros[key]);
  });
  if (filtros.filaForcada) params.set("fila", "1");
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.pushState({}, "", newUrl);
};

const persistirFiltros = (filtros) => {
  sessionStorage.setItem(FILTROS_KEY, JSON.stringify(filtros));
};

const determinarModo = (filtros) => {
  if (filtros.filaForcada || filtros.correicaoId || filtros.estado || filtros.prontoEm) {
    return "grupo";
  }
  return "overview";
};

const aplicarFiltros = (novos) => {
  setFiltrosInUrl(novos);
  render();
};

// ---------------------------------------------------------------------------
// Helpers temporais e de filtragem
// ---------------------------------------------------------------------------

const isoDia = (iso) => (iso ? iso.slice(0, 10) : "");

const formatPronto = (iso) => {
  if (!iso) return "—";
  const now = new Date();
  const data = new Date(iso);
  const diffMs = now - data;
  if (diffMs < 0) return "Pronta agora";
  const diffH = Math.floor(diffMs / 3600000);
  if (isoDia(iso) === isoDia(now.toISOString())) {
    if (diffH < 1) return "Pronta há menos de 1h";
    return `Pronta há ${diffH}h`;
  }
  const diffDias = Math.floor(diffMs / 86400000);
  if (diffDias === 1) return "Pronta há 1 dia";
  return `Pronta há ${diffDias} dias`;
};

const isHoje = (iso) => {
  if (!iso) return false;
  return isoDia(iso) === isoDia(new Date().toISOString());
};

const isEstaSemana = (iso) => {
  if (!iso) return false;
  const diffMs = Date.now() - new Date(iso).getTime();
  return diffMs >= 0 && diffMs <= 7 * 86400000;
};

const filtrarGrupos = (grupos, filtros) =>
  grupos.filter((g) => {
    if (filtros.ramoMP && g.ramoMP !== filtros.ramoMP) return false;
    if (filtros.correicaoId && g.correicaoId !== filtros.correicaoId) return false;
    if (filtros.estado === "completo" && !g.completo) return false;
    if (filtros.estado === "parcial" && g.completo) return false;
    if (filtros.prontoEm === "hoje" && !(g.completo && isHoje(g.prontoEm))) return false;
    if (filtros.prontoEm === "semana" && !(g.completo && isEstaSemana(g.prontoEm))) return false;
    return true;
  });

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

const renderOverview = (grupos, currentState) => {
  const completos = grupos.filter((g) => g.completo);
  const kpis = [
    {
      label: "Grupos prontos para ciência",
      valor: completos.length,
      filtros: { estado: "completo" },
      destaque: true,
      title: "Grupos completos — todas as proposições prontas para a ciência em bloco.",
    },
    {
      label: "Proposições a cientificar",
      valor: completos.reduce((s, g) => s + g.prontas, 0),
      filtros: { estado: "completo" },
      title: "Proposições dos grupos completos, prontas para ciência.",
    },
    {
      label: "Prontos hoje",
      valor: completos.filter((g) => isHoje(g.prontoEm)).length,
      filtros: { prontoEm: "hoje" },
      title: "Grupos que ficaram completos hoje.",
    },
  ];

  const correicoes = listPanoramaFilaPorCorreicao(currentState, StatusFilaOperacional.CIENCIA);

  const correicaoRows = correicoes.length
    ? correicoes
        .map(
          (item) => `
            <tr data-nav-correicao="${escapeAttr(item.correicaoId || "")}">
              <td>${item.correicaoId || "—"}</td>
              <td>${item.ramoMP || "—"}</td>
              <td class="numeric">${item.proposicoesAguardando}</td>
              <td class="numeric">${item.destinatariosProntos} / ${item.destinatariosTotal}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="4">${renderEmptyState("Nenhuma correição com proposições aguardando ciência.")}</td></tr>`;

  return `
    <section class="stack">
      <div class="panel">
        <h3 class="panel__title">Panorama da ciência</h3>
        ${renderPanoramaKpis(kpis)}
        <div class="button-row" style="margin-top: 1rem;">
          <button class="button" type="button" data-action="ver-todos">Ver todos em uma fila</button>
        </div>
      </div>

      <div class="panel">
        <h3 class="panel__title">Por correição</h3>
        <div class="table-wrap">
          <table class="table table--hover">
            <thead>
              <tr>
                <th>Correição</th>
                <th>Ramo</th>
                <th class="numeric">Proposições aguardando</th>
                <th class="numeric">Destinatários prontos / total</th>
              </tr>
            </thead>
            <tbody>${correicaoRows}</tbody>
          </table>
        </div>
      </div>
    </section>
  `;
};

// (Removido: nível intermediário "Por ramo" — a navegação agora é Correição → grupos de unidade.)

// ---------------------------------------------------------------------------
// Grupo mode — filtros laterais e cards
// ---------------------------------------------------------------------------

const option = (value, label, selected) =>
  `<option value="${escapeAttr(value)}"${selected === value ? " selected" : ""}>${label}</option>`;

const renderPainelFiltros = (grupos, filtros) => {
  return `
    <form class="fila-operacional-filtros" id="painel-filtros">
      <header class="fila-operacional-filtros__head">
        <h3 class="fila-operacional-filtros__title">Filtros da fila</h3>
      </header>
      <div class="fila-operacional-filtros__fields">
        <div class="field">
          <label for="filtro-estado">Estado</label>
          <select id="filtro-estado" name="estado">
            ${option("", "Todos", filtros.estado || "")}
            ${option("completo", "Completo (pronto para ciência)", filtros.estado || "")}
            ${option("parcial", "Parcial (aguardando decisões)", filtros.estado || "")}
          </select>
        </div>
        <div class="field">
          <label for="filtro-prontoem">Pronto em</label>
          <select id="filtro-prontoem" name="prontoEm">
            ${option("", "Qualquer", filtros.prontoEm || "")}
            ${option("hoje", "Hoje", filtros.prontoEm || "")}
            ${option("semana", "Últimos 7 dias", filtros.prontoEm || "")}
          </select>
        </div>
      </div>
      <div class="button-row fila-operacional-filtros__actions">
        <button class="button" type="submit">Aplicar filtros</button>
        <button class="button button--ghost" type="button" data-action="limpar-filtros">Limpar</button>
      </div>
    </form>
  `;
};

const renderCardGrupo = (grupo) => {
  const key = grupoKey(grupo);
  const selecionado = selecaoKeys.has(key);
  const podeSelecionar = grupo.completo;
  const statusBadge = grupo.completo
    ? renderBadge(
        `Pronta${grupo.prontoEm ? " · " + formatPronto(grupo.prontoEm) : ""}`,
        "success",
      )
    : renderBadge(
        `Aguardando ${grupo.pendentesNoGrupo} decisão(ões) pendente(s)`,
        "warning",
      );

  const checkbox = podeSelecionar
    ? `<input type="checkbox" data-grupo-checkbox="${escapeAttr(key)}" ${selecionado ? "checked" : ""} aria-label="Selecionar grupo ${grupo.rotulo}" />`
    : `<input type="checkbox" disabled aria-label="Grupo parcial não selecionável" />`;

  const providenciaLine =
    grupo.comProvidencia > 0
      ? `<div class="muted proposicao-card__support">${grupo.comProvidencia} com pendência paralela</div>`
      : "";

  const proposicoesLista = grupo.proposicoes
    .map((p) => `<li><strong>${p.numero}</strong> — ${p.descricao?.substring(0, 80) || "—"}${(p.descricao || "").length > 80 ? "…" : ""}</li>`)
    .join("");

  return `
    <article class="proposicao-card proposicao-card--selecionavel fila-operacional-grupo ${selecionado ? "proposicao-card--selected is-selected" : ""} ${podeSelecionar ? "proposicao-card--pronta fila-operacional-grupo--pronto" : "proposicao-card--disabled fila-operacional-grupo--parcial"}">
      ${checkbox}
      <div>
        <div class="proposicao-card__header">
          <div>
            <div class="proposicao-card__numero">${grupo.rotulo || "—"}</div>
            <div class="proposicao-card__tipo">${grupo.rotuloSecundario ? `${grupo.rotuloSecundario} · ` : ""}${grupo.ramoMPNome || grupo.ramoMP || "—"} · Correição ${grupo.correicaoId || "—"}</div>
          </div>
          <div class="pill-list">${statusBadge}</div>
        </div>
        <div class="proposicao-card__content">
          <div><strong>${grupo.prontas}</strong> de ${grupo.total} proposições prontas para ciência</div>
          ${providenciaLine}
          <ul class="stack proposicao-card__list">
            ${proposicoesLista}
          </ul>
        </div>
      </div>
    </article>
  `;
};

const renderSelectAllRow = (gruposSelecionaveis) => {
  const total = gruposSelecionaveis.length;
  if (total === 0) return "";

  const selecionadosVisiveis = gruposSelecionaveis.reduce(
    (acc, g) => acc + (selecaoKeys.has(grupoKey(g)) ? 1 : 0),
    0,
  );

  let estado;
  let texto;
  if (selecionadosVisiveis === 0) {
    estado = "nenhum";
    texto = `Selecionar todos os ${total} grupos completos visíveis`;
  } else if (selecionadosVisiveis === total) {
    estado = "todos";
    texto = `Desmarcar todos os ${total} grupos visíveis`;
  } else {
    estado = "parcial";
    texto = `${selecionadosVisiveis} de ${total} grupos selecionados — marcar restantes`;
  }

  return `
    <label class="select-all-row">
      <input type="checkbox" data-select-all data-select-all-state="${estado}" ${estado === "todos" ? "checked" : ""} />
      <span><strong>${texto}</strong></span>
    </label>
  `;
};

const renderStickyBar = (totalSelecionados, ocultas, totalProposicoes) => {
  if (totalSelecionados === 0) return "";
  const hint =
    ocultas > 0
      ? `<span class="batch-bar__hint">${ocultas} grupo(s) oculto(s) pelo filtro atual</span>`
      : "";

  return `
    <div class="batch-bar" id="batch-bar">
      <div class="batch-bar__header">
        <span class="batch-bar__counter">${totalSelecionados} grupo(s) selecionado(s) · ${totalProposicoes} proposição(ões)</span>
        ${hint}
      </div>
      <div class="button-row" style="align-items: stretch;">
        <button class="button button--primary" type="button" data-action="abrir-modal-ciencia">
          Cientificar todas (${totalProposicoes})
        </button>
        <button class="button button--ghost" type="button" data-action="limpar-selecao">Limpar seleção</button>
      </div>
    </div>
  `;
};

// ---------------------------------------------------------------------------
// Grupo mode — orquestração
// ---------------------------------------------------------------------------

const renderModoGrupo = (grupos, filtros) => {
  const filtrados = filtrarGrupos(grupos, filtros);
  const filtradosKeys = new Set(filtrados.map(grupoKey));
  const ocultas = Array.from(selecaoKeys).filter((k) => !filtradosKeys.has(k)).length;
  const selecionaveis = filtrados.filter((g) => g.completo);

  // Cards agrupados nas 3 seções de destinatário (ordem fixa, vazias ocultas).
  // `filtrados` já vem ordenado (completos primeiro); o filtro por tipo preserva a ordem.
  const cards = filtrados.length
    ? SECOES_CIENCIA.map((secao) => {
        const itens = filtrados.filter((g) => g.tipoDestinatario === secao.tipo);
        if (itens.length === 0) return "";
        return `
          <div class="fila-destinatarios-secao">
            <p class="fila-operacional-overline">${secao.titulo} · ${itens.length}</p>
            ${itens.map(renderCardGrupo).join("")}
          </div>`;
      }).join("")
    : renderFilaEmptyState("Nenhum grupo corresponde aos filtros selecionados.");

  const proposicoesSelecionadas = grupos
    .filter((g) => selecaoKeys.has(grupoKey(g)))
    .reduce((s, g) => s + g.prontas, 0);

  const contextoSelecao = [
    filtros.correicaoId ? `Correição: <strong>${filtros.correicaoId}</strong>` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const chips = [
    filtros.estado
      ? {
          key: "estado",
          label: `Estado: ${filtros.estado === "completo" ? "Completo" : "Parcial"}`,
        }
      : null,
    filtros.prontoEm
      ? {
          key: "prontoEm",
          label: `Pronto em: ${filtros.prontoEm === "hoje" ? "Hoje" : "Últimos 7 dias"}`,
        }
      : null,
  ].filter(Boolean);

  return `
    <section class="stack">
      ${renderFilaOperacionalHeader({
        title: "Fila de ciência",
        contexto: contextoSelecao,
        visiveis: filtrados.length,
        total: grupos.length,
        itemSingular: "grupo",
        itemPlural: "grupos",
        actions:
          '<button class="button button--ghost" type="button" data-action="voltar-overview">Panorama</button>',
      })}
      ${renderFilaFiltrosAtivos(chips)}
      <div class="page-grid page-grid--two fila-operacional-corpo">
        <div class="stack">
          ${renderSelectAllRow(selecionaveis)}
          <div class="fila-operacional-list" id="lista-cards">${cards}</div>
          ${renderStickyBar(selecaoKeys.size, ocultas, proposicoesSelecionadas)}
        </div>

        <aside class="fila-operacional-sidebar">
          ${renderPainelFiltros(grupos, filtros)}
        </aside>
      </div>
    </section>
  `;
};

// ---------------------------------------------------------------------------
// Modal de confirmação
// ---------------------------------------------------------------------------

const ensureModalRoot = () => {
  let root = document.getElementById(MODAL_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = MODAL_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
};

// Uma proposição representativa (pronta) do grupo, para resolver os candidatos do
// controle de destinatário. Todas as proposições do grupo compartilham o destinatário.
const repProposicaoDoGrupo = (currentState, grupo) =>
  currentState.proposicoes.find(
    (p) =>
      p.correicaoId === grupo.correicaoId &&
      getDestinatarioRef(p) === grupo.destinatarioRef &&
      p.statusFluxo === StatusFluxo.AGUARDANDO_CIENCIA,
  ) || null;

const abrirModalCiencia = (gruposSelecionados) => {
  const root = ensureModalRoot();
  const currentState = state();
  const totalProposicoes = gruposSelecionados.reduce((s, g) => s + g.prontas, 0);
  const totalProvidencias = gruposSelecionados.reduce((s, g) => s + (g.comProvidencia || 0), 0);

  // Cada grupo exibe seu controle de destinatário (confirmar/trocar). Membro/unidade =>
  // <select> (1 e-mail); administração superior => nota multi-envio (1 e-mail por usuário).
  let totalEmails = 0;
  const itens = gruposSelecionados
    .map((g) => {
      const rep = repProposicaoDoGrupo(currentState, g);
      const control = rep
        ? renderDestinatarioControl(currentState, rep, grupoKey(g))
        : `<span class="muted">(sem proposição pronta)</span>`;
      if (rep) {
        const { tipo, sugeridos } = resolverUsuariosDestinatarios(currentState, rep);
        totalEmails +=
          tipo === TipoDestinatario.ADMINISTRACAO_SUPERIOR ? Math.max(sugeridos.length, 1) : 1;
      }
      return `
        <li style="margin-bottom: var(--space-3);">
          <strong>${g.rotulo || "—"}</strong> · Correição ${g.correicaoId || "—"} · ${g.prontas} proposição(ões)
          ${g.comProvidencia > 0 ? ` · <em>${g.comProvidencia} gerará(ão) pendência paralela</em>` : ""}
          <div style="margin-top:0.25rem;">${control}</div>
        </li>
      `;
    })
    .join("");

  const providenciaLine =
    totalProvidencias > 0
      ? `<p class="muted">Após a ciência, <strong>${totalProvidencias}</strong> proposição(ões) permanecerão com pendência paralela em acompanhamento (não bloqueiam a baixa definitiva).</p>`
      : "";

  const body = `
    <p>Você está prestes a cientificar <strong>${gruposSelecionados.length}</strong> grupo(s), totalizando <strong>${totalProposicoes}</strong> proposição(ões). Cada proposição transitará para <em>baixa definitiva</em>.</p>
    ${providenciaLine}
    <p><strong>Grupos e destinatários</strong> (confirme ou troque o destinatário de cada grupo; administração superior envia a todos os usuários mapeados):</p>
    <div class="lote-resumo-list">
      <ul style="list-style:none;padding-left:0;">${itens}</ul>
    </div>
    <p class="muted" style="margin-top: var(--space-3);">Serão disparados <strong>${totalEmails}</strong> e-mail(s) de ciência.</p>
    <div class="button-row" style="justify-content: flex-end; margin-top: var(--space-4);">
      <button class="button button--ghost" type="button" data-modal-close>Cancelar</button>
      <button class="button button--primary" type="button" data-action="confirmar-ciencia">Confirmar ciência e envio</button>
    </div>
  `;

  root.innerHTML = `
    <div class="modal-overlay" data-modal-overlay>
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="Confirmar ciência em lote">
        <header class="modal-header">
          <h2 class="modal-title">Confirmar ciência em lote</h2>
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
  root.querySelector("[data-action='confirmar-ciencia']")?.addEventListener("click", () => {
    confirmarCienciaEmLote(gruposSelecionados);
  });
};

const confirmarCienciaEmLote = (gruposSelecionados) => {
  // Lê os overrides ANTES de mutar (o modal ainda está no DOM). Validação: adm. superior
  // sem parametrização ou unidade vaga sem escolha bloqueiam — sempre cai numa pessoa real.
  const modalRoot = document.getElementById(MODAL_ROOT_ID);
  if (temAdmSuperiorVago(modalRoot)) {
    window.alert(
      "Há grupo orientado à administração superior sem usuários parametrizados. Parametrize na tela de Administração Superior antes de cientificar.",
    );
    return;
  }
  const overrides = lerOverridesDestinatario(modalRoot);
  if (Object.values(overrides).some((valor) => !valor)) {
    window.alert("Defina o destinatário dos grupos com unidade sem responsável atual antes de cientificar.");
    return;
  }

  const snapshot = gruposSelecionados.map((g) => ({
    correicaoId: g.correicaoId,
    destinatarioRef: g.destinatarioRef,
    rotulo: g.rotulo,
    prontas: g.prontas,
    destinatarioOverrideId: overrides[grupoKey(g)] || null,
  }));

  mutateState((draft) => {
    snapshot.forEach(({ correicaoId, destinatarioRef, destinatarioOverrideId }) => {
      cientificarGrupo(draft, correicaoId, destinatarioRef, undefined, { destinatarioOverrideId });
    });
    return draft;
  });

  selecaoKeys.clear();
  persistirSelecao();
  closeModal();

  snapshot.forEach(({ rotulo, prontas }) => {
    showToast(`Ciência registrada para ${prontas} proposição(ões) de ${rotulo || "—"}.`);
  });

  render();
};

// ---------------------------------------------------------------------------
// Render principal
// ---------------------------------------------------------------------------

const render = () => {
  const filtros = getFiltrosFromUrl();
  persistirFiltros(filtros);

  const currentState = state();
  const grupos = listFilaAguardandoCiencia(currentState);

  const keysValidas = new Set(grupos.map(grupoKey));
  let podou = false;
  for (const key of Array.from(selecaoKeys)) {
    if (!keysValidas.has(key)) {
      selecaoKeys.delete(key);
      podou = true;
    }
  }
  if (podou) persistirSelecao();

  const modo = determinarModo(filtros);

  let content;
  if (modo === "overview") {
    content = renderOverview(grupos, currentState);
  } else {
    content = renderModoGrupo(grupos, filtros);
  }

  mountPage({
    activePage: "secretaria-ciencia",
    title: "Aguardando ciência",
    actions: baseActions,
    content,
  });

  bindHandlers(filtros, grupos);
};

const bindHandlers = (filtros, grupos) => {
  document.querySelectorAll("[data-nav-correicao]").forEach((row) => {
    const correicao = row.dataset.navCorreicao;
    if (!correicao) return;
    row.addEventListener("click", () => {
      aplicarFiltros({ correicaoId: correicao });
    });
  });

  document.querySelectorAll("[data-kpi-filtros]").forEach((kpi) => {
    kpi.addEventListener("click", () => aplicarFiltros(JSON.parse(kpi.dataset.kpiFiltros)));
  });

  document.querySelector("[data-action='ver-todos']")?.addEventListener("click", () => {
    aplicarFiltros({ filaForcada: true });
  });

  document.querySelector("[data-action='voltar-overview']")?.addEventListener("click", () => {
    aplicarFiltros({});
  });

  document.querySelector("[data-action='limpar-filtros']")?.addEventListener("click", () => {
    aplicarFiltros({
      correicaoId: filtros.correicaoId || "",
      filaForcada: !filtros.correicaoId ? true : false,
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
    aplicarFiltros({
      correicaoId: filtros.correicaoId || "",
      estado: (data.get("estado") || "").toString(),
      prontoEm: (data.get("prontoEm") || "").toString(),
      filaForcada: true,
    });
  });

  document.querySelectorAll("[data-grupo-checkbox]").forEach((cb) => {
    cb.addEventListener("change", (event) => {
      const key = event.currentTarget.dataset.grupoCheckbox;
      if (event.currentTarget.checked) {
        selecaoKeys.add(key);
      } else {
        selecaoKeys.delete(key);
      }
      persistirSelecao();
      render();
    });
  });

  const selectAll = document.querySelector("[data-select-all]");
  if (selectAll) {
    selectAll.indeterminate = selectAll.dataset.selectAllState === "parcial";
    selectAll.addEventListener("change", (event) => {
      const filtrados = filtrarGrupos(grupos, filtros);
      const selecionaveis = filtrados.filter((g) => g.completo);
      if (event.currentTarget.checked) {
        selecionaveis.forEach((g) => selecaoKeys.add(grupoKey(g)));
      } else {
        selecionaveis.forEach((g) => selecaoKeys.delete(grupoKey(g)));
      }
      persistirSelecao();
      render();
    });
  }

  document.querySelector("[data-action='limpar-selecao']")?.addEventListener("click", () => {
    selecaoKeys.clear();
    persistirSelecao();
    render();
  });

  document
    .querySelector("[data-action='abrir-modal-ciencia']")
    ?.addEventListener("click", () => {
      const selecionados = grupos.filter((g) => selecaoKeys.has(grupoKey(g)) && g.completo);
      if (selecionados.length === 0) return;
      abrirModalCiencia(selecionados);
    });
};

window.addEventListener("popstate", render);

render();
