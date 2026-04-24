import { requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { formatDateTime } from "../app/utils.js";
import { Labels } from "../domain/enums.js";
import { listFilaPendenciasProvidencia } from "../domain/secretaria-filas.js";
import { registrarCumprimentoPendencia } from "../domain/pendencias-secretaria.js";
import { renderBadge } from "../ui/components.js";

requireAuth();

const renderFilaProvidencia = (proposicoes) => {
  if (!proposicoes.length) {
    return `<div class="empty-state">Nenhuma providência pendente.</div>`;
  }

  return `
    <div class="stack">
      ${proposicoes
        .map(
          (proposicao) => `
            <section class="panel">
              <h3 class="panel__title">${proposicao.numero} · ${proposicao.unidade}</h3>
              <div class="cards-grid">
                ${proposicao.pendenciasSecretaria
                  .map(
                    (pendencia) => `
                      <article class="status-card">
                        <div class="pill-list">
                          <span class="badge badge--${pendencia.status === "cumprida" ? "success" : "warning"}">
                            ${pendencia.status === "cumprida" ? "Cumprida" : "Pendente"}
                          </span>
                          <span class="badge badge--neutral">
                            ${Labels.tipoProvidencia[pendencia.tipoProvidencia]}
                          </span>
                        </div>
                        <p><strong>${pendencia.descricao}</strong></p>
                        <p class="muted">Criada em ${formatDateTime(pendencia.dataCriacao)}</p>
                        <p class="muted">Cumprida em ${pendencia.dataCumprimento ? formatDateTime(pendencia.dataCumprimento) : "—"}</p>
                        <p>Observações: ${pendencia.observacoes || "—"}</p>
                        ${
                          pendencia.status !== "cumprida"
                            ? `
                              <form class="stack" data-pendencia-form="${proposicao.id}:${pendencia.id}">
                                <div class="field">
                                  <label>Data de cumprimento</label>
                                  <input type="date" name="dataCumprimento" required />
                                </div>
                                <div class="field">
                                  <label>Observações</label>
                                  <textarea name="observacoes"></textarea>
                                </div>
                                <button class="button" type="submit">Registrar cumprimento</button>
                              </form>
                            `
                            : ""
                        }
                      </article>
                    `,
                  )
                  .join("")}
              </div>
            </section>
          `,
        )
        .join("")}
    </div>
  `;
};

const render = () => {
  const currentState = state();
  const filaProvidencia = listFilaPendenciasProvidencia(currentState);

  mountPage({
    activePage: "secretaria-providencia",
    title: "Pendências de providência",
    subtitle:
      "Controle administrativo paralelo das providências externas (parcial/não cumprida). Cumprimento ocorre fora do sistema; aqui apenas se registra data e observações.",
    actions: baseActions,
    content: `
      <section class="panel">
        <h2 class="panel__title">Pendências de providência ${renderBadge(`${filaProvidencia.length}`, filaProvidencia.length ? "warning" : "neutral")}</h2>
        ${renderFilaProvidencia(filaProvidencia)}
      </section>
    `,
  });

  document.querySelectorAll("[data-pendencia-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const [proposicaoId, pendenciaId] = event.currentTarget.dataset.pendenciaForm.split(":");
      const data = new FormData(event.currentTarget);

      mutateState((draft) => {
        const proposicao = draft.proposicoes.find((item) => item.id === proposicaoId);
        if (!proposicao) return draft;

        registrarCumprimentoPendencia(proposicao, pendenciaId, {
          dataCumprimento: data.get("dataCumprimento"),
          observacoes: data.get("observacoes"),
        });

        return draft;
      });

      render();
    });
  });
};

render();
