import assert from "node:assert/strict";
import test from "node:test";

class MemoryStorage {
  #items = new Map();

  get length() {
    return this.#items.size;
  }

  clear() {
    this.#items.clear();
  }

  getItem(key) {
    return this.#items.has(key) ? this.#items.get(key) : null;
  }

  key(index) {
    return Array.from(this.#items.keys())[index] ?? null;
  }

  removeItem(key) {
    this.#items.delete(key);
  }

  setItem(key, value) {
    this.#items.set(key, String(value));
  }
}

globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
localStorage.setItem("nad-persona-atual", "Corregedor Nacional");

const { renderAppShell } = await import("../assets/js/ui/layout.js");

const renderShell = () =>
  renderAppShell({
    activePage: "corregedor-inicio",
    title: "Início",
    content: '<section aria-label="Conteúdo de teste"></section>',
  });

test("renderiza os controles e relações acessíveis da navegação mobile", () => {
  const html = renderShell();

  assert.match(html, /<header class="mobile-topbar">/);
  assert.match(
    html,
    /data-mobile-nav-toggle[\s\S]*aria-controls="app-sidebar"[\s\S]*aria-expanded="false"[\s\S]*aria-label="Abrir menu"/,
  );
  assert.match(html, /<aside class="sidebar" id="app-sidebar" data-mobile-sidebar>/);
  assert.match(html, /data-mobile-nav-close[\s\S]*aria-label="Fechar menu"/);
  assert.match(
    html,
    /<div class="mobile-nav-backdrop" data-mobile-nav-backdrop aria-hidden="true"><\/div>/,
  );
});

test("preserva título, item ativo e estado recolhido do shell desktop", () => {
  localStorage.setItem("nad-sidebar-recolhida", "1");
  const html = renderShell();

  assert.match(html, /class="app-shell app-shell--nav-recolhida"/);
  assert.match(html, /class="mobile-topbar__page" title="Início">Início<\/span>/);
  assert.match(
    html,
    /class="nav-link is-active" aria-current="page" href="corregedor-inicio\.html"/,
  );
});
