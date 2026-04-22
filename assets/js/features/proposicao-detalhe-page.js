import { requireAuth, getCurrentPersona } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { formatDate, formatDateTime, queryParam } from "../app/utils.js";

requireAuth();
import {
  deferirAvaliacao,
  indeferirAvaliacao,
  registrarAvaliacaoComForcaDeDecisao,
  removerAvaliacao,
  salvarAvaliacaoMembro,
} from "../domain/avaliacoes.js";
import { criarDiligencia, registrarComprovacao } from "../domain/diligencias.js";
import { Labels } from "../domain/enums.js";
import {
  getAvaliacaoVigente,
  getAvailableActions,
  getAvailableActionsByPersona,
  getProposicaoById,
} from "../domain/proposicoes.js";
import {
  obterRascunhoAvaliacao,
  removerRascunhoAvaliacao,
  salvarRascunhoAvaliacao,
} from "../domain/rascunhos-avaliacao.js";
import {
  renderDiligenciasCards,
  renderMetaList,
  renderPendenciasCards,
  renderProposicaoHero,
  renderTimeline,
} from "../ui/components.js";
import {
  aplicarRegrasJuizoForm,
  lerJuizoParcial,
  readJuizoForm,
  renderJuizoForm,
} from "../ui/forms.js";

const proposicaoId = queryParam("id") || "prop-003";
const veioDaFilaMembro = queryParam("fromMembro") === "1";

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
    const juizo = readJuizoForm(event.currentTarget);
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
      const juizoParcial = lerJuizoParcial(form);
      const payload = salvarRascunhoAvaliacao(proposicao.id, juizoParcial);
      const feedback = form.querySelector("[data-role='rascunho-feedback']");
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = `Rascunho salvo às ${formatDateTime(payload.savedAt)}.`;
      }
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
    const juizo = readJuizoForm(event.currentTarget);
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
    const juizo = readJuizoForm(event.currentTarget);
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

  ["form-avaliacao-membro", "form-decisao-corregedor", "form-avaliacao-direta"].forEach((id) => {
    const form = document.querySelector(`#${id}`);
    if (!form) return;
    aplicarRegrasJuizoForm(form);
    form.addEventListener("change", (event) => {
      if (["situacao", "tipoConclusao", "existeProvidenciaSecretaria"].includes(event.target.name)) {
        aplicarRegrasJuizoForm(form);
      }
    });
  });
};

const render = () => {
  const currentState = state();
  const proposicao = getProposicaoById(currentState, proposicaoId);

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

  const avaliacaoVigente = getAvaliacaoVigente(proposicao);
  const persona = getCurrentPersona();
  const available = getAvailableActionsByPersona(proposicao, persona);

  const meta = [
    { label: "Número", value: proposicao.numero },
    { label: "Número ELO", value: proposicao.numeroElo },
    { label: "Tipo", value: proposicao.tipo },
    { label: "Prioridade", value: proposicao.prioridade },
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
  ];

  mountPage({
    activePage: "proposicao-detalhe",
    title: "Detalhe da proposição",
    subtitle:
      "Painel completo do caso, com histórico, diligências, pendências da Secretaria e ações condicionadas às regras de domínio.",
    actions: `${baseActions}${veioDaFilaMembro ? `<a class="button button--ghost" href="membro-auxiliar.html">Voltar à fila</a>` : `<a class="button button--ghost" href="proposicoes-lista.html">Voltar à lista</a>`}`,
    content: `
      <section class="stack">
        ${renderProposicaoHero(proposicao)}
        <section class="split-callout">
          <div class="panel">
            <h3 class="panel__title">Metadados do caso</h3>
            ${renderMetaList(meta)}
          </div>
          <div class="panel">
            <h3 class="panel__title">Leitura rápida</h3>
            <div class="stack">
              <div class="status-card">
                <span class="muted">Juízo atual</span>
                <strong>${proposicao.juizoAtual ? Labels.situacaoJuizo[proposicao.juizoAtual.situacao] : "Sem juízo final"}</strong>
              </div>
              <div class="status-card">
                <span class="muted">Conclusão</span>
                <strong>${proposicao.juizoAtual?.tipoConclusao ? Labels.tipoConclusao[proposicao.juizoAtual.tipoConclusao] : "—"}</strong>
              </div>
              <div class="status-card">
                <span class="muted">Observações gerais</span>
                <strong>${proposicao.observacoesGerais || "Sem observações complementares."}</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="page-grid page-grid--two">
          <div class="stack">
            <section class="panel detail-section">
              <h3 class="panel__title">Diligências</h3>
              ${renderDiligenciasCards(proposicao.diligencias)}
            </section>

            <section class="panel detail-section">
              <h3 class="panel__title">Pendências da Secretaria</h3>
              ${renderPendenciasCards(
                proposicao.pendenciasSecretaria.map((item) => ({
                  ...item,
                  __formRef: `${proposicao.id}:${item.id}`,
                })),
              ).replaceAll('data-pendencia-form="', `data-pendencia-form="${proposicao.id}:`)}
            </section>

            <section class="panel detail-section">
              <h3 class="panel__title">Histórico completo</h3>
              ${renderTimeline(proposicao.historico)}
            </section>
          </div>

          <div class="stack">
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
                ? renderJuizoForm({
                    formId: "form-avaliacao-membro",
                    title: "Avaliação do membro auxiliar",
                    submitLabel: "Salvar avaliação",
                    initialJuizo: obterRascunhoAvaliacao(proposicao.id)?.juizo || null,
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
                    <button class="button" type="button" data-action="deferir-avaliacao">Deferir avaliação vigente</button>
                  </section>
                  ${renderJuizoForm({
                    formId: "form-decisao-corregedor",
                    title: "Indeferir e redefinir invariantes",
                    submitLabel: "Registrar decisão de indeferimento",
                    includeDelete: true,
                  })}
                `
                : ""
            }

            ${
              available.podeAvaliarDiretamente
                ? renderJuizoForm({
                    formId: "form-avaliacao-direta",
                    title: "Avaliação com força de decisão",
                    submitLabel: "Avaliar diretamente",
                  })
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
