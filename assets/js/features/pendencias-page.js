import { requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { formatDateTime } from "../app/utils.js";
import { Labels } from "../domain/enums.js";
import { listProposicoes } from "../domain/proposicoes.js";
import { registrarCumprimentoPendencia } from "../domain/pendencias-secretaria.js";

requireAuth();

const render = () => {
  const currentState = state();
  const proposicoes = listProposicoes(currentState).filter((item) => item.pendenciasSecretaria.length);

  mountPage({
    activePage: "pendencias-secretaria",
    title: "Pendências da Secretaria",
    subtitle:
      "Controle administrativo paralelo das providências externas. O cumprimento ocorre fora do sistema; aqui só são registradas data e observações.",
    actions: baseActions,
    content: `
      <section class="stack">
        ${
          proposicoes.length
            ? proposicoes
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
                .join("")
            : `<div class="empty-state">Nenhuma pendência aberta ou concluída para a Secretaria.</div>`
        }
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
