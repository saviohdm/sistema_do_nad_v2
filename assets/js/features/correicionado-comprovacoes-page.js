import { PERSONAS, getCurrentPersona, getCurrentUser, requireAuth } from "../app/auth.js";
import { mountPage } from "../app/bootstrap.js";
import { loadState } from "../app/store.js";
import { listProposicoesCorreicionadoPendentes } from "../domain/correicionados.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { formatDate } from "../app/utils.js";
import {
  renderBadge,
  renderEmptyState,
  renderFilaEmptyState,
  renderFilaFiltrosAtivos,
  renderFilaOperacionalHeader,
  renderPanoramaKpis,
  renderPrioridadeBadge,
  renderSensivelBadge,
} from "../ui/components.js";

requireAuth();

if (getCurrentPersona() !== PERSONAS.CORREICIONADO) {
  window.location.href = "/pages/dashboard.html";
}

const user = getCurrentUser();
if (!user) {
  window.location.href = "/pages/login.html";
}

// Mesmo esqueleto visual das filas (KPIs de panorama, filtro "Somente com
// rascunho" via comRascunho=1, chips de filtros ativos). O drill-down por
// correição do fila-navegável não se aplica: a visão do correicionado é
// escopada ao próprio usuário, não à operação da CN.

const temRascunho = (proposicao) => Boolean(proposicao.rascunhoComprovacao);

const calcularDiasParaPrazo = (prazo) => {
  if (!prazo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const data = new Date(prazo);
  data.setHours(0, 0, 0, 0);
  return Math.round((data - hoje) / 86400000);
};

const diligenciaAbertaDe = (proposicao) =>
  (proposicao.diligencias || []).find((d) => d.status === "aberta");

const prazoProximoDoFim = (proposicao) => {
  const dias = calcularDiasParaPrazo(diligenciaAbertaDe(proposicao)?.prazo);
  return dias != null && dias <= 7;
};

const renderBadgePrazo = (diligencia) => {
  const dias = calcularDiasParaPrazo(diligencia?.prazo);
  if (dias == null) return renderBadge("Sem prazo", "neutral");
  if (dias < 0) return renderBadge(`Vencido há ${Math.abs(dias)} dia(s)`, "danger");
  if (dias === 0) return renderBadge("Vence hoje", "danger");
  if (dias <= 7) return renderBadge(`Vence em ${dias} dia(s)`, "warning");
  return renderBadge(`Vence em ${dias} dia(s)`, "neutral");
};

const renderCardComprovacao = (proposicao) => {
  const diligenciaAberta = diligenciaAbertaDe(proposicao);
  const rascunho = temRascunho(proposicao);

  return `
    <article class="panel stack" style="border-left: 4px solid var(--color-warning, #d97706);">
      <header class="button-row" style="justify-content: space-between; align-items: flex-start;">
        <div>
          <p class="muted" style="margin: 0;">${proposicao.numero} · ${proposicao.tipo}</p>
          <h3 style="margin: 0.25rem 0;">${proposicao.unidade}</h3>
          <p class="muted" style="margin: 0; font-size: 0.85rem;">${proposicao.ramoMPNome}</p>
        </div>
        <div class="pill-list">
          ${renderSensivelBadge(proposicao.sensivel)}
          ${renderPrioridadeBadge(proposicao.prioridade)}
          ${renderBadgePrazo(diligenciaAberta)}
          ${rascunho ? renderBadge("Rascunho salvo", "warning") : ""}
        </div>
      </header>
      <p>${proposicao.descricao}</p>
      ${
        diligenciaAberta
          ? `
            <div class="panel" style="padding: 0.75rem; background: var(--color-surface-muted);">
              <p style="margin: 0;"><strong>Diligência:</strong> ${diligenciaAberta.descricao}</p>
              <p class="muted" style="margin: 0.25rem 0 0; font-size: 0.85rem;">Prazo: ${formatDate(diligenciaAberta.prazo)}</p>
            </div>
          `
          : ""
      }
      <div class="button-row">
        <a class="button" href="proposicao-detalhe.html?id=${proposicao.id}&from=correicionado-comprovacoes">
          ${rascunho ? "Retomar comprovação" : "Abrir para comprovar"}
        </a>
      </div>
    </article>
  `;
};

const getFiltrosFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    comRascunho: params.get("comRascunho") === "1",
    prazoProximo: params.get("prazoProximo") === "1",
  };
};

const aplicarFiltros = (filtros) => {
  const params = new URLSearchParams();
  if (filtros.comRascunho) params.set("comRascunho", "1");
  if (filtros.prazoProximo) params.set("prazoProximo", "1");
  const query = params.toString();
  window.history.pushState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  render();
};

const buildFiltrosAtivos = (filtros) => {
  const chips = [];
  if (filtros.comRascunho) chips.push({ key: "comRascunho", label: "Somente com rascunho" });
  if (filtros.prazoProximo) chips.push({ key: "prazoProximo", label: "Prazo próximo do fim" });
  return chips;
};

const renderPainelFiltros = (filtros) => `
  <form class="fila-operacional-filtros" id="painel-filtros">
    <header class="fila-operacional-filtros__head">
      <h3 class="fila-operacional-filtros__title">Filtros da fila</h3>
    </header>
    <div class="fila-operacional-filtros__fields">
      <div class="field">
        <label for="filtro-rascunho">Somente com rascunho</label>
        <select id="filtro-rascunho" name="comRascunho">
          <option value="">Não</option>
          <option value="1"${filtros.comRascunho ? " selected" : ""}>Sim</option>
        </select>
      </div>
      <div class="field">
        <label for="filtro-prazo">Somente prazo próximo do fim</label>
        <select id="filtro-prazo" name="prazoProximo">
          <option value="">Não</option>
          <option value="1"${filtros.prazoProximo ? " selected" : ""}>Sim</option>
        </select>
      </div>
    </div>
    <div class="button-row fila-operacional-filtros__actions">
      <button class="button" type="submit">Aplicar filtros</button>
      <button class="button button--ghost" type="button" data-action="limpar-filtros">Limpar filtros</button>
    </div>
  </form>
`;

const getKpis = (proposicoes) => [
  {
    label: "Aguardando sua comprovação",
    valor: proposicoes.length,
    filtros: {},
  },
  {
    label: "Com rascunho a retomar",
    valor: proposicoes.filter(temRascunho).length,
    filtros: { comRascunho: true },
    destaque: true,
    title: "Comprovações iniciadas e ainda não confirmadas.",
  },
  {
    label: "Prazo próximo do fim",
    valor: proposicoes.filter(prazoProximoDoFim).length,
    filtros: { prazoProximo: true },
    title: "Diligências vencidas ou que vencem nos próximos 7 dias.",
  },
];

const bindHandlers = (filtros) => {
  document.querySelectorAll("[data-kpi-filtros]").forEach((kpi) => {
    kpi.addEventListener("click", () => aplicarFiltros(JSON.parse(kpi.dataset.kpiFiltros)));
  });

  document.querySelectorAll("[data-remove-filtro]").forEach((button) => {
    button.addEventListener("click", () => {
      const novos = { ...filtros };
      delete novos[button.dataset.removeFiltro];
      aplicarFiltros(novos);
    });
  });

  document.querySelector("#painel-filtros")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    aplicarFiltros({
      comRascunho: data.get("comRascunho") === "1",
      prazoProximo: data.get("prazoProximo") === "1",
    });
  });

  document
    .querySelector("[data-action='limpar-filtros']")
    ?.addEventListener("click", () => aplicarFiltros({}));
};

const render = () => {
  const state = loadState();
  const filtros = getFiltrosFromUrl();
  const proposicoes = listProposicoesCorreicionadoPendentes(state, user)
    .map((p) => hydrateProposicao(state, p))
    .sort((a, b) => {
      const pa = diligenciaAbertaDe(a)?.prazo ? new Date(diligenciaAbertaDe(a).prazo).getTime() : Infinity;
      const pb = diligenciaAbertaDe(b)?.prazo ? new Date(diligenciaAbertaDe(b).prazo).getTime() : Infinity;
      return pa - pb;
    });

  let filtradas = proposicoes;
  if (filtros.comRascunho) filtradas = filtradas.filter(temRascunho);
  if (filtros.prazoProximo) filtradas = filtradas.filter(prazoProximoDoFim);

  const content =
    proposicoes.length === 0
      ? renderEmptyState(
          "Você não tem comprovações pendentes no momento. Quando a Secretaria abrir uma diligência referente a uma proposição vinculada a você, ela aparecerá aqui.",
        )
      : `
        <section class="stack">
          <div class="panel">
            <h3 class="panel__title">Panorama das comprovações</h3>
            ${renderPanoramaKpis(getKpis(proposicoes))}
          </div>
          ${renderFilaOperacionalHeader({
            title: "Fila de comprovação",
            visiveis: filtradas.length,
            total: proposicoes.length,
            itemSingular: "comprovação",
            itemPlural: "comprovações",
          })}
          ${renderFilaFiltrosAtivos(buildFiltrosAtivos(filtros))}
          <div class="page-grid page-grid--two fila-operacional-corpo">
            <div class="stack">
              <div class="fila-operacional-list">
                ${
                  filtradas.length
                    ? filtradas.map(renderCardComprovacao).join("")
                    : renderFilaEmptyState("Nenhuma comprovação corresponde aos filtros selecionados.")
                }
              </div>
            </div>
            <aside class="fila-operacional-sidebar">
              ${renderPainelFiltros(filtros)}
            </aside>
          </div>
        </section>
      `;

  mountPage({
    activePage: "correicionado-comprovacoes",
    title: "Minhas comprovações",
    content,
  });

  bindHandlers(filtros);
};

window.addEventListener("popstate", render);
render();
