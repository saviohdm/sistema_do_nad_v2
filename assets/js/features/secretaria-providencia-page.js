import { requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { formatDate, formatDateTime } from "../app/utils.js";
import { Labels, TipoProvidencia } from "../domain/enums.js";
import { listFilaPendenciasProvidencia } from "../domain/secretaria-filas.js";
import { registrarCumprimentoPendencia } from "../domain/pendencias-secretaria.js";
import { renderBadge } from "../ui/components.js";

requireAuth();

const LIMITE_ATRASADAS = 10;

const TIPOS_PROVIDENCIA_ORDEM = [
  TipoProvidencia.CORREGEDORIA_LOCAL,
  TipoProvidencia.COCI,
  TipoProvidencia.OUTRA,
];

const escapeAttr = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const diasDesde = (iso, hoje = new Date()) => {
  if (!iso) return null;
  const inicio = new Date(iso);
  if (Number.isNaN(inicio.getTime())) return null;
  return Math.max(0, Math.floor((hoje - inicio) / 86400000));
};

const isAtrasada = (pendencia, hoje) =>
  pendencia.status === "pendente" &&
  (diasDesde(pendencia.dataCriacao, hoje) ?? 0) > LIMITE_ATRASADAS;

const getFiltrosFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    atrasadas: params.get("atrasadas") === "1",
    tipos: params.getAll("tipo"),
    correicaoId: params.get("correicao") || "",
    busca: params.get("q") || "",
  };
};

const setFiltrosInUrl = (filtros) => {
  const params = new URLSearchParams();
  if (filtros.atrasadas) params.set("atrasadas", "1");
  filtros.tipos.forEach((tipo) => params.append("tipo", tipo));
  if (filtros.correicaoId) params.set("correicao", filtros.correicaoId);
  if (filtros.busca) params.set("q", filtros.busca);
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.pushState({}, "", newUrl);
};

const aplicarFiltros = (novos) => {
  setFiltrosInUrl(novos);
  render();
};

// Achata uma proposição em N entradas (uma por pendência pendente),
// com referência cruzada à proposição-mãe para enriquecimento de contexto.
const flattenPendencias = (proposicoes) => {
  const itens = [];
  proposicoes.forEach((proposicao) => {
    (proposicao.pendenciasSecretaria || [])
      .filter((p) => p.status === "pendente")
      .forEach((pendencia) => {
        itens.push({ proposicao, pendencia });
      });
  });
  return itens;
};

const aplicarFiltrosNasPendencias = (itens, filtros, hoje) => {
  const tiposAtivos = new Set(filtros.tipos);
  const buscaNorm = normalize(filtros.busca);

  return itens.filter(({ proposicao, pendencia }) => {
    if (filtros.atrasadas && !isAtrasada(pendencia, hoje)) return false;
    if (tiposAtivos.size > 0 && !tiposAtivos.has(pendencia.tipoProvidencia))
      return false;
    if (filtros.correicaoId && proposicao.correicaoId !== filtros.correicaoId)
      return false;
    if (buscaNorm) {
      const haystack = `${proposicao.numero || ""} ${pendencia.descricao || ""}`;
      if (!normalize(haystack).includes(buscaNorm)) return false;
    }
    return true;
  });
};

// Reagrupa itens por proposição preservando ordem global (mais antigo primeiro).
const agruparPorProposicao = (itens, hoje) => {
  const grupos = new Map();
  itens.forEach(({ proposicao, pendencia }) => {
    const entry = grupos.get(proposicao.id) || {
      proposicao,
      pendencias: [],
      maiorDias: -1,
    };
    entry.pendencias.push(pendencia);
    const dias = diasDesde(pendencia.dataCriacao, hoje) ?? 0;
    if (dias > entry.maiorDias) entry.maiorDias = dias;
    grupos.set(proposicao.id, entry);
  });

  return Array.from(grupos.values())
    .map((grupo) => ({
      ...grupo,
      pendencias: grupo.pendencias
        .slice()
        .sort(
          (a, b) =>
            (diasDesde(b.dataCriacao, hoje) ?? 0) -
            (diasDesde(a.dataCriacao, hoje) ?? 0),
        ),
    }))
    .sort((a, b) => b.maiorDias - a.maiorDias);
};

const contarPorTipo = (itens) => {
  const counts = { [TipoProvidencia.CORREGEDORIA_LOCAL]: 0, [TipoProvidencia.COCI]: 0, [TipoProvidencia.OUTRA]: 0 };
  itens.forEach(({ pendencia }) => {
    if (counts[pendencia.tipoProvidencia] !== undefined) {
      counts[pendencia.tipoProvidencia] += 1;
    }
  });
  return counts;
};

const correicoesDistintas = (todas) => {
  const set = new Set();
  todas.forEach((proposicao) => {
    if (proposicao.correicaoId) set.add(proposicao.correicaoId);
  });
  return Array.from(set).sort();
};

const renderPrioridadeBadge = (prioridade) => {
  if (!prioridade) return "";
  if (prioridade === "alta") return renderBadge("Prioridade alta", "danger");
  return renderBadge(`Prioridade ${prioridade}`, "neutral");
};

const renderConclusaoBadge = (juizo) => {
  if (!juizo || !juizo.tipoConclusao) return "";
  const label = Labels.tipoConclusao[juizo.tipoConclusao] || juizo.tipoConclusao;
  const tone = juizo.tipoConclusao === "nao_cumprida" ? "danger" : "warning";
  return renderBadge(`Conclusão: ${label}`, tone);
};

const renderFundamentos = (juizo, pendenciaId) => {
  const texto = juizo?.observacoes;
  if (!texto || !String(texto).trim()) {
    return `<p class="muted">Sem fundamentos registrados na decisão.</p>`;
  }
  const safe = escapeAttr(texto).replace(/\n/g, "<br />");
  return `
    <details class="fundamentos" data-fundamentos="${pendenciaId}">
      <summary>Fundamentos da decisão que originou a providência</summary>
      <p>${safe}</p>
    </details>
  `;
};

const renderHeaderProposicao = (proposicao) => {
  const ufs = Array.isArray(proposicao.uf)
    ? proposicao.uf.filter(Boolean).join(" · ")
    : proposicao.uf || "";

  return `
    <div class="panel__title-row">
      <div>
        <h3 class="panel__title">${proposicao.numero} · ${proposicao.unidade || "—"}</h3>
        <div class="muted">${proposicao.tipo || ""}${
          proposicao.descricao
            ? ` — ${escapeAttr(proposicao.descricao).slice(0, 160)}${proposicao.descricao.length > 160 ? "…" : ""}`
            : ""
        }</div>
      </div>
      <a class="button button--ghost button--small" href="proposicao-detalhe.html?id=${escapeAttr(proposicao.id)}">Abrir proposição</a>
    </div>
    <div class="pill-list" style="margin-top: var(--space-2);">
      ${proposicao.correicaoId ? renderBadge(`Correição ${proposicao.correicaoId}`, "primary") : ""}
      ${proposicao.ramoMP ? renderBadge(proposicao.ramoMP, "neutral") : ""}
      ${proposicao.tematica ? renderBadge(proposicao.tematica, "neutral") : ""}
      ${ufs ? renderBadge(ufs, "neutral") : ""}
      ${renderPrioridadeBadge(proposicao.prioridade)}
      ${proposicao.membro ? renderBadge(`Membro: ${proposicao.membro}`, "neutral") : ""}
      ${renderConclusaoBadge(proposicao.juizoAtual)}
    </div>
  `;
};

const renderCardPendencia = (proposicao, pendencia, hoje) => {
  const dias = diasDesde(pendencia.dataCriacao, hoje);
  const atrasada = isAtrasada(pendencia, hoje);
  const labelTipo = Labels.tipoProvidencia[pendencia.tipoProvidencia] || pendencia.tipoProvidencia;

  return `
    <article class="status-card">
      <div class="pill-list">
        ${renderBadge("Pendente", "warning")}
        ${renderBadge(labelTipo, "neutral")}
        ${
          atrasada
            ? renderBadge(`Há ${dias} dias em aberto`, "danger")
            : dias !== null
              ? renderBadge(`Há ${dias} dias em aberto`, "neutral")
              : ""
        }
      </div>
      <p><strong>${escapeAttr(pendencia.descricao)}</strong></p>
      <p class="muted">Criada em ${formatDateTime(pendencia.dataCriacao)}</p>
      ${renderFundamentos(proposicao.juizoAtual, pendencia.id)}
      <form class="stack" data-pendencia-form="${escapeAttr(proposicao.id)}:${escapeAttr(pendencia.id)}">
        <div class="field">
          <label>Data de cumprimento</label>
          <input type="date" name="dataCumprimento" required />
        </div>
        <div class="field">
          <label>Observações</label>
          <textarea name="observacoes" placeholder="Resumo do despacho externo (ofício, número, destinatário, data efetiva)."></textarea>
        </div>
        <button class="button" type="submit">Registrar cumprimento</button>
      </form>
    </article>
  `;
};

const renderFila = (grupos, hoje, totalCarregadoSemFiltro) => {
  if (!grupos.length) {
    const msg = totalCarregadoSemFiltro
      ? "Nenhuma providência atende aos filtros selecionados."
      : "Nenhuma providência pendente no momento.";
    return `<div class="empty-state">${msg}</div>`;
  }

  return `
    <div class="stack">
      ${grupos
        .map(
          (grupo) => `
            <section class="panel">
              ${renderHeaderProposicao(grupo.proposicao)}
              <div class="cards-grid" style="margin-top: var(--space-3);">
                ${grupo.pendencias
                  .map((pendencia) => renderCardPendencia(grupo.proposicao, pendencia, hoje))
                  .join("")}
              </div>
            </section>
          `,
        )
        .join("")}
    </div>
  `;
};

const renderTotalizadores = (counts) => {
  const labels = {
    [TipoProvidencia.CORREGEDORIA_LOCAL]: "Corregedoria Local",
    [TipoProvidencia.COCI]: "COCI",
    [TipoProvidencia.OUTRA]: "Outra",
  };
  return TIPOS_PROVIDENCIA_ORDEM
    .map((tipo) => `<span class="muted"><strong>${counts[tipo]}</strong> ${labels[tipo]}</span>`)
    .join(" · ");
};

const renderToolbar = (filtros, counts, totalItens, correicoes) => {
  const tiposAtivos = new Set(filtros.tipos);
  const tipoCheckboxes = TIPOS_PROVIDENCIA_ORDEM
    .map(
      (tipo) => `
        <label class="field field--checkbox" style="margin: 0;">
          <input type="checkbox" data-filtro-tipo value="${escapeAttr(tipo)}" ${tiposAtivos.has(tipo) ? "checked" : ""} />
          <span>${Labels.tipoProvidencia[tipo]}</span>
        </label>
      `,
    )
    .join("");

  const correicaoOptions = [`<option value="">Todas as correições</option>`]
    .concat(
      correicoes.map(
        (id) =>
          `<option value="${escapeAttr(id)}" ${filtros.correicaoId === id ? "selected" : ""}>${escapeAttr(id)}</option>`,
      ),
    )
    .join("");

  return `
    <form class="toolbar stack" data-toolbar style="gap: var(--space-3);">
      <div class="form-grid form-grid--two">
        <div class="field">
          <label for="filtro-correicao">Correição-mãe</label>
          <select id="filtro-correicao" name="correicao">
            ${correicaoOptions}
          </select>
        </div>
        <div class="field">
          <label for="filtro-busca">Busca textual</label>
          <input id="filtro-busca" name="busca" type="search"
            placeholder="Número da proposição ou descrição"
            value="${escapeAttr(filtros.busca)}" />
        </div>
      </div>
      <div class="pill-list" style="gap: var(--space-3); flex-wrap: wrap;">
        ${tipoCheckboxes}
        <label class="field field--checkbox" style="margin: 0;">
          <input type="checkbox" data-filtro-atrasadas ${filtros.atrasadas ? "checked" : ""} />
          <span>Somente atrasadas (mais de ${LIMITE_ATRASADAS} dias em aberto)</span>
        </label>
      </div>
      <div class="button-row" style="align-items: center; gap: var(--space-3); flex-wrap: wrap;">
        <button class="button button--small" type="submit">Aplicar filtros</button>
        <button class="button button--ghost button--small" type="button" data-action="limpar">Limpar filtros</button>
        <span class="muted" style="margin-left: auto;">
          <strong>${totalItens}</strong> providência(s) ${filtros.atrasadas ? "atrasada(s)" : "pendente(s)"} · ${renderTotalizadores(counts)}
        </span>
      </div>
    </form>
  `;
};

const render = () => {
  const filtros = getFiltrosFromUrl();
  const currentState = state();
  const hoje = new Date();
  const proposicoesComPendencias = listFilaPendenciasProvidencia(currentState);
  const correicoes = correicoesDistintas(proposicoesComPendencias);

  const todosItens = flattenPendencias(proposicoesComPendencias);
  const itensFiltrados = aplicarFiltrosNasPendencias(todosItens, filtros, hoje);
  const grupos = agruparPorProposicao(itensFiltrados, hoje);
  const counts = contarPorTipo(itensFiltrados);

  const titulo = filtros.atrasadas ? "Providências pendentes atrasadas" : "Providências pendentes";
  const subtitulo = filtros.atrasadas
    ? `Apenas providências em aberto há mais de ${LIMITE_ATRASADAS} dias. Cumprimento ocorre fora do sistema; aqui apenas se registra data e observações.`
    : "Providências derivadas de decisões parcialmente/não cumpridas. Cumprimento ocorre fora do sistema; aqui apenas se registra data e observações.";

  mountPage({
    activePage: "secretaria-providencia",
    title: titulo,
    subtitle: subtitulo,
    actions: baseActions,
    content: `
      <section class="panel">
        <h2 class="panel__title">${titulo} ${renderBadge(`${itensFiltrados.length}`, itensFiltrados.length ? "warning" : "neutral")}</h2>
        ${renderToolbar(filtros, counts, itensFiltrados.length, correicoes)}
        ${renderFila(grupos, hoje, todosItens.length)}
      </section>
    `,
  });

  const toolbar = document.querySelector("[data-toolbar]");
  if (toolbar) {
    toolbar.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(toolbar);
      const tipos = Array.from(toolbar.querySelectorAll("[data-filtro-tipo]:checked")).map(
        (el) => el.value,
      );
      aplicarFiltros({
        atrasadas: !!toolbar.querySelector("[data-filtro-atrasadas]")?.checked,
        tipos,
        correicaoId: formData.get("correicao") || "",
        busca: formData.get("busca") || "",
      });
    });

    toolbar.querySelector("[data-action='limpar']")?.addEventListener("click", () => {
      aplicarFiltros({ atrasadas: false, tipos: [], correicaoId: "", busca: "" });
    });
  }

  document.querySelectorAll("[data-pendencia-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const [proposicaoId, pendenciaId] = event.currentTarget.dataset.pendenciaForm.split(":");
      const data = new FormData(event.currentTarget);

      mutateState((draft) => {
        const proposicao = draft.proposicoes.find((item) => item.id === proposicaoId);
        if (!proposicao) return draft;

        registrarCumprimentoPendencia(proposicao, pendenciaId, {
          dataCumprimento: data.get("dataCumprimento"),
          observacoes: data.get("observacoes"),
        });

        return draft;
      });

      render();
    });
  });
};

window.addEventListener("popstate", render);

render();
