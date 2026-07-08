import { requireAuth, hasPermission } from "../app/auth.js";
import { mountPage, state } from "../app/bootstrap.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import {
  Labels,
  Prioridade,
  StatusFluxo,
  SituacaoApreciacao,
  TipoConclusao,
  TipoDestinatario,
} from "../domain/enums.js";
import {
  filtrarProposicoes,
  isProposicaoAtiva,
  listProposicoes,
} from "../domain/proposicoes.js";
import { formatDatelineEditorial } from "../app/utils.js";
import {
  renderActiveFilterChip,
  renderAlert,
  renderFilterToggleChip,
  renderPresetChip,
  renderProposicaoCardGrid,
  renderProposicaoTableEditorial,
} from "../ui/components.js";

requireAuth();

const LIMITE_AVISO = 200;
const BUSCA_FLAG = "buscar";
const VIEW_KEY = "nad.acervo.view";
const SORT_KEY_LS = "nad.acervo.sort";

const TEXTO_KEY = "q";
const STATUS_KEY = "status";
const FILTRO_KEYS = [
  "tipo",
  "prioridade",
  "situacaoApreciacao",
  "tipoConclusao",
  "ramoMP",
  "uf",
  "unidade",
  "tematica",
  "membro",
  "tipoDestinatario",
  "correicaoId",
  "dataInicioDe",
  "dataFimAte",
];
const BOOL_KEYS = ["comDiligenciasAbertas", "comPendenciasSecretaria"];

const SORT_OPTIONS = [
  { value: "relevancia", label: "Padrão (urgência + idade)" },
  { value: "numero-asc", label: "Número (crescente)" },
  { value: "numero-desc", label: "Número (decrescente)" },
  { value: "idade-desc", label: "Movimentação mais recente" },
  { value: "idade-asc", label: "Movimentação mais antiga" },
  { value: "pendencias-desc", label: "Mais pendências" },
  { value: "unidade-asc", label: "Unidade (A–Z)" },
];

const PRIORIDADE_PESO = {
  [Prioridade.URGENTE]: 0,
  [Prioridade.IMPORTANTE]: 1,
  [Prioridade.NORMAL]: 2,
};

const uniq = (values) => Array.from(new Set(values.filter(Boolean))).sort();

const escapeAttr = (value) => String(value).replace(/"/g, "&quot;");

const getView = () => {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === "cards" ? "cards" : "tabela";
  } catch {
    return "tabela";
  }
};

const setView = (view) => {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* ignore */
  }
};

const getSort = () => {
  try {
    const v = localStorage.getItem(SORT_KEY_LS);
    return SORT_OPTIONS.some((o) => o.value === v) ? v : "relevancia";
  } catch {
    return "relevancia";
  }
};

const setSort = (sort) => {
  try {
    localStorage.setItem(SORT_KEY_LS, sort);
  } catch {
    /* ignore */
  }
};

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

const buildUrl = (filtros) => {
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

  return `${window.location.pathname}?${params.toString()}`;
};

const setFiltrosInUrl = (filtros) => {
  window.history.pushState({}, "", buildUrl(filtros));
};

const limparUrl = () => {
  window.history.pushState({}, "", window.location.pathname);
};

const cloneFiltros = (filtros) => ({
  ...filtros,
  statusFluxo: filtros.statusFluxo ? [...filtros.statusFluxo] : undefined,
});

const removeFilterFromUrl = (filtros, removal) => {
  const next = cloneFiltros(filtros);
  delete next.__buscaAtiva;
  if (removal.key === "textoBusca") delete next.textoBusca;
  else if (removal.key === "statusFluxo") {
    next.statusFluxo = (next.statusFluxo || []).filter((v) => v !== removal.value);
    if (!next.statusFluxo.length) delete next.statusFluxo;
  } else delete next[removal.key];
  return buildUrl({ ...next, __buscaAtiva: true });
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

const option = (value, label, selected) => {
  const isSelected = Array.isArray(selected)
    ? selected.includes(value)
    : selected === value;
  return `<option value="${escapeAttr(value)}"${isSelected ? " selected" : ""}>${label}</option>`;
};

const getUltimaMovimentacaoIso = (p) => {
  const eventos = p.historico || [];
  if (!eventos.length) return null;
  let maior = 0;
  for (const ev of eventos) {
    const t = new Date(ev.data).getTime();
    if (Number.isFinite(t) && t > maior) maior = t;
  }
  return maior || null;
};

const aplicarOrdenacao = (lista, sort) => {
  const arr = [...lista];
  switch (sort) {
    case "numero-asc":
      return arr.sort((a, b) => (a.numero || "").localeCompare(b.numero || ""));
    case "numero-desc":
      return arr.sort((a, b) => (b.numero || "").localeCompare(a.numero || ""));
    case "idade-desc":
      return arr.sort(
        (a, b) => (getUltimaMovimentacaoIso(b) || 0) - (getUltimaMovimentacaoIso(a) || 0),
      );
    case "idade-asc":
      return arr.sort(
        (a, b) => (getUltimaMovimentacaoIso(a) || 0) - (getUltimaMovimentacaoIso(b) || 0),
      );
    case "pendencias-desc":
      return arr.sort((a, b) => {
        const pa = (a.pendenciasSecretaria || []).filter((p) => p.status === "pendente").length;
        const pb = (b.pendenciasSecretaria || []).filter((p) => p.status === "pendente").length;
        return pb - pa;
      });
    case "unidade-asc":
      return arr.sort((a, b) => (a.unidade || "").localeCompare(b.unidade || ""));
    case "relevancia":
    default:
      return arr.sort((a, b) => {
        const sensDiff = (b.sensivel ? 1 : 0) - (a.sensivel ? 1 : 0);
        if (sensDiff !== 0) return sensDiff;
        const prioDiff =
          (PRIORIDADE_PESO[a.prioridade] ?? 9) - (PRIORIDADE_PESO[b.prioridade] ?? 9);
        if (prioDiff !== 0) return prioDiff;
        return (getUltimaMovimentacaoIso(b) || 0) - (getUltimaMovimentacaoIso(a) || 0);
      });
  }
};

const contarPorStatus = (proposicoes, status) =>
  proposicoes.filter((p) => p.statusFluxo === status).length;

const contarComPendencias = (proposicoes) =>
  proposicoes.filter((p) =>
    (p.pendenciasSecretaria || []).some((x) => x.status === "pendente"),
  ).length;

const contarComDiligenciasAbertas = (proposicoes) =>
  proposicoes.filter((p) =>
    (p.diligencias || []).some((x) => x.status === "aberta"),
  ).length;

const contarPorPrioridade = (proposicoes, prioridade) =>
  proposicoes.filter((p) => p.prioridade === prioridade).length;

const buildHero = (todas) => {
  const ativas = todas.filter(isProposicaoAtiva).length;
  const comPend = contarComPendencias(todas);
  const aguardando = contarPorStatus(todas, StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR);

  return `
    <section class="acervo-hero">
      <div>
        <div class="acervo-hero__top">
          <p class="acervo-overline acervo-overline--accent">Acervo · ${formatDatelineEditorial()}</p>
          <span class="acervo-hero__mark">NAD</span>
        </div>
      </div>
      <div class="acervo-hero__kpis" aria-label="Indicadores do acervo">
        <div class="acervo-hero__kpi">
          <span class="acervo-hero__kpi-value">${todas.length}</span>
          <span class="acervo-hero__kpi-label">No acervo</span>
        </div>
        <div class="acervo-hero__kpi">
          <span class="acervo-hero__kpi-value">${ativas}</span>
          <span class="acervo-hero__kpi-label">Em fluxo</span>
        </div>
        <div class="acervo-hero__kpi">
          <span class="acervo-hero__kpi-value">${aguardando}</span>
          <span class="acervo-hero__kpi-label">Aguardando decisão</span>
        </div>
        <div class="acervo-hero__kpi">
          <span class="acervo-hero__kpi-value">${comPend}</span>
          <span class="acervo-hero__kpi-label">Com pendências</span>
        </div>
      </div>
    </section>
  `;
};

const buildPresets = (todas) => {
  const presets = [
    {
      label: "Aguardando decisão",
      href: `?${BUSCA_FLAG}=1&${STATUS_KEY}=${StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR}`,
      count: contarPorStatus(todas, StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR),
      icon: "✦",
    },
    {
      label: "Rascunho de decisão",
      href: `?${BUSCA_FLAG}=1&${STATUS_KEY}=${StatusFluxo.RASCUNHO_DECISAO_CN}`,
      count: contarPorStatus(todas, StatusFluxo.RASCUNHO_DECISAO_CN),
      icon: "✎",
    },
    {
      label: "Aguardando avaliação",
      href: `?${BUSCA_FLAG}=1&${STATUS_KEY}=${StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO}`,
      count: contarPorStatus(todas, StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO),
      icon: "◐",
    },
    {
      label: "Aguardando Secretaria",
      href: `?${BUSCA_FLAG}=1&${STATUS_KEY}=${StatusFluxo.AGUARDANDO_SECRETARIA}`,
      count: contarPorStatus(todas, StatusFluxo.AGUARDANDO_SECRETARIA),
      icon: "❒",
    },
    {
      label: "Com pendências da Secretaria",
      href: `?${BUSCA_FLAG}=1&comPendenciasSecretaria=1`,
      count: contarComPendencias(todas),
      icon: "⏳",
    },
    {
      label: "Urgentes",
      href: `?${BUSCA_FLAG}=1&prioridade=${Prioridade.URGENTE}`,
      count: contarPorPrioridade(todas, Prioridade.URGENTE),
      icon: "▲",
    },
  ];

  return `
    <section aria-labelledby="presets-title" class="stack">
      <h2 class="acervo-overline" id="presets-title">Atalhos · filas mais consultadas</h2>
      <div class="acervo-presets">
        ${presets.map(renderPresetChip).join("")}
      </div>
    </section>
  `;
};

const renderStatusChips = (todas, statusAtivos) => {
  const ordem = [
    StatusFluxo.AGUARDANDO_REFERENDO_CNMP,
    StatusFluxo.RASCUNHO_CN,
    StatusFluxo.AGUARDANDO_SECRETARIA,
    StatusFluxo.AGUARDANDO_COMPROVACAO,
    StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO,
    StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR,
    StatusFluxo.RASCUNHO_DECISAO_CN,
    StatusFluxo.AGUARDANDO_CIENCIA,
    StatusFluxo.BAIXA_DEFINITIVA,
  ];
  return ordem
    .map((status) =>
      renderFilterToggleChip({
        label: Labels.statusFluxo[status],
        value: status,
        count: contarPorStatus(todas, status),
        active: statusAtivos.includes(status),
      }),
    )
    .join("");
};

const buildFiltersPanel = (opcoes, filtros, todas) => {
  const statusAtivos = filtros.statusFluxo || [];

  const situacaoOptions = [
    option("", "Todas", filtros.situacaoApreciacao || ""),
    option("sem_apreciacao", "Sem decisão do CN registrada", filtros.situacaoApreciacao || ""),
    ...Object.values(SituacaoApreciacao).map((s) =>
      option(s, Labels.situacaoApreciacao[s], filtros.situacaoApreciacao || ""),
    ),
  ].join("");

  const conclusaoOptions = [
    option("", "Todas", filtros.tipoConclusao || ""),
    ...Object.values(TipoConclusao).map((s) =>
      option(s, Labels.tipoConclusao[s], filtros.tipoConclusao || ""),
    ),
  ].join("");

  const prioridadeOptions = [
    option("", "Todas", filtros.prioridade || ""),
    option(Prioridade.URGENTE, Labels.prioridade[Prioridade.URGENTE], filtros.prioridade || ""),
    option(Prioridade.IMPORTANTE, Labels.prioridade[Prioridade.IMPORTANTE], filtros.prioridade || ""),
    option(Prioridade.NORMAL, Labels.prioridade[Prioridade.NORMAL], filtros.prioridade || ""),
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
    <form class="acervo-filter-panel" id="filtros-consulta" aria-label="Filtros de consulta">
      <header class="acervo-filter-panel__head">
        <div>
          <p class="acervo-overline">Refinamento</p>
          <h2 class="acervo-filter-panel__title">Critérios de busca</h2>
        </div>
        <p class="muted" style="margin:0;font-size:0.85rem;max-width:36ch;">
          Combine status, localização e período. Os filtros ficam refletidos na URL.
        </p>
      </header>

      <div class="acervo-filter-search">
        <input
          id="filtro-texto"
          name="textoBusca"
          type="text"
          placeholder="Buscar por número, ELO, descrição ou observações…"
          value="${escapeAttr(filtros.textoBusca || "")}"
          autocomplete="off"
        />
      </div>

      <div class="acervo-filter-section">
        <p class="acervo-filter-section__title">Status do fluxo</p>
        <div class="acervo-filter-chips" role="group" aria-label="Filtrar por status">
          ${renderStatusChips(todas, statusAtivos)}
        </div>
        <input type="hidden" name="statusFluxoHidden" id="statusFluxoHidden" value="${statusAtivos.join(",")}" />
      </div>

      <div class="acervo-filter-section">
        <p class="acervo-filter-section__title">Apreciação &amp; tipo</p>
        <div class="acervo-filter-grid">
          ${selectSimples("filtro-tipo", "tipo", "Tipo", opcoes.tipos, filtros.tipo)}
          <div class="field">
            <label for="filtro-orientacao">Orientação</label>
            <select id="filtro-orientacao" name="tipoDestinatario">
              <option value="">Todas</option>
              ${Object.values(TipoDestinatario)
                .map((t) => option(t, Labels.tipoDestinatario[t], filtros.tipoDestinatario || ""))
                .join("")}
            </select>
          </div>
          <div class="field">
            <label for="filtro-prioridade">Prioridade</label>
            <select id="filtro-prioridade" name="prioridade">
              ${prioridadeOptions}
            </select>
          </div>
          <div class="field">
            <label for="filtro-situacao">Situação da apreciação</label>
            <select id="filtro-situacao" name="situacaoApreciacao">
              ${situacaoOptions}
            </select>
          </div>
          <div class="field">
            <label for="filtro-conclusao">Tipo de conclusão</label>
            <select id="filtro-conclusao" name="tipoConclusao" ${
              filtros.situacaoApreciacao && filtros.situacaoApreciacao !== SituacaoApreciacao.CONCLUIDA
                ? "disabled"
                : ""
            }>
              ${conclusaoOptions}
            </select>
          </div>
        </div>
        <div class="acervo-filter-checks">
          <label class="acervo-filter-check">
            <input type="checkbox" name="comDiligenciasAbertas" value="1" ${
              filtros.comDiligenciasAbertas ? "checked" : ""
            } />
            <span>Apenas com diligências abertas (${contarComDiligenciasAbertas(todas)})</span>
          </label>
          <label class="acervo-filter-check">
            <input type="checkbox" name="comPendenciasSecretaria" value="1" ${
              filtros.comPendenciasSecretaria ? "checked" : ""
            } />
            <span>Apenas com providências da Secretaria pendentes (${contarComPendencias(todas)})</span>
          </label>
        </div>
      </div>

      <div class="acervo-filter-section">
        <p class="acervo-filter-section__title">Localização, temática e período</p>
        <div class="acervo-filter-grid">
          <div class="field">
            <label for="filtro-ramo">Ramo do MP</label>
            <select id="filtro-ramo" name="ramoMP">
              <option value="">Todos</option>
              ${opcoes.ramos
                .map((r) => option(r.value, `${r.value} — ${r.label}`, filtros.ramoMP || ""))
                .join("")}
            </select>
          </div>
          ${selectSimples("filtro-uf", "uf", "UF", opcoes.ufs, filtros.uf)}
          ${selectSimples("filtro-unidade", "unidade", "Unidade", opcoes.unidades, filtros.unidade)}
          ${selectSimples("filtro-tematica", "tematica", "Temática", opcoes.tematicas, filtros.tematica)}
          ${selectSimples("filtro-membro", "membro", "Membro responsável", opcoes.membros, filtros.membro)}
          ${selectSimples("filtro-correicao", "correicaoId", "Correição", opcoes.correicoes, filtros.correicaoId)}
        </div>
        <div class="acervo-filter-period">
          <div class="field">
            <label for="filtro-data-inicio-de">Início da correição (a partir de)</label>
            <input id="filtro-data-inicio-de" name="dataInicioDe" type="date" value="${escapeAttr(
              filtros.dataInicioDe || "",
            )}" />
          </div>
          <span class="acervo-filter-period__sep" aria-hidden="true">—</span>
          <div class="field">
            <label for="filtro-data-fim-ate">Fim da correição (até)</label>
            <input id="filtro-data-fim-ate" name="dataFimAte" type="date" value="${escapeAttr(
              filtros.dataFimAte || "",
            )}" />
          </div>
        </div>
      </div>

      <div class="acervo-filter-actions">
        <button class="button button--primary" type="submit">Buscar acervo</button>
        <button class="button button--ghost" type="button" data-action="limpar-filtros">Limpar filtros</button>
        <span class="acervo-filter-actions__hint">A busca opera sobre os dados carregados na sessão atual.</span>
      </div>
    </form>
  `;
};

const buildActiveFiltersChips = (filtros, opcoes) => {
  const chips = [];
  if (filtros.textoBusca) {
    chips.push({
      label: `Busca: "${filtros.textoBusca}"`,
      removeHref: removeFilterFromUrl(filtros, { key: "textoBusca" }),
    });
  }
  (filtros.statusFluxo || []).forEach((s) => {
    chips.push({
      label: Labels.statusFluxo[s] || s,
      removeHref: removeFilterFromUrl(filtros, { key: "statusFluxo", value: s }),
    });
  });
  if (filtros.prioridade) {
    chips.push({
      label: `Prioridade: ${Labels.prioridade[filtros.prioridade]}`,
      removeHref: removeFilterFromUrl(filtros, { key: "prioridade" }),
    });
  }
  if (filtros.tipo) {
    chips.push({
      label: `Tipo: ${filtros.tipo}`,
      removeHref: removeFilterFromUrl(filtros, { key: "tipo" }),
    });
  }
  if (filtros.situacaoApreciacao) {
    const label =
      filtros.situacaoApreciacao === "sem_apreciacao"
        ? "Sem decisão do CN"
        : Labels.situacaoApreciacao[filtros.situacaoApreciacao];
    chips.push({
      label: `Apreciação: ${label}`,
      removeHref: removeFilterFromUrl(filtros, { key: "situacaoApreciacao" }),
    });
  }
  if (filtros.tipoConclusao) {
    chips.push({
      label: `Conclusão: ${Labels.tipoConclusao[filtros.tipoConclusao]}`,
      removeHref: removeFilterFromUrl(filtros, { key: "tipoConclusao" }),
    });
  }
  if (filtros.ramoMP) {
    const ramo = opcoes.ramos.find((r) => r.value === filtros.ramoMP);
    chips.push({
      label: `Ramo: ${ramo ? ramo.label : filtros.ramoMP}`,
      removeHref: removeFilterFromUrl(filtros, { key: "ramoMP" }),
    });
  }
  if (filtros.uf) {
    chips.push({
      label: `UF: ${filtros.uf}`,
      removeHref: removeFilterFromUrl(filtros, { key: "uf" }),
    });
  }
  if (filtros.unidade) {
    chips.push({
      label: `Unidade: ${filtros.unidade}`,
      removeHref: removeFilterFromUrl(filtros, { key: "unidade" }),
    });
  }
  if (filtros.tematica) {
    chips.push({
      label: `Temática: ${filtros.tematica}`,
      removeHref: removeFilterFromUrl(filtros, { key: "tematica" }),
    });
  }
  if (filtros.membro) {
    chips.push({
      label: `Membro: ${filtros.membro}`,
      removeHref: removeFilterFromUrl(filtros, { key: "membro" }),
    });
  }
  if (filtros.tipoDestinatario) {
    chips.push({
      label: `Orientação: ${Labels.tipoDestinatario[filtros.tipoDestinatario] || filtros.tipoDestinatario}`,
      removeHref: removeFilterFromUrl(filtros, { key: "tipoDestinatario" }),
    });
  }
  if (filtros.correicaoId) {
    chips.push({
      label: `Correição: ${filtros.correicaoId}`,
      removeHref: removeFilterFromUrl(filtros, { key: "correicaoId" }),
    });
  }
  if (filtros.dataInicioDe) {
    chips.push({
      label: `Início ≥ ${filtros.dataInicioDe}`,
      removeHref: removeFilterFromUrl(filtros, { key: "dataInicioDe" }),
    });
  }
  if (filtros.dataFimAte) {
    chips.push({
      label: `Fim ≤ ${filtros.dataFimAte}`,
      removeHref: removeFilterFromUrl(filtros, { key: "dataFimAte" }),
    });
  }
  if (filtros.comDiligenciasAbertas) {
    chips.push({
      label: "Com diligências abertas",
      removeHref: removeFilterFromUrl(filtros, { key: "comDiligenciasAbertas" }),
    });
  }
  if (filtros.comPendenciasSecretaria) {
    chips.push({
      label: "Com pendências da Secretaria",
      removeHref: removeFilterFromUrl(filtros, { key: "comPendenciasSecretaria" }),
    });
  }
  if (chips.length === 0) return "";
  return `
    <div class="acervo-active-chips" aria-label="Filtros aplicados">
      <span class="acervo-active-chips__label">Filtros ativos</span>
      ${chips.map(renderActiveFilterChip).join("")}
    </div>
  `;
};

const buildResultsSummary = (lista) => {
  if (!lista.length) return "";
  const buckets = lista.reduce((acc, p) => {
    acc[p.statusFluxo] = (acc[p.statusFluxo] || 0) + 1;
    return acc;
  }, {});
  const partes = Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([status, n]) => `<strong>${n}</strong> ${Labels.statusFluxo[status] || status}`);
  return partes.join(" · ");
};

const renderResultsToolbar = (lista, sort, view) => {
  const subtitle = lista.length
    ? buildResultsSummary(lista)
    : "Nenhum item corresponde aos filtros aplicados.";
  const total = lista.length;

  return `
    <div class="acervo-results-head">
      <div class="acervo-results-head__title-block">
        <p class="acervo-overline">Sumário</p>
        <h2 class="acervo-results-head__title">${total} ${total === 1 ? "proposição encontrada" : "proposições encontradas"}</h2>
        <p class="acervo-results-head__subtitle">${subtitle}</p>
      </div>
      <div class="acervo-results-toolbar" role="group" aria-label="Apresentação dos resultados">
        <div class="acervo-toolbar-group">
          <span class="acervo-toolbar-label">Visão</span>
          <div class="acervo-view-switch" role="tablist">
            <button type="button" role="tab" aria-selected="${view === "tabela"}" class="${view === "tabela" ? "is-active" : ""}" data-view="tabela">Tabela</button>
            <button type="button" role="tab" aria-selected="${view === "cards"}" class="${view === "cards" ? "is-active" : ""}" data-view="cards">Cartões</button>
          </div>
        </div>
        <div class="acervo-toolbar-group">
          <label class="acervo-toolbar-label" for="acervo-sort">Ordenar por</label>
          <select id="acervo-sort" class="acervo-sort-select" data-action="ordenar">
            ${SORT_OPTIONS.map((o) =>
              option(o.value, o.label, sort),
            ).join("")}
          </select>
        </div>
      </div>
    </div>
  `;
};

const renderEmptyState = (filtros) => {
  const sugestao = (() => {
    if (filtros.textoBusca) {
      const next = removeFilterFromUrl(filtros, { key: "textoBusca" });
      return `<a class="acervo-empty__suggestion" href="${next}">Remover busca textual "${filtros.textoBusca}"</a>`;
    }
    if ((filtros.statusFluxo || []).length > 1) {
      const lastStatus = filtros.statusFluxo[filtros.statusFluxo.length - 1];
      const next = removeFilterFromUrl(filtros, { key: "statusFluxo", value: lastStatus });
      return `<a class="acervo-empty__suggestion" href="${next}">Remover status "${Labels.statusFluxo[lastStatus]}"</a>`;
    }
    if (filtros.prioridade) {
      const next = removeFilterFromUrl(filtros, { key: "prioridade" });
      return `<a class="acervo-empty__suggestion" href="${next}">Remover filtro de prioridade</a>`;
    }
    return `<a class="acervo-empty__suggestion" href="?${BUSCA_FLAG}=1">Buscar sem nenhum filtro</a>`;
  })();

  return `
    <div class="acervo-empty">
      <div class="acervo-empty__mark" aria-hidden="true">∅</div>
      <h3 class="acervo-empty__title">Nenhum item corresponde aos filtros atuais</h3>
      <p class="acervo-empty__body">
        Os critérios aplicados não retornaram proposições. Ajuste ou remova um filtro
        para ampliar o resultado.
      </p>
      ${sugestao}
    </div>
  `;
};

const renderResults = (lista, sort, view, filtros) => {
  const ordenada = aplicarOrdenacao(lista, sort);
  const toolbar = renderResultsToolbar(lista, sort, view);
  const stChips = state();
  const activeChips = buildActiveFiltersChips(
    filtros,
    extrairOpcoes(listProposicoes(stChips).map((p) => hydrateProposicao(stChips, p))),
  );
  if (!ordenada.length) {
    return `
      <section class="stack" aria-label="Resultados da consulta">
        ${toolbar}
        ${activeChips}
        ${renderEmptyState(filtros)}
      </section>
    `;
  }
  const aviso =
    ordenada.length > LIMITE_AVISO
      ? `<div style="padding:0 var(--space-5) var(--space-4); background: var(--surface); border-left:1px solid var(--line); border-right:1px solid var(--line);">
          ${renderAlert(`Exibindo ${ordenada.length} resultados. Refine os filtros para uma consulta mais específica.`, "warning")}
        </div>`
      : "";
  const corpo =
    view === "cards"
      ? renderProposicaoCardGrid(ordenada)
      : renderProposicaoTableEditorial(ordenada);
  return `
    <section class="stack" aria-label="Resultados da consulta">
      ${toolbar}
      ${activeChips}
      ${aviso}
      ${corpo}
    </section>
  `;
};

const renderEstadoInicial = (todas) => {
  const ativas = todas.filter(isProposicaoAtiva).length;
  const aguardando = contarPorStatus(todas, StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR);
  const comPend = contarComPendencias(todas);
  return `
    <section class="stack" aria-labelledby="acervo-overview-title">
      <h2 class="acervo-overline" id="acervo-overview-title">Acervo em números</h2>
      <div class="acervo-overview">
        <div class="acervo-overview__card">
          <span class="acervo-overview__value">${todas.length}</span>
          <span class="acervo-overview__label">Total de proposições</span>
        </div>
        <div class="acervo-overview__card">
          <span class="acervo-overview__value">${ativas}</span>
          <span class="acervo-overview__label">Em fluxo ativo</span>
        </div>
        <div class="acervo-overview__card">
          <span class="acervo-overview__value">${aguardando}</span>
          <span class="acervo-overview__label">Aguardando decisão</span>
        </div>
        <div class="acervo-overview__card">
          <span class="acervo-overview__value">${comPend}</span>
          <span class="acervo-overview__label">Com pendências</span>
        </div>
      </div>
      <p class="muted" style="margin:0;text-align:center;font-size:0.9rem;">
        Selecione um atalho acima ou refine os critérios abaixo e clique em <strong>Buscar acervo</strong> para listar resultados.
      </p>
    </section>
  `;
};

const render = () => {
  const filtros = getFiltrosFromUrl();
  const currentState = state();
  const todas = listProposicoes(currentState).map((p) => hydrateProposicao(currentState, p));
  const opcoes = extrairOpcoes(todas);
  const view = getView();
  const sort = getSort();

  const temFiltroAplicavel =
    Boolean(filtros.textoBusca) ||
    (filtros.statusFluxo && filtros.statusFluxo.length > 0) ||
    FILTRO_KEYS.some((k) => filtros[k]) ||
    BOOL_KEYS.some((k) => filtros[k]);

  const buscaAtiva = Boolean(filtros.__buscaAtiva);

  let resultadoHtml;
  if (!buscaAtiva) {
    resultadoHtml = renderEstadoInicial(todas);
  } else if (!temFiltroAplicavel) {
    resultadoHtml = renderResults(todas, sort, view, filtros);
  } else {
    const lista = filtrarProposicoes(todas, filtros);
    resultadoHtml = renderResults(lista, sort, view, filtros);
  }

  const createButton = hasPermission("criar_proposicao")
    ? `<a href="/pages/proposicoes-criar.html" class="button button--primary">+ Criar Proposição</a>`
    : "";

  mountPage({
    activePage: "proposicoes-lista",
    title: "Consulta de proposições",
    subtitle:
      "Sumário do acervo de proposições oriundas das correições conduzidas pela Corregedoria Nacional. Use os atalhos para filas comuns ou refine a busca pelos critérios completos.",
    actions: createButton,
    content: `
      <section class="stack" style="gap: var(--space-6);">
        ${buildHero(todas)}
        ${buildPresets(todas)}
        ${buildFiltersPanel(opcoes, filtros, todas)}
        ${resultadoHtml}
      </section>
    `,
  });

  bindHandlers();
};

const coletarFiltrosDoForm = (form) => {
  const data = new FormData(form);

  const statusHidden = (data.get("statusFluxoHidden") || "")
    .toString()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const novosFiltros = {
    textoBusca: (data.get("textoBusca") || "").toString().trim(),
    statusFluxo: statusHidden,
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

  document.querySelectorAll("[data-toggle-status]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const hidden = document.querySelector("#statusFluxoHidden");
      if (!hidden) return;
      const status = chip.getAttribute("data-toggle-status");
      const lista = (hidden.value || "").split(",").map((s) => s.trim()).filter(Boolean);
      const idx = lista.indexOf(status);
      if (idx >= 0) {
        lista.splice(idx, 1);
        chip.classList.remove("is-active");
        chip.setAttribute("aria-pressed", "false");
      } else {
        lista.push(status);
        chip.classList.add("is-active");
        chip.setAttribute("aria-pressed", "true");
      }
      hidden.value = lista.join(",");
    });
  });

  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-view");
      if (!view) return;
      setView(view);
      render();
    });
  });

  document.querySelector("[data-action='ordenar']")?.addEventListener("change", (event) => {
    setSort(event.currentTarget.value);
    render();
  });

  const situacao = document.querySelector("#filtro-situacao");
  const conclusao = document.querySelector("#filtro-conclusao");
  if (situacao && conclusao) {
    situacao.addEventListener("change", () => {
      const habilitar = situacao.value === SituacaoApreciacao.CONCLUIDA || situacao.value === "";
      conclusao.disabled = !habilitar;
      if (!habilitar) conclusao.value = "";
    });
  }
};

window.addEventListener("popstate", render);

render();
