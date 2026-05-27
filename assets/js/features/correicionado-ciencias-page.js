import { PERSONAS, getCurrentPersona, getCurrentUser, requireAuth } from "../app/auth.js";
import { mountPage } from "../app/bootstrap.js";
import { loadState } from "../app/store.js";
import {
  cienciaJaVisualizadaPor,
  getDataVisualizacaoCiencia,
  getEmailCienciaEvent,
  listProposicoesCorreicionadoCiencias,
} from "../domain/correicionados.js";
import { Labels } from "../domain/enums.js";
import { formatDateTime } from "../app/utils.js";
import {
  renderApreciacaoBadge,
  renderBadge,
  renderEmptyState,
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

const renderProvidencias = (proposicao) => {
  const pendencias = proposicao.pendenciasSecretaria || [];
  if (pendencias.length === 0) {
    return `<p class="muted" style="margin: 0;">Nenhuma providência paralela registrada.</p>`;
  }
  return `
    <ul style="margin: 0; padding-left: 1rem;">
      ${pendencias
        .map(
          (p) => `
            <li>
              <strong>${Labels.tipoProvidencia[p.tipoProvidencia] || p.descricao}</strong>
              · ${p.status === "cumprida" ? "Cumprida" : "Em curso pela Secretaria"}
              ${p.observacoes ? `<br><span class="muted">${p.observacoes}</span>` : ""}
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
};

const renderApreciacaoFundamentos = (apreciacao) => {
  if (!apreciacao) return "";
  const fundamentos = apreciacao.observacoes || "";
  if (!fundamentos) return "";
  return `
    <div class="panel" style="padding: 0.75rem; background: var(--color-surface-muted);">
      <strong>Fundamentos da decisão:</strong>
      <p style="margin: 0.25rem 0 0;">${fundamentos}</p>
    </div>
  `;
};

const renderCardCiencia = (proposicao) => {
  const apreciacao = proposicao.apreciacaoDoCN;
  const ciencia = getEmailCienciaEvent(proposicao);
  const visualizada = cienciaJaVisualizadaPor(proposicao, user.id);
  const dataVisualizacao = getDataVisualizacaoCiencia(proposicao, user.id);

  return `
    <article class="panel stack" style="border-left: 4px solid var(--color-primary, #2563eb);">
      <header class="button-row" style="justify-content: space-between; align-items: flex-start;">
        <div>
          <p class="muted" style="margin: 0;">${proposicao.numero} · ${proposicao.tipo}</p>
          <h3 style="margin: 0.25rem 0;">${proposicao.unidade}</h3>
          <p class="muted" style="margin: 0; font-size: 0.85rem;">${proposicao.ramoMPNome}</p>
        </div>
        <div class="pill-list">
          ${renderSensivelBadge(proposicao.sensivel)}
          ${renderApreciacaoBadge(apreciacao)}
          ${
            visualizada
              ? renderBadge(`Visualizada em ${formatDateTime(dataVisualizacao)}`, "success")
              : renderBadge("Não visualizada", "warning")
          }
        </div>
      </header>
      <p>${proposicao.descricao}</p>
      ${renderApreciacaoFundamentos(apreciacao)}
      <div>
        <p style="margin: 0.5rem 0 0.25rem; font-weight: 600;">Providências derivadas:</p>
        ${renderProvidencias(proposicao)}
      </div>
      ${
        ciencia
          ? `<p class="muted" style="margin: 0; font-size: 0.85rem;">Ciência disponibilizada em ${formatDateTime(ciencia.data)} pela Secretaria.</p>`
          : ""
      }
      <div class="button-row">
        <a class="button" href="proposicao-detalhe.html?id=${proposicao.id}">
          ${visualizada ? "Reabrir detalhe" : "Tomar ciência"}
        </a>
      </div>
    </article>
  `;
};

const render = () => {
  const state = loadState();
  const proposicoes = listProposicoesCorreicionadoCiencias(state, user).sort((a, b) => {
    const ea = getEmailCienciaEvent(a);
    const eb = getEmailCienciaEvent(b);
    const ta = ea?.data ? new Date(ea.data).getTime() : 0;
    const tb = eb?.data ? new Date(eb.data).getTime() : 0;
    return tb - ta;
  });

  const naoVisualizadas = proposicoes.filter((p) => !cienciaJaVisualizadaPor(p, user.id)).length;

  const content =
    proposicoes.length === 0
      ? renderEmptyState(
          "Nenhuma ciência disponível no momento. Quando a Secretaria disponibilizar a ciência de uma proposição encerrada vinculada a você, ela aparecerá aqui.",
        )
      : `
        <p class="muted">Você tem <strong>${proposicoes.length}</strong> ciência(s) disponível(is)${naoVisualizadas > 0 ? `, <strong>${naoVisualizadas}</strong> ainda não visualizada(s)` : ""}.</p>
        <div class="stack">${proposicoes.map(renderCardCiencia).join("")}</div>
      `;

  mountPage({
    activePage: "correicionado-ciencias",
    title: "Minhas ciências",
    subtitle: `Proposições encerradas com baixa definitiva cuja ciência foi disponibilizada a ${user.nome}.`,
    content,
  });
};

render();
