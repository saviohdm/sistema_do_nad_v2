import { initMobileNavigation, renderAppShell } from "../ui/layout.js";
import { loadState, resetState } from "./store.js";

let disposeMobileNavigation = null;

export const mountPage = ({ activePage, title, content, actions, breadcrumb }) => {
  const app = document.querySelector("#app");
  disposeMobileNavigation?.();
  app.innerHTML = renderAppShell({ activePage, title, content, actions, breadcrumb });
  disposeMobileNavigation = initMobileNavigation();

  const resetButton = document.querySelector("[data-reset-state]");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      resetState();
      window.location.reload();
    });
  }
};

export const baseActions = `
  <button class="button button--secondary" data-reset-state type="button">
    Restaurar dados iniciais
  </button>
`;

export const state = () => loadState();
