import {
  criarNomeBaseRelatorioDecisao,
  serializarRelatorioDecisaoJson,
} from "../domain/relatorio-decisao.js";
import { openModal } from "./modal.js";
import { criarDefinicaoPdfRelatorioDecisao } from "./relatorio-decisao-pdf.js";
import { baixarBlob, carregarPdfMake } from "./pdf-runtime.js";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const baixarRelatorioDecisaoJson = (snapshot) => {
  const nomeBase = criarNomeBaseRelatorioDecisao(snapshot);
  const conteudo = serializarRelatorioDecisaoJson(snapshot);
  baixarBlob(new Blob([conteudo], { type: "application/json;charset=utf-8" }), `${nomeBase}.json`);
  return `${nomeBase}.json`;
};

export const baixarRelatorioDecisaoPdf = async (snapshot) => {
  const pdfMake = await carregarPdfMake();
  const nomeArquivo = `${criarNomeBaseRelatorioDecisao(snapshot)}.pdf`;
  const definicao = criarDefinicaoPdfRelatorioDecisao(snapshot);
  const blob = await pdfMake.createPdf(definicao).getBlob();
  baixarBlob(blob, nomeArquivo);
  return nomeArquivo;
};

const renderFiltros = (snapshot) =>
  snapshot.recorte.resumo_legivel
    .map((filtro) => `<li>${escapeHtml(filtro)}</li>`)
    .join("");

const renderItensIncluidos = (snapshot) =>
  snapshot.proposicoes
    .map((item) => {
      const proposicao = item.proposicao;
      const contexto = [proposicao.correicao_id, proposicao.destinatario?.nome]
        .filter(Boolean)
        .join(" · ");
      return `<li><strong>${escapeHtml(proposicao.numero || proposicao.id)}</strong>${
        contexto ? `<span>${escapeHtml(contexto)}</span>` : ""
      }</li>`;
    })
    .join("");

const getTituloModal = (snapshot) => {
  const modo = snapshot.recorte.modo?.codigo;
  if (modo === "selecionadas") return "Gerar relatório das selecionadas";
  if (modo === "individual") return "Gerar relatório da proposição";
  return "Gerar relatório das filtradas";
};

const atualizarStatus = (root, formato, { estado, mensagem }) => {
  const status = root.querySelector(`[data-relatorio-status="${formato}"]`);
  if (!status) return;
  status.className = `relatorio-modal__status relatorio-modal__status--${estado}`;
  status.textContent = mensagem;
};

const executarDownload = async ({ root, formato, acao }) => {
  const button = root.querySelector(`[data-download-relatorio="${formato}"]`);
  if (!button || button.disabled) return;
  const labelOriginal = button.textContent;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = formato === "pdf" ? "Gerando PDF..." : "Preparando JSON...";
  atualizarStatus(root, formato, { estado: "processando", mensagem: "Preparando arquivo..." });
  try {
    const nomeArquivo = await acao();
    atualizarStatus(root, formato, {
      estado: "sucesso",
      mensagem: `${nomeArquivo} gerado com sucesso. Você pode baixar novamente.`,
    });
  } catch (error) {
    console.error(error);
    atualizarStatus(root, formato, {
      estado: "erro",
      mensagem: "Não foi possível gerar o arquivo. Tente novamente.",
    });
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.textContent = labelOriginal;
  }
};

export const openRelatorioDecisaoModal = (snapshot) => {
  if (!snapshot?.recorte?.total_proposicoes) return null;
  const total = snapshot.recorte.total_proposicoes;
  const bodyHtml = `
    <section class="relatorio-modal" aria-describedby="relatorio-modal-intro">
      <div class="relatorio-modal__masthead">
        <p class="relatorio-modal__overline">NAD · Corregedoria Nacional</p>
        <p id="relatorio-modal-intro" class="relatorio-modal__intro">
          Confira o recorte abaixo. Os dois formatos usam o mesmo instantâneo e preservam os textos integrais.
        </p>
        <div class="relatorio-modal__metricas" aria-label="Resumo do relatório">
          <div><strong>${total}</strong><span>${total === 1 ? "proposição" : "proposições"}</span></div>
          <div><strong>${snapshot.recorte.contem_sensiveis ? "Sim" : "Não"}</strong><span>contém sensíveis</span></div>
          <div><strong>${escapeHtml(snapshot.versao_esquema)}</strong><span>esquema JSON</span></div>
        </div>
      </div>

      ${
        snapshot.recorte.contem_sensiveis
          ? `<div class="relatorio-modal__alerta" role="note"><strong>Atenção:</strong> o relatório contém textos integrais de proposições sensíveis e deve circular apenas por canal institucional.</div>`
          : ""
      }

      <div class="relatorio-modal__recorte">
        <div class="relatorio-modal__escopo">
          <div>
            <p class="relatorio-modal__label">Recorte do relatório</p>
            <p class="relatorio-modal__modo">${escapeHtml(snapshot.recorte.modo?.rotulo || "Proposições filtradas")}</p>
          </div>
          <ul class="relatorio-modal__filtros">${renderFiltros(snapshot)}</ul>
          <div>
            <p class="relatorio-modal__label">Proposições incluídas</p>
            <ol class="relatorio-modal__itens">${renderItensIncluidos(snapshot)}</ol>
          </div>
        </div>
        <div class="relatorio-modal__identificador">
          <span>Instantâneo</span>
          <code>${escapeHtml(snapshot.id_relatorio)}</code>
          <small>${escapeHtml(snapshot.geracao.gerado_em_local)}</small>
        </div>
      </div>

      <div class="relatorio-modal__formatos">
        <article class="relatorio-formato relatorio-formato--pdf">
          <header>
            <span class="relatorio-formato__sigla" aria-hidden="true">PDF</span>
            <div><h3>Conferência da chefia</h3><p>A4, leitura editorial, paginação e marcação de conteúdo sensível.</p></div>
          </header>
          <button class="button" type="button" data-download-relatorio="pdf">Baixar PDF</button>
          <p class="relatorio-modal__status" data-relatorio-status="pdf" role="status" aria-live="polite">Pronto para gerar.</p>
        </article>

        <article class="relatorio-formato relatorio-formato--json">
          <header>
            <span class="relatorio-formato__sigla" aria-hidden="true">JSON</span>
            <div><h3>Manipulação com IA</h3><p>Estrutura versionada e um texto consolidado por proposição, sem HTML.</p></div>
          </header>
          <button class="button button--secondary" type="button" data-download-relatorio="json">Baixar JSON</button>
          <p class="relatorio-modal__status" data-relatorio-status="json" role="status" aria-live="polite">Pronto para gerar.</p>
        </article>
      </div>

      <footer class="relatorio-modal__footer">
        <span>Uso interno · nenhum download altera o histórico das proposições.</span>
        <button class="button button--ghost" type="button" data-modal-close>Fechar</button>
      </footer>
    </section>
  `;

  return openModal({
    title: getTituloModal(snapshot),
    bodyHtml,
    size: "relatorio",
    initialFocusSelector: '[data-download-relatorio="pdf"]',
    onMount: (root) => {
      root.querySelector('[data-download-relatorio="pdf"]')?.addEventListener("click", () =>
        executarDownload({
          root,
          formato: "pdf",
          acao: () => baixarRelatorioDecisaoPdf(snapshot),
        }),
      );
      root.querySelector('[data-download-relatorio="json"]')?.addEventListener("click", () =>
        executarDownload({
          root,
          formato: "json",
          acao: () => baixarRelatorioDecisaoJson(snapshot),
        }),
      );
    },
  });
};
