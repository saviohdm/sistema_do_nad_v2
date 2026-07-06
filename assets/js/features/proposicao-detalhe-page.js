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
import { Labels, SituacaoApreciacao, StatusFluxo, TipoDestinatario, TipoHistorico } from "../domain/enums.js";
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
  renderApreciacaoResumo,
  renderDetailActionZone,
  renderDiligenciasCards,
  renderEmptyState,
  renderJudgingAnchor,
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
import { openEditarMetadadosModal } from "../ui/modal.js";
import { adicionarEmailDiligencia } from "../domain/caixa-de-saida.js";
import {
  renderDestinatarioControl,
  lerOverridesDestinatario,
  temAdmSuperiorVago,
} from "../ui/destinatario-control.js";

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

const renderAcaoCorreicionadoCiencia = (proposicao, user) => {
  const ap = proposicao.apreciacaoDoCN;
  if (!ap) return "";
  const visualizada = cienciaJaVisualizadaPor(proposicao, user.id);
  const dataViz = getDataVisualizacaoCiencia(proposicao, user.id);

  return renderDetailActionZone({
    overline: "Ciência · baixa definitiva",
    title: "Apreciação final do Corregedor Nacional",
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

const getUltimaComprovacao = (proposicao) =>
  (proposicao.historico || [])
    .filter((event) => event.tipo === TipoHistorico.COMPROVACAO)
    .sort((a, b) => new Date(b.data) - new Date(a.data))[0] || null;

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

const renderComprovacaoAnchor = (proposicao, overline = "Comprovação a avaliar") => {
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
    overline: "Sua vez · membro auxiliar",
    title: "Avaliação técnica",
    children: `
      ${renderComprovacaoAnchor(proposicao)}
      <p class="inline-note">Sua avaliação informa o Corregedor Nacional, mas não produz efeitos por si só — a decisão final é sempre dele.</p>
      ${renderApreciacaoForm({
        formId: "form-avaliacao-membro",
        title: "Avaliação do membro auxiliar",
        submitLabel: "Salvar avaliação",
        initialApreciacao: obterRascunhoAvaliacao(proposicao.id)?.apreciacao || null,
        includeRascunho: true,
        variant: "bare",
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
        <div class="field">
          <label for="prazo-diligencia">Prazo</label>
          <input id="prazo-diligencia" name="prazo" type="date" required />
        </div>
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
          <a class="button button--ghost" href="proposicoes-criar.html?id=${proposicao.id}&fromCorregedor=referendo">Editar rascunho</a>
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
              ? `<a class="button button--ghost" href="proposicoes-criar.html?id=${proposicao.id}&fromCorregedor=referendo">Editar proposição</a>`
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
    const descartar =
      proposicao.statusFluxo === StatusFluxo.RASCUNHO_DECISAO_CN
        ? `<button class="button button--ghost" type="button" data-action="descartar-rascunho-decisao">Descartar rascunho de decisão</button>`
        : "";
    return renderDetailActionZone({
      overline: "Sua vez · decisão do Corregedor Nacional",
      title: "Decidir sobre a avaliação",
      children: `
        ${renderJudgingAnchor({
          overline: "Avaliação vigente · membro auxiliar",
          children: renderApreciacaoResumo(avaliacao?.apreciacao, {
            autor: avaliacao?.usuario,
            data: avaliacao?.data,
          }),
        })}
        <p class="inline-note">Deferir adota integralmente as invariantes acima. Indeferir exige redefini-las neste mesmo ato.</p>
        <div class="button-row">
          ${descartar}
          <button class="button" type="button" data-action="deferir-avaliacao">Deferir avaliação vigente</button>
        </div>
        ${renderApreciacaoForm({
          formId: "form-decisao-corregedor",
          title: "Indeferir e redefinir invariantes",
          submitLabel: "Registrar decisão de indeferimento",
          includeDelete: true,
          includeRascunho: true,
          initialApreciacao: proposicao.rascunhoDecisaoCN || null,
          variant: "bare",
        })}
      `,
    });
  }

  if (available.podeAvaliarDiretamente) {
    const descartar =
      proposicao.statusFluxo === StatusFluxo.RASCUNHO_DECISAO_CN
        ? `<div class="button-row"><button class="button button--ghost" type="button" data-action="descartar-rascunho-decisao">Descartar rascunho de decisão</button></div>`
        : "";
    return renderDetailActionZone({
      overline: "Sua vez · Corregedor Nacional",
      title: "Avaliar com força de decisão",
      children: `
        ${renderComprovacaoAnchor(proposicao)}
        <p class="inline-note">Sem avaliação do membro auxiliar nesta etapa: sua avaliação tem força de decisão e produz efeitos imediatos.</p>
        ${descartar}
        ${renderApreciacaoForm({
          formId: "form-avaliacao-direta",
          title: "Avaliação com força de decisão",
          submitLabel: "Avaliar diretamente",
          includeRascunho: true,
          initialApreciacao: proposicao.rascunhoDecisaoCN || null,
          variant: "bare",
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

const renderDossie = ({ proposicao, historico, historicoNota, providenciasEditable }) => `
  ${
    proposicao.diligencias.length > 0
      ? `
        <section class="panel detail-section">
          <h3 class="panel__title">Diligências e comprovações</h3>
          ${renderDiligenciasCards(proposicao.diligencias)}
        </section>
      `
      : ""
  }
  ${
    proposicao.pendenciasSecretaria.length > 0
      ? `
        <section class="panel detail-section">
          <h3 class="panel__title">Providências da Secretaria</h3>
          <p class="muted" style="font-size: 0.85rem;">
            ${
              providenciasEditable
                ? "Registre o cumprimento de cada providência. Elas correm em paralelo e não travam o fluxo principal."
                : "Estas providências são cumpridas pela Secretaria da CN fora do sistema; aqui são apenas acompanhadas."
            }
          </p>
          ${renderPendenciasCards(proposicao.pendenciasSecretaria, {
            editable: providenciasEditable,
          }).replaceAll('data-pendencia-form="', `data-pendencia-form="${proposicao.id}:`)}
        </section>
      `
      : ""
  }
  <section class="panel detail-section">
    <h3 class="panel__title">Histórico</h3>
    ${historicoNota ? `<p class="muted" style="font-size: 0.85rem;">${historicoNota}</p>` : ""}
    ${
      historico.length > 0
        ? renderTimeline(historico)
        : renderEmptyState("Sem eventos relevantes nesta proposição.")
    }
  </section>
`;

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
    <section class="panel">
      <div class="panel__header-row">
        <h3 class="panel__title">Metadados do caso</h3>
        ${
          podeEditarMetadados
            ? `<button class="button button--ghost button--small" type="button" data-action="editar-metadados">Editar</button>`
            : ""
        }
      </div>
      ${renderMetaList(meta)}
    </section>
    ${acaoPrincipalHtml || ""}
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
  const available = getAvailableActionsByPersona(proposicao, persona);

  if (persona === PERSONAS.CORREICIONADO) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "/pages/login.html";
      return;
    }
    if (!proposicaoVisivelPara(state(), proposicao, user)) {
      mountPage({
        activePage: "proposicao-detalhe",
        title: "Proposição não vinculada a você",
        subtitle: "Você só pode visualizar proposições orientadas a você, à unidade que chefia atualmente ou à administração superior que responde — ou que já lhe foram comunicadas.",
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
      subtitle: "Visão do correicionado: acompanhe diligências, comprove ou tome ciência da apreciação final.",
      actions: `<a class="button button--ghost" href="correicionado-comprovacoes.html">Comprovações</a><a class="button button--ghost" href="correicionado-ciencias.html">Ciências</a>`,
      content: renderDetalheContent({
        proposicao: propAtualizada,
        meta: buildMeta(propAtualizada, persona),
        podeEditarMetadados: false,
        acaoPrincipalHtml: buildAcaoPrincipal(propAtualizada, persona, availableAtualizada, user),
        historico: filtrarHistoricoParaCorreicionado(propAtualizada.historico),
        historicoNota:
          "São exibidos os atos formais e comunicações dirigidas a você. Avaliações internas da CN e rascunhos não constam desta visão.",
        providenciasEditable: false,
      }),
    });
    bindCorreicionadoHandlers(propAtualizada, user);
    return;
  }

  mountPage({
    activePage: "proposicao-detalhe",
    title: "Detalhe da proposição",
    subtitle:
      "Painel completo do caso: a ação da sua persona em destaque e o dossiê (diligências, providências e histórico) logo abaixo.",
    actions: `${baseActions}${botaoVoltar()}`,
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
};

render();
