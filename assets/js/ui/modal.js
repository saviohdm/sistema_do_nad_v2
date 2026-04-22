const MODAL_ROOT_ID = "nad-modal-root";

const ensureRoot = () => {
  let root = document.getElementById(MODAL_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = MODAL_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
};

export const closeModal = () => {
  const root = document.getElementById(MODAL_ROOT_ID);
  if (root) root.innerHTML = "";
};

const renderShell = (title, bodyHtml) => `
  <div class="modal-overlay" data-modal-overlay>
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="${title}">
      <header class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close" type="button" data-modal-close aria-label="Fechar">×</button>
      </header>
      <div class="modal-body">${bodyHtml}</div>
    </div>
  </div>
`;

const bindClose = (root) => {
  root.querySelector("[data-modal-close]")?.addEventListener("click", closeModal);
  root.querySelector("[data-modal-overlay]")?.addEventListener("click", (event) => {
    if (event.target.matches("[data-modal-overlay]")) closeModal();
  });
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") closeModal();
    },
    { once: true },
  );
};

export const openRelatorioFinalModal = ({ correicaoId, ramoMP, proposicoes }) => {
  const root = ensureRoot();
  const titulo = `Relatório final — correição ${correicaoId || "sem identificador"}`;

  const linhas = proposicoes.length
    ? proposicoes
        .map(
          (p) => `
            <tr>
              <td><strong>${p.numero}</strong></td>
              <td>${p.unidade}</td>
              <td>${p.tematica || "—"}</td>
              <td>${(p.descricao || "").substring(0, 140)}${(p.descricao || "").length > 140 ? "..." : ""}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="4"><em>Nenhuma proposição associada a esta correição.</em></td></tr>`;

  const body = `
    <div class="inline-note" style="background: var(--surface-warm); border-left: 4px solid var(--warning); padding: var(--space-3); margin-bottom: var(--space-4);">
      <strong>Template em desenvolvimento.</strong>
      Este é um preview das proposições que comporão o relatório final a ser encaminhado
      ao Conselho Nacional do Ministério Público (CNMP) para referendo em sessão solene.
    </div>
    <p class="muted">Ramo: <strong>${ramoMP || "—"}</strong> · Total de proposições: <strong>${proposicoes.length}</strong></p>
    <div class="table-wrap" style="margin-top: var(--space-3);">
      <table class="table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Unidade</th>
            <th>Temática</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <div class="button-row" style="margin-top: var(--space-4); justify-content: flex-end;">
      <button class="button button--ghost" type="button" data-modal-close>Fechar</button>
    </div>
  `;

  root.innerHTML = renderShell(titulo, body);
  bindClose(root);
};
