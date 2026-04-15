import { requireAuth, hasPermission } from "../app/auth.js";
import { baseActions, mountPage } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { criarProposicao, encaminharParaSecretaria } from "../domain/proposicoes.js";

requireAuth();

if (!hasPermission("criar_proposicao")) {
  alert("Sem permissão para criar proposições");
  window.location.href = "/pages/dashboard.html";
}

const render = () => {
  mountPage({
    activePage: "proposicoes-criar",
    title: "Criar Nova Proposição",
    subtitle: "Preencha os dados da proposição e os metadados da correição de origem. Você pode salvar como rascunho ou criar e encaminhar diretamente para a Secretaria.",
    actions: baseActions,
    content: `
      <form id="form-criar-proposicao" class="panel stack">
        <h3 class="panel__title">Dados da Proposição</h3>

        <div class="field-grid">
          <div class="field">
            <label for="tipo">Tipo *</label>
            <select id="tipo" name="tipo" required>
              <option value="Determinação">Determinação</option>
              <option value="Recomendação">Recomendação</option>
            </select>
          </div>

          <div class="field">
            <label for="prioridade">Prioridade</label>
            <select id="prioridade" name="prioridade">
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="unidade">Unidade *</label>
          <input type="text" id="unidade" name="unidade" required
                 placeholder="Ex: Procuradoria-Geral de Justiça" />
        </div>

        <div class="field">
          <label for="membro">Membro *</label>
          <input type="text" id="membro" name="membro" required
                 placeholder="Ex: Dr. João Silva Santos" />
        </div>

        <div class="field">
          <label for="descricao">Descrição *</label>
          <textarea id="descricao" name="descricao" rows="6" required
                    placeholder="Descreva a proposição..."></textarea>
        </div>

        <h3 class="panel__title">Dados da Correição Vinculada</h3>

        <div class="field-grid">
          <div class="field">
            <label for="numeroElo">Número ELO *</label>
            <input type="text" id="numeroElo" name="numeroElo" required
                   placeholder="Ex: 1234567-89.2026.1.01.0001" />
          </div>

          <div class="field">
            <label for="ramoMP">Ramo do MP *</label>
            <input type="text" id="ramoMP" name="ramoMP" required
                   placeholder="Ex: MPBA" />
          </div>
        </div>

        <div class="field">
          <label for="ramoMPNome">Nome do Ramo do MP *</label>
          <input type="text" id="ramoMPNome" name="ramoMPNome" required
                 placeholder="Ex: Ministério Público do Estado da Bahia" />
        </div>

        <div class="field-grid">
          <div class="field">
            <label for="tematica">Temática *</label>
            <input type="text" id="tematica" name="tematica" required
                   placeholder="Ex: Gestão administrativa e fluxos internos" />
          </div>

          <div class="field">
            <label for="uf">UF *</label>
            <input type="text" id="uf" name="uf" required
                   placeholder="Ex: BA" />
          </div>
        </div>

        <div class="field-grid">
          <div class="field">
            <label for="dataInicioCorreicao">Data de início da correição *</label>
            <input type="date" id="dataInicioCorreicao" name="dataInicioCorreicao" required />
          </div>

          <div class="field">
            <label for="dataFimCorreicao">Data de fim da correição *</label>
            <input type="date" id="dataFimCorreicao" name="dataFimCorreicao" required />
          </div>
        </div>

        <div class="field">
          <label for="observacoesGerais">Observações gerais</label>
          <textarea id="observacoesGerais" name="observacoesGerais" rows="4"
                    placeholder="Informe observações complementares da correição ou do encaminhamento."></textarea>
        </div>

        <div class="button-row">
          <button type="button" class="button button--secondary" id="btn-cancelar">
            Cancelar
          </button>
          <button type="submit" name="action" value="rascunho" class="button button--secondary">
            Salvar Rascunho
          </button>
          <button type="submit" name="action" value="encaminhar" class="button">
            Criar e Encaminhar
          </button>
        </div>
      </form>
    `,
  });

  document.querySelector("#btn-cancelar").addEventListener("click", () => {
    window.location.href = "/pages/proposicoes-lista.html";
  });

  document.querySelector("#form-criar-proposicao").addEventListener("submit", (e) => {
    e.preventDefault();
    const submitter = e.submitter;
    const action = submitter?.value || "rascunho";

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
