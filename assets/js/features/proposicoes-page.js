import {
  PERSONAS,
  getCurrentPersona,
  getCurrentUser,
  hasPermission,
  requireAuth,
} from "../app/auth.js";
import { mountPage, state } from "../app/bootstrap.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import {
  Labels,
  Prioridade,
  StatusFluxo,
  SituacaoApreciacao,
  TipoConclusao,
  TipoDestinatario,
  TipoHistorico,
} from "../domain/enums.js";
import {
  filtrarProposicoes,
  listProposicoes,
} from "../domain/proposicoes.js";
import { listProposicoesCorreicionado } from "../domain/correicionados.js";
import {
  getDestinatarioDisplay,
  isFluxoPrincipalAberto,
} from "../domain/filas-operacionais.js";
import { formatDatelineEditorial } from "../app/utils.js";
import {
  renderActiveFilterChip,
  renderAlert,
  renderFilterToggleChip,
  renderProposicaoCardGrid,
  renderProposicaoTableEditorial,
} from "../ui/components.js";

requireAuth();

const LIMITE_AVISO = 200;
const BUSCA_FLAG = "buscar";
const VIEW_KEY = "nad.acervo.view";
const SORT_KEY_INSTITUCIONAL = "nad.consulta.sort.institucional";
const SORT_KEY_CORREICIONADO = "nad.consulta.sort.correicionado";

const TEXTO_KEY = "q";
const STATUS_KEY = "status";
const FILTRO_KEYS = [
  "tipo",
  "prioridade",
  "sensivel",
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

const SORT_OPTIONS_INSTITUCIONAL = [
  { value: "relevancia", label: "Sensibilidade, prioridade e movimentação" },
  { value: "numero-asc", label: "Número (crescente)" },
  { value: "numero-desc", label: "Número (decrescente)" },
  { value: "idade-desc", label: "Movimentação mais recente" },
  { value: "idade-asc", label: "Movimentação mais antiga" },
  { value: "pendencias-desc", label: "Mais providências pendentes" },
  { value: "destinatario-asc", label: "Destinatário (A–Z)" },
];

const SORT_OPTIONS_CORREICIONADO = [
  { value: "idade-desc", label: "Movimentação mais recente" },
  { value: "idade-asc", label: "Movimentação mais antiga" },
  { value: "numero-asc", label: "Número (crescente)" },
  { value: "numero-desc", label: "Número (decrescente)" },
  { value: "destinatario-asc", label: "Destinatário (A–Z)" },
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

const getSortOptions = (isCorreicionado) =>
  isCorreicionado ? SORT_OPTIONS_CORREICIONADO : SORT_OPTIONS_INSTITUCIONAL;

const getSortKey = (isCorreicionado) =>
  isCorreicionado ? SORT_KEY_CORREICIONADO : SORT_KEY_INSTITUCIONAL;

const getDefaultSort = (isCorreicionado) =>
  isCorreicionado ? "idade-desc" : "relevancia";

const getSort = (isCorreicionado) => {
  try {
    const v = localStorage.getItem(getSortKey(isCorreicionado));
    return getSortOptions(isCorreicionado).some((o) => o.value === v)
      ? v
      : getDefaultSort(isCorreicionado);
  } catch {
    return getDefaultSort(isCorreicionado);
  }
};

const setSort = (sort, isCorreicionado) => {
  try {
    localStorage.setItem(getSortKey(isCorreicionado), sort);
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

const normalizarFiltros = (filtros, isCorreicionado) => {
  const normalizados = cloneFiltros(filtros);

  if (isCorreicionado) {
    delete normalizados.prioridade;
    delete normalizados.sensivel;
  }

  if (normalizados.membro) {
    normalizados.tipoDestinatario = TipoDestinatario.MEMBRO;
  }

  if (normalizados.tipoConclusao) {
    normalizados.situacaoApreciacao = SituacaoApreciacao.CONCLUIDA;
  } else if (
    normalizados.situacaoApreciacao &&
    normalizados.situacaoApreciacao !== SituacaoApreciacao.CONCLUIDA
  ) {
    delete normalizados.tipoConclusao;
  }

  return normalizados;
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
  correicoes: uniq(proposicoes.map((p) => p.correicaoId)).map((id) => {
    const item = proposicoes.find((p) => p.correicaoId === id);
    const numero = item?.correicao?.numero || id;
    const elo = item?.numeroElo ? ` — ELO ${item.numeroElo}` : "";
    return { value: id, label: `${numero}${elo}` };
  }),
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
    case "destinatario-asc":
      return arr.sort((a, b) =>
        (getDestinatarioDisplay(a).rotulo || "").localeCompare(
          getDestinatarioDisplay(b).rotulo || "",
        ),
      );
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

const contarCienciasDisponiveis = (proposicoes) =>
  proposicoes.filter(
    (p) =>
      p.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA &&
      (p.historico || []).some((ev) => ev.tipo === TipoHistorico.EMAIL_CIENCIA_ENVIADO),
  ).length;

const buildHero = (todas, isCorreicionado) => {
  const fluxoAberto = todas.filter(isFluxoPrincipalAberto).length;
  const kpis = isCorreicionado
    ? [
        { valor: todas.length, label: "Total vinculadas" },
        { valor: fluxoAberto, label: "Em andamento" },
        {
          valor: contarPorStatus(todas, StatusFluxo.AGUARDANDO_COMPROVACAO),
          label: "Aguardando sua comprovação",
        },
        { valor: contarCienciasDisponiveis(todas), label: "Ciências disponíveis" },
      ]
    : [
        { valor: todas.length, label: "No acervo institucional" },
        { valor: fluxoAberto, label: "Fluxo principal aberto" },
        {
          valor: contarPorStatus(todas, StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR),
          label: "Aguardando decisão",
        },
        {
          valor: contarComPendencias(todas),
          label: "Com providência pendente",
        },
      ];

  return `
    <section class="acervo-hero">
      <div>
        <div class="acervo-hero__top">
          <p class="acervo-overline acervo-overline--accent">${
            isCorreicionado ? "Proposições vinculadas a você" : "Acervo institucional do NAD"
          } · ${formatDatelineEditorial()}</p>
          <span class="acervo-hero__mark">${isCorreicionado ? "NAD · Você" : "NAD"}</span>
        </div>
      </div>
      <div class="acervo-hero__kpis" aria-label="Indicadores das proposições disponíveis">
        ${kpis
          .map(
            (kpi) => `
              <div class="acervo-hero__kpi">
                <span class="acervo-hero__kpi-value">${kpi.valor}</span>
                <span class="acervo-hero__kpi-label">${kpi.label}</span>
              </div>`,
          )
          .join("")}
      </div>
    </section>
  `;
};

const renderStatusChips = (todas, statusAtivos, isCorreicionado) => {
  const ordem = [
    StatusFluxo.RASCUNHO_CN,
    StatusFluxo.AGUARDANDO_REFERENDO_CNMP,
    StatusFluxo.AGUARDANDO_SECRETARIA,
    StatusFluxo.AGUARDANDO_COMPROVACAO,
    StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO,
    StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR,
    StatusFluxo.AGUARDANDO_CIENCIA,
    StatusFluxo.BAIXA_DEFINITIVA,
  ];
  return ordem
    .filter((status) => !isCorreicionado || contarPorStatus(todas, status) > 0)
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

const buildFiltersPanel = (opcoes, filtros, todas, isCorreicionado) => {
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

  const prioridadeESensibilidade = isCorreicionado
    ? ""
    : `
      <div class="field">
        <label for="filtro-prioridade">Prioridade</label>
        <select id="filtro-prioridade" name="prioridade">
          ${prioridadeOptions}
        </select>
      </div>
      <div class="field">
        <label for="filtro-sensivel">Sensível</label>
        <select id="filtro-sensivel" name="sensivel">
          ${option("", "Todas", filtros.sensivel || "")}
          ${option("sim", "Sim", filtros.sensivel || "")}
          ${option("nao", "Não", filtros.sensivel || "")}
        </select>
      </div>`;

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
          placeholder="${
            isCorreicionado
              ? "Buscar por número, ELO ou descrição…"
              : "Buscar por número, ELO, descrição ou observações…"
          }"
          value="${escapeAttr(filtros.textoBusca || "")}"
          autocomplete="off"
        />
      </div>

      <div class="acervo-filter-section">
        <p class="acervo-filter-section__title">Status do fluxo</p>
        <div class="acervo-filter-chips" role="group" aria-label="Filtrar por status">
          ${renderStatusChips(todas, statusAtivos, isCorreicionado)}
        </div>
        <input type="hidden" name="statusFluxoHidden" id="statusFluxoHidden" value="${statusAtivos.join(",")}" />
      </div>

      <div class="acervo-filter-section">
        <p class="acervo-filter-section__title">Classificação e apreciação</p>
        <div class="acervo-filter-grid">
          ${selectSimples("filtro-tipo", "tipo", "Tipo", opcoes.tipos, filtros.tipo)}
          <div class="field">
            <label for="filtro-orientacao">Tipo de destinatário</label>
            <select id="filtro-orientacao" name="tipoDestinatario">
              <option value="">Todas</option>
              ${Object.values(TipoDestinatario)
                .map((t) => option(t, Labels.tipoDestinatario[t], filtros.tipoDestinatario || ""))
                .join("")}
            </select>
          </div>
          ${prioridadeESensibilidade}
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
          ${selectSimples("filtro-membro", "membro", "Membro destinatário", opcoes.membros, filtros.membro)}
          <div class="field">
            <label for="filtro-correicao">Correição</label>
            <select id="filtro-correicao" name="correicaoId">
              <option value="">Todas</option>
              ${opcoes.correicoes
                .map((correicao) =>
                  option(correicao.value, correicao.label, filtros.correicaoId || ""),
                )
                .join("")}
            </select>
          </div>
        </div>
        <p class="acervo-filter-section__title acervo-filter-section__title--subtle">Período da correição</p>
        <div class="acervo-filter-period">
          <div class="field">
            <label for="filtro-data-inicio-de">De</label>
            <input id="filtro-data-inicio-de" name="dataInicioDe" type="date" value="${escapeAttr(
              filtros.dataInicioDe || "",
            )}" />
          </div>
          <span class="acervo-filter-period__sep" aria-hidden="true">—</span>
          <div class="field">
            <label for="filtro-data-fim-ate">Até</label>
            <input id="filtro-data-fim-ate" name="dataFimAte" type="date" value="${escapeAttr(
              filtros.dataFimAte || "",
            )}" />
          </div>
        </div>
      </div>

      <div class="acervo-filter-actions">
        <button class="button button--primary" type="submit">Buscar proposições</button>
        <button class="button button--ghost" type="button" data-action="limpar-filtros">Limpar filtros</button>
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
  if (filtros.sensivel) {
    chips.push({
      label: `Sensível: ${filtros.sensivel === "sim" ? "Sim" : "Não"}`,
      removeHref: removeFilterFromUrl(filtros, { key: "sensivel" }),
    });
  }
  if (filtros.tipo) {
    chips.push({
      label: `Tipo: ${filtros.tipo}`,
      removeHref: removeFilterFromUrl(filtros, { key: "tipo" }),
    });
  }
  if (filtros.situacaoApreciacao && !filtros.tipoConclusao) {
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
      label: `Membro destinatário: ${filtros.membro}`,
      removeHref: removeFilterFromUrl(filtros, { key: "membro" }),
    });
  }
  if (filtros.tipoDestinatario && !filtros.membro) {
    chips.push({
      label: `Tipo de destinatário: ${Labels.tipoDestinatario[filtros.tipoDestinatario] || filtros.tipoDestinatario}`,
      removeHref: removeFilterFromUrl(filtros, { key: "tipoDestinatario" }),
    });
  }
  if (filtros.correicaoId) {
    const correicao = opcoes.correicoes.find((item) => item.value === filtros.correicaoId);
    chips.push({
      label: `Correição: ${correicao?.label || filtros.correicaoId}`,
      removeHref: removeFilterFromUrl(filtros, { key: "correicaoId" }),
    });
  }
  if (filtros.dataInicioDe) {
    chips.push({
      label: `Período desde ${filtros.dataInicioDe}`,
      removeHref: removeFilterFromUrl(filtros, { key: "dataInicioDe" }),
    });
  }
  if (filtros.dataFimAte) {
    chips.push({
      label: `Período até ${filtros.dataFimAte}`,
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

const renderResultsToolbar = (lista, sort, view, isCorreicionado) => {
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
            ${getSortOptions(isCorreicionado).map((o) =>
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

const renderResults = (lista, sort, view, filtros, todas, isCorreicionado) => {
  const ordenada = aplicarOrdenacao(lista, sort);
  const toolbar = renderResultsToolbar(lista, sort, view, isCorreicionado);
  const activeChips = buildActiveFiltersChips(filtros, extrairOpcoes(todas));
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
      ? renderProposicaoCardGrid(ordenada, {
          exibirMetadadosInternos: !isCorreicionado,
        })
      : renderProposicaoTableEditorial(ordenada, {
          exibirMetadadosInternos: !isCorreicionado,
        });
  return `
    <section class="stack" aria-label="Resultados da consulta">
      ${toolbar}
      ${activeChips}
      ${aviso}
      ${corpo}
    </section>
  `;
};

const renderEstadoInicial = () => {
  return `
    <section class="acervo-initial" aria-label="Orientação para iniciar a consulta">
      <span class="acervo-initial__mark" aria-hidden="true">⌕</span>
      <p>Defina os critérios desejados e selecione <strong>Buscar proposições</strong> para exibir os resultados.</p>
    </section>
  `;
};

const renderPeriodoInvalido = () => `
  <section class="stack" aria-label="Período inválido">
    ${renderAlert("A data inicial do período não pode ser posterior à data final.", "error")}
  </section>
`;

const render = () => {
  const currentState = state();
  const persona = getCurrentPersona();
  const isCorreicionado = persona === PERSONAS.CORREICIONADO;
  const user = isCorreicionado ? getCurrentUser() : null;
  const universo = isCorreicionado
    ? listProposicoesCorreicionado(currentState, user)
    : listProposicoes(currentState);
  const todas = universo.map((p) => hydrateProposicao(currentState, p));
  const filtros = normalizarFiltros(getFiltrosFromUrl(), isCorreicionado);
  const opcoes = extrairOpcoes(todas);
  const view = getView();
  const sort = getSort(isCorreicionado);

  const temFiltroAplicavel =
    Boolean(filtros.textoBusca) ||
    (filtros.statusFluxo && filtros.statusFluxo.length > 0) ||
    FILTRO_KEYS.some((k) => filtros[k]) ||
    BOOL_KEYS.some((k) => filtros[k]);

  const buscaAtiva = Boolean(filtros.__buscaAtiva);
  const periodoInvalido = Boolean(
    filtros.dataInicioDe &&
      filtros.dataFimAte &&
      filtros.dataInicioDe > filtros.dataFimAte,
  );

  let resultadoHtml;
  if (!buscaAtiva) {
    resultadoHtml = renderEstadoInicial();
  } else if (periodoInvalido) {
    resultadoHtml = renderPeriodoInvalido();
  } else if (!temFiltroAplicavel) {
    resultadoHtml = renderResults(todas, sort, view, filtros, todas, isCorreicionado);
  } else {
    const lista = filtrarProposicoes(todas, {
      ...filtros,
      incluirObservacoesInternas: !isCorreicionado,
    });
    resultadoHtml = renderResults(
      lista,
      sort,
      view,
      filtros,
      todas,
      isCorreicionado,
    );
  }

  const createButton = hasPermission("criar_proposicao")
    ? `<a href="/pages/proposicoes-criar.html" class="button button--primary">+ Criar Proposição</a>`
    : "";

  const pageTitle = isCorreicionado ? "Minhas proposições" : "Consulta de proposições";
  document.title = `NAD — ${pageTitle}`;

  mountPage({
    activePage: "proposicoes-lista",
    title: pageTitle,
    subtitle: isCorreicionado
      ? "Consulte as proposições vinculadas a você, respeitando seu perfil de acesso no NAD."
      : "Consulte o acervo institucional de proposições oriundas das correições conduzidas pela Corregedoria Nacional.",
    actions: createButton,
    content: `
      <section class="stack" style="gap: var(--space-6);">
        ${buildHero(todas, isCorreicionado)}
        ${buildFiltersPanel(opcoes, filtros, todas, isCorreicionado)}
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
  const isCorreicionado = getCurrentPersona() === PERSONAS.CORREICIONADO;
  const form = document.querySelector("#filtros-consulta");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const inicio = event.currentTarget.querySelector("#filtro-data-inicio-de");
      const fim = event.currentTarget.querySelector("#filtro-data-fim-ate");
      if (inicio?.value && fim?.value && inicio.value > fim.value) {
        fim.setCustomValidity("A data final deve ser igual ou posterior à data inicial.");
        fim.reportValidity();
        return;
      }
      fim?.setCustomValidity("");
      const filtros = normalizarFiltros(
        coletarFiltrosDoForm(event.currentTarget),
        isCorreicionado,
      );
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
    setSort(event.currentTarget.value, isCorreicionado);
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
    conclusao.addEventListener("change", () => {
      if (conclusao.value) {
        situacao.value = SituacaoApreciacao.CONCLUIDA;
        conclusao.disabled = false;
      }
    });
  }

  const tipoDestinatario = document.querySelector("#filtro-orientacao");
  const membro = document.querySelector("#filtro-membro");
  if (tipoDestinatario && membro) {
    membro.addEventListener("change", () => {
      if (membro.value) tipoDestinatario.value = TipoDestinatario.MEMBRO;
    });
    tipoDestinatario.addEventListener("change", () => {
      if (
        tipoDestinatario.value &&
        tipoDestinatario.value !== TipoDestinatario.MEMBRO
      ) {
        membro.value = "";
      }
    });
  }

  const inicio = document.querySelector("#filtro-data-inicio-de");
  const fim = document.querySelector("#filtro-data-fim-ate");
  [inicio, fim].filter(Boolean).forEach((campo) => {
    campo.addEventListener("change", () => fim?.setCustomValidity(""));
  });
};

window.addEventListener("popstate", render);

render();
