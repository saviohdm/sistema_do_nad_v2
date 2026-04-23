import { requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { listProposicoes } from "../domain/proposicoes.js";
import { renderDiligenciasCards } from "../ui/components.js";

requireAuth();

const render = () => {
  const currentState = state();
  const proposicoes = listProposicoes(currentState).filter(
    (item) => item.diligencias.length,
  );

  mountPage({
    activePage: "diligencias",
    title: "Diligências",
    subtitle:
      "Vista consolidada de todas as diligências registradas, abertas ou comprovadas. A criação é feita no Painel da Secretaria, na fila 'Aguardando diligência'.",
    actions: baseActions,
    content: `
      <section class="stack">
        ${
          proposicoes.length
            ? proposicoes
                .map(
                  (item) => `
                    <section class="panel">
                      <h3 class="panel__title">${item.numero} · ${item.unidade}</h3>
                      ${renderDiligenciasCards(item.diligencias)}
                    </section>
                  `,
                )
                .join("")
            : `<div class="empty-state">Nenhuma diligência registrada até o momento.</div>`
        }
      </section>
    `,
  });
};

render();
