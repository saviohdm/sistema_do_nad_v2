import { getCurrentPersona, hasPermission, getMenuOverrideForCurrentPersona } from "../app/auth.js";
import { loadState } from "../app/store.js";
import { countGruposCompletosProntos } from "../domain/secretaria-filas.js";

const baseNavItems = [
  { href: "dashboard.html", label: "Dashboard" },
  { href: "membro-auxiliar.html", label: "Minha fila", permission: "ver_fila_membro_auxiliar" },
  { href: "proposicoes-criar.html", label: "Criar Proposição", permission: "criar_proposicao" },
  { href: "proposicao-detalhe.html?id=prop-003", label: "Detalhe da proposição" },
];

const getNavItemsForCurrentPersona = () => {
  const override = getMenuOverrideForCurrentPersona();
  if (override) return override;
  return baseNavItems.filter((item) => !item.permission || hasPermission(item.permission));
};

const computeBadgeValue = (badgeKey) => {
  if (!badgeKey) return null;
  try {
    const state = loadState();
    if (badgeKey === "gruposCompletosProntos") {
      const total = countGruposCompletosProntos(state);
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

export const renderPersonaBadge = () => {
  const persona = getCurrentPersona();
  if (!persona) return "";

  return `
    <div class="sidebar-persona">
      <div class="sidebar-persona__inner">
        <div class="sidebar-persona__text">
          <div class="sidebar-persona__label">Logado como:</div>
          <div class="sidebar-persona__name">${persona}</div>
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

export const renderAppShell = ({ activePage, title, subtitle, content, actions = "" }) => {
  const navItems = getNavItemsForCurrentPersona();

  return `
    <div class="app-shell">
      <aside class="sidebar">
        ${renderPersonaBadge()}
        <p class="sidebar__title">NAD</p>
        <p class="sidebar__subtitle">Gestão de proposições, diligências, decisões e pendências da Secretaria Processual.</p>
        <nav>
          ${navItems
            .map(
              (item) => `
                <a class="nav-link ${item.href.includes(activePage) ? "is-active" : ""}" href="${item.href}">
                  <span class="nav-link__label">${item.label}</span>
                  ${renderNavBadge(item.badgeKey)}
                </a>
              `,
            )
            .join("")}
        </nav>
      </aside>
      <main class="page">
        <header class="page-header">
          <div class="page-header__content">
            <h1 class="page-title">${title}</h1>
            <p class="page-subtitle">${subtitle}</p>
          </div>
          ${actions ? `<div class="toolbar page-actions">${actions}</div>` : ""}
        </header>
        ${content}
      </main>
    </div>
  `;
};
