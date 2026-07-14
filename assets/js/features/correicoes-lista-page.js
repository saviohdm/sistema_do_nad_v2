import { requireAuth, hasPermission, getCurrentPersona, PERSONAS } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import {
  listCorreicoes,
  getCorreicaoStatusEfetivo,
  getProposicoesDaCorreicao,
} from "../domain/correicoes.js";
import { renderStatusCorreicaoBadge, renderEmptyState } from "../ui/components.js";
import { formatDate } from "../app/utils.js";

requireAuth();

if (getCurrentPersona() !== PERSONAS.CORREGEDOR || !hasPermission("gerir_correicao")) {
  alert("Acesso restrito ao Corregedor Nacional.");
  window.location.href = "/pages/dashboard.html";
}

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

let filtroTexto = "";

const matchFiltro = (c) => {
  if (!filtroTexto) return true;
  const termo = filtroTexto.toLowerCase();
  return [c.numero, c.ramoMP, c.ramoMPNome, c.tematica, c.numeroElo, ...(c.uf || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(termo);
};

const renderTabela = (currentState, correicoes) => `
  <div class="panel">
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Ramo / UF</th>
            <th>Temática</th>
            <th>Período</th>
            <th>Proposições</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${correicoes
            .map((c) => {
              const statusEf = getCorreicaoStatusEfetivo(currentState, c);
              const qtd = getProposicoesDaCorreicao(currentState, c.id).length;
              return `
                <tr>
                  <td>
                    <a href="correicoes-criar.html?id=${c.id}"><strong>${escapeHtml(c.numero)}</strong></a>
                    <div class="muted">${escapeHtml(c.numeroElo)}</div>
                  </td>
                  <td>
                    ${escapeHtml(c.ramoMP)} · ${(c.uf || []).join(", ")}
                    <div class="muted">${escapeHtml(c.ramoMPNome)}</div>
                  </td>
                  <td>${escapeHtml(c.tematica)}</td>
                  <td>${formatDate(c.dataInicio)} – ${formatDate(c.dataFim)}</td>
                  <td>${qtd}</td>
                  <td>${renderStatusCorreicaoBadge(statusEf)}</td>
                  <td><a class="button button--small button--secondary" href="correicoes-criar.html?id=${c.id}">Editar</a></td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  </div>
`;

const renderBusca = () => `
  <form class="panel stack" id="form-busca">
    <div class="field">
      <label for="busca">Buscar correição</label>
      <input type="search" id="busca" name="busca" value="${escapeHtml(filtroTexto)}"
             placeholder="Número, ramo, temática, ELO ou UF" />
    </div>
  </form>
`;

const render = () => {
  const currentState = state();
  const todas = listCorreicoes(currentState);
  const correicoes = todas.filter(matchFiltro);

  const corpo =
    todas.length === 0
      ? renderEmptyState(
          "Nenhuma correição cadastrada. Crie a primeira para poder vincular proposições.",
        )
      : correicoes.length === 0
        ? renderBusca() + renderEmptyState("Nenhuma correição corresponde à busca.")
        : renderBusca() + renderTabela(currentState, correicoes);

  mountPage({
    activePage: "correicoes-lista",
    title: "Correições",
    actions: `<a class="button" href="correicoes-criar.html">Nova correição</a> ${baseActions}`,
    content: corpo,
  });

  const form = document.querySelector("#form-busca");
  if (form) {
    const input = form.querySelector("#busca");
    const aplicar = () => {
      filtroTexto = input.value.trim();
      render();
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      aplicar();
    });
    input.addEventListener("search", aplicar);
  }
};

render();
