import { PERSONAS, getCurrentPersona, requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { Labels } from "../domain/enums.js";
import { listAdmSuperiores } from "../domain/destinatario.js";

requireAuth();

// Parametrização institucional — apenas Corregedoria e Secretaria.
const persona = getCurrentPersona();
if (persona !== PERSONAS.CORREGEDOR && persona !== PERSONAS.SECRETARIA) {
  window.location.href = "/pages/dashboard.html";
}

const escapeAttr = (v) => String(v ?? "").replace(/"/g, "&quot;");
const escapeHtml = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Membros do mesmo ramo da administração superior (via unidade de lotação).
const membrosDoRamo = (st, ramoMP) => {
  const unidadesDoRamo = new Set(
    (st.diretorioCnmp?.unidades || []).filter((u) => u.ramoMP === ramoMP).map((u) => u.id),
  );
  return (st.diretorioCnmp?.membros || []).filter((m) =>
    unidadesDoRamo.has(m.lotacaoUnidadeId),
  );
};

const renderAdmCard = (st, adm) => {
  const membros = membrosDoRamo(st, adm.ramoMP);
  const checks = membros
    .map((m) => {
      const checked = (adm.usuarioIds || []).includes(m.id) ? " checked" : "";
      return `<label class="acervo-filter-check"><input type="checkbox" data-adm="${escapeAttr(adm.id)}" value="${escapeAttr(m.id)}"${checked} /> <span>${escapeHtml(m.nome)} — ${escapeHtml(m.cargo || "")}</span></label>`;
    })
    .join("");
  const vazio =
    membros.length === 0
      ? `<p class="muted">Nenhum membro do ramo ${escapeHtml(adm.ramoMP)} no diretório CNMP.</p>`
      : "";
  const count = (adm.usuarioIds || []).length;
  return `
    <article class="panel stack" data-adm-card="${escapeAttr(adm.id)}">
      <header class="button-row" style="justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="margin: 0;">${escapeHtml(adm.nome)}</h3>
          <p class="muted" style="margin: 0;">${escapeHtml(adm.ramoMP)} · ${escapeHtml(Labels.tipoAdmSuperior?.[adm.tipo] || adm.tipo)}</p>
        </div>
        <span class="badge badge--neutral" data-adm-count="${escapeAttr(adm.id)}">${count} usuário(s)</span>
      </header>
      <div class="acervo-filter-checks">${checks}${vazio}</div>
    </article>
  `;
};

const render = () => {
  const st = state();
  const adms = listAdmSuperiores(st);
  const cards = adms.map((a) => renderAdmCard(st, a)).join("");
  mountPage({
    activePage: "administracao-superior",
    title: "Administração Superior",
    actions: baseActions,
    content: `
      <section class="stack">
        <div class="button-row">
          <button class="button button--primary" data-action="salvar">Salvar parametrização</button>
        </div>
        <div class="stack">
          ${cards || `<p class="muted">Nenhuma administração superior cadastrada.</p>`}
        </div>
      </section>
    `,
  });
  bind();
};

const bind = () => {
  // Atualiza o contador ao marcar/desmarcar.
  document.querySelectorAll("input[type='checkbox'][data-adm]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const admId = cb.dataset.adm;
      const marcados = document.querySelectorAll(
        `input[type='checkbox'][data-adm="${CSS.escape(admId)}"]:checked`,
      ).length;
      const badge = document.querySelector(`[data-adm-count="${CSS.escape(admId)}"]`);
      if (badge) badge.textContent = `${marcados} usuário(s)`;
    });
  });

  document.querySelector("[data-action='salvar']")?.addEventListener("click", () => {
    const mapa = {};
    document.querySelectorAll("input[type='checkbox'][data-adm]").forEach((cb) => {
      const admId = cb.dataset.adm;
      if (!mapa[admId]) mapa[admId] = [];
      if (cb.checked) mapa[admId].push(cb.value);
    });
    mutateState((draft) => {
      (draft.diretorioCnmp?.administracoesSuperiores || []).forEach((adm) => {
        if (mapa[adm.id]) adm.usuarioIds = mapa[adm.id];
      });
      return draft;
    });
    window.alert("Parametrização da Administração Superior salva.");
    render();
  });
};

render();
