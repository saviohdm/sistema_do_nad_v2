import { requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { SituacaoJuizo } from "../domain/enums.js";
import { listFilaAguardandoDiligencia } from "../domain/secretaria-filas.js";
import { criarDiligencia } from "../domain/diligencias.js";
import { renderBadge } from "../ui/components.js";

requireAuth();

const escapeAttr = (value) => String(value).replace(/"/g, "&quot;");

const renderFilaDiligencia = (proposicoes) => {
  if (!proposicoes.length) {
    return `<div class="empty-state">Nenhuma proposição aguardando diligência.</div>`;
  }

  return `
    <div class="stack">
      ${proposicoes
        .map((proposicao) => {
          const juizo = proposicao.juizoAtual;
          const motivoBadge =
            juizo?.situacao === SituacaoJuizo.NECESSITA_MAIS_INFORMACOES
              ? renderBadge("Retornou · necessita mais informações", "warning")
              : renderBadge("Nova proposição", "primary");

          return `
            <article class="panel">
              <h3 class="panel__title">${proposicao.numero} · ${proposicao.unidade}</h3>
              <p class="muted">${proposicao.ramoMPNome || proposicao.ramoMP || ""} · Correição ${proposicao.correicaoId || "—"}</p>
              <div class="pill-list">${motivoBadge}</div>
              <p>${proposicao.descricao}</p>
              <form class="stack" data-diligencia-form="${escapeAttr(proposicao.id)}">
                <div class="field-grid">
                  <div class="field">
                    <label for="prazo-${proposicao.id}">Prazo da diligência</label>
                    <input id="prazo-${proposicao.id}" name="prazo" type="date" required />
                  </div>
                </div>
                <div class="field">
                  <label for="descricao-${proposicao.id}">Descrição da diligência</label>
                  <textarea id="descricao-${proposicao.id}" name="descricao" required></textarea>
                </div>
                <button class="button" type="submit">Criar diligência</button>
              </form>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
};

const render = () => {
  const currentState = state();
  const filaDiligencia = listFilaAguardandoDiligencia(currentState);

  mountPage({
    activePage: "secretaria-diligencia",
    title: "Aguardando diligência",
    subtitle:
      "Proposições que ainda não têm diligência aberta — recém-referendadas ou com juízo \"necessita mais informações\".",
    actions: baseActions,
    content: `
      <section class="panel">
        <h2 class="panel__title">Fila de diligência ${renderBadge(`${filaDiligencia.length}`, filaDiligencia.length ? "warning" : "neutral")}</h2>
        ${renderFilaDiligencia(filaDiligencia)}
      </section>
    `,
  });

  document.querySelectorAll("[data-diligencia-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const proposicaoId = event.currentTarget.dataset.diligenciaForm;
      const data = new FormData(event.currentTarget);

      mutateState((draft) => {
        const proposicao = draft.proposicoes.find((item) => item.id === proposicaoId);
        if (!proposicao) return draft;

        criarDiligencia(proposicao, {
          descricao: data.get("descricao"),
          prazo: data.get("prazo"),
        });

        return draft;
      });

      render();
    });
  });
};

render();
