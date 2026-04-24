import { requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { Labels } from "../domain/enums.js";
import { listFilaAguardandoCiencia } from "../domain/secretaria-filas.js";
import { cientificarGrupo } from "../domain/ciencia.js";
import { renderBadge } from "../ui/components.js";

requireAuth();

const escapeAttr = (value) => String(value).replace(/"/g, "&quot;");

const renderFilaCiencia = (grupos) => {
  if (!grupos.length) {
    return `<div class="empty-state">Nenhum grupo aguardando ciência.</div>`;
  }

  return `
    <div class="stack">
      ${grupos
        .map((grupo) => {
          const statusBadge = grupo.completo
            ? renderBadge("Grupo completo · pronto para ciência", "success")
            : renderBadge(
                `Aguardando ${grupo.pendentesNoGrupo} proposição(ões) restante(s)`,
                "warning",
              );
          const acao = grupo.completo
            ? `<button class="button" type="button" data-ciencia-grupo data-correicao="${escapeAttr(grupo.correicaoId || "")}" data-unidade="${escapeAttr(grupo.unidade || "")}">Dar ciência em lote (${grupo.prontas})</button>`
            : `<button class="button button--secondary" type="button" disabled title="Aguardando todas as proposições desta unidade/correição estarem conclusivas">Dar ciência em lote (${grupo.prontas}/${grupo.total})</button>`;

          return `
            <article class="panel">
              <h3 class="panel__title">${grupo.unidade || "—"}</h3>
              <p class="muted">${grupo.ramoMPNome || grupo.ramoMP || ""} · Correição ${grupo.correicaoId || "—"} · ${grupo.prontas}/${grupo.total} prontas</p>
              <div class="pill-list">${statusBadge}</div>
              <ul class="stack" style="padding-left: 1rem;">
                ${grupo.proposicoes
                  .map(
                    (proposicao) => `
                      <li>
                        <strong>${proposicao.numero}</strong> — ${Labels.tipoConclusao[proposicao.juizoAtual?.tipoConclusao] || "—"}
                      </li>
                    `,
                  )
                  .join("")}
              </ul>
              <div class="button-row">${acao}</div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
};

const render = () => {
  const currentState = state();
  const filaCiencia = listFilaAguardandoCiencia(currentState);
  const countCiencia = filaCiencia.reduce((sum, grupo) => sum + grupo.prontas, 0);

  mountPage({
    activePage: "secretaria-ciencia",
    title: "Aguardando ciência",
    subtitle:
      "Proposições com juízo conclusivo, agrupadas por unidade + correição. A ciência só é liberada quando todas as proposições do grupo estão prontas.",
    actions: baseActions,
    content: `
      <section class="panel">
        <h2 class="panel__title">Fila de ciência ${renderBadge(`${countCiencia}`, countCiencia ? "warning" : "neutral")}</h2>
        ${renderFilaCiencia(filaCiencia)}
      </section>
    `,
  });

  document.querySelectorAll("[data-ciencia-grupo]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const correicaoId = event.currentTarget.dataset.correicao || null;
      const unidade = event.currentTarget.dataset.unidade || null;

      mutateState((draft) => {
        cientificarGrupo(draft, correicaoId, unidade);
        return draft;
      });

      render();
    });
  });
};

render();
