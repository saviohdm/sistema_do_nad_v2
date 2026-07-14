import { requireAuth, hasPermission, getCurrentPersona, PERSONAS } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { queryParam } from "../app/utils.js";
import {
  criarCorreicao,
  editarCorreicao,
  getCorreicaoById,
  getCorreicaoStatusEfetivo,
  getProposicoesDaCorreicao,
} from "../domain/correicoes.js";
import { renderStatusCorreicaoBadge, renderEmptyState } from "../ui/components.js";

requireAuth();

if (getCurrentPersona() !== PERSONAS.CORREGEDOR || !hasPermission("gerir_correicao")) {
  alert("Acesso restrito ao Corregedor Nacional.");
  window.location.href = "/pages/dashboard.html";
}

const editId = queryParam("id");
const correicaoParaEditar = editId ? getCorreicaoById(state(), editId) : null;

if (editId && !correicaoParaEditar) {
  alert("Correição não encontrada.");
  window.location.href = "/pages/correicoes-lista.html";
}

const isEdicao = Boolean(correicaoParaEditar);

const escapeAttr = (s) => String(s ?? "").replaceAll('"', "&quot;");
const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const valor = (campo, fallback = "") => {
  if (!correicaoParaEditar) return fallback;
  const v = correicaoParaEditar[campo];
  if (v === undefined || v === null || v === "") return fallback;
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
};

const renderProposicoesVinculadas = () => {
  const props = getProposicoesDaCorreicao(state(), correicaoParaEditar.id);
  if (!props.length) {
    return renderEmptyState("Nenhuma proposição vinculada a esta correição ainda.");
  }
  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr><th>Número</th><th>Tipo</th><th>Unidade</th></tr>
        </thead>
        <tbody>
          ${props
            .map(
              (p) => `
                <tr>
                  <td><a href="proposicao-detalhe.html?id=${p.id}&from=correicoes-criar"><strong>${escapeHtml(p.numero)}</strong></a></td>
                  <td>${escapeHtml(p.tipo)}</td>
                  <td>${escapeHtml(p.unidade)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
};

const render = () => {
  const title = isEdicao
    ? `Editar correição ${correicaoParaEditar.numero}`
    : "Nova correição";

  const painelEdicao = isEdicao
    ? `
      <div class="panel stack">
        <h3 class="panel__title">Situação</h3>
        <div class="button-row">
          ${renderStatusCorreicaoBadge(getCorreicaoStatusEfetivo(state(), correicaoParaEditar))}
          <span class="muted">Número: <strong>${escapeHtml(correicaoParaEditar.numero)}</strong></span>
        </div>
      </div>
      <div class="panel stack">
        <h3 class="panel__title">Proposições vinculadas</h3>
        ${renderProposicoesVinculadas()}
      </div>
    `
    : "";

  mountPage({
    activePage: "correicoes-lista",
    title,
    actions: baseActions,
    content: `
      <form id="form-correicao" class="panel stack">
        <h3 class="panel__title">Dados da correição</h3>

        <div class="field-grid">
          <div class="field">
            <label for="numeroElo">Número ELO *</label>
            <input type="text" id="numeroElo" name="numeroElo" required
                   placeholder="Ex: 1234567-89.2026.1.01.0001"
                   value="${escapeAttr(valor("numeroElo"))}" />
          </div>
          <div class="field">
            <label for="tipo">Tipo</label>
            <input type="text" id="tipo" name="tipo"
                   placeholder="Ex: Ordinária"
                   value="${escapeAttr(valor("tipo", "Ordinária"))}" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field">
            <label for="ramoMP">Ramo do MP *</label>
            <input type="text" id="ramoMP" name="ramoMP" required
                   placeholder="Ex: MPBA"
                   value="${escapeAttr(valor("ramoMP"))}" />
          </div>
          <div class="field">
            <label for="mp">MP</label>
            <input type="text" id="mp" name="mp"
                   placeholder="Ex: MPE"
                   value="${escapeAttr(valor("mp", "MPE"))}" />
          </div>
        </div>

        <div class="field">
          <label for="ramoMPNome">Nome do Ramo do MP *</label>
          <input type="text" id="ramoMPNome" name="ramoMPNome" required
                 placeholder="Ex: Ministério Público do Estado da Bahia"
                 value="${escapeAttr(valor("ramoMPNome"))}" />
        </div>

        <div class="field-grid">
          <div class="field">
            <label for="tematica">Temática *</label>
            <input type="text" id="tematica" name="tematica" required
                   placeholder="Ex: Governança e controle de prazos"
                   value="${escapeAttr(valor("tematica"))}" />
          </div>
          <div class="field">
            <label for="uf">UF *</label>
            <input type="text" id="uf" name="uf" required
                   placeholder="Ex: BA (separe por vírgula)"
                   value="${escapeAttr(valor("uf"))}" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field">
            <label for="dataInicio">Data de início *</label>
            <input type="date" id="dataInicio" name="dataInicio" required
                   value="${escapeAttr(valor("dataInicio"))}" />
          </div>
          <div class="field">
            <label for="dataFim">Data de fim *</label>
            <input type="date" id="dataFim" name="dataFim" required
                   value="${escapeAttr(valor("dataFim"))}" />
          </div>
        </div>

        <div class="field">
          <label for="observacoes">Observações</label>
          <textarea id="observacoes" name="observacoes" rows="4"
                    placeholder="Observações da correição.">${escapeHtml(valor("observacoes"))}</textarea>
        </div>

        <div class="button-row">
          <button type="button" class="button button--secondary" id="btn-cancelar">Cancelar</button>
          <button type="submit" class="button">${isEdicao ? "Salvar alterações" : "Criar correição"}</button>
        </div>
      </form>
      ${painelEdicao}
    `,
  });

  document.querySelector("#btn-cancelar").addEventListener("click", () => {
    window.location.href = "/pages/correicoes-lista.html";
  });

  document.querySelector("#form-correicao").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const dados = {
      numeroElo: data.get("numeroElo"),
      tipo: data.get("tipo"),
      ramoMP: data.get("ramoMP"),
      mp: data.get("mp"),
      ramoMPNome: data.get("ramoMPNome"),
      tematica: data.get("tematica"),
      uf: data.get("uf"),
      dataInicio: data.get("dataInicio"),
      dataFim: data.get("dataFim"),
      observacoes: data.get("observacoes"),
    };

    try {
      mutateState((draft) => {
        if (isEdicao) {
          editarCorreicao(getCorreicaoById(draft, correicaoParaEditar.id), dados);
        } else {
          criarCorreicao(draft, dados);
        }
        return draft;
      });
    } catch (err) {
      alert(err.message);
      return;
    }

    alert(isEdicao ? "Correição atualizada." : "Correição criada.");
    window.location.href = "/pages/correicoes-lista.html";
  });
};

render();
