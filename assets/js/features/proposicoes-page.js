import { requireAuth, hasPermission } from "../app/auth.js";
import { mountPage, state } from "../app/bootstrap.js";
import { Labels, StatusFluxo, SituacaoJuizo, TipoConclusao } from "../domain/enums.js";
import { filtrarProposicoes, listProposicoes } from "../domain/proposicoes.js";
import { renderAlert, renderEmptyState, renderProposicaoTable } from "../ui/components.js";

requireAuth();

const LIMITE_AVISO = 200;
const BUSCA_FLAG = "buscar";

const TEXTO_KEY = "q";
const STATUS_KEY = "status";
const FILTRO_KEYS = [
  "tipo",
  "prioridade",
  "situacaoJuizo",
  "tipoConclusao",
  "ramoMP",
  "uf",
  "unidade",
  "tematica",
  "membro",
  "correicaoId",
  "dataInicioDe",
  "dataFimAte",
];
const BOOL_KEYS = ["comDiligenciasAbertas", "comPendenciasSecretaria"];

const uniq = (values) => Array.from(new Set(values.filter(Boolean))).sort();

const getFiltrosFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const filtros = {};

  const texto = params.get(TEXTO_KEY);
  if (texto) filtros.textoBusca = texto;

  const statusList = params.getAll(STATUS_KEY).filter(Boolean);
  if (statusList.length > 0) filtros.statusFluxo = statusList;

  FILTRO_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) filtros[key] = value;
  });

  BOOL_KEYS.forEach((key) => {
    if (params.get(key) === "1") filtros[key] = true;
  });

  if (params.get(BUSCA_FLAG) === "1") filtros.__buscaAtiva = true;

  return filtros;
};

const setFiltrosInUrl = (filtros) => {
  const params = new URLSearchParams();
  params.set(BUSCA_FLAG, "1");

  if (filtros.textoBusca) params.set(TEXTO_KEY, filtros.textoBusca);
  (filtros.statusFluxo || []).forEach((v) => params.append(STATUS_KEY, v));
  FILTRO_KEYS.forEach((key) => {
    if (filtros[key]) params.set(key, filtros[key]);
  });
  BOOL_KEYS.forEach((key) => {
    if (filtros[key]) params.set(key, "1");
  });

  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.pushState({}, "", newUrl);
};

const limparUrl = () => {
  window.history.pushState({}, "", window.location.pathname);
};

const extrairOpcoes = (proposicoes) => ({
  ramos: uniq(proposicoes.map((p) => p.ramoMP)).map((ramo) => ({
    value: ramo,
    label: proposicoes.find((p) => p.ramoMP === ramo)?.ramoMPNome || ramo,
  })),
  ufs: uniq(proposicoes.flatMap((p) => p.uf || [])),
  unidades: uniq(proposicoes.map((p) => p.unidade)),
  tematicas: uniq(proposicoes.map((p) => p.tematica)),
  membros: uniq(proposicoes.map((p) => p.membro)),
  correicoes: uniq(proposicoes.map((p) => p.correicaoId)),
  tipos: uniq(proposicoes.map((p) => p.tipo)),
});

const escapeAttr = (value) => String(value).replace(/"/g, "&quot;");

const option = (value, label, selected) => {
  const isSelected = Array.isArray(selected)
    ? selected.includes(value)
    : selected === value;
  return `<option value="${escapeAttr(value)}"${isSelected ? " selected" : ""}>${label}</option>`;
};

const renderFormFiltros = (opcoes, filtros) => {
  const status = filtros.statusFluxo || [];
  const statusOptions = Object.values(StatusFluxo)
    .map((s) => option(s, Labels.statusFluxo[s], status))
    .join("");

  const situacaoOptions = [
    option("", "Todas", filtros.situacaoJuizo || ""),
    option("sem_juizo", "Sem juízo registrado", filtros.situacaoJuizo || ""),
    ...Object.values(SituacaoJuizo).map((s) =>
      option(s, Labels.situacaoJuizo[s], filtros.situacaoJuizo || ""),
    ),
  ].join("");

  const conclusaoOptions = [
    option("", "Todas", filtros.tipoConclusao || ""),
    ...Object.values(TipoConclusao).map((s) =>
      option(s, Labels.tipoConclusao[s], filtros.tipoConclusao || ""),
    ),
  ].join("");

  const selectSimples = (id, name, label, lista, valor, { textoValor } = {}) => `
    <div class="field">
      <label for="${id}">${label}</label>
      <select id="${id}" name="${name}">
        <option value="">Todas</option>
        ${lista.map((v) => option(v, textoValor ? textoValor(v) : v, valor || "")).join("")}
      </select>
    </div>
  `;

  return `
    <form class="panel stack" id="filtros-consulta">
      <h3 class="panel__title">Filtros de consulta</h3>
      <p class="muted">Defina ao menos um filtro e clique em <strong>Buscar</strong>. O resultado é limitado aos dados carregados na sessão atual.</p>

      <fieldset class="stack">
        <legend class="muted"><strong>Identificação e texto</strong></legend>
        <div class="field-grid">
          <div class="field" style="grid-column: span 2;">
            <label for="filtro-texto">Busca textual</label>
            <input id="filtro-texto" name="textoBusca" type="text"
              placeholder="Número, número ELO, descrição ou observações"
              value="${escapeAttr(filtros.textoBusca || "")}" />
          </div>
          ${selectSimples("filtro-tipo", "tipo", "Tipo", opcoes.tipos, filtros.tipo)}
          <div class="field">
            <label for="filtro-prioridade">Prioridade</label>
            <select id="filtro-prioridade" name="prioridade">
              <option value="">Todas</option>
              ${option("alta", "Alta", filtros.prioridade || "")}
              ${option("normal", "Normal", filtros.prioridade || "")}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset class="stack">
        <legend class="muted"><strong>Fluxo e juízo</strong></legend>
        <div class="field-grid">
          <div class="field" style="grid-column: span 2;">
            <label for="filtro-status">Status do fluxo <span class="muted">(Ctrl/Cmd + clique para múltiplos)</span></label>
            <select id="filtro-status" name="statusFluxo" multiple size="4">
              ${statusOptions}
            </select>
          </div>
          <div class="field">
            <label for="filtro-situacao">Situação do juízo</label>
            <select id="filtro-situacao" name="situacaoJuizo">
              ${situacaoOptions}
            </select>
          </div>
          <div class="field">
            <label for="filtro-conclusao">Tipo de conclusão</label>
            <select id="filtro-conclusao" name="tipoConclusao" ${filtros.situacaoJuizo && filtros.situacaoJuizo !== SituacaoJuizo.CONCLUIDA ? "disabled" : ""}>
              ${conclusaoOptions}
            </select>
          </div>
        </div>
        <div class="field-grid">
          <label class="field" style="flex-direction: row; align-items: center; gap: 0.5rem;">
            <input type="checkbox" name="comDiligenciasAbertas" value="1" ${filtros.comDiligenciasAbertas ? "checked" : ""} />
            <span>Apenas com diligências abertas</span>
          </label>
          <label class="field" style="flex-direction: row; align-items: center; gap: 0.5rem;">
            <input type="checkbox" name="comPendenciasSecretaria" value="1" ${filtros.comPendenciasSecretaria ? "checked" : ""} />
            <span>Apenas com providências da secretaria pendentes</span>
          </label>
        </div>
      </fieldset>

      <fieldset class="stack">
        <legend class="muted"><strong>Localização, temática e período</strong></legend>
        <div class="field-grid">
          <div class="field">
            <label for="filtro-ramo">Ramo do MP</label>
            <select id="filtro-ramo" name="ramoMP">
              <option value="">Todos</option>
              ${opcoes.ramos.map((r) => option(r.value, `${r.value} — ${r.label}`, filtros.ramoMP || "")).join("")}
            </select>
          </div>
          ${selectSimples("filtro-uf", "uf", "UF", opcoes.ufs, filtros.uf)}
          ${selectSimples("filtro-unidade", "unidade", "Unidade", opcoes.unidades, filtros.unidade)}
          ${selectSimples("filtro-tematica", "tematica", "Temática", opcoes.tematicas, filtros.tematica)}
          ${selectSimples("filtro-membro", "membro", "Membro responsável", opcoes.membros, filtros.membro)}
          ${selectSimples("filtro-correicao", "correicaoId", "Correição", opcoes.correicoes, filtros.correicaoId)}
          <div class="field">
            <label for="filtro-data-inicio-de">Início da correição ≥</label>
            <input id="filtro-data-inicio-de" name="dataInicioDe" type="date" value="${escapeAttr(filtros.dataInicioDe || "")}" />
          </div>
          <div class="field">
            <label for="filtro-data-fim-ate">Fim da correição ≤</label>
            <input id="filtro-data-fim-ate" name="dataFimAte" type="date" value="${escapeAttr(filtros.dataFimAte || "")}" />
          </div>
        </div>
      </fieldset>

      <div class="button-row">
        <button class="button button--primary" type="submit">Buscar</button>
        <button class="button button--secondary" type="button" data-action="limpar-filtros">Limpar</button>
      </div>
    </form>
  `;
};

const renderResultados = (lista) => {
  if (lista.length === 0) {
    return `
      <div class="panel">
        ${renderEmptyState("Nenhuma proposição encontrada para os filtros aplicados.")}
      </div>
    `;
  }

  const aviso =
    lista.length > LIMITE_AVISO
      ? renderAlert(
          `Exibindo ${lista.length} resultados. Refine os filtros para uma consulta mais específica.`,
          "warning",
        )
      : "";

  return `
    <section class="stack">
      <div class="panel">
        <h3 class="panel__title">${lista.length} proposição(ões) encontrada(s)</h3>
        ${aviso}
      </div>
      ${renderProposicaoTable(lista)}
    </section>
  `;
};

const renderEstadoInicial = () => `
  <div class="panel">
    <div class="empty-state">
      <p>Configure os filtros acima e clique em <strong>Buscar</strong> para consultar proposições.</p>
    </div>
  </div>
`;

const render = () => {
  const filtros = getFiltrosFromUrl();
  const currentState = state();
  const todas = listProposicoes(currentState);
  const opcoes = extrairOpcoes(todas);

  const temFiltroAplicavel =
    Boolean(filtros.textoBusca) ||
    (filtros.statusFluxo && filtros.statusFluxo.length > 0) ||
    FILTRO_KEYS.some((k) => filtros[k]) ||
    BOOL_KEYS.some((k) => filtros[k]);

  const buscaAtiva = Boolean(filtros.__buscaAtiva);

  let resultadoHtml;
  if (!buscaAtiva) {
    resultadoHtml = renderEstadoInicial();
  } else if (!temFiltroAplicavel) {
    resultadoHtml = renderResultados(todas);
  } else {
    const lista = filtrarProposicoes(todas, filtros);
    resultadoHtml = renderResultados(lista);
  }

  const createButton = hasPermission("criar_proposicao")
    ? `<a href="/pages/proposicoes-criar.html" class="button">Criar Proposição</a>`
    : "";

  mountPage({
    activePage: "proposicoes-lista",
    title: "Consulta de Proposições",
    subtitle:
      "Configure os filtros abaixo para consultar o acervo de proposições. A busca é executada apenas após o clique em Buscar.",
    actions: createButton,
    content: `
      <section class="stack">
        ${renderFormFiltros(opcoes, filtros)}
        ${resultadoHtml}
      </section>
    `,
  });

  bindHandlers();
};

const coletarFiltrosDoForm = (form) => {
  const data = new FormData(form);
  const statusMultiplos = data.getAll("statusFluxo").filter(Boolean);

  const novosFiltros = {
    textoBusca: (data.get("textoBusca") || "").toString().trim(),
    statusFluxo: statusMultiplos,
  };

  FILTRO_KEYS.forEach((key) => {
    const value = (data.get(key) || "").toString().trim();
    if (value) novosFiltros[key] = value;
  });

  BOOL_KEYS.forEach((key) => {
    if (data.get(key) === "1") novosFiltros[key] = true;
  });

  return novosFiltros;
};

const bindHandlers = () => {
  const form = document.querySelector("#filtros-consulta");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const filtros = coletarFiltrosDoForm(event.currentTarget);
      setFiltrosInUrl(filtros);
      render();
    });
  }

  document.querySelector("[data-action='limpar-filtros']")?.addEventListener("click", () => {
    limparUrl();
    render();
  });

  const situacao = document.querySelector("#filtro-situacao");
  const conclusao = document.querySelector("#filtro-conclusao");
  if (situacao && conclusao) {
    situacao.addEventListener("change", () => {
      const habilitar = situacao.value === SituacaoJuizo.CONCLUIDA || situacao.value === "";
      conclusao.disabled = !habilitar;
      if (!habilitar) conclusao.value = "";
    });
  }
};

window.addEventListener("popstate", render);

render();
