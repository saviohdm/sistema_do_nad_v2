import { requireAuth, getCurrentPersona, hasPermission } from "../app/auth.js";
import { mountPage, state } from "../app/bootstrap.js";
import { StatusFluxo } from "../domain/enums.js";
import { listProposicoes } from "../domain/proposicoes.js";
import { renderProposicaoCard, renderEmptyState } from "../ui/components.js";

requireAuth();

let filtroAtivo = null;

const render = (filtro = null) => {
  filtroAtivo = filtro;
  const currentState = state();
  const persona = getCurrentPersona();
  const todasProposicoes = listProposicoes(currentState);

  let filtered = todasProposicoes;
  if (filtro) {
    filtered = todasProposicoes.filter((p) => p.statusFluxo === filtro);
  }

  const cards =
    filtered.length > 0
      ? filtered.map((p) => renderProposicaoCard(p)).join("")
      : renderEmptyState("Nenhuma proposição encontrada");

  const createButton = hasPermission("criar_proposicao")
    ? `<a href="/pages/proposicoes-criar.html" class="button">Criar Proposição</a>`
    : "";

  mountPage({
    activePage: "proposicoes-lista",
    title: "Proposições",
    subtitle: "Lista completa de proposições. Clique em uma proposição para ver detalhes e realizar ações.",
    actions: createButton,
    content: `
      <section class="stack">
        <div class="panel">
          <h3 class="panel__title">Filtrar por Status</h3>
          <div class="button-group" id="filter-buttons">
            <button class="button ${!filtro ? "button--primary" : "button--secondary"}" data-filter="">
              Todas (${todasProposicoes.length})
            </button>
            <button class="button ${filtro === StatusFluxo.AGUARDANDO_REFERENDO_CNMP ? "button--primary" : "button--secondary"}"
                    data-filter="${StatusFluxo.AGUARDANDO_REFERENDO_CNMP}">
              Aguardando Referendo
            </button>
            <button class="button ${filtro === StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR ? "button--primary" : "button--secondary"}"
                    data-filter="${StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR}">
              Aguardando Decisão
            </button>
            <button class="button ${filtro === StatusFluxo.AGUARDANDO_SECRETARIA ? "button--primary" : "button--secondary"}"
                    data-filter="${StatusFluxo.AGUARDANDO_SECRETARIA}">
              Aguardando Secretaria
            </button>
            <button class="button ${filtro === StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO ? "button--primary" : "button--secondary"}"
                    data-filter="${StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO}">
              Aguardando Avaliação
            </button>
            <button class="button ${filtro === StatusFluxo.CONCLUIDA ? "button--primary" : "button--secondary"}"
                    data-filter="${StatusFluxo.CONCLUIDA}">
              Concluídas
            </button>
          </div>
        </div>

        <div class="proposicoes-list">
          ${cards}
        </div>
      </section>
    `,
  });

  // Bind filter buttons
  document.querySelectorAll("#filter-buttons button").forEach((btn) => {
    btn.addEventListener("click", () => {
      render(btn.dataset.filter || null);
    });
  });
};

render();
