import { renderAppShell } from "../ui/layout.js";
import { loadState, resetState } from "./store.js";

export const mountPage = ({ activePage, title, subtitle, content, actions }) => {
  const app = document.querySelector("#app");
  app.innerHTML = renderAppShell({ activePage, title, subtitle, content, actions });

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
