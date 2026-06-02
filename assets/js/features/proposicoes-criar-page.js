import { requireAuth, hasPermission } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { queryParam, formatDate } from "../app/utils.js";
import { Prioridade, StatusFluxo } from "../domain/enums.js";
import {
  confirmarRascunhoCN,
  criarProposicao,
  editarProposicao,
  getProposicaoById,
} from "../domain/proposicoes.js";
import { listCorreicoes } from "../domain/correicoes.js";
import { listMembros, listUnidades } from "../domain/correicionados.js";
import { renderAlert } from "../ui/components.js";

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

const STATUS_EDITAVEIS = [
  StatusFluxo.AGUARDANDO_REFERENDO_CNMP,
  StatusFluxo.RASCUNHO_CN,
];

if (
  proposicaoParaEditar &&
  !STATUS_EDITAVEIS.includes(proposicaoParaEditar.statusFluxo)
) {
  alert(
    "Esta proposição não está mais em rascunho nem em aguardo de referendo do CNMP e não pode ser editada.",
  );
  window.location.href = `/pages/proposicao-detalhe.html?id=${proposicaoParaEditar.id}`;
}

const isEdicao = Boolean(proposicaoParaEditar);
const editandoRascunho =
  isEdicao && proposicaoParaEditar.statusFluxo === StatusFluxo.RASCUNHO_CN;

const valor = (campo) => {
  if (!proposicaoParaEditar) return "";
  const v = proposicaoParaEditar[campo];
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
};

const escapeAttr = (s) => String(s).replaceAll('"', "&quot;");
const escapeHtml = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const correicoesDisponiveis = listCorreicoes(state());
const correicoesById = new Map(correicoesDisponiveis.map((c) => [c.id, c]));
const unidadesDiretorio = listUnidades(state());
const unidadesById = new Map(unidadesDiretorio.map((unidade) => [unidade.id, unidade]));
const membrosDiretorio = listMembros(state());
const membrosById = new Map(membrosDiretorio.map((membro) => [membro.id, membro]));
const LEGADO_VALUE = "__legado__";
const correicaoOriginalId = proposicaoParaEditar?.correicaoId || "";
let correicaoSelecionadaId = isEdicao ? proposicaoParaEditar.correicaoId || "" : "";

const getUnidadesDisponiveis = () => {
  const ramoMP = correicoesById.get(correicaoSelecionadaId)?.ramoMP;
  if (!ramoMP) return [];
  return unidadesDiretorio.filter((unidade) => unidade.ramoMP === ramoMP);
};

const resolveUnidadeIdLegada = () => {
  if (!proposicaoParaEditar) return "";
  if (proposicaoParaEditar.unidadeId) return proposicaoParaEditar.unidadeId;
  return (
    getUnidadesDisponiveis().find((unidade) => unidade.nome === proposicaoParaEditar.unidade)?.id ||
    ""
  );
};

let unidadeSelecionada = resolveUnidadeIdLegada();
if (!unidadeSelecionada && valor("unidade")) unidadeSelecionada = LEGADO_VALUE;

const resolveMembroIdLegado = () => {
  if (!proposicaoParaEditar) return "";
  if (proposicaoParaEditar.membroId) return proposicaoParaEditar.membroId;
  return (
    membrosDiretorio.find(
      (membro) =>
        membro.nome === proposicaoParaEditar.membro &&
        membro.lotacaoUnidadeId === unidadeSelecionada,
    )?.id || ""
  );
};

let membroSelecionado = resolveMembroIdLegado();
if (!membroSelecionado && valor("membro")) membroSelecionado = LEGADO_VALUE;

const getMembrosDisponiveis = () =>
  membrosDiretorio.filter((membro) => membro.lotacaoUnidadeId === unidadeSelecionada);

const renderUnidadesOptions = () => {
  const legado =
    isEdicao && unidadeSelecionada === LEGADO_VALUE
      ? `<option value="${LEGADO_VALUE}"${unidadeSelecionada === LEGADO_VALUE ? " selected" : ""}>Manter unidade legada: ${escapeHtml(valor("unidade"))}</option>`
      : "";
  const options = getUnidadesDisponiveis()
    .map(
      (unidade) =>
        `<option value="${escapeAttr(unidade.id)}"${unidadeSelecionada === unidade.id ? " selected" : ""}>${escapeHtml(unidade.nome)}</option>`,
    )
    .join("");
  return `<option value="">Selecione uma unidade…</option>${legado}${options}`;
};

const renderMembrosOptions = () => {
  const legado =
    isEdicao && membroSelecionado === LEGADO_VALUE
      ? `<option value="${LEGADO_VALUE}"${membroSelecionado === LEGADO_VALUE ? " selected" : ""}>Manter membro legado: ${escapeHtml(valor("membro"))}</option>`
      : "";
  const options = getMembrosDisponiveis()
    .map(
      (membro) =>
        `<option value="${escapeAttr(membro.id)}"${membroSelecionado === membro.id ? " selected" : ""}>${escapeHtml(membro.nome)}</option>`,
    )
    .join("");
  return `<option value="">Proposição da unidade</option>${legado}${options}`;
};

const renderPreview = (c) => {
  if (!c) return `<p class="muted">Selecione uma correição para ver os dados herdados.</p>`;
  return `
    <div class="meta-list">
      <div class="meta-item"><span>Número ELO</span><strong>${escapeHtml(c.numeroElo)}</strong></div>
      <div class="meta-item"><span>Ramo do MP</span><strong>${escapeHtml(c.ramoMP)} — ${escapeHtml(c.ramoMPNome)}</strong></div>
      <div class="meta-item"><span>Temática</span><strong>${escapeHtml(c.tematica)}</strong></div>
      <div class="meta-item"><span>UF</span><strong>${(c.uf || []).join(", ")}</strong></div>
      <div class="meta-item"><span>Período</span><strong>${formatDate(c.dataInicio)} – ${formatDate(c.dataFim)}</strong></div>
    </div>
  `;
};

const render = () => {
  if (!isEdicao && correicoesDisponiveis.length === 0) {
    mountPage({
      activePage: "proposicoes-criar",
      title: "Criar nova proposição",
      subtitle: "É preciso ter ao menos uma correição cadastrada para vincular a proposição.",
      actions: baseActions,
      content: `
        <div class="panel stack">
          ${renderAlert("Nenhuma correição cadastrada. A proposição precisa estar vinculada a uma correição.", "warning")}
          <div class="button-row">
            <a class="button" href="correicoes-criar.html">Criar correição primeiro</a>
            <a class="button button--secondary" href="dashboard.html">Voltar</a>
          </div>
        </div>
      `,
    });
    return;
  }

  const title = isEdicao
    ? `Editar proposição ${proposicaoParaEditar.numero}`
    : "Criar nova proposição";
  const subtitle = editandoRascunho
    ? "Atualize o rascunho desta proposição. Você pode salvá-lo como rascunho (sem confirmar) ou confirmar e encaminhá-lo ao referendo do CNMP. Histórico e demais campos são preservados."
    : isEdicao
      ? "Atualize os dados da proposição enquanto ela aguarda referendo do CNMP. Campos sensíveis (histórico, apreciação, diligências) são preservados."
      : "Preencha os dados da proposição e os metadados da correição de origem. Você pode salvar como rascunho ou criar e encaminhar ao referendo do CNMP (ou diretamente à Secretaria, se a correição já estiver referendada).";

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
              <option value="${Prioridade.URGENTE}"${valor("prioridade") === Prioridade.URGENTE ? " selected" : ""}>Urgente</option>
              <option value="${Prioridade.IMPORTANTE}"${valor("prioridade") === Prioridade.IMPORTANTE ? " selected" : ""}>Importante</option>
              <option value="${Prioridade.NORMAL}"${valor("prioridade") === Prioridade.NORMAL || !valor("prioridade") ? " selected" : ""}>Normal</option>
            </select>
          </div>
        </div>

        <div class="field field--checkbox">
          <label for="sensivel">
            <input id="sensivel" name="sensivel" type="checkbox" ${proposicaoParaEditar?.sensivel ? "checked" : ""} />
            Marcar como caso sensível
          </label>
          <p class="muted modal-helper">Sinaliza ao time tratamento com cautela adicional. Não afeta visibilidade ou acesso ao caso.</p>
        </div>

        <div class="field">
          <label for="descricao">Descrição *</label>
          <textarea id="descricao" name="descricao" rows="6" required
                    placeholder="Descreva a proposição...">${valor("descricao")}</textarea>
        </div>

        <h3 class="panel__title">Correição vinculada *</h3>
        <p class="muted">Selecione a correição de origem. Ramo do MP, temática, número ELO, UF e período são herdados dela (fonte única).</p>

        <div class="field">
          <label for="correicaoId">Correição</label>
          <select id="correicaoId" name="correicaoId" required>
            <option value="">Selecione uma correição…</option>
            ${correicoesDisponiveis
              .map(
                (c) =>
                  `<option value="${c.id}"${correicaoSelecionadaId === c.id ? " selected" : ""}>${escapeAttr(`${c.numero} — ${c.ramoMP} — ${c.tematica}`)}</option>`,
              )
              .join("")}
          </select>
        </div>

        <div id="correicao-preview" class="stack">
          ${renderPreview(correicoesById.get(correicaoSelecionadaId))}
        </div>

        <div class="field">
          <label for="unidadeId">Unidade *</label>
          <select id="unidadeId" name="unidadeId" required>
            ${renderUnidadesOptions()}
          </select>
          <p class="muted modal-helper">Somente unidades do mesmo ramo da correição selecionada.</p>
        </div>

        <div class="field">
          <label for="membroId">Membro</label>
          <select id="membroId" name="membroId">
            ${renderMembrosOptions()}
          </select>
          <p class="muted modal-helper">Opcional. Selecione um membro lotado na unidade ou mantenha a proposição vinculada à unidade.</p>
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
            editandoRascunho
              ? `
                <button type="submit" name="action" value="editar" class="button button--secondary">
                  Salvar rascunho
                </button>
                <button type="submit" name="action" value="confirmar" class="button">
                  Salvar e encaminhar
                </button>
              `
              : isEdicao
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

  const selectCorreicao = document.querySelector("#correicaoId");
  const selectUnidade = document.querySelector("#unidadeId");
  const selectMembro = document.querySelector("#membroId");

  const atualizarSeletoresDiretorio = () => {
    if (selectUnidade) selectUnidade.innerHTML = renderUnidadesOptions();
    if (selectMembro) selectMembro.innerHTML = renderMembrosOptions();
  };

  if (selectCorreicao) {
    selectCorreicao.addEventListener("change", (e) => {
      correicaoSelecionadaId = e.target.value;
      const idsPermitidos = new Set(getUnidadesDisponiveis().map((unidade) => unidade.id));
      if (
        (unidadeSelecionada === LEGADO_VALUE && correicaoSelecionadaId !== correicaoOriginalId) ||
        (unidadeSelecionada !== LEGADO_VALUE && !idsPermitidos.has(unidadeSelecionada))
      ) {
        unidadeSelecionada = "";
        membroSelecionado = "";
      }
      const preview = document.querySelector("#correicao-preview");
      if (preview) preview.innerHTML = renderPreview(correicoesById.get(correicaoSelecionadaId));
      atualizarSeletoresDiretorio();
    });
  }

  selectUnidade?.addEventListener("change", (e) => {
    const unidadeAnterior = unidadeSelecionada;
    unidadeSelecionada = e.target.value;
    if (unidadeSelecionada !== unidadeAnterior) membroSelecionado = "";
    atualizarSeletoresDiretorio();
  });

  selectMembro?.addEventListener("change", (e) => {
    membroSelecionado = e.target.value;
  });

  document.querySelector("#form-criar-proposicao").addEventListener("submit", (e) => {
    e.preventDefault();
    const submitter = e.submitter;
    const action = submitter?.value || (isEdicao ? "editar" : "rascunho");

    const data = new FormData(e.currentTarget);
    const unidadeValue = data.get("unidadeId");
    const unidadeDiretorio = unidadesById.get(unidadeValue);
    const membroValue = data.get("membroId");
    const membroDiretorio = membrosById.get(membroValue);
    const mantendoUnidadeLegada = unidadeValue === LEGADO_VALUE && isEdicao;
    const mantendoMembroLegado = membroValue === LEGADO_VALUE && isEdicao;

    if (!unidadeDiretorio && !mantendoUnidadeLegada) {
      alert("Selecione uma unidade vinculada ao ramo da correição.");
      return;
    }
    if (
      membroDiretorio &&
      unidadeDiretorio &&
      membroDiretorio.lotacaoUnidadeId !== unidadeDiretorio.id
    ) {
      alert("Selecione um membro lotado na unidade escolhida.");
      return;
    }

    const dados = {
      tipo: data.get("tipo"),
      unidadeId: unidadeDiretorio?.id || null,
      unidade: unidadeDiretorio?.nome || valor("unidade"),
      membroId: membroDiretorio?.id || null,
      membro: membroDiretorio?.nome || (mantendoMembroLegado ? valor("membro") : ""),
      descricao: data.get("descricao"),
      prioridade: data.get("prioridade"),
      sensivel: data.get("sensivel") === "on",
      correicaoId: data.get("correicaoId"),
      observacoesGerais: data.get("observacoesGerais"),
    };

    if (!dados.correicaoId) {
      alert("Selecione a correição vinculada.");
      return;
    }

    if (isEdicao) {
      const confirmar = action === "confirmar";
      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === proposicaoParaEditar.id);
        if (item) {
          editarProposicao(item, dados);
          if (confirmar) confirmarRascunhoCN(draft, item);
        }
        return draft;
      });
      alert(
        confirmar
          ? "Rascunho confirmado e encaminhado."
          : editandoRascunho
            ? "Rascunho atualizado."
            : "Alterações salvas.",
      );
      if (fromCorregedor === "referendo") {
        window.location.href = "/pages/corregedor-referendo.html";
      } else {
        window.location.href = `/pages/proposicao-detalhe.html?id=${proposicaoParaEditar.id}&fromCorregedor=referendo`;
      }
      return;
    }

    let novaProposicaoId;
    mutateState((draft) => {
      const prop = criarProposicao(draft, dados, { comoRascunho: action === "rascunho" });
      novaProposicaoId = prop.id;
      return draft;
    });

    alert(
      action === "rascunho"
        ? "Rascunho de proposição salvo."
        : "Proposição criada com sucesso!",
    );
    window.location.href = `/pages/proposicao-detalhe.html?id=${novaProposicaoId}`;
  });
};

render();
