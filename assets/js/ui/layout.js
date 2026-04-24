import { getCurrentPersona, hasPermission, getMenuOverrideForCurrentPersona } from "../app/auth.js";

const baseNavItems = [
  { href: "dashboard.html", label: "Dashboard" },
  { href: "membro-auxiliar.html", label: "Minha fila", permission: "ver_fila_membro_auxiliar" },
  { href: "proposicoes-lista.html", label: "Proposições" },
  { href: "proposicoes-criar.html", label: "Criar Proposição", permission: "criar_proposicao" },
  { href: "proposicao-detalhe.html?id=prop-003", label: "Detalhe da proposição" },
  { href: "diligencias.html", label: "Diligências" },
];

const getNavItemsForCurrentPersona = () => {
  const override = getMenuOverrideForCurrentPersona();
  if (override) return override;
  return baseNavItems.filter((item) => !item.permission || hasPermission(item.permission));
};

export const renderPersonaBadge = () => {
  const persona = getCurrentPersona();
  if (!persona) return "";

  return `
    <div style="padding: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
        <div style="min-width: 0;">
          <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7);">Logado como:</div>
          <div style="font-weight: 600; font-size: 0.875rem; overflow: hidden; text-overflow: ellipsis; color: #ffffff;">${persona}</div>
        </div>
        <button
          class="button button--small"
          style="flex-shrink: 0; background: rgba(255, 255, 255, 0.2); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.3);"
          onclick="localStorage.clear(); window.location.href='/pages/login.html';"
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
                  ${item.label}
                </a>
              `,
            )
            .join("")}
        </nav>
      </aside>
      <main class="page">
        <header class="page-header">
          <div>
            <h1 class="page-title">${title}</h1>
            <p class="page-subtitle">${subtitle}</p>
          </div>
          ${actions ? `<div class="toolbar">${actions}</div>` : ""}
        </header>
        ${content}
      </main>
    </div>
  `;
};
