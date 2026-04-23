import { requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { formatDateTime } from "../app/utils.js";
import { Labels, SituacaoJuizo } from "../domain/enums.js";
import {
  listFilaAguardandoCiencia,
  listFilaAguardandoDiligencia,
  listFilaPendenciasProvidencia,
} from "../domain/secretaria-filas.js";
import { criarDiligencia } from "../domain/diligencias.js";
import { cientificarGrupo } from "../domain/ciencia.js";
import { registrarCumprimentoPendencia } from "../domain/pendencias-secretaria.js";
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
  const filaDiligencia = listFilaAguardandoDiligencia(currentState);
  const filaCiencia = listFilaAguardandoCiencia(currentState);
  const filaProvidencia = listFilaPendenciasProvidencia(currentState);

  const countCiencia = filaCiencia.reduce((sum, grupo) => sum + grupo.prontas, 0);

  mountPage({
    activePage: "pendencias-secretaria",
    title: "Painel da Secretaria Processual",
    subtitle:
      "Três filas independentes: criar diligência, dar ciência em lote por unidade/correição e acompanhar providências. A ciência e as providências tramitam em paralelo.",
    actions: baseActions,
    content: `
      <section class="stack">
        <section class="panel">
          <h2 class="panel__title">1. Aguardando diligência ${renderBadge(`${filaDiligencia.length}`, filaDiligencia.length ? "warning" : "neutral")}</h2>
          <p class="muted">Proposições que ainda não têm diligência aberta — recém-referendadas ou com juízo "necessita mais informações".</p>
          ${renderFilaDiligencia(filaDiligencia)}
        </section>

        <section class="panel">
          <h2 class="panel__title">2. Aguardando ciência ${renderBadge(`${countCiencia}`, countCiencia ? "warning" : "neutral")}</h2>
          <p class="muted">Proposições com juízo conclusivo, agrupadas por unidade + correição. A ciência só é liberada quando todas as proposições do grupo estão prontas.</p>
          ${renderFilaCiencia(filaCiencia)}
        </section>

        <section class="panel">
          <h2 class="panel__title">3. Pendências de providência ${renderBadge(`${filaProvidencia.length}`, filaProvidencia.length ? "warning" : "neutral")}</h2>
          <p class="muted">Controle administrativo paralelo das providências externas (parcial/não cumprida). Cumprimento ocorre fora do sistema; aqui apenas se registra data e observações.</p>
          ${renderFilaProvidencia(filaProvidencia)}
        </section>
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
