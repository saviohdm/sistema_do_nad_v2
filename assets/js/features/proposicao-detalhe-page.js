import { PERSONAS, requireAuth, getCurrentPersona, getCurrentUser, hasPermission } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { activePageParaPersona, renderBreadcrumb, resolverOrigemDetalhe } from "../ui/layout.js";
import { mutateState } from "../app/store.js";
import { hydrateProposicao } from "../domain/correicoes.js";
import { formatDate, formatDateTime, queryParam } from "../app/utils.js";

requireAuth();
import {
  deferirAvaliacao,
  descartarRascunhoAvaliacao,
  indeferirAvaliacao,
  registrarAvaliacaoComForcaDeDecisao,
  removerAvaliacao,
  salvarAvaliacaoMembro,
  salvarRascunhoAvaliacao,
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
import { Labels, SituacaoApreciacao, StatusFluxo, TipoDestinatario } from "../domain/enums.js";
import {
  getDestinatario,
  getTipoDestinatario,
  resolverUsuariosDestinatarios,
  findMembroById,
  findAdmSuperior,
  listUsuariosAdmSuperior,
} from "../domain/destinatario.js";
import {
  confirmarRascunhoCN,
  descartarRascunhoDecisaoCN,
  editarMetadados,
  getAvaliacaoVigente,
  getAvailableActions,
  getAvailableActionsByPersona,
  getProposicaoById,
  getUltimaComprovacao,
  listProposicoesAguardandoDecisao,
  markPropositionDeleted,
  salvarRascunhoDecisaoCN,
} from "../domain/proposicoes.js";
import {
  renderAnexoChips,
  renderApreciacaoResumo,
  renderContextoSection,
  renderDetailActionZone,
  renderHistoricoUnificado,
  renderJudgingAnchor,
  renderMetaList,
  renderProposicaoHero,
} from "../ui/components.js";
import {
  aplicarRegrasApreciacaoForm,
  lerApreciacaoParcial,
  readApreciacaoForm,
  renderApreciacaoForm,
} from "../ui/forms.js";
import { openEditarMetadadosModal } from "../ui/modal.js";
import { adicionarEmailDiligencia } from "../domain/caixa-de-saida.js";
import {
  renderDestinatarioControl,
  lerOverridesDestinatario,
  temAdmSuperiorVago,
} from "../ui/destinatario-control.js";
import {
  bindPrazoDiligenciaControls,
  renderPrazoDiligenciaControl,
} from "../ui/prazo-diligencia-control.js";
import { confirmarEExecutarDevolucaoMinuta } from "../ui/confirmacoes.js";
import {
  CAMINHO_FILA_DECISAO,
  CONTEXTO_NAVEGACAO_DECISAO_KEY,
  lerContextoNavegacaoFila,
  resolverDestinoNavegacaoFila,
} from "../ui/fila-contexto-navegacao.js";

const proposicaoId = queryParam("id") || "prop-003";
const origem = resolverOrigemDetalhe({
  from: queryParam("from"),
  fromMembro: queryParam("fromMembro"),
  fromCorregedor: queryParam("fromCorregedor"),
});

// Filtro de categoria do histórico unificado; sobrevive aos re-renders da página.
let filtroHistoricoAtivo = "todos";

const bindHistoricoHandlers = () => {
  document.querySelectorAll("[data-filtro-historico]").forEach((chip) => {
    chip.addEventListener("click", () => {
      filtroHistoricoAtivo = chip.dataset.filtroHistorico;
      render();
    });
  });
};

// Contexto colapsado por padrão; preserva a escolha do usuário entre re-renders.
let contextoAberto = false;

const bindContextoHandler = () => {
  document.querySelector("[data-contexto-panel]")?.addEventListener("toggle", (event) => {
    contextoAberto = event.currentTarget.open;
  });
};

// Metadados colapsados por padrão; preserva a escolha do usuário entre re-renders.
let metadadosAberto = false;

const bindMetadadosHandler = () => {
  document.querySelector("[data-metadados-panel]")?.addEventListener("toggle", (event) => {
    metadadosAberto = event.currentTarget.open;
  });
};

const voltarParaOrigem = (proposicao) => {
  window.location.href = origem.href(proposicao);
};

const getContextoNavegacaoDecisao = () =>
  lerContextoNavegacaoFila({
    storage: sessionStorage,
    key: CONTEXTO_NAVEGACAO_DECISAO_KEY,
    caminhoPermitido: CAMINHO_FILA_DECISAO,
  });

const getHrefRetornoOrigem = (proposicao) => {
  if (origem?.slug === "corregedor-decisao") {
    return getContextoNavegacaoDecisao()?.returnHref || origem.href(proposicao);
  }
  return origem?.href(proposicao) || "proposicoes-lista.html";
};

const concluirAcaoCorregedor = (proposicao) => {
  if (origem?.slug === "corregedor-decisao") {
    const contexto = getContextoNavegacaoDecisao();
    const validIds = listProposicoesAguardandoDecisao(state()).map((item) => item.id);
    const destino = resolverDestinoNavegacaoFila({
      contexto,
      currentId: proposicao.id,
      validIds,
    });

    if (destino.type === "next") {
      window.location.replace(
        `/pages/proposicao-detalhe.html?id=${encodeURIComponent(destino.nextId)}&from=corregedor-decisao`,
      );
      return;
    }

    if (destino.type === "last") {
      window.alert("Esta era a última proposição da lista filtrada.");
      window.location.replace(destino.returnHref);
      return;
    }

    if (destino.type === "exhausted") {
      window.alert("Não há outras proposições disponíveis na lista filtrada.");
      window.location.replace(destino.returnHref);
      return;
    }

    window.alert(
      "Não foi possível recuperar o contexto da lista. Você retornará à fila operacional.",
    );
    window.location.replace(origem.href(proposicao));
    return;
  }

  if (origem) {
    window.location.replace(origem.href(proposicao));
    return;
  }
  render();
};

const botaoVoltar = (proposicao) =>
  origem
    ? `<a class="button button--ghost" href="${getHrefRetornoOrigem(proposicao)}">${origem.voltarLabel}</a>`
    : `<a class="button button--ghost" href="proposicoes-lista.html">Voltar à consulta</a>`;

const renderTrilha = (proposicao) =>
  renderBreadcrumb([
    proposicao.correicao
      ? {
          label: `Correição ${proposicao.correicao.numero}${proposicao.ramoMP ? ` · ${proposicao.ramoMP}` : ""}`,
          href: hasPermission("gerir_correicao")
            ? `/pages/correicoes-criar.html?id=${proposicao.correicaoId}`
            : null,
        }
      : null,
    { label: `Proposição ${proposicao.numero}` },
  ]);

const bindHandlers = (proposicao) => {
  bindPrazoDiligenciaControls();

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
    const form = event.currentTarget;
    const data = new FormData(form);

    // Válvula universal do destinatário (paridade com a fila): sempre cai numa pessoa
    // real. Adm. superior sem parametrização ou unidade vaga sem escolha bloqueiam.
    if (temAdmSuperiorVago(form)) {
      window.alert(
        "Proposição orientada à administração superior sem usuários parametrizados. Parametrize na tela de Administração Superior antes de abrir a diligência.",
      );
      return;
    }
    const overrides = lerOverridesDestinatario(form);
    if (Object.values(overrides).some((valor) => !valor)) {
      window.alert("Defina o destinatário (unidade sem responsável atual) antes de abrir a diligência.");
      return;
    }

    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      const { diligencia } = criarDiligencia(item, {
        descricao: data.get("descricao"),
        prazo: data.get("prazo"),
      });
      // Notifica o correicionado (paridade com a fila): adm. superior => um e-mail por
      // usuário mapeado; membro/unidade => e-mail ao escolhido (override se != sugerido).
      const tipo = getTipoDestinatario(item);
      const { sugeridos } = resolverUsuariosDestinatarios(draft, item);
      if (tipo === TipoDestinatario.ADMINISTRACAO_SUPERIOR) {
        sugeridos.forEach((usuario) => adicionarEmailDiligencia(draft, item, diligencia, usuario));
      } else {
        const escolhidoId = overrides[item.id];
        const usuario = findMembroById(draft, escolhidoId);
        const override = escolhidoId !== (sugeridos[0]?.id || null);
        adicionarEmailDiligencia(draft, item, diligencia, usuario, "Secretaria Processual da CN", {
          override,
        });
      }
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
    if (origem?.slug === "membro-auxiliar") {
      voltarParaOrigem(proposicao);
      return;
    }
    render();
  });

  // Rascunhos de apreciação (minuta do membro e decisão do CN) compartilham o
  // mesmo par salvar/descartar do form; muda apenas a função de domínio.
  const RASCUNHO_APRECIACAO = {
    "form-avaliacao-membro": {
      salvar: salvarRascunhoAvaliacao,
      descartar: descartarRascunhoAvaliacao,
    },
    "form-decisao-corregedor": {
      salvar: salvarRascunhoDecisaoCN,
      descartar: descartarRascunhoDecisaoCN,
    },
    "form-avaliacao-direta": {
      salvar: salvarRascunhoDecisaoCN,
      descartar: descartarRascunhoDecisaoCN,
    },
  };

  Object.entries(RASCUNHO_APRECIACAO).forEach(([formId, acoes]) => {
    const form = document.querySelector(`#${formId}`);
    if (!form) return;

    form.querySelector("[data-action='salvar-rascunho']")?.addEventListener("click", () => {
      const juizoParcial = lerApreciacaoParcial(form);
      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
        acoes.salvar(item, juizoParcial);
        return draft;
      });
      const feedback = form.querySelector("[data-role='rascunho-feedback']");
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = `Rascunho salvo às ${formatDateTime(new Date().toISOString())}.`;
      }
    });

    form.querySelector("[data-action='descartar-rascunho']")?.addEventListener("click", () => {
      if (!window.confirm("Descartar o rascunho atual?")) return;
      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
        acoes.descartar(item);
        return draft;
      });
      render();
    });
  });

  document.querySelector("[data-action='deferir-avaliacao']")?.addEventListener("click", () => {
    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      deferirAvaliacao(item);
      return draft;
    });
    concluirAcaoCorregedor(proposicao);
  });

  const alternarDecisaoSubstitutiva = document.querySelector(
    "[data-action='alternar-decisao-substitutiva']",
  );
  const painelDecisaoSubstitutiva = document.querySelector("#painel-decisao-substitutiva");
  if (alternarDecisaoSubstitutiva && painelDecisaoSubstitutiva) {
    alternarDecisaoSubstitutiva.addEventListener("click", () => {
      const abrir = painelDecisaoSubstitutiva.hidden;
      painelDecisaoSubstitutiva.hidden = !abrir;
      alternarDecisaoSubstitutiva.setAttribute("aria-expanded", String(abrir));
      if (abrir) {
        painelDecisaoSubstitutiva.querySelector("select, textarea")?.focus();
      }
    });
  }

  document.querySelector("#form-decisao-corregedor")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const juizo = readApreciacaoForm(event.currentTarget);
    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      indeferirAvaliacao(item, juizo);
      return draft;
    });
    concluirAcaoCorregedor(proposicao);
  });

  document.querySelector("[data-action='remover-avaliacao']")?.addEventListener("click", () => {
    confirmarEExecutarDevolucaoMinuta({
      confirmar: (mensagem) => window.confirm(mensagem),
      devolver: () => {
        mutateState((draft) => {
          const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
          removerAvaliacao(item);
          return draft;
        });
        concluirAcaoCorregedor(proposicao);
      },
    });
  });

  document.querySelector("#form-avaliacao-direta")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const juizo = readApreciacaoForm(event.currentTarget);
    mutateState((draft) => {
      const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
      registrarAvaliacaoComForcaDeDecisao(item, juizo);
      return draft;
    });
    concluirAcaoCorregedor(proposicao);
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
      if (origem?.slug === "corregedor-referendo") {
        voltarParaOrigem(proposicao);
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
      if (origem?.slug === "corregedor-referendo") {
        voltarParaOrigem(proposicao);
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

  ["form-avaliacao-membro", "form-decisao-corregedor", "form-avaliacao-direta"].forEach((id) => {
    const form = document.querySelector(`#${id}`);
    if (!form) return;
    aplicarRegrasApreciacaoForm(form);
    form.addEventListener("change", (event) => {
      if (["situacao", "tipoConclusao", "existeProvidenciaSecretaria", "tipoProvidencia"].includes(event.target.name)) {
        aplicarRegrasApreciacaoForm(form);
      }
    });
    form.addEventListener("input", (event) => {
      if (event.target.name === "descricaoProvidencia") {
        aplicarRegrasApreciacaoForm(form);
      }
    });
  });
};

const collectAnexosFromInput = (input) =>
  Array.from(input?.files || []).map((file) => ({
    nome: file.name,
    tamanhoBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    anexadoEm: new Date().toISOString(),
  }));

const renderAcaoCorreicionadoCiencia = (proposicao, user) => {
  const ap = proposicao.apreciacaoDoCN;
  if (!ap) return "";
  const visualizada = cienciaJaVisualizadaPor(proposicao, user.id);
  const dataViz = getDataVisualizacaoCiencia(proposicao, user.id);

  return renderDetailActionZone({
    overline: "Ciência · baixa definitiva",
    title: "Decisão final do Corregedor Nacional",
    children: `
      ${renderJudgingAnchor({
        overline: "Resultado do Corregedor Nacional",
        children: `
          ${renderApreciacaoResumo(ap)}
          ${
            ap.existeProvidenciaSecretaria
              ? `<p class="muted" style="margin: 0;">Há providência paralela a cargo da Secretaria Processual da CN. Acompanhe abaixo.</p>`
              : ""
          }
        `,
      })}
      <p class="muted" style="margin: 0; font-size: 0.85rem;">
        ${visualizada ? `Ciência visualizada por você em ${formatDateTime(dataViz)}.` : "Esta é a primeira vez que você acessa essa ciência."}
      </p>
    `,
  });
};

const renderAcaoCorreicionadoComprovacao = (proposicao) => {
  const diligenciaAberta = proposicao.diligencias.find((d) => d.status === "aberta");
  if (!diligenciaAberta) return "";
  const rascunho = proposicao.rascunhoComprovacao;

  return renderDetailActionZone({
    overline: "Sua vez · comprovação da diligência",
    title: "Comprovar o cumprimento",
    children: `
      ${renderJudgingAnchor({
        overline: "Diligência a responder",
        children: `
          <p><strong>${diligenciaAberta.descricao}</strong></p>
          <p class="muted" style="margin: 0; font-size: 0.85rem;">Prazo: ${formatDate(diligenciaAberta.prazo)}</p>
        `,
      })}
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
          <p class="form-help" style="font-size: 0.8rem; color: var(--muted); margin: 0.25rem 0 0;">
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
    `,
  });
};

// Linhas de metadados específicas da orientação do destinatário.
const metaDestinatario = (proposicao) => {
  const st = state();
  const dest = getDestinatario(proposicao);
  const tipo = dest.tipo;
  const rows = [{ label: "Orientação", value: Labels.tipoDestinatario?.[tipo] || tipo }];

  if (tipo === TipoDestinatario.MEMBRO) {
    rows.push({ label: "Membro", value: proposicao.membro || "—" });
    const snap = dest.unidadeOrigemSnapshot;
    if (snap?.unidade) rows.push({ label: "Unidade de origem", value: snap.unidade });
    return rows;
  }

  if (tipo === TipoDestinatario.UNIDADE) {
    rows.push({ label: "Unidade", value: proposicao.unidade || "—" });
    const { sugeridos, vago } = resolverUsuariosDestinatarios(st, proposicao);
    rows.push({
      label: "Responsável atual",
      value: vago ? "(sem responsável no cadastro CNMP)" : sugeridos.map((m) => m.nome).join(", "),
    });
    return rows;
  }

  const adm = findAdmSuperior(st, dest.administracaoSuperior);
  rows.push({ label: "Administração Superior", value: adm?.nome || proposicao.unidade || "—" });
  const usuarios = listUsuariosAdmSuperior(st, adm);
  rows.push({
    label: "Usuários que respondem",
    value: usuarios.length ? usuarios.map((m) => m.nome).join(", ") : "(não parametrizado)",
  });
  return rows;
};

const buildMeta = (proposicao, persona) => {
  const core = [
    { label: "Número", value: proposicao.numero },
    { label: "Tipo", value: proposicao.tipo },
    {
      label: "Status atual",
      value: Labels.statusFluxo[proposicao.statusFluxo] || proposicao.statusFluxo,
    },
    ...metaDestinatario(proposicao),
    { label: "Ramo do MP", value: proposicao.ramoMPNome || proposicao.ramoMP },
    { label: "Temática", value: proposicao.tematica },
  ];
  if (persona === PERSONAS.CORREICIONADO) return core;
  return [
    ...core,
    { label: "Número ELO", value: proposicao.numeroElo },
    {
      label: "Prioridade",
      value: Labels.prioridade[proposicao.prioridade] || proposicao.prioridade || "—",
    },
    { label: "Sensível", value: proposicao.sensivel ? "Sim" : "Não" },
    { label: "UF", value: proposicao.uf?.join(", ") },
    { label: "Início da correição", value: formatDate(proposicao.dataInicioCorreicao) },
    { label: "Fim da correição", value: formatDate(proposicao.dataFimCorreicao) },
    { label: "Observações gerais", value: proposicao.observacoesGerais || "—" },
  ];
};

const renderComprovacaoAnchor = (proposicao, overline = "Comprovação em análise") => {
  const comp = getUltimaComprovacao(proposicao);
  if (!comp) return "";
  const linhaMeta = [comp.usuario, comp.data ? formatDateTime(comp.data) : null]
    .filter(Boolean)
    .join(" · ");
  return renderJudgingAnchor({
    overline,
    children: `
      ${comp.descricao ? `<p><strong>${comp.descricao}</strong></p>` : ""}
      ${comp.observacoes ? `<p class="muted">${comp.observacoes}</p>` : ""}
      ${linhaMeta ? `<p class="muted" style="font-size: 0.85rem;">${linhaMeta}</p>` : ""}
      ${comp.anexos?.length ? `<ul class="pill-list" style="flex-wrap: wrap;">${renderAnexoChips(comp.anexos)}</ul>` : ""}
    `,
  });
};

const renderAcaoCorreicionado = (proposicao, user, available) => {
  if (proposicao.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA) {
    return renderAcaoCorreicionadoCiencia(proposicao, user);
  }
  if (available.podeRegistrarComprovacao) {
    return renderAcaoCorreicionadoComprovacao(proposicao);
  }
  return "";
};

const renderAcaoMembro = (proposicao, available) => {
  if (!available.podeAvaliarComoMembro) return "";
  return renderDetailActionZone({
    children: `
      ${renderComprovacaoAnchor(proposicao)}
      ${renderApreciacaoForm({
        formId: "form-avaliacao-membro",
        title: "Minuta de decisão",
        submitLabel: "Submeter minuta",
        initialApreciacao: proposicao.rascunhoAvaliacao?.apreciacao || null,
        includeRascunho: true,
        variant: "bare",
        observacoesLabel: "Redação da minuta",
        observacoesPlaceholder: "Redija a fundamentação e o comando decisório da minuta.",
        observacoesRequired: true,
      })}
    `,
  });
};

const renderAcaoSecretaria = (proposicao, available) => {
  if (!available.podeCriarDiligencia) return "";
  const ap = proposicao.apreciacaoDoCN;
  const anchor =
    ap && ap.situacao === SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES
      ? renderJudgingAnchor({
          overline: "Retorno do Corregedor · necessita mais informações",
          children: renderApreciacaoResumo(ap),
        })
      : "";
  return renderDetailActionZone({
    overline: "Sua vez · Secretaria Processual",
    title: "Abrir diligência",
    children: `
      ${anchor}
      <p class="inline-note">A diligência segue ao correicionado para comprovação. O prazo orienta o acompanhamento; não trava o fluxo principal.</p>
      <form class="stack" id="form-diligencia-local">
        <div class="field">
          <label for="descricao-diligencia">Descrição</label>
          <textarea id="descricao-diligencia" name="descricao" required></textarea>
        </div>
        ${renderPrazoDiligenciaControl({ idPrefix: "prazo-diligencia" })}
        <div class="field">
          ${renderDestinatarioControl(state(), proposicao)}
        </div>
        <button class="button" type="submit">Abrir diligência</button>
      </form>
    `,
  });
};

const renderAcaoCorregedor = (proposicao, available) => {
  if (available.podeConfirmarRascunho) {
    return renderDetailActionZone({
      overline: "Sua vez · Corregedoria (rascunho)",
      title: "Rascunho de criação",
      children: `
        <p class="inline-note">
          Esta proposição é um rascunho de criação ainda não confirmado. Edite-a à vontade
          e, quando estiver pronta, confirme para encaminhá-la ao referendo do CNMP
          (ou diretamente à Secretaria, se a correição já estiver referendada).
        </p>
        <div class="button-row">
          <a class="button button--ghost" href="proposicoes-criar.html?id=${proposicao.id}${origem ? `&from=${origem.slug}` : ""}">Retomar criação</a>
          <button class="button" type="button" data-action="confirmar-rascunho">Confirmar e encaminhar</button>
          <button class="button button--danger" type="button" data-action="apagar-proposicao">Apagar rascunho</button>
        </div>
      `,
    });
  }

  if (available.podeEditarProposicao || available.podeApagarProposicao) {
    return renderDetailActionZone({
      overline: "Sua vez · Corregedoria (referendo)",
      title: "Aguardando referendo do CNMP",
      children: `
        <p class="inline-note">
          Você pode editar os dados ou apagá-la enquanto ela não é encaminhada à Secretaria Processual.
        </p>
        <div class="button-row">
          ${
            available.podeEditarProposicao
              ? `<a class="button button--ghost" href="proposicoes-criar.html?id=${proposicao.id}${origem ? `&from=${origem.slug}` : ""}">Editar proposição</a>`
              : ""
          }
          ${
            available.podeApagarProposicao
              ? `<button class="button button--danger" type="button" data-action="apagar-proposicao">Apagar proposição</button>`
              : ""
          }
        </div>
      `,
    });
  }

  if (available.podeDecidir) {
    const avaliacao = getAvaliacaoVigente(proposicao);
    return renderDetailActionZone({
      title: "Decidir sobre a minuta",
      children: `
        ${renderJudgingAnchor({
          overline: "Minuta vigente · membro auxiliar",
          children: renderApreciacaoResumo(avaliacao?.apreciacao, {
            autor: avaliacao?.usuario,
            data: avaliacao?.data,
          }),
        })}
        <div class="button-row decisao-minuta__actions" role="group" aria-label="Ações sobre a minuta">
          <button class="button" type="button" data-action="deferir-avaliacao">Acolher minuta</button>
          <button class="button button--danger" type="button" data-action="remover-avaliacao">Devolver minuta</button>
          <button
            class="button button--ghost decisao-minuta__toggle"
            type="button"
            data-action="alternar-decisao-substitutiva"
            aria-expanded="false"
            aria-controls="painel-decisao-substitutiva"
          >Afastar minuta e decidir</button>
        </div>
        <div class="decisao-substitutiva" id="painel-decisao-substitutiva" hidden>
          ${renderApreciacaoForm({
            formId: "form-decisao-corregedor",
            submitLabel: "Confirmar",
            includeRascunho: true,
            initialApreciacao: proposicao.rascunhoDecisaoCN?.apreciacao || null,
            variant: "bare",
            ariaLabel: "Decisão substitutiva",
            invariantesLegend: "Novas invariantes da decisão substitutiva",
            observacoesLabel: "Fundamentação da decisão",
            observacoesPlaceholder: "Redija a fundamentação e o comando da decisão substitutiva.",
            observacoesRequired: true,
          })}
        </div>
      `,
    });
  }

  if (available.podeAvaliarDiretamente) {
    return renderDetailActionZone({
      overline: "Sua vez · Corregedor Nacional",
      title: "Decisão direta",
      children: `
        ${renderComprovacaoAnchor(proposicao)}
        <p class="inline-note">Excepcionalmente sem minuta do membro auxiliar: a decisão do Corregedor produz efeitos imediatos.</p>
        ${renderApreciacaoForm({
          formId: "form-avaliacao-direta",
          title: "Decisão direta do Corregedor Nacional",
          submitLabel: "Registrar decisão direta",
          includeRascunho: true,
          initialApreciacao: proposicao.rascunhoDecisaoCN?.apreciacao || null,
          variant: "bare",
          observacoesLabel: "Fundamentação da decisão",
          observacoesPlaceholder: "Redija a fundamentação e o comando da decisão.",
          observacoesRequired: true,
        })}
      `,
    });
  }

  return "";
};

const buildAcaoPrincipal = (proposicao, persona, available, user) => {
  if (persona === PERSONAS.CORREICIONADO) return renderAcaoCorreicionado(proposicao, user, available);
  if (persona === PERSONAS.MEMBRO) return renderAcaoMembro(proposicao, available);
  if (persona === PERSONAS.SECRETARIA) return renderAcaoSecretaria(proposicao, available);
  if (persona === PERSONAS.CORREGEDOR) return renderAcaoCorregedor(proposicao, available);
  return "";
};

const renderDossie = ({ proposicao, historico, historicoNota, providenciasEditable }) =>
  renderHistoricoUnificado(proposicao, {
    historico,
    nota: historicoNota,
    providenciasEditable,
    filtroAtivo: filtroHistoricoAtivo,
  });

const renderDetalheContent = ({
  proposicao,
  meta,
  podeEditarMetadados,
  acaoPrincipalHtml,
  historico,
  historicoNota,
  providenciasEditable,
}) => `
  <section class="stack">
    ${renderProposicaoHero(proposicao)}
    ${acaoPrincipalHtml || ""}
    <details class="panel contexto-panel metadados-panel" data-metadados-panel${metadadosAberto ? " open" : ""}>
      <summary class="contexto-panel__summary">
        <h3 class="panel__title">Metadados do caso</h3>
      </summary>
      <div class="contexto-panel__body">
        ${
          podeEditarMetadados
            ? `<div class="toolbar metadados-panel__actions">
                <button class="button button--ghost button--small" type="button" data-action="editar-metadados">Editar</button>
              </div>`
            : ""
        }
        ${renderMetaList(meta)}
      </div>
    </details>
    ${renderContextoSection(proposicao, { aberto: contextoAberto })}
    ${renderDossie({ proposicao, historico, historicoNota, providenciasEditable })}
  </section>
`;

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
    window.alert("Comprovação registrada. A proposição segue agora para elaboração de minuta pelo membro auxiliar.");
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
      if (!window.confirm("Descartar o rascunho atual?")) return;
      mutateState((draft) => {
        const item = draft.proposicoes.find((entry) => entry.id === proposicao.id);
        descartarRascunhoComprovacao(item, user);
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
      activePage: activePageParaPersona("proposicoes-lista"),
      title: "Proposição não encontrada",
      actions: baseActions,
      content: `<div class="empty-state">Abra uma proposição válida pela página de lista.</div>`,
    });
    return;
  }

  const persona = getCurrentPersona();
  const available = getAvailableActionsByPersona(proposicao, persona);

  if (persona === PERSONAS.CORREICIONADO) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "/pages/login.html";
      return;
    }
    if (!proposicaoVisivelPara(state(), proposicao, user)) {
      mountPage({
        activePage: "correicionado-comprovacoes",
        title: "Proposição não vinculada a você",
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
    const availableAtualizada = getAvailableActionsByPersona(propAtualizada, persona);
    mountPage({
      activePage:
        propAtualizada.statusFluxo === StatusFluxo.BAIXA_DEFINITIVA
          ? "correicionado-ciencias"
          : "correicionado-comprovacoes",
      title: "Detalhe da proposição",
      breadcrumb: renderTrilha(propAtualizada),
      actions: `<a class="button button--ghost" href="correicionado-comprovacoes.html">Comprovações</a><a class="button button--ghost" href="correicionado-ciencias.html">Ciências</a>`,
      content: renderDetalheContent({
        proposicao: propAtualizada,
        meta: buildMeta(propAtualizada, persona),
        podeEditarMetadados: false,
        acaoPrincipalHtml: buildAcaoPrincipal(propAtualizada, persona, availableAtualizada, user),
        historico: filtrarHistoricoParaCorreicionado(propAtualizada.historico),
        historicoNota:
          "São exibidos os atos formais e comunicações dirigidas a você. Atos preparatórios internos da CN e rascunhos não constam desta visão.",
        providenciasEditable: false,
      }),
    });
    bindCorreicionadoHandlers(propAtualizada, user);
    bindHistoricoHandlers();
    bindContextoHandler();
    bindMetadadosHandler();
    return;
  }

  mountPage({
    activePage: activePageParaPersona(origem?.activePage || "proposicoes-lista"),
    title: "Detalhe da proposição",
    breadcrumb: renderTrilha(proposicao),
    actions: `${baseActions}${botaoVoltar(proposicao)}`,
    content: renderDetalheContent({
      proposicao,
      meta: buildMeta(proposicao, persona),
      podeEditarMetadados: available.podeEditarMetadados,
      acaoPrincipalHtml: buildAcaoPrincipal(proposicao, persona, available),
      historico: proposicao.historico,
      historicoNota: "",
      providenciasEditable: persona === PERSONAS.SECRETARIA,
    }),
  });

  bindHandlers(proposicao);
  bindHistoricoHandlers();
  bindContextoHandler();
  bindMetadadosHandler();
};

render();
