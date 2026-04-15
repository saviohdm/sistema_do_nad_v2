import { requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { criarDiligencia } from "../domain/diligencias.js";
import { listProposicoes } from "../domain/proposicoes.js";
import { renderDiligenciasCards } from "../ui/components.js";

requireAuth();

const render = () => {
  const currentState = state();
  const proposicoes = listProposicoes(currentState);

  mountPage({
    activePage: "diligencias",
    title: "Diligências",
    subtitle:
      "Visão operacional da Secretaria Processual. Aqui o protótipo permite criar novas diligências e acompanhar o ciclo de comprovação.",
    actions: baseActions,
    content: `
      <section class="stack">
        <form class="panel stack" id="form-criar-diligencia">
          <h3 class="panel__title">Criar nova diligência</h3>
          <div class="field-grid">
            <div class="field">
              <label for="proposicaoId">Proposição</label>
              <select id="proposicaoId" name="proposicaoId" required>
                ${proposicoes
                  .map(
                    (item) =>
                      `<option value="${item.id}">${item.numero} · ${item.unidade}</option>`,
                  )
                  .join("")}
              </select>
            </div>
            <div class="field">
              <label for="prazo">Prazo</label>
              <input id="prazo" name="prazo" type="date" required />
            </div>
          </div>
          <div class="field">
            <label for="descricao">Descrição da diligência</label>
            <textarea id="descricao" name="descricao" required></textarea>
          </div>
          <button class="button" type="submit">Criar diligência</button>
        </form>

        <section class="stack">
          ${proposicoes
            .map(
              (item) => `
                <section class="panel">
                  <h3 class="panel__title">${item.numero} · ${item.unidade}</h3>
                  ${renderDiligenciasCards(item.diligencias)}
                </section>
              `,
            )
            .join("")}
        </section>
      </section>
    `,
  });

  document.querySelector("#form-criar-diligencia")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    mutateState((draft) => {
      const proposicao = draft.proposicoes.find((item) => item.id === data.get("proposicaoId"));
      if (!proposicao) return draft;

      criarDiligencia(proposicao, {
        descricao: data.get("descricao"),
        prazo: data.get("prazo"),
      });
      return draft;
    });

    render();
  });
};

render();
