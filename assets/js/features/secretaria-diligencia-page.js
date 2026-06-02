import { PERSONAS } from "../app/auth.js";
import { mutateState } from "../app/store.js";
import { state } from "../app/bootstrap.js";
import { montarFilaNavegavel } from "../ui/fila-navegavel.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { Labels, SituacaoApreciacao } from "../domain/enums.js";
import { filtrarProposicoes } from "../domain/proposicoes.js";
import { StatusFilaOperacional } from "../domain/filas-operacionais.js";
import {
  listFilaAguardandoDiligencia,
  listGruposAguardandoDiligencia,
} from "../domain/secretaria-filas.js";
import { criarDiligenciaEmLote } from "../domain/diligencias.js";
import { adicionarEmailDiligencia } from "../domain/caixa-de-saida.js";
import { resolveDestinatarioCorreicionado } from "../domain/correicionados.js";
import {
  renderBadge,
  renderPrioridadeBadge,
  renderSensivelBadge,
  renderStatCard,
} from "../ui/components.js";
import { closeModal } from "../ui/modal.js";

const SELECAO_KEY = "nad-secretaria-diligencia-selecao";
const MODAL_ROOT_ID = "nad-modal-root";

const escapeAttr = (value) => String(value ?? "").replace(/"/g, "&quot;");
const uniq = (values) => Array.from(new Set(values.filter(Boolean))).sort();
const optionTag = (value, label, selected) =>
  `<option value="${escapeAttr(value)}"${selected === value ? " selected" : ""}>${label}</option>`;

const isRetornada = (p) =>
  p.apreciacaoDoCN?.situacao === SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES;

// --- Seleção em lote (page-local, GLOBAL, persistida) ---
const selecaoIds = new Set();

const persistirSelecao = () => {
  sessionStorage.setItem(SELECAO_KEY, JSON.stringify(Array.from(selecaoIds)));
};

const hidratarSelecao = () => {
  const raw = sessionStorage.getItem(SELECAO_KEY);
  if (!raw) return;
  try {
    const ids = JSON.parse(raw);
    if (Array.isArray(ids)) ids.forEach((id) => selecaoIds.add(id));
  } catch {
    sessionStorage.removeItem(SELECAO_KEY);
  }
};

hidratarSelecao();

// --- Cards e UI de lote ---
const renderCardSelecionavel = (proposicao) => {
  const selecionado = selecaoIds.has(proposicao.id);
  const subStatusBadge = isRetornada(proposicao)
    ? renderBadge("Retornou · necessita mais informações", "warning")
    : renderBadge("Nova proposição", "primary");
  return `
    <article class="proposicao-card proposicao-card--selecionavel ${selecionado ? "proposicao-card--selected" : ""}">
      <input type="checkbox" data-prop-checkbox="${escapeAttr(proposicao.id)}" ${selecionado ? "checked" : ""} aria-label="Selecionar proposição ${proposicao.numero}" />
      <div>
        <div class="proposicao-card__header">
          <div>
            <div class="proposicao-card__numero">${proposicao.numero}</div>
            <div class="proposicao-card__tipo">${proposicao.tipo} · ${proposicao.ramoMP || "—"}</div>
          </div>
          <div class="pill-list">
            ${renderSensivelBadge(proposicao.sensivel)}
            ${renderPrioridadeBadge(proposicao.prioridade)}
            ${subStatusBadge}
          </div>
        </div>
        <div class="proposicao-card__content">
          <div><strong>Unidade:</strong> ${proposicao.unidade}</div>
          <div><strong>Correição:</strong> ${proposicao.correicaoId || "—"}</div>
          <div><strong>Membro:</strong> ${proposicao.membro || "—"}</div>
          <div class="proposicao-card__descricao">${(proposicao.descricao || "").substring(0, 200)}${(proposicao.descricao || "").length > 200 ? "..." : ""}</div>
        </div>
        <div class="button-row proposicao-card__actions">
          <a class="button button--ghost button--small" href="/pages/proposicao-detalhe.html?id=${proposicao.id}">Abrir detalhe</a>
        </div>
      </div>
    </article>
  `;
};

const renderSelectAllRow = (filtradas) => {
  const total = filtradas.length;
  if (total === 0) return "";
  const selecionadosVisiveis = filtradas.reduce((acc, p) => acc + (selecaoIds.has(p.id) ? 1 : 0), 0);

  let estado;
  let texto;
  if (selecionadosVisiveis === 0) {
    estado = "nenhum";
    texto = `Selecionar todos os ${total} visíveis`;
  } else if (selecionadosVisiveis === total) {
    estado = "todos";
    texto = `Desmarcar todos os ${total} visíveis`;
  } else {
    estado = "parcial";
    texto = `${selecionadosVisiveis} de ${total} visíveis selecionados — marcar restantes`;
  }

  return `
    <label class="select-all-row">
      <input type="checkbox" data-select-all data-select-all-state="${estado}" ${estado === "todos" ? "checked" : ""} />
      <span><strong>${texto}</strong></span>
    </label>
  `;
};

const renderStickyBar = (totalSelecionados, ocultas) => {
  if (totalSelecionados === 0) return "";
  const hoje = new Date().toISOString().slice(0, 10);
  const hint =
    ocultas > 0 ? `<span class="batch-bar__hint">${ocultas} oculta(s) pelo filtro atual</span>` : "";

  return `
    <div class="batch-bar" id="batch-bar">
      <div class="batch-bar__header">
        <span class="batch-bar__counter">${totalSelecionados} proposição(ões) selecionada(s)</span>
        ${hint}
      </div>
      <form class="batch-bar__form" id="batch-form">
        <div class="field">
          <label for="batch-prazo">Prazo da diligência</label>
          <input id="batch-prazo" name="prazo" type="date" min="${hoje}" required />
        </div>
        <div class="field">
          <label for="batch-descricao">Descrição (aplicada a todas)</label>
          <textarea id="batch-descricao" name="descricao" required rows="2"></textarea>
        </div>
        <div class="button-row" style="align-items: stretch;">
          <button class="button button--primary" type="submit">Criar diligências (${totalSelecionados})</button>
          <button class="button button--ghost" type="button" data-action="limpar-selecao">Limpar seleção</button>
        </div>
      </form>
    </div>
  `;
};

const renderGruposCompletoToggle = (countCompletos, ativo) => `
  <div class="grupos-toggle${ativo ? " is-active" : ""}">
    <label class="grupos-toggle__label" for="toggle-grupos-completos">
      <span class="grupos-toggle__info">
        <strong class="grupos-toggle__title">Somente grupos completos</strong>
        <small class="grupos-toggle__sub">todas as prop. da unidade prontas para diligência</small>
      </span>
      <span class="grupos-toggle__badge">${countCompletos}</span>
    </label>
    <div class="grupos-toggle__control">
      <input type="checkbox" id="toggle-grupos-completos" name="gruposCompletos" value="1"
        data-action="toggle-grupos-completos" ${ativo ? "checked" : ""}
        aria-label="Filtrar somente grupos completos" />
      <span class="grupos-toggle__switch" aria-hidden="true"></span>
    </div>
  </div>
`;

// --- Modal de confirmação (lote) ---
const formatBR = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const ensureModalRoot = () => {
  let root = document.getElementById(MODAL_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = MODAL_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
};

const confirmarCriacaoEmLote = (prazo, descricao, render) => {
  const idsParaCriar = Array.from(selecaoIds);
  mutateState((draft) => {
    const proposicoesAlvo = draft.proposicoes.filter((p) => idsParaCriar.includes(p.id));
    if (proposicoesAlvo.length === 0) return draft;
    const { criadas } = criarDiligenciaEmLote(proposicoesAlvo, { prazo, descricao });
    criadas.forEach(({ proposicao, diligencia }) => {
      const destinatario = resolveDestinatarioCorreicionado(draft, proposicao);
      adicionarEmailDiligencia(draft, proposicao, diligencia, destinatario);
    });
    return draft;
  });
  selecaoIds.clear();
  persistirSelecao();
  closeModal();
  render();
};

const abrirModalConfirmacao = (proposicoesSelecionadas, prazo, descricao, render) => {
  const root = ensureModalRoot();
  const currentState = state();
  const itens = proposicoesSelecionadas
    .map((p) => hydrateProposicao(currentState, p))
    .map((p) => {
      const destinatario = resolveDestinatarioCorreicionado(currentState, p);
      const dest = destinatario
        ? `${destinatario.nome} &lt;${destinatario.email}&gt;`
        : `<em>(sem destinatário cadastrado — unidade ${p.unidade})</em>`;
      return `<li><strong>${p.numero}</strong> · ${p.unidade} · ${p.ramoMP || "—"}<br><span class="muted" style="font-size: 0.85rem;">E-mail para: ${dest}</span></li>`;
    })
    .join("");

  const semDestinatario = proposicoesSelecionadas.filter(
    (p) => !resolveDestinatarioCorreicionado(currentState, p),
  );
  const avisoSemDestinatario =
    semDestinatario.length > 0
      ? `<div class="alert alert--warning" role="alert" style="margin-top: var(--space-3);">
          ${semDestinatario.length} proposição(ões) não têm destinatário identificável no diretório CNMP. O e-mail será registrado na caixa de saída como "sem destinatário", e o evento de envio constará no histórico para auditoria.
        </div>`
      : "";

  const body = `
    <p>Você está prestes a criar <strong>${proposicoesSelecionadas.length}</strong> diligência(s) com os seguintes dados:</p>
    <p><strong>Prazo:</strong> ${formatBR(prazo)}</p>
    <p><strong>Descrição:</strong></p>
    <blockquote class="muted" style="border-left: 3px solid var(--line); padding-left: var(--space-3); margin: var(--space-2) 0;">${descricao.replace(/\n/g, "<br>")}</blockquote>
    <p><strong>Cada proposição também disparará um e-mail ao correicionado:</strong></p>
    <div class="lote-resumo-list"><ul>${itens}</ul></div>
    ${avisoSemDestinatario}
    <div class="button-row" style="justify-content: flex-end; margin-top: var(--space-4);">
      <button class="button button--ghost" type="button" data-modal-close>Cancelar</button>
      <button class="button button--primary" type="button" data-action="confirmar-lote">Confirmar criação e envio</button>
    </div>
  `;

  root.innerHTML = `
    <div class="modal-overlay" data-modal-overlay>
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="Confirmar criação em lote">
        <header class="modal-header">
          <h2 class="modal-title">Confirmar criação em lote</h2>
          <button class="modal-close" type="button" data-modal-close aria-label="Fechar">×</button>
        </header>
        <div class="modal-body">${body}</div>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-modal-close]").forEach((btn) => btn.addEventListener("click", closeModal));
  root.querySelector("[data-modal-overlay]")?.addEventListener("click", (event) => {
    if (event.target.matches("[data-modal-overlay]")) closeModal();
  });
  root.querySelector("[data-action='confirmar-lote']")?.addEventListener("click", () => {
    confirmarCriacaoEmLote(prazo, descricao, render);
  });
};

// --- Config do módulo compartilhado ---
montarFilaNavegavel({
  statusFila: StatusFilaOperacional.DILIGENCIA,
  persona: PERSONAS.SECRETARIA,
  activePage: "secretaria-diligencia",
  title: "Aguardando diligência",
  storageKey: "nad-secretaria-diligencia-filtros",
  subtitlePorModo: {
    overview:
      'Proposições recém-referendadas ou que retornaram com apreciação "necessita mais informações".',
    correicao: "Escolha uma unidade dentro da correição para entrar na fila.",
    fila: "Selecione múltiplas proposições e crie diligências em lote com um único prazo e descrição.",
  },
  textos: {
    panoramaTitulo: "Panorama da fila",
    panoramaIntro:
      'Proposições que aguardam criação de diligência pela Secretaria — recém-referendadas (novas) ou que retornaram após decisão "necessita mais informações".',
    contagemLabel: "Aguardando diligência",
    porCorreicaoHint: "Clique em uma correição para ver suas unidades.",
    unidadesHint: "Clique em uma unidade para entrar na fila daquela unidade.",
    filaTitulo: "Fila de diligência",
    filaIntroVazia: "Todas as proposições aguardando diligência.",
    emptyCorreicoes: "Nenhuma correição com proposições aguardando diligência.",
    emptyUnidades: "Nenhuma unidade nesta correição com proposições aguardando diligência.",
    emptyFila: "Nenhuma proposição corresponde aos filtros selecionados.",
    contadorIntro: "Visíveis com os filtros atuais:",
    totalSistemaLabel: "Total aguardando diligência no sistema",
  },
  getProposicoes: (currentState) =>
    listFilaAguardandoDiligencia(currentState).map((p) => hydrateProposicao(currentState, p)),
  prepare: (currentState) => {
    // Poda da seleção: remove ids que saíram do universo "aguardando diligência".
    const validIds = new Set(listFilaAguardandoDiligencia(currentState).map((p) => p.id));
    let podou = false;
    for (const id of Array.from(selecaoIds)) {
      if (!validIds.has(id)) {
        selecaoIds.delete(id);
        podou = true;
      }
    }
    if (podou) persistirSelecao();
    const grupos = listGruposAguardandoDiligencia(currentState);
    const completos = grupos.filter((g) => g.completo);
    return {
      idsGruposCompletos: new Set(completos.flatMap((g) => g.proposicoes.map((p) => p.id))),
      gruposCompletoCount: completos.length,
    };
  },
  filtrosExtras: [
    { key: "subStatus", tipo: "string" },
    { key: "membro", tipo: "string" },
    { key: "textoBusca", tipo: "string" },
    { key: "gruposCompletos", tipo: "bool" },
  ],
  aplicarFiltrosExtras: (lista, filtros, ctx) => {
    let r = filtrarProposicoes(lista, {
      subStatus: filtros.subStatus,
      membro: filtros.membro,
      textoBusca: filtros.textoBusca,
    });
    if (filtros.gruposCompletos) {
      r = r.filter((p) => ctx.extras.idsGruposCompletos.has(p.id));
    }
    return r;
  },
  renderFiltrosExtras: (filtros, ctx) => {
    const membros = uniq(ctx.proposicoes.map((p) => p.membro));
    return `
      <div class="field">
        <label for="filtro-substatus">Sub-status</label>
        <select id="filtro-substatus" name="subStatus">
          <option value="">Todas</option>
          ${optionTag("nova", "Nova", filtros.subStatus || "")}
          ${optionTag("retornada", "Retornada (necessita mais informações)", filtros.subStatus || "")}
        </select>
      </div>
      <div class="field">
        <label for="filtro-membro">Membro responsável</label>
        <select id="filtro-membro" name="membro">
          <option value="">Todos</option>
          ${membros.map((v) => optionTag(v, v, filtros.membro || "")).join("")}
        </select>
      </div>
      <div class="field" style="grid-column: span 2;">
        <label for="filtro-texto">Busca textual</label>
        <input id="filtro-texto" name="textoBusca" type="text"
          placeholder="Número, número ELO, descrição ou observações"
          value="${escapeAttr(filtros.textoBusca || "")}" />
      </div>
      ${renderGruposCompletoToggle(ctx.extras.gruposCompletoCount, !!filtros.gruposCompletos)}
    `;
  },
  renderStats: (proposicoes) => {
    const novas = proposicoes.filter((p) => !p.apreciacaoDoCN).length;
    const retornadas = proposicoes.filter(isRetornada).length;
    return `
      ${renderStatCard("Total aguardando diligência", proposicoes.length)}
      ${renderStatCard("Novas", novas)}
      ${renderStatCard("Retornadas (necessita mais informações)", retornadas)}
    `;
  },
  renderItens: (filtradas) => filtradas.map(renderCardSelecionavel).join(""),
  renderFilaTopo: (ctx) => renderSelectAllRow(ctx.filtradas),
  renderFilaRodape: (ctx) => {
    const idsVisiveis = new Set(ctx.filtradas.map((p) => p.id));
    const ocultas = Array.from(selecaoIds).filter((id) => !idsVisiveis.has(id)).length;
    return renderStickyBar(selecaoIds.size, ocultas);
  },
  bindExtra: (ctx) => {
    // Toggle "somente grupos completos" — aplica imediatamente.
    document
      .querySelector("[data-action='toggle-grupos-completos']")
      ?.addEventListener("change", (event) => {
        const novos = { ...ctx.filtros, gruposCompletos: event.target.checked };
        if (!novos.unidadeRef && !novos.unidade) novos.filaForcada = true;
        ctx.aplicarFiltros(novos);
      });

    // Seleção individual.
    document.querySelectorAll("[data-prop-checkbox]").forEach((cb) => {
      cb.addEventListener("change", (event) => {
        const id = event.currentTarget.dataset.propCheckbox;
        if (event.currentTarget.checked) selecaoIds.add(id);
        else selecaoIds.delete(id);
        persistirSelecao();
        ctx.render();
      });
    });

    // Selecionar/desmarcar todos os visíveis.
    const selectAll = document.querySelector("[data-select-all]");
    if (selectAll) {
      selectAll.indeterminate = selectAll.dataset.selectAllState === "parcial";
      selectAll.addEventListener("change", (event) => {
        if (event.currentTarget.checked) ctx.filtradas.forEach((p) => selecaoIds.add(p.id));
        else ctx.filtradas.forEach((p) => selecaoIds.delete(p.id));
        persistirSelecao();
        ctx.render();
      });
    }

    document.querySelector("[data-action='limpar-selecao']")?.addEventListener("click", () => {
      selecaoIds.clear();
      persistirSelecao();
      ctx.render();
    });

    document.querySelector("#batch-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const prazo = (data.get("prazo") || "").toString();
      const descricao = (data.get("descricao") || "").toString().trim();
      if (!prazo || !descricao) return;
      const hoje = new Date().toISOString().slice(0, 10);
      if (prazo < hoje) return;
      const selecionadas = ctx.proposicoes.filter((p) => selecaoIds.has(p.id));
      if (selecionadas.length === 0) return;
      abrirModalConfirmacao(selecionadas, prazo, descricao, ctx.render);
    });
  },
});
