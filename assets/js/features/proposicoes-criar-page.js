import { requireAuth, hasPermission } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { queryParam } from "../app/utils.js";
import { StatusFluxo } from "../domain/enums.js";
import {
  criarProposicao,
  editarProposicao,
  encaminharParaSecretaria,
  getProposicaoById,
} from "../domain/proposicoes.js";

requireAuth();

const editId = queryParam("id");
const fromCorregedor = queryParam("fromCorregedor");

if (!editId && !hasPermission("criar_proposicao")) {
  alert("Sem permissão para criar proposições");
  window.location.href = "/pages/dashboard.html";
}

const proposicaoParaEditar = editId ? getProposicaoById(state(), editId) : null;

if (editId && !proposicaoParaEditar) {
  alert("Proposição não encontrada.");
  window.location.href = "/pages/proposicoes-lista.html";
}

if (
  proposicaoParaEditar &&
  proposicaoParaEditar.statusFluxo !== StatusFluxo.AGUARDANDO_REFERENDO_CNMP
) {
  alert(
    "Esta proposição não está mais em aguardo de referendo do CNMP e não pode ser editada.",
  );
  window.location.href = `/pages/proposicao-detalhe.html?id=${proposicaoParaEditar.id}`;
}

const isEdicao = Boolean(proposicaoParaEditar);

const valor = (campo) => {
  if (!proposicaoParaEditar) return "";
  const v = proposicaoParaEditar[campo];
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
};

const escapeAttr = (s) => String(s).replaceAll('"', "&quot;");

const render = () => {
  const title = isEdicao
    ? `Editar proposição ${proposicaoParaEditar.numero}`
    : "Criar nova proposição";
  const subtitle = isEdicao
    ? "Atualize os dados da proposição enquanto ela aguarda referendo do CNMP. Campos sensíveis (histórico, juízo, diligências) são preservados."
    : "Preencha os dados da proposição e os metadados da correição de origem. Você pode salvar como rascunho ou criar e encaminhar diretamente para a Secretaria.";

  mountPage({
    activePage: "proposicoes-criar",
    title,
    subtitle,
    actions: baseActions,
    content: `
      <form id="form-criar-proposicao" class="panel stack">
        <h3 class="panel__title">Dados da Proposição</h3>

        <div class="field-grid">
          <div class="field">
            <label for="tipo">Tipo *</label>
            <select id="tipo" name="tipo" required>
              <option value="Determinação"${valor("tipo") === "Determinação" ? " selected" : ""}>Determinação</option>
              <option value="Recomendação"${valor("tipo") === "Recomendação" ? " selected" : ""}>Recomendação</option>
            </select>
          </div>

          <div class="field">
            <label for="prioridade">Prioridade</label>
            <select id="prioridade" name="prioridade">
              <option value="normal"${valor("prioridade") === "normal" ? " selected" : ""}>Normal</option>
              <option value="alta"${valor("prioridade") === "alta" ? " selected" : ""}>Alta</option>
              <option value="baixa"${valor("prioridade") === "baixa" ? " selected" : ""}>Baixa</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="unidade">Unidade *</label>
          <input type="text" id="unidade" name="unidade" required
                 placeholder="Ex: Procuradoria-Geral de Justiça"
                 value="${escapeAttr(valor("unidade"))}" />
        </div>

        <div class="field">
          <label for="membro">Membro *</label>
          <input type="text" id="membro" name="membro" required
                 placeholder="Ex: Dr. João Silva Santos"
                 value="${escapeAttr(valor("membro"))}" />
        </div>

        <div class="field">
          <label for="descricao">Descrição *</label>
          <textarea id="descricao" name="descricao" rows="6" required
                    placeholder="Descreva a proposição...">${valor("descricao")}</textarea>
        </div>

        <h3 class="panel__title">Dados da Correição Vinculada</h3>

        <div class="field-grid">
          <div class="field">
            <label for="numeroElo">Número ELO *</label>
            <input type="text" id="numeroElo" name="numeroElo" required
                   placeholder="Ex: 1234567-89.2026.1.01.0001"
                   value="${escapeAttr(valor("numeroElo"))}" />
          </div>

          <div class="field">
            <label for="ramoMP">Ramo do MP *</label>
            <input type="text" id="ramoMP" name="ramoMP" required
                   placeholder="Ex: MPBA"
                   value="${escapeAttr(valor("ramoMP"))}" />
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
                   placeholder="Ex: Gestão administrativa e fluxos internos"
                   value="${escapeAttr(valor("tematica"))}" />
          </div>

          <div class="field">
            <label for="uf">UF *</label>
            <input type="text" id="uf" name="uf" required
                   placeholder="Ex: BA"
                   value="${escapeAttr(valor("uf"))}" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field">
            <label for="dataInicioCorreicao">Data de início da correição *</label>
            <input type="date" id="dataInicioCorreicao" name="dataInicioCorreicao" required
                   value="${escapeAttr(valor("dataInicioCorreicao"))}" />
          </div>

          <div class="field">
            <label for="dataFimCorreicao">Data de fim da correição *</label>
            <input type="date" id="dataFimCorreicao" name="dataFimCorreicao" required
                   value="${escapeAttr(valor("dataFimCorreicao"))}" />
          </div>
        </div>

        <div class="field">
          <label for="observacoesGerais">Observações gerais</label>
          <textarea id="observacoesGerais" name="observacoesGerais" rows="4"
                    placeholder="Informe observações complementares da correição ou do encaminhamento.">${valor("observacoesGerais")}</textarea>
        </div>

        <div class="button-row">
          <button type="button" class="button button--secondary" id="btn-cancelar">
            Cancelar
          </button>
          ${
            isEdicao
              ? `<button type="submit" name="action" value="editar" class="button">Salvar alterações</button>`
              : `
                <button type="submit" name="action" value="rascunho" class="button button--secondary">
                  Salvar rascunho
                </button>
                <button type="submit" name="action" value="encaminhar" class="button">
                  Criar e encaminhar
                </button>
              `
          }
        </div>
      </form>
    `,
  });

  document.querySelector("#btn-cancelar").addEventListener("click", () => {
    if (isEdicao && fromCorregedor === "referendo") {
      window.location.href = "/pages/corregedor-referendo.html";
      return;
    }
    if (isEdicao) {
      window.location.href = `/pages/proposicao-detalhe.html?id=${proposicaoParaEditar.id}`;
      return;
    }
    window.location.href = "/pages/proposicoes-lista.html";
  });

  document.querySelector("#form-criar-proposicao").addEventListener("submit", (e) => {
    e.preventDefault();
    const submitter = e.submitter;
    const action = submitter?.value || (isEdicao ? "editar" : "rascunho");

    const data = new FormData(e.currentTarget);
    const dados = {
      tipo: data.get("tipo"),
      unidade: data.get("unidade"),
      membro: data.get("membro"),
      descricao: data.get("descricao"),
      prioridade: data.get("prioridade"),
      numeroElo: data.get("numeroElo"),
      ramoMP: data.get("ramoMP"),
      ramoMPNome: data.get("ramoMPNome"),
      tematica: data.get("tematica"),
      uf: String(data.get("uf") || "")
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
      dataInicioCorreicao: data.get("dataInicioCorreicao"),
      dataFimCorreicao: data.get("dataFimCorreicao"),
      observacoesGerais: data.get("observacoesGerais"),
    };

    if (isEdicao) {
      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === proposicaoParaEditar.id);
        if (item) editarProposicao(item, dados);
        return draft;
      });
      alert("Alterações salvas.");
      if (fromCorregedor === "referendo") {
        window.location.href = "/pages/corregedor-referendo.html";
      } else {
        window.location.href = `/pages/proposicao-detalhe.html?id=${proposicaoParaEditar.id}&fromCorregedor=referendo`;
      }
      return;
    }

    let novaProposicaoId;
    mutateState((draft) => {
      const prop = criarProposicao(draft, dados);
      novaProposicaoId = prop.id;
      if (action === "encaminhar") {
        encaminharParaSecretaria(prop);
      }
      return draft;
    });

    alert("Proposição criada com sucesso!");
    window.location.href = `/pages/proposicao-detalhe.html?id=${novaProposicaoId}`;
  });
};

render();
