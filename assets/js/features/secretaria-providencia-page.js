import { requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { formatDateTime } from "../app/utils.js";
import { Labels } from "../domain/enums.js";
import { listFilaPendenciasProvidencia } from "../domain/secretaria-filas.js";
import { registrarCumprimentoPendencia } from "../domain/pendencias-secretaria.js";
import { renderBadge } from "../ui/components.js";

requireAuth();

const LIMITE_ATRASADAS = 10;

const getFiltrosFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    atrasadas: params.get("atrasadas") === "1",
  };
};

const setFiltrosInUrl = (filtros) => {
  const params = new URLSearchParams();
  if (filtros.atrasadas) params.set("atrasadas", "1");
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.pushState({}, "", newUrl);
};

const aplicarFiltros = (novos) => {
  setFiltrosInUrl(novos);
  render();
};

const diasDesde = (iso, hoje = new Date()) => {
  if (!iso) return null;
  const inicio = new Date(iso);
  if (Number.isNaN(inicio.getTime())) return null;
  return Math.max(0, Math.floor((hoje - inicio) / 86400000));
};

const isAtrasada = (pendencia, hoje) =>
  pendencia.status === "pendente" && (diasDesde(pendencia.dataCriacao, hoje) ?? 0) > LIMITE_ATRASADAS;

const aplicarFiltroPendencias = (proposicoes, filtros, hoje) => {
  if (!filtros.atrasadas) return proposicoes;
  return proposicoes
    .map((proposicao) => ({
      ...proposicao,
      pendenciasSecretaria: proposicao.pendenciasSecretaria.filter((p) =>
        isAtrasada(p, hoje),
      ),
    }))
    .filter((proposicao) => proposicao.pendenciasSecretaria.length > 0);
};

const renderFilaProvidencia = (proposicoes, filtros, hoje) => {
  if (!proposicoes.length) {
    const msg = filtros.atrasadas
      ? "Nenhuma providência atrasada (mais de 10 dias em aberto)."
      : "Nenhuma providência pendente.";
    return `<div class="empty-state">${msg}</div>`;
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
                  .map((pendencia) => {
                    const dias = diasDesde(pendencia.dataCriacao, hoje);
                    const atrasada = isAtrasada(pendencia, hoje);
                    return `
                      <article class="status-card">
                        <div class="pill-list">
                          <span class="badge badge--${pendencia.status === "cumprida" ? "success" : "warning"}">
                            ${pendencia.status === "cumprida" ? "Cumprida" : "Pendente"}
                          </span>
                          <span class="badge badge--neutral">
                            ${Labels.tipoProvidencia[pendencia.tipoProvidencia]}
                          </span>
                          ${
                            atrasada
                              ? `<span class="badge badge--danger">Há ${dias} dias em aberto</span>`
                              : pendencia.status === "pendente" && dias !== null
                                ? `<span class="badge badge--neutral">Há ${dias} dias em aberto</span>`
                                : ""
                          }
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
                    `;
                  })
                  .join("")}
              </div>
            </section>
          `,
        )
        .join("")}
    </div>
  `;
};

const renderToolbar = (filtros, total) => `
  <div class="toolbar" style="display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap;">
    <label class="field field--checkbox" style="margin: 0;">
      <input type="checkbox" data-filtro-atrasadas ${filtros.atrasadas ? "checked" : ""} />
      <span>Somente atrasadas (mais de ${LIMITE_ATRASADAS} dias em aberto)</span>
    </label>
    <span class="muted">${total} proposição(ões) com pendência ${filtros.atrasadas ? "atrasada" : "aberta"}</span>
  </div>
`;

const render = () => {
  const filtros = getFiltrosFromUrl();
  const currentState = state();
  const hoje = new Date();
  const todas = listFilaPendenciasProvidencia(currentState);
  const filtradas = aplicarFiltroPendencias(todas, filtros, hoje);

  const titulo = filtros.atrasadas
    ? "Pendências de providência atrasadas"
    : "Pendências de providência";
  const subtitulo = filtros.atrasadas
    ? `Apenas pendências em aberto há mais de ${LIMITE_ATRASADAS} dias. Cumprimento ocorre fora do sistema; aqui apenas se registra data e observações.`
    : "Controle administrativo paralelo das providências externas (parcial/não cumprida). Cumprimento ocorre fora do sistema; aqui apenas se registra data e observações.";

  mountPage({
    activePage: "secretaria-providencia",
    title: titulo,
    subtitle: subtitulo,
    actions: baseActions,
    content: `
      <section class="panel">
        <h2 class="panel__title">${titulo} ${renderBadge(`${filtradas.length}`, filtradas.length ? "warning" : "neutral")}</h2>
        ${renderToolbar(filtros, filtradas.length)}
        ${renderFilaProvidencia(filtradas, filtros, hoje)}
      </section>
    `,
  });

  document.querySelector("[data-filtro-atrasadas]")?.addEventListener("change", (event) => {
    aplicarFiltros({ atrasadas: event.currentTarget.checked });
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

window.addEventListener("popstate", render);

render();
