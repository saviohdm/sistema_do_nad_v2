import {
  PERSONAS,
  getCurrentPersona,
  getCurrentUser,
  hasPermission,
  getMenuOverrideForCurrentPersona,
  getHomeForPersona,
} from "../app/auth.js";
import { loadState, saveState } from "../app/store.js";
import { countGruposCompletosProntos } from "../domain/secretaria-filas.js";
import {
  listProposicoesCorreicionadoCiencias,
  listProposicoesCorreicionadoPendentes,
  cienciaJaVisualizadaPor,
} from "../domain/correicionados.js";
import { expirarDiligenciasVencidas } from "../domain/diligencias.js";

const getNavItemsForCurrentPersona = () => getMenuOverrideForCurrentPersona() || [];

const pageSlug = (href) => href.split("?")[0].split("/").pop().replace(/\.html$/i, "");

export const activePageParaPersona = (slug, fallback = "proposicoes-lista") =>
  getNavItemsForCurrentPersona().some((item) => pageSlug(item.href) === slug) ? slug : fallback;

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

export const renderAppShell = ({ activePage, title, subtitle, content, actions = "" }) => {
  const navItems = getNavItemsForCurrentPersona();
  const avancarTempo = renderAvancarTempoButton();
  const actionsAumentadas = [avancarTempo, actions].filter(Boolean).join(" ");

  return `
    <div class="app-shell">
      <aside class="sidebar">
        ${renderPersonaBadge()}
        <p class="sidebar__title"><a href="${getHomeForPersona()}" title="Ir para a página inicial">NAD</a></p>
        <p class="sidebar__subtitle">Gestão de proposições, diligências, decisões e pendências da Secretaria Processual.</p>
        <nav>
          ${navItems
            .map((item) => {
              const ativo = pageSlug(item.href) === activePage;
              return `
                <a class="nav-link ${ativo ? "is-active" : ""}"${ativo ? ' aria-current="page"' : ""} href="${item.href}">
                  <span class="nav-link__label">${item.label}</span>
                  ${renderNavBadge(item.badgeKey)}
                </a>
              `;
            })
            .join("")}
        </nav>
      </aside>
      <main class="page">
        <header class="page-header">
          <div class="page-header__content">
            <h1 class="page-title">${title}</h1>
            <p class="page-subtitle">${subtitle}</p>
          </div>
          ${actionsAumentadas ? `<div class="toolbar page-actions">${actionsAumentadas}</div>` : ""}
        </header>
        ${content}
      </main>
    </div>
  `;
};
