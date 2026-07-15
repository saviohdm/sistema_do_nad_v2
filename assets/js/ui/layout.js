import {
  PERSONAS,
  getCurrentPersona,
  getCurrentUser,
  hasPermission,
  getMenuOverrideForCurrentPersona,
  getHomeForPersona,
} from "../app/auth.js";
import { loadState, saveState } from "../app/store.js";
import {
  countGruposCompletosProntos,
  listGruposAguardandoDiligencia,
} from "../domain/secretaria-filas.js";
import {
  listProposicoesCorreicionadoCiencias,
  listProposicoesCorreicionadoPendentes,
  cienciaJaVisualizadaPor,
} from "../domain/correicionados.js";
import { expirarDiligenciasVencidas } from "../domain/diligencias.js";
import { countPendenciasAbertas, countPendentesDoCorregedor } from "../domain/proposicoes.js";
import { renderIcon } from "./icons.js";

// O menu de uma persona pode ser plano (lista de itens) ou agrupado
// ({ label?, items }). Normaliza para grupos; personas sem grupos viram um
// grupo único sem rótulo (render idêntico ao anterior).
const getNavGroupsForCurrentPersona = () => {
  const menu = getMenuOverrideForCurrentPersona() || [];
  if (!menu.length) return [];
  const agrupado = menu.every((entry) => Array.isArray(entry.items));
  return agrupado ? menu : [{ items: menu }];
};

const getNavItemsForCurrentPersona = () =>
  getNavGroupsForCurrentPersona().flatMap((grupo) => grupo.items);

const pageSlug = (href) => href.split("?")[0].split("/").pop().replace(/\.html$/i, "");

export const activePageParaPersona = (slug, fallback = "proposicoes-lista") =>
  getNavItemsForCurrentPersona().some((item) => pageSlug(item.href) === slug) ? slug : fallback;

const buildHrefComFiltrosSalvos = (href, storageKey) => {
  try {
    const filtros = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (!filtros) return href;
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value === true) params.set(key, "1");
      else if (value) params.set(key, String(value));
    });
    const query = params.toString();
    return query ? `${href}?${query}` : href;
  } catch {
    return href;
  }
};

// Origens válidas do detalhe da proposição (whitelist). O slug é o mesmo da página
// emissora; as filas navegáveis reabrem com os filtros que o usuário deixou salvos.
export const ORIGENS_DETALHE = {
  "dashboard": {
    activePage: "dashboard",
    voltarLabel: "Voltar ao dashboard",
    href: () => "/pages/dashboard.html",
  },
  "proposicoes-lista": {
    activePage: "proposicoes-lista",
    voltarLabel: "Voltar à consulta",
    href: () => "/pages/proposicoes-lista.html",
  },
  "membro-auxiliar": {
    activePage: "membro-auxiliar",
    voltarLabel: "Voltar à minha fila",
    href: () => buildHrefComFiltrosSalvos("/pages/membro-auxiliar.html", "nad-membro-auxiliar-filtros"),
  },
  "corregedor-referendo": {
    activePage: "corregedor-referendo",
    voltarLabel: "Voltar à fila de referendo",
    href: () => buildHrefComFiltrosSalvos("/pages/corregedor-referendo.html", "nad-corregedor-referendo-filtros"),
  },
  "corregedor-decisao": {
    activePage: "corregedor-decisao",
    voltarLabel: "Voltar à fila de decisão",
    href: () => buildHrefComFiltrosSalvos("/pages/corregedor-decisao.html", "nad-corregedor-decisao-filtros"),
  },
  "secretaria-diligencia": {
    activePage: "secretaria-diligencia",
    voltarLabel: "Voltar à fila de diligência",
    href: () => buildHrefComFiltrosSalvos("/pages/secretaria-diligencia.html", "nad-secretaria-diligencia-filtros"),
  },
  "secretaria-providencia": {
    activePage: "secretaria-providencia",
    voltarLabel: "Voltar às providências",
    href: () => "/pages/secretaria-providencia.html",
  },
  "correicoes-criar": {
    activePage: "correicoes-lista",
    voltarLabel: "Voltar à correição",
    href: (proposicao) =>
      proposicao?.correicaoId
        ? `/pages/correicoes-criar.html?id=${proposicao.correicaoId}`
        : "/pages/correicoes-lista.html",
  },
  "correicionado-comprovacoes": {
    activePage: "correicionado-comprovacoes",
    voltarLabel: "Voltar às comprovações",
    href: () => "/pages/correicionado-comprovacoes.html",
  },
  "correicionado-ciencias": {
    activePage: "correicionado-ciencias",
    voltarLabel: "Voltar às ciências",
    href: () => "/pages/correicionado-ciencias.html",
  },
};

// `fromMembro`/`fromCorregedor` são aliases legados aceitos apenas na leitura.
export const resolverOrigemDetalhe = ({ from, fromMembro, fromCorregedor }) => {
  if (from && ORIGENS_DETALHE[from]) return { slug: from, ...ORIGENS_DETALHE[from] };
  if (fromMembro === "1") return { slug: "membro-auxiliar", ...ORIGENS_DETALHE["membro-auxiliar"] };
  if (fromCorregedor === "referendo") return { slug: "corregedor-referendo", ...ORIGENS_DETALHE["corregedor-referendo"] };
  if (fromCorregedor === "decisao") return { slug: "corregedor-decisao", ...ORIGENS_DETALHE["corregedor-decisao"] };
  return null;
};

export const renderBreadcrumb = (items) =>
  items
    .filter(Boolean)
    .map(({ label, href }) =>
      href
        ? `<a class="breadcrumb__link" href="${href}">${escapeHtml(label)}</a>`
        : `<span class="breadcrumb__atual">${escapeHtml(label)}</span>`,
    )
    .join(`<span class="breadcrumb__sep" aria-hidden="true">›</span>`);

const computeBadgeValue = (badgeKey) => {
  if (!badgeKey) return null;
  try {
    const state = loadState();
    if (badgeKey === "gruposCompletosProntos") {
      const total = countGruposCompletosProntos(state);
      return total > 0 ? total : null;
    }
    if (badgeKey === "minhasComprovacoesPendentes") {
      const user = getCurrentUser();
      if (!user) return null;
      const total = listProposicoesCorreicionadoPendentes(state, user).length;
      return total > 0 ? total : null;
    }
    if (badgeKey === "minhasCienciasNaoVisualizadas") {
      const user = getCurrentUser();
      if (!user) return null;
      const total = listProposicoesCorreicionadoCiencias(state, user).filter(
        (p) => !cienciaJaVisualizadaPor(p, user.id),
      ).length;
      return total > 0 ? total : null;
    }
    if (badgeKey === "pendentesDecisaoCN" || badgeKey === "pendentesReferendoCN") {
      const pendentes = countPendentesDoCorregedor(state);
      const total =
        badgeKey === "pendentesDecisaoCN"
          ? pendentes.pendentesDecisao
          : pendentes.pendentesReferendo;
      return total > 0 ? total : null;
    }
    if (badgeKey === "gruposDiligenciaProntos") {
      const total = listGruposAguardandoDiligencia(state).filter((g) => g.completo).length;
      return total > 0 ? total : null;
    }
    if (badgeKey === "providenciasPendentes") {
      const total = countPendenciasAbertas(state);
      return total > 0 ? total : null;
    }
  } catch (err) {
    return null;
  }
  return null;
};

const renderNavBadge = (badgeKey) => {
  const value = computeBadgeValue(badgeKey);
  if (value == null) return "";
  return `<span class="nav-link__badge" aria-label="${value} pendentes">${value}</span>`;
};

const escapeHtml = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const renderPersonaBadge = () => {
  const persona = getCurrentPersona();
  if (!persona) return "";

  const user = persona === PERSONAS.CORREICIONADO ? getCurrentUser() : null;
  const nomeExibido = user ? escapeHtml(user.nome) : persona;
  const cargoExibido = user ? `<div class="sidebar-persona__cargo">${escapeHtml(user.cargo || "")}</div>` : "";

  return `
    <div class="sidebar-persona">
      <div class="sidebar-persona__inner">
        <div class="sidebar-persona__text">
          <div class="sidebar-persona__label">Logado como ${user ? "<em>Correicionado</em>:" : ""}</div>
          <div class="sidebar-persona__name">${nomeExibido}</div>
          ${cargoExibido}
        </div>
        <button
          class="button button--small sidebar-persona__switch"
          onclick="localStorage.clear(); sessionStorage.clear(); window.location.href='/pages/login.html';"
        >
          Trocar
        </button>
      </div>
    </div>
  `;
};

const handleAvancarTempo = () => {
  const state = loadState();
  const cincoDiasAdiante = new Date();
  cincoDiasAdiante.setFullYear(cincoDiasAdiante.getFullYear() + 1);
  const afetadas = expirarDiligenciasVencidas(state, cincoDiasAdiante);
  saveState(state);
  if (afetadas.length === 0) {
    window.alert("Nenhuma diligência com prazo vencido foi encontrada.");
  } else {
    window.alert(
      `Expiraram ${afetadas.length} diligência(s): ${afetadas.map((p) => p.numero).join(", ")}.`,
    );
    window.location.reload();
  }
};

if (typeof window !== "undefined") {
  window.__nadAvancarTempo = handleAvancarTempo;
}

// ---------------------------------------------------------------------------
// Sidebar recolhível: estado persistido por usuário do navegador; o toggle
// atua no DOM já montado (sem re-render) para não perder handlers da página.
// ---------------------------------------------------------------------------

const SIDEBAR_RECOLHIDA_KEY = "nad-sidebar-recolhida";

const isSidebarRecolhida = () => localStorage.getItem(SIDEBAR_RECOLHIDA_KEY) === "1";

const handleToggleSidebar = () => {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;
  const recolhida = shell.classList.toggle("app-shell--nav-recolhida");
  localStorage.setItem(SIDEBAR_RECOLHIDA_KEY, recolhida ? "1" : "0");
  const botao = document.querySelector("[data-toggle-sidebar]");
  if (!botao) return;
  const rotulo = recolhida ? "Expandir menu" : "Recolher menu";
  botao.setAttribute("aria-expanded", String(!recolhida));
  botao.setAttribute("aria-label", rotulo);
  botao.setAttribute("title", rotulo);
  const labelEl = botao.querySelector(".sidebar__recolher-label");
  if (labelEl) labelEl.textContent = rotulo;
};

if (typeof window !== "undefined") {
  window.__nadToggleSidebar = handleToggleSidebar;
}

const renderNavItem = (item, activePage) => {
  const ativo = pageSlug(item.href) === activePage;
  // Item sem ícone (personas de menu plano) ganha a inicial do rótulo como
  // marca visual do modo recolhido; invisível no modo expandido.
  const marcaVisual = item.icon
    ? renderIcon(item.icon)
    : `<span class="nav-link__inicial" aria-hidden="true">${escapeHtml((item.label || "•").charAt(0))}</span>`;
  return `
    <a class="nav-link ${ativo ? "is-active" : ""}"${ativo ? ' aria-current="page"' : ""} href="${item.href}" title="${escapeHtml(item.label)}">
      ${marcaVisual}
      <span class="nav-link__label">${escapeHtml(item.label)}</span>
      ${renderNavBadge(item.badgeKey)}
    </a>
  `;
};

const renderNavGroup = (grupo, activePage) => `
  <div class="nav-group">
    ${grupo.label ? `<p class="nav-group__label">${escapeHtml(grupo.label)}</p>` : ""}
    ${grupo.items.map((item) => renderNavItem(item, activePage)).join("")}
  </div>
`;

const renderAvancarTempoButton = () => {
  if (!hasPermission("avancar_tempo_sistema")) return "";
  return `
    <button
      class="button button--secondary button--small"
      type="button"
      onclick="window.__nadAvancarTempo()"
      title="Simula a passagem do tempo: vence todas as diligências com prazo passado."
    >
      Avançar tempo do sistema
    </button>
  `;
};

export const renderAppShell = ({ activePage, title, content, actions = "", breadcrumb = "" }) => {
  const navGroups = getNavGroupsForCurrentPersona();
  const recolhida = isSidebarRecolhida();
  const rotuloRecolher = recolhida ? "Expandir menu" : "Recolher menu";
  const avancarTempo = renderAvancarTempoButton();
  const actionsAumentadas = [avancarTempo, actions].filter(Boolean).join(" ");

  return `
    <div class="app-shell${recolhida ? " app-shell--nav-recolhida" : ""}">
      <aside class="sidebar">
        ${renderPersonaBadge()}
        <p class="sidebar__title"><a href="${getHomeForPersona()}" title="Ir para a página inicial">NAD</a></p>
        <nav aria-label="Menu principal">
          ${navGroups.map((grupo) => renderNavGroup(grupo, activePage)).join("")}
        </nav>
        <button
          class="sidebar__recolher"
          type="button"
          data-toggle-sidebar
          aria-expanded="${String(!recolhida)}"
          aria-label="${rotuloRecolher}"
          title="${rotuloRecolher}"
          onclick="window.__nadToggleSidebar()"
        >
          ${renderIcon("recolher", "sidebar__recolher-icone")}
          <span class="sidebar__recolher-label">${rotuloRecolher}</span>
        </button>
      </aside>
      <main class="page">
        <header class="page-header">
          <div class="page-header__content">
            ${breadcrumb ? `<nav class="breadcrumb" aria-label="Trilha de contexto">${breadcrumb}</nav>` : ""}
            <h1 class="page-title">${title}</h1>
          </div>
          ${actionsAumentadas ? `<div class="toolbar page-actions">${actionsAumentadas}</div>` : ""}
        </header>
        ${content}
      </main>
    </div>
  `;
};
