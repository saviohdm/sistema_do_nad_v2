import { PERSONAS, getCurrentPersona, getCurrentUser, requireAuth } from "../app/auth.js";
import { mountPage } from "../app/bootstrap.js";
import { loadState } from "../app/store.js";
import { listProposicoesCorreicionadoPendentes } from "../domain/correicionados.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { formatDate } from "../app/utils.js";
import { renderBadge, renderEmptyState, renderPrioridadeBadge, renderSensivelBadge } from "../ui/components.js";

requireAuth();

if (getCurrentPersona() !== PERSONAS.CORREICIONADO) {
  window.location.href = "/pages/dashboard.html";
}

const user = getCurrentUser();
if (!user) {
  window.location.href = "/pages/login.html";
}

const calcularDiasParaPrazo = (prazo) => {
  if (!prazo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const data = new Date(prazo);
  data.setHours(0, 0, 0, 0);
  return Math.round((data - hoje) / 86400000);
};

const renderBadgePrazo = (diligencia) => {
  const dias = calcularDiasParaPrazo(diligencia?.prazo);
  if (dias == null) return renderBadge("Sem prazo", "neutral");
  if (dias < 0) return renderBadge(`Vencido há ${Math.abs(dias)} dia(s)`, "danger");
  if (dias === 0) return renderBadge("Vence hoje", "danger");
  if (dias <= 3) return renderBadge(`Vence em ${dias} dia(s)`, "warning");
  if (dias <= 7) return renderBadge(`Vence em ${dias} dia(s)`, "warning");
  return renderBadge(`Vence em ${dias} dia(s)`, "neutral");
};

const renderCardComprovacao = (proposicao) => {
  const diligenciaAberta = (proposicao.diligencias || []).find((d) => d.status === "aberta");
  const temRascunho = Boolean(proposicao.rascunhoComprovacao);

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
          ${temRascunho ? renderBadge("Rascunho salvo", "primary") : ""}
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
        <a class="button" href="proposicao-detalhe.html?id=${proposicao.id}">
          ${temRascunho ? "Retomar comprovação" : "Abrir para comprovar"}
        </a>
      </div>
    </article>
  `;
};

const render = () => {
  const state = loadState();
  const proposicoes = listProposicoesCorreicionadoPendentes(state, user)
    .map((p) => hydrateProposicao(state, p))
    .sort((a, b) => {
    const dilA = (a.diligencias || []).find((d) => d.status === "aberta");
    const dilB = (b.diligencias || []).find((d) => d.status === "aberta");
    const pa = dilA?.prazo ? new Date(dilA.prazo).getTime() : Infinity;
    const pb = dilB?.prazo ? new Date(dilB.prazo).getTime() : Infinity;
    return pa - pb;
  });

  const content =
    proposicoes.length === 0
      ? renderEmptyState(
          "Você não tem comprovações pendentes no momento. Quando a Secretaria abrir uma diligência referente a uma proposição vinculada a você, ela aparecerá aqui.",
        )
      : `<div class="stack">${proposicoes.map(renderCardComprovacao).join("")}</div>`;

  mountPage({
    activePage: "correicionado-comprovacoes",
    title: "Minhas comprovações",
    subtitle: `Proposições com diligência aberta vinculadas a ${user.nome} ou às unidades em que você atua como chefe.`,
    content,
  });
};

render();
