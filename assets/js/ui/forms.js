import {
  Labels,
  SituacaoJuizo,
  TipoConclusao,
  TipoProvidencia,
} from "../domain/enums.js";

const renderOptions = (entries, selectedValue) =>
  entries
    .map(
      ([value, label]) =>
        `<option value="${value}"${String(selectedValue) === String(value) ? " selected" : ""}>${label}</option>`,
    )
    .join("");

const conclusaoEntries = Object.entries(Labels.tipoConclusao);
const providenciaEntries = Object.entries(Labels.tipoProvidencia);

export const renderJuizoForm = ({
  formId,
  title,
  submitLabel,
  includeDelete = false,
  initialJuizo = null,
  includeRascunho = false,
}) => {
  const j = initialJuizo || {};
  const situacaoValue = j.situacao || SituacaoJuizo.CONCLUIDA;
  const tipoConclusaoValue = j.tipoConclusao || "";
  const existeProvidenciaValue = j.existeProvidenciaSecretaria ? "true" : "false";
  const tipoProvidenciaValue = j.tipoProvidencia || "";
  const observacoesValue = j.observacoes || "";

  const situacaoOpts = renderOptions(
    [
      [SituacaoJuizo.CONCLUIDA, "Concluída"],
      [SituacaoJuizo.NECESSITA_MAIS_INFORMACOES, "Necessita mais informações"],
    ],
    situacaoValue,
  );

  const conclusaoOpts = `<option value="">Selecione</option>${renderOptions(conclusaoEntries, tipoConclusaoValue)}`;

  const providenciaOpts = `<option value="">Selecione</option>${renderOptions(providenciaEntries, tipoProvidenciaValue)}`;

  const existeProvidenciaOpts = renderOptions(
    [
      ["false", "Não"],
      ["true", "Sim"],
    ],
    existeProvidenciaValue,
  );

  return `
    <form class="panel stack" id="${formId}" data-has-rascunho="${initialJuizo ? "true" : "false"}">
      <h3 class="panel__title">${title}</h3>
      <div class="field-grid">
        <div class="field">
          <label for="${formId}-situacao">Situação</label>
          <select id="${formId}-situacao" name="situacao" required>
            ${situacaoOpts}
          </select>
        </div>
        <div class="field">
          <label for="${formId}-tipoConclusao">Tipo de conclusão</label>
          <select id="${formId}-tipoConclusao" name="tipoConclusao">
            ${conclusaoOpts}
          </select>
        </div>
        <div class="field">
          <label for="${formId}-existeProvidenciaSecretaria">Existe providência da Secretaria?</label>
          <select id="${formId}-existeProvidenciaSecretaria" name="existeProvidenciaSecretaria">
            ${existeProvidenciaOpts}
          </select>
        </div>
        <div class="field">
          <label for="${formId}-tipoProvidencia">Tipo de providência</label>
          <select id="${formId}-tipoProvidencia" name="tipoProvidencia">
            ${providenciaOpts}
          </select>
        </div>
      </div>
      <div class="field">
        <label for="${formId}-observacoes">Avaliação</label>
        <textarea id="${formId}-observacoes" name="observacoes">${observacoesValue}</textarea>
      </div>
      <div class="button-row">
        <button class="button" type="submit">${submitLabel}</button>
        ${
          includeRascunho
            ? `<button class="button button--ghost" type="button" data-action="salvar-rascunho">Salvar rascunho</button>`
            : ""
        }
        ${
          includeDelete
            ? `<button class="button button--danger" type="button" data-action="remover-avaliacao">Apagar avaliação vigente</button>`
            : ""
        }
      </div>
      <p class="inline-note" data-role="rascunho-feedback" hidden></p>
    </form>
  `;
};

export const aplicarRegrasJuizoForm = (form) => {
  const situacaoSel = form.querySelector('[name="situacao"]');
  const tipoConclusaoSel = form.querySelector('[name="tipoConclusao"]');
  const existeProvSel = form.querySelector('[name="existeProvidenciaSecretaria"]');
  const tipoProvSel = form.querySelector('[name="tipoProvidencia"]');
  if (!situacaoSel || !tipoConclusaoSel || !existeProvSel || !tipoProvSel) return;

  const conclusaoAtiva = situacaoSel.value === SituacaoJuizo.CONCLUIDA;
  tipoConclusaoSel.disabled = !conclusaoAtiva;
  if (!conclusaoAtiva) tipoConclusaoSel.value = "";

  const cabeProvidencia =
    conclusaoAtiva &&
    (tipoConclusaoSel.value === TipoConclusao.PARCIALMENTE_CUMPRIDA ||
      tipoConclusaoSel.value === TipoConclusao.NAO_CUMPRIDA);
  existeProvSel.disabled = !cabeProvidencia;
  if (!cabeProvidencia) existeProvSel.value = "false";

  const providenciaAtiva = cabeProvidencia && existeProvSel.value === "true";
  tipoProvSel.disabled = !providenciaAtiva;
  if (!providenciaAtiva) tipoProvSel.value = "";
};

export const readJuizoForm = (form) => {
  const data = new FormData(form);
  const situacao = data.get("situacao");
  const tipoConclusao = data.get("tipoConclusao") || null;
  const existeProvidenciaSecretaria = data.get("existeProvidenciaSecretaria") === "true";
  const tipoProvidencia = data.get("tipoProvidencia") || null;
  const observacoes = data.get("observacoes")?.trim() || null;

  return {
    situacao,
    tipoConclusao: situacao === SituacaoJuizo.CONCLUIDA ? tipoConclusao : null,
    existeProvidenciaSecretaria:
      situacao === SituacaoJuizo.CONCLUIDA &&
      [TipoConclusao.PARCIALMENTE_CUMPRIDA, TipoConclusao.NAO_CUMPRIDA].includes(tipoConclusao)
        ? existeProvidenciaSecretaria
        : false,
    tipoProvidencia:
      situacao === SituacaoJuizo.CONCLUIDA &&
      [TipoConclusao.PARCIALMENTE_CUMPRIDA, TipoConclusao.NAO_CUMPRIDA].includes(tipoConclusao) &&
      existeProvidenciaSecretaria
        ? tipoProvidencia
        : null,
    observacoes,
  };
};

export const lerJuizoParcial = (form) => {
  const data = new FormData(form);
  const situacao = data.get("situacao") || null;
  const tipoConclusao = data.get("tipoConclusao") || null;
  const existeProvidenciaSecretaria = data.get("existeProvidenciaSecretaria") === "true";
  const tipoProvidencia = data.get("tipoProvidencia") || null;
  const observacoes = data.get("observacoes")?.trim() || null;

  return {
    situacao,
    tipoConclusao,
    existeProvidenciaSecretaria,
    tipoProvidencia,
    observacoes,
  };
};
