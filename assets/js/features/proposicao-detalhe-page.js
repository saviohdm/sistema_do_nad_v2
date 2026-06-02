import { PERSONAS, requireAuth, getCurrentPersona, getCurrentUser } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { formatDate, formatDateTime, queryParam } from "../app/utils.js";

requireAuth();
import {
  deferirAvaliacao,
  indeferirAvaliacao,
  registrarAvaliacaoComForcaDeDecisao,
  removerAvaliacao,
  salvarAvaliacaoMembro,
} from "../domain/avaliacoes.js";
import {
  criarDiligencia,
  descartarRascunhoComprovacao,
  registrarComprovacao,
  salvarRascunhoComprovacao,
} from "../domain/diligencias.js";
import {
  filtrarHistoricoParaCorreicionado,
  proposicaoVisivelPara,
  registrarVisualizacaoCiencia,
  cienciaJaVisualizadaPor,
  getDataVisualizacaoCiencia,
} from "../domain/correicionados.js";
import { Labels, StatusFluxo } from "../domain/enums.js";
import {
  confirmarRascunhoCN,
  descartarRascunhoDecisaoCN,
  editarMetadados,
  getAvaliacaoVigente,
  getAvailableActions,
  getAvailableActionsByPersona,
  getProposicaoById,
  markPropositionDeleted,
  salvarRascunhoDecisaoCN,
} from "../domain/proposicoes.js";
import {
  obterRascunhoAvaliacao,
  removerRascunhoAvaliacao,
  salvarRascunhoAvaliacao,
} from "../domain/rascunhos-avaliacao.js";
import {
  renderApreciacaoBadge,
  renderBadge,
  renderDiligenciasCards,
  renderEmptyState,
  renderMetaList,
  renderPendenciasCards,
  renderProposicaoHero,
  renderTimeline,
} from "../ui/components.js";
import {
  aplicarRegrasApreciacaoForm,
  lerApreciacaoParcial,
  readApreciacaoForm,
  renderApreciacaoForm,
} from "../ui/forms.js";
import { openEditarMetadadosModal, openRelatorioFinalModal } from "../ui/modal.js";

const proposicaoId = queryParam("id") || "prop-003";
const veioDaFilaMembro = queryParam("fromMembro") === "1";
const fromCorregedor = queryParam("fromCorregedor");
const veioDaFilaReferendo = fromCorregedor === "referendo";
const veioDaFilaDecisao = fromCorregedor === "decisao";

const voltarParaFilaMembro = () => {
  const filtrosSalvos = sessionStorage.getItem("nad-membro-auxiliar-filtros");
  let query = "";
  if (filtrosSalvos) {
    try {
      const filtros = JSON.parse(filtrosSalvos);
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value === true) params.set(key, "1");
        else if (value) params.set(key, String(value));
      });
      const q = params.toString();
      if (q) query = `?${q}`;
    } catch {
      query = "";
    }
  }
  window.location.href = `/pages/membro-auxiliar.html${query}`;
};

const voltarParaFilaCorregedor = (qual) => {
  const page = qual === "decisao" ? "corregedor-decisao.html" : "corregedor-referendo.html";
  window.location.href = `/pages/${page}`;
};

const botaoVoltar = () => {
  if (veioDaFilaMembro) {
    return `<a class="button button--ghost" href="membro-auxiliar.html">Voltar à fila</a>`;
  }
  if (veioDaFilaReferendo) {
    return `<a class="button button--ghost" href="corregedor-referendo.html">Voltar à fila de referendo</a>`;
  }
  if (veioDaFilaDecisao) {
    return `<a class="button button--ghost" href="corregedor-decisao.html">Voltar à fila de decisão</a>`;
  }
  return `<a class="button button--ghost" href="proposicoes-lista.html">Voltar à lista</a>`;
};

const bindHandlers = (proposicao) => {
  document.querySelector("#form-comprovacao")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      registrarComprovacao(item, {
        descricao: data.get("descricao"),
        observacoes: data.get("observacoes"),
      });
      return draft;
    });
    render();
  });

  document.querySelector("#form-diligencia-local")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      criarDiligencia(item, {
        descricao: data.get("descricao"),
        prazo: data.get("prazo"),
      });
      return draft;
    });
    render();
  });

  document.querySelector("#form-avaliacao-membro")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const juizo = readApreciacaoForm(event.currentTarget);
    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      salvarAvaliacaoMembro(item, juizo);
      return draft;
    });
    removerRascunhoAvaliacao(proposicao.id);
    if (veioDaFilaMembro) {
      voltarParaFilaMembro();
      return;
    }
    render();
  });

  document
    .querySelector("#form-avaliacao-membro [data-action='salvar-rascunho']")
    ?.addEventListener("click", () => {
      const form = document.querySelector("#form-avaliacao-membro");
      const juizoParcial = lerApreciacaoParcial(form);
      const payload = salvarRascunhoAvaliacao(proposicao.id, juizoParcial);
      const feedback = form.querySelector("[data-role='rascunho-feedback']");
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = `Rascunho salvo às ${formatDateTime(payload.savedAt)}.`;
      }
    });

  ["form-decisao-corregedor", "form-avaliacao-direta"].forEach((formId) => {
    document
      .querySelector(`#${formId} [data-action='salvar-rascunho']`)
      ?.addEventListener("click", () => {
        const form = document.querySelector(`#${formId}`);
        const juizoParcial = lerApreciacaoParcial(form);
        mutateState((draft) => {
          const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
          salvarRascunhoDecisaoCN(item, juizoParcial);
          return draft;
        });
        const feedback = form.querySelector("[data-role='rascunho-feedback']");
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent = `Rascunho de decisão salvo às ${formatDateTime(new Date().toISOString())}.`;
        }
      });
  });

  document
    .querySelector("[data-action='descartar-rascunho-decisao']")
    ?.addEventListener("click", () => {
      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
        descartarRascunhoDecisaoCN(item);
        return draft;
      });
      render();
    });

  document.querySelector("[data-action='deferir-avaliacao']")?.addEventListener("click", () => {
    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      deferirAvaliacao(item);
      return draft;
    });
    render();
  });

  document.querySelector("#form-decisao-corregedor")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const juizo = readApreciacaoForm(event.currentTarget);
    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      indeferirAvaliacao(item, juizo);
      return draft;
    });
    render();
  });

  document.querySelector("[data-action='remover-avaliacao']")?.addEventListener("click", () => {
    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      removerAvaliacao(item);
      return draft;
    });
    render();
  });

  document.querySelector("#form-avaliacao-direta")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const juizo = readApreciacaoForm(event.currentTarget);
    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      registrarAvaliacaoComForcaDeDecisao(item, juizo);
      return draft;
    });
    render();
  });

  document.querySelectorAll("[data-pendencia-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const [propId, pendenciaId] = event.currentTarget.dataset.pendenciaForm.split(":");
      const data = new FormData(event.currentTarget);

      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === propId);
        const pendencia = item.pendenciasSecretaria.find((entry) => entry.id === pendenciaId);
        if (!pendencia) return draft;

        pendencia.status = "cumprida";
        pendencia.dataCumprimento = data.get("dataCumprimento");
        pendencia.observacoes = data.get("observacoes");
        item.historico.push({
          id: crypto.randomUUID(),
          tipo: "cumprimento_pendencia_secretaria",
          data: new Date().toISOString(),
          usuario: "Secretaria Processual da CN",
          descricao: `Providência cumprida: ${pendencia.descricao}.`,
          observacoes: pendencia.observacoes,
        });
        return draft;
      });
      render();
    });
  });

  document
    .querySelector("[data-action='apagar-proposicao']")
    ?.addEventListener("click", () => {
      if (!window.confirm(`Apagar a proposição ${proposicao.numero}? Esta ação encerra o ciclo da proposição.`)) {
        return;
      }
      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
        if (item) markPropositionDeleted(item);
        return draft;
      });
      if (veioDaFilaReferendo) {
        voltarParaFilaCorregedor("referendo");
        return;
      }
      render();
    });

  document
    .querySelector("[data-action='confirmar-rascunho']")
    ?.addEventListener("click", () => {
      if (
        !window.confirm(
          `Confirmar o rascunho ${proposicao.numero}? Ele deixa de ser rascunho e passa a aguardar o referendo do CNMP (ou segue à Secretaria, se a correição já estiver referendada).`,
        )
      ) {
        return;
      }
      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
        if (item) confirmarRascunhoCN(draft, item);
        return draft;
      });
      if (veioDaFilaReferendo) {
        voltarParaFilaCorregedor("referendo");
        return;
      }
      render();
    });

  document
    .querySelector("[data-action='editar-metadados']")
    ?.addEventListener("click", () => {
      openEditarMetadadosModal({
        proposicao,
        onSave: ({ prioridade, sensivel }) => {
          const persona = getCurrentPersona();
          mutateState((draft) => {
            const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
            if (item) editarMetadados(item, { prioridade, sensivel }, persona);
            return draft;
          });
          render();
        },
      });
    });

  document
    .querySelector("[data-action='gerar-relatorio-final']")
    ?.addEventListener("click", () => {
      const currentState = state();
      const proposicoesDaCorreicao = currentState.proposicoes
        .filter(
          (p) =>
            p.correicaoId === proposicao.correicaoId &&
            p.statusFluxo === "aguardando_referendo_cnmp",
        )
        .map((p) => hydrateProposicao(currentState, p));
      openRelatorioFinalModal({
        correicaoId: proposicao.correicaoId,
        ramoMP: proposicao.ramoMPNome || proposicao.ramoMP,
        proposicoes: proposicoesDaCorreicao,
      });
    });

  ["form-avaliacao-membro", "form-decisao-corregedor", "form-avaliacao-direta"].forEach((id) => {
    const form = document.querySelector(`#${id}`);
    if (!form) return;
    aplicarRegrasApreciacaoForm(form);
    form.addEventListener("change", (event) => {
      if (["situacao", "tipoConclusao", "existeProvidenciaSecretaria"].includes(event.target.name)) {
        aplicarRegrasApreciacaoForm(form);
      }
    });
  });
};

const renderAnexoChips = (anexos) =>
  (anexos || [])
    .map(
      (a) => `
        <li class="pill">
          <strong>${a.nome}</strong>
          <span class="muted" style="font-size: 0.8rem;">${a.mimeType || "application/octet-stream"} · ${Math.round((a.tamanhoBytes || 0) / 1024)} KB</span>
        </li>
      `,
    )
    .join("");

const collectAnexosFromInput = (input) =>
  Array.from(input?.files || []).map((file) => ({
    nome: file.name,
    tamanhoBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    anexadoEm: new Date().toISOString(),
  }));

const renderCorreicionadoApreciacaoCard = (proposicao, user) => {
  const ap = proposicao.apreciacaoDoCN;
  if (!ap) return "";
  const tipoLabel = ap.tipoConclusao
    ? Labels.tipoConclusao[ap.tipoConclusao]
    : Labels.situacaoApreciacao[ap.situacao];
  const visualizada = cienciaJaVisualizadaPor(proposicao, user.id);
  const dataViz = getDataVisualizacaoCiencia(proposicao, user.id);

  return `
    <section class="panel stack" style="border-left: 4px solid var(--color-primary, #2563eb);">
      <header class="button-row" style="justify-content: space-between;">
        <h3 class="panel__title" style="margin: 0;">Apreciação final do Corregedor Nacional</h3>
        ${renderApreciacaoBadge(ap)}
      </header>
      <p style="margin: 0;"><strong>Resultado:</strong> ${tipoLabel}</p>
      ${
        ap.observacoes
          ? `<div class="panel" style="padding: 0.75rem; background: var(--color-surface-muted);">
              <strong>Fundamentos:</strong>
              <p style="margin: 0.25rem 0 0;">${ap.observacoes}</p>
            </div>`
          : ""
      }
      ${
        ap.existeProvidenciaSecretaria
          ? `<p class="muted" style="margin: 0;">Há providência paralela a cargo da Secretaria Processual da CN. Acompanhe abaixo.</p>`
          : ""
      }
      <p class="muted" style="margin: 0; font-size: 0.85rem;">
        ${visualizada ? `Ciência visualizada por você em ${formatDateTime(dataViz)}.` : "Esta é a primeira vez que você acessa essa ciência."}
      </p>
    </section>
  `;
};

const renderCorreicionadoComprovacaoForm = (proposicao) => {
  const diligenciaAberta = proposicao.diligencias.find((d) => d.status === "aberta");
  if (!diligenciaAberta) return "";
  const rascunho = proposicao.rascunhoComprovacao;

  return `
    <section class="panel stack" style="border-left: 4px solid var(--color-warning, #d97706);">
      <h3 class="panel__title">Comprovação da diligência</h3>
      <div class="panel" style="padding: 0.75rem; background: var(--color-surface-muted);">
        <p style="margin: 0;"><strong>Diligência:</strong> ${diligenciaAberta.descricao}</p>
        <p class="muted" style="margin: 0.25rem 0 0; font-size: 0.85rem;">Prazo: ${formatDate(diligenciaAberta.prazo)}</p>
      </div>
      ${
        rascunho
          ? `<div class="alert alert--info" role="alert">
              Há um rascunho salvo em ${formatDateTime(rascunho.salvoEm)}. Você pode continuá-lo abaixo.
            </div>`
          : ""
      }
      <form id="form-comprovacao-correicionado" class="stack">
        <div class="field">
          <label for="descricao-comprovacao">Descrição da comprovação</label>
          <textarea id="descricao-comprovacao" name="descricao" required rows="4">${rascunho?.descricao || ""}</textarea>
        </div>
        <div class="field">
          <label for="observacoes-comprovacao">Observações adicionais (opcional)</label>
          <textarea id="observacoes-comprovacao" name="observacoes" rows="2">${rascunho?.observacoes || ""}</textarea>
        </div>
        <div class="field">
          <label for="anexos-comprovacao">Anexos</label>
          <input id="anexos-comprovacao" name="anexos" type="file" multiple />
          ${
            rascunho?.anexos?.length
              ? `<p class="muted" style="font-size: 0.85rem; margin: 0.25rem 0 0;">Anexos do rascunho (${rascunho.anexos.length}):</p>
                 <ul class="pill-list" style="flex-wrap: wrap;">${renderAnexoChips(rascunho.anexos)}</ul>`
              : ""
          }
          <p class="form-help" style="font-size: 0.8rem; color: var(--color-text-muted); margin: 0.25rem 0 0;">
            Os arquivos selecionados aqui adicionam-se aos do rascunho. O sistema registra apenas o nome, tamanho e tipo (protótipo).
          </p>
        </div>
        <div class="button-row">
          <button class="button" type="submit">Confirmar comprovação</button>
          <button class="button button--ghost" type="button" data-action="salvar-rascunho-comprovacao">Salvar rascunho</button>
          ${
            rascunho
              ? `<button class="button button--ghost button--danger" type="button" data-action="descartar-rascunho-comprovacao">Descartar rascunho</button>`
              : ""
          }
        </div>
        <p class="muted" data-role="rascunho-feedback" hidden style="font-size: 0.85rem;"></p>
      </form>
    </section>
  `;
};

const renderCorreicionadoContent = (proposicao, user) => {
  const historicoVisivel = filtrarHistoricoParaCorreicionado(proposicao.historico);
  const podeComprovar = proposicao.diligencias.some((d) => d.status === "aberta");
  const emBaixa = proposicao.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA;
  const meta = [
    { label: "Número", value: proposicao.numero },
    { label: "Tipo", value: proposicao.tipo },
    { label: "Unidade", value: proposicao.unidade },
    { label: "Membro nomeado", value: proposicao.membro },
    { label: "Ramo do MP", value: proposicao.ramoMPNome || proposicao.ramoMP },
    { label: "Temática", value: proposicao.tematica },
    {
      label: "Status atual",
      value: Labels.statusFluxo[proposicao.statusFluxo] || proposicao.statusFluxo,
    },
  ];

  return `
    <section class="stack">
      ${renderProposicaoHero(proposicao)}
      <section class="panel">
        <h3 class="panel__title">Metadados do caso</h3>
        ${renderMetaList(meta)}
      </section>

      ${emBaixa ? renderCorreicionadoApreciacaoCard(proposicao, user) : ""}

      ${podeComprovar ? renderCorreicionadoComprovacaoForm(proposicao) : ""}

      ${
        proposicao.diligencias.length > 0
          ? `
            <section class="panel detail-section">
              <h3 class="panel__title">Diligências</h3>
              ${renderDiligenciasCards(proposicao.diligencias)}
            </section>
          `
          : ""
      }

      ${
        proposicao.pendenciasSecretaria.length > 0
          ? `
            <section class="panel detail-section">
              <h3 class="panel__title">Providências paralelas (Secretaria)</h3>
              <p class="muted">Estas providências são cumpridas pela Secretaria da CN fora do sistema. Você apenas as visualiza.</p>
              <ul class="stack" style="list-style: none; padding: 0;">
                ${proposicao.pendenciasSecretaria
                  .map(
                    (p) => `
                      <li class="panel" style="padding: 0.75rem;">
                        <div class="button-row">
                          ${renderBadge(Labels.tipoProvidencia[p.tipoProvidencia] || p.descricao, p.status === "cumprida" ? "success" : "warning")}
                          ${renderBadge(p.status === "cumprida" ? `Cumprida em ${formatDate(p.dataCumprimento)}` : "Em curso", p.status === "cumprida" ? "success" : "warning")}
                        </div>
                        <p style="margin: 0.25rem 0 0;">${p.descricao}</p>
                        ${p.observacoes ? `<p class="muted" style="margin: 0.25rem 0 0; font-size: 0.85rem;">${p.observacoes}</p>` : ""}
                      </li>
                    `,
                  )
                  .join("")}
              </ul>
            </section>
          `
          : ""
      }

      <section class="panel detail-section">
        <h3 class="panel__title">Histórico visível</h3>
        <p class="muted" style="font-size: 0.85rem;">
          São exibidos os atos formais e comunicações dirigidas a você. Avaliações internas da CN e rascunhos não constam desta visão.
        </p>
        ${
          historicoVisivel.length > 0
            ? renderTimeline(historicoVisivel)
            : renderEmptyState("Sem eventos relevantes nesta proposição.")
        }
      </section>
    </section>
  `;
};

const bindCorreicionadoHandlers = (proposicao, user) => {
  const form = document.querySelector("#form-comprovacao-correicionado");
  if (!form) return;

  const anexosInput = form.querySelector("#anexos-comprovacao");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const anexos = collectAnexosFromInput(anexosInput);
    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      registrarComprovacao(item, {
        descricao: data.get("descricao"),
        observacoes: data.get("observacoes"),
        anexos,
        usuario: user.nome,
      });
      return draft;
    });
    window.alert("Comprovação registrada. A proposição segue agora para avaliação do membro auxiliar.");
    window.location.href = "/pages/correicionado-comprovacoes.html";
  });

  document
    .querySelector("[data-action='salvar-rascunho-comprovacao']")
    ?.addEventListener("click", () => {
      const data = new FormData(form);
      const novosAnexos = collectAnexosFromInput(anexosInput);
      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
        const existentes = item.rascunhoComprovacao?.anexos || [];
        salvarRascunhoComprovacao(
          item,
          {
            descricao: data.get("descricao"),
            observacoes: data.get("observacoes"),
            anexos: [...existentes, ...novosAnexos],
          },
          user,
        );
        return draft;
      });
      const feedback = form.querySelector("[data-role='rascunho-feedback']");
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = `Rascunho salvo às ${formatDateTime(new Date().toISOString())}.`;
      }
    });

  document
    .querySelector("[data-action='descartar-rascunho-comprovacao']")
    ?.addEventListener("click", () => {
      if (!window.confirm("Descartar o rascunho atual de comprovação?")) return;
      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
        descartarRascunhoComprovacao(item);
        return draft;
      });
      window.location.reload();
    });
};

const render = () => {
  const currentState = state();
  const proposicao = hydrateProposicao(currentState, getProposicaoById(currentState, proposicaoId));

  if (!proposicao) {
    mountPage({
      activePage: "proposicao-detalhe",
      title: "Proposição não encontrada",
      subtitle: "O identificador informado não existe na base carregada.",
      actions: baseActions,
      content: `<div class="empty-state">Abra uma proposição válida pela página de lista.</div>`,
    });
    return;
  }

  const persona = getCurrentPersona();

  if (persona === PERSONAS.CORREICIONADO) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "/pages/login.html";
      return;
    }
    if (!proposicaoVisivelPara(proposicao, user)) {
      mountPage({
        activePage: "proposicao-detalhe",
        title: "Proposição não vinculada a você",
        subtitle: "Você só pode visualizar proposições nominadas a você ou de unidades em que é chefe.",
        actions: `<a class="button button--ghost" href="correicionado-comprovacoes.html">Voltar</a>`,
        content: `<div class="empty-state">Esta proposição não pertence a você.</div>`,
      });
      return;
    }
    if (proposicao.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA && !cienciaJaVisualizadaPor(proposicao, user.id)) {
      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
        if (item) registrarVisualizacaoCiencia(item, user);
        return draft;
      });
    }

    const stAtual = state();
    const propAtualizada = hydrateProposicao(stAtual, getProposicaoById(stAtual, proposicaoId));
    mountPage({
      activePage:
        proposicao.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA
          ? "correicionado-ciencias"
          : "correicionado-comprovacoes",
      title: "Detalhe da proposição",
      subtitle: "Visão do correicionado: acompanhe diligências, comprove ou tome ciência da apreciação final.",
      actions: `<a class="button button--ghost" href="correicionado-comprovacoes.html">Comprovações</a><a class="button button--ghost" href="correicionado-ciencias.html">Ciências</a>`,
      content: renderCorreicionadoContent(propAtualizada, user),
    });
    bindCorreicionadoHandlers(propAtualizada, user);
    return;
  }

  const avaliacaoVigente = getAvaliacaoVigente(proposicao);
  const available = getAvailableActionsByPersona(proposicao, persona);

  const meta = [
    { label: "Número", value: proposicao.numero },
    { label: "Número ELO", value: proposicao.numeroElo },
    { label: "Tipo", value: proposicao.tipo },
    {
      label: "Prioridade",
      value: Labels.prioridade[proposicao.prioridade] || proposicao.prioridade || "—",
    },
    { label: "Sensível", value: proposicao.sensivel ? "Sim" : "Não" },
    { label: "Membro", value: proposicao.membro },
    { label: "Unidade", value: proposicao.unidade },
    { label: "Ramo do MP", value: proposicao.ramoMP },
    { label: "Nome do ramo", value: proposicao.ramoMPNome },
    { label: "Temática", value: proposicao.tematica },
    { label: "UF", value: proposicao.uf?.join(", ") },
    { label: "Início da correição", value: formatDate(proposicao.dataInicioCorreicao) },
    { label: "Fim da correição", value: formatDate(proposicao.dataFimCorreicao) },
    {
      label: "Avaliação vigente",
      value: avaliacaoVigente ? formatDate(avaliacaoVigente.data) : "Não há",
    },
    { label: "Observações gerais", value: proposicao.observacoesGerais || "—" },
  ];

  mountPage({
    activePage: "proposicao-detalhe",
    title: "Detalhe da proposição",
    subtitle:
      "Painel completo do caso, com histórico, diligências, pendências da Secretaria e ações condicionadas às regras de domínio.",
    actions: `${baseActions}${botaoVoltar()}`,
    content: `
      <section class="stack">
        ${renderProposicaoHero(proposicao)}
        <section class="panel">
          <div class="panel__header-row">
            <h3 class="panel__title">Metadados do caso</h3>
            ${
              available.podeEditarMetadados
                ? `<button class="button button--ghost button--small" type="button" data-action="editar-metadados">Editar</button>`
                : ""
            }
          </div>
          ${renderMetaList(meta)}
        </section>

        <section class="page-grid page-grid--two">
          <div class="stack">
            ${
              proposicao.diligencias.length > 0
                ? `
                  <section class="panel detail-section">
                    <h3 class="panel__title">Diligências</h3>
                    ${renderDiligenciasCards(proposicao.diligencias)}
                  </section>
                `
                : ""
            }

            ${
              proposicao.pendenciasSecretaria.length > 0
                ? `
                  <section class="panel detail-section">
                    <h3 class="panel__title">Providências pendentes</h3>
                    ${renderPendenciasCards(
                      proposicao.pendenciasSecretaria.map((item) => ({
                        ...item,
                        __formRef: `${proposicao.id}:${item.id}`,
                      })),
                    ).replaceAll('data-pendencia-form="', `data-pendencia-form="${proposicao.id}:`)}
                  </section>
                `
                : ""
            }

            <section class="panel detail-section">
              <h3 class="panel__title">Histórico completo</h3>
              ${renderTimeline(proposicao.historico)}
            </section>
          </div>

          <div class="stack">
            ${
              available.podeConfirmarRascunho
                ? `
                  <section class="panel stack">
                    <h3 class="panel__title">Ações da Corregedoria (rascunho)</h3>
                    <p class="inline-note">
                      Esta proposição é um rascunho de criação ainda não confirmado. Edite-a à vontade
                      e, quando estiver pronta, confirme para encaminhá-la ao referendo do CNMP
                      (ou diretamente à Secretaria, se a correição já estiver referendada).
                    </p>
                    <div class="button-row">
                      <a class="button button--ghost" href="proposicoes-criar.html?id=${proposicao.id}&fromCorregedor=referendo">Editar rascunho</a>
                      <button class="button" type="button" data-action="confirmar-rascunho">Confirmar e encaminhar</button>
                      <button class="button button--danger" type="button" data-action="apagar-proposicao">Apagar rascunho</button>
                    </div>
                  </section>
                `
                : available.podeEditarProposicao ||
                    available.podeApagarProposicao ||
                    available.podeGerarRelatorioFinal
                  ? `
                  <section class="panel stack">
                    <h3 class="panel__title">Ações da Corregedoria (referendo)</h3>
                    <p class="inline-note">
                      Esta proposição aguarda referendo do CNMP. Você pode editar os dados,
                      apagá-la ou gerar um preview do relatório final enquanto ela não é encaminhada
                      à Secretaria Processual.
                    </p>
                    <div class="button-row">
                      ${
                        available.podeEditarProposicao
                          ? `<a class="button button--ghost" href="proposicoes-criar.html?id=${proposicao.id}&fromCorregedor=referendo">Editar proposição</a>`
                          : ""
                      }
                      ${
                        available.podeGerarRelatorioFinal
                          ? `<button class="button button--ghost" type="button" data-action="gerar-relatorio-final">Gerar relatório final</button>`
                          : ""
                      }
                      ${
                        available.podeApagarProposicao
                          ? `<button class="button button--danger" type="button" data-action="apagar-proposicao">Apagar proposição</button>`
                          : ""
                      }
                    </div>
                  </section>
                `
                  : ""
            }

            ${
              available.podeCriarDiligencia
                ? `
                  <form class="panel stack" id="form-diligencia-local">
                    <h3 class="panel__title">Criar diligência</h3>
                    <div class="field">
                      <label for="descricao-diligencia">Descrição</label>
                      <textarea id="descricao-diligencia" name="descricao" required></textarea>
                    </div>
                    <div class="field">
                      <label for="prazo-diligencia">Prazo</label>
                      <input id="prazo-diligencia" name="prazo" type="date" required />
                    </div>
                    <button class="button" type="submit">Abrir diligência</button>
                  </form>
                `
                : ""
            }

            ${
              available.podeRegistrarComprovacao
                ? `
                  <form class="panel stack" id="form-comprovacao">
                    <h3 class="panel__title">Registrar comprovação</h3>
                    <div class="field">
                      <label for="descricao-comprovacao">Descrição</label>
                      <textarea id="descricao-comprovacao" name="descricao" required></textarea>
                    </div>
                    <div class="field">
                      <label for="observacoes-comprovacao">Observações</label>
                      <textarea id="observacoes-comprovacao" name="observacoes"></textarea>
                    </div>
                    <button class="button" type="submit">Enviar comprovação</button>
                  </form>
                `
                : ""
            }

            ${
              available.podeAvaliarComoMembro
                ? renderApreciacaoForm({
                    formId: "form-avaliacao-membro",
                    title: "Avaliação do membro auxiliar",
                    submitLabel: "Salvar avaliação",
                    initialApreciacao: obterRascunhoAvaliacao(proposicao.id)?.apreciacao || null,
                    includeRascunho: true,
                  })
                : ""
            }

            ${
              available.podeDecidir
                ? `
                  <section class="panel stack">
                    <h3 class="panel__title">Decisão do Corregedor Nacional</h3>
                    <p class="inline-note">
                      A avaliação vigente já está submetida. O Corregedor pode deferir rapidamente
                      ou indeferir, redefinindo integralmente as invariantes.
                    </p>
                    ${
                      proposicao.statusFluxo === StatusFluxo.RASCUNHO_DECISAO_CN
                        ? `<button class="button button--ghost" type="button" data-action="descartar-rascunho-decisao">Descartar rascunho de decisão</button>`
                        : ""
                    }
                    <button class="button" type="button" data-action="deferir-avaliacao">Deferir avaliação vigente</button>
                  </section>
                  ${renderApreciacaoForm({
                    formId: "form-decisao-corregedor",
                    title: "Indeferir e redefinir invariantes",
                    submitLabel: "Registrar decisão de indeferimento",
                    includeDelete: true,
                    includeRascunho: true,
                    initialApreciacao: proposicao.rascunhoDecisaoCN || null,
                  })}
                `
                : ""
            }

            ${
              available.podeAvaliarDiretamente
                ? `
                  ${
                    proposicao.statusFluxo === StatusFluxo.RASCUNHO_DECISAO_CN
                      ? `<div class="panel"><button class="button button--ghost" type="button" data-action="descartar-rascunho-decisao">Descartar rascunho de decisão</button></div>`
                      : ""
                  }
                  ${renderApreciacaoForm({
                    formId: "form-avaliacao-direta",
                    title: "Avaliação com força de decisão",
                    submitLabel: "Avaliar diretamente",
                    includeRascunho: true,
                    initialApreciacao: proposicao.rascunhoDecisaoCN || null,
                  })}
                `
                : ""
            }
          </div>
        </section>
      </section>
    `,
  });

  bindHandlers(proposicao);
};

render();
