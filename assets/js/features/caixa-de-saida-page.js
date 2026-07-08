import { PERSONAS, getCurrentPersona, hasPermission, requireAuth } from "../app/auth.js";
import { mountPage } from "../app/bootstrap.js";
import { loadState } from "../app/store.js";
import { listarCaixaSaida } from "../domain/caixa-de-saida.js";
import { TipoCaixaSaida } from "../domain/enums.js";
import { formatDateTime } from "../app/utils.js";
import { renderBadge, renderEmptyState } from "../ui/components.js";

requireAuth();

if (!hasPermission("ver_caixa_de_saida") || getCurrentPersona() === PERSONAS.CORREICIONADO) {
  window.location.href = "/pages/dashboard.html";
}

const getFiltrosFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    tipo: params.get("tipo") || "",
    q: params.get("q") || "",
  };
};

const setFiltrosInUrl = (filtros) => {
  const params = new URLSearchParams();
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  if (filtros.q) params.set("q", filtros.q);
  const query = params.toString();
  window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
};

const renderTipoBadge = (tipo) =>
  tipo === TipoCaixaSaida.DILIGENCIA
    ? renderBadge("Diligência", "warning")
    : renderBadge("Ciência", "primary");

const renderEntry = (entry, state) => {
  const proposicoes = (entry.proposicaoIds || [])
    .map((id) => state.proposicoes.find((p) => p.id === id))
    .filter(Boolean);
  return `
    <article class="panel stack">
      <header class="button-row" style="justify-content: space-between;">
        <div>
          <p class="muted" style="margin: 0;">Enviado em ${formatDateTime(entry.enviadoEm)} por ${entry.enviadoPor}</p>
          <h3 style="margin: 0.25rem 0;">${entry.assunto}</h3>
        </div>
        ${renderTipoBadge(entry.tipo)}
      </header>
      <div>
        <p style="margin: 0;"><strong>Para:</strong> ${entry.usuarioNotificadoNome} &lt;${entry.usuarioNotificadoEmail}&gt;${entry.override ? ` <span class="badge badge--neutral">destinatário manual</span>` : ""}</p>
        ${
          proposicoes.length > 0
            ? `<p style="margin: 0.25rem 0 0;"><strong>Proposições:</strong> ${proposicoes
                .map((p) => `<a href="proposicao-detalhe.html?id=${p.id}&from=caixa-de-saida">${p.numero}</a>`)
                .join(", ")}</p>`
            : ""
        }
      </div>
      <div class="panel" style="padding: 0.75rem; background: var(--color-surface-muted);">
        ${entry.corpoResumo}<br>
        <span class="muted" style="font-size: 0.85rem;">Link de acesso: <code>${entry.linkAcesso}</code></span>
      </div>
    </article>
  `;
};

const render = () => {
  const state = loadState();
  const filtros = getFiltrosFromUrl();
  setFiltrosInUrl(filtros);
  const entries = listarCaixaSaida(state, filtros);

  const totals = (state.caixaDeSaida || []).reduce(
    (acc, e) => {
      if (e.tipo === TipoCaixaSaida.DILIGENCIA) acc.diligencia++;
      else if (e.tipo === TipoCaixaSaida.CIENCIA) acc.ciencia++;
      return acc;
    },
    { diligencia: 0, ciencia: 0 },
  );

  const filtersHtml = `
    <form class="panel" id="filtros" style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
      <div class="field" style="min-width: 220px;">
        <label for="filtro-tipo">Tipo de e-mail</label>
        <select id="filtro-tipo" name="tipo">
          <option value="">Todos (${totals.diligencia + totals.ciencia})</option>
          <option value="${TipoCaixaSaida.DILIGENCIA}" ${filtros.tipo === TipoCaixaSaida.DILIGENCIA ? "selected" : ""}>Diligência (${totals.diligencia})</option>
          <option value="${TipoCaixaSaida.CIENCIA}" ${filtros.tipo === TipoCaixaSaida.CIENCIA ? "selected" : ""}>Ciência (${totals.ciencia})</option>
        </select>
      </div>
      <div class="field" style="flex: 1; min-width: 240px;">
        <label for="filtro-q">Busca textual</label>
        <input id="filtro-q" name="q" type="text" value="${filtros.q || ""}" placeholder="assunto, destinatário, e-mail..." />
      </div>
      <button class="button" type="submit">Filtrar</button>
    </form>
  `;

  const listHtml =
    entries.length === 0
      ? renderEmptyState(
          (state.caixaDeSaida || []).length === 0
            ? "Nenhum e-mail foi disparado pelo sistema ainda. Quando a Secretaria abrir uma diligência ou cientificar uma proposição, o item aparecerá aqui."
            : "Nenhum e-mail atende aos filtros selecionados.",
        )
      : `<div class="stack">${entries.map((e) => renderEntry(e, state)).join("")}</div>`;

  mountPage({
    activePage: "caixa-de-saida",
    title: "Caixa de saída (demo)",
    subtitle: "Registro dos e-mails que o sistema simulou enviar ao correicionado. Em produção, equivaleria à integração SMTP.",
    content: `${filtersHtml}<div style="height: 1rem;"></div>${listHtml}`,
  });

  const form = document.querySelector("#filtros");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const novos = { tipo: fd.get("tipo") || "", q: fd.get("q") || "" };
      setFiltrosInUrl(novos);
      window.location.reload();
    });
  }
};

render();
