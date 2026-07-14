import {
  Labels,
  SituacaoApreciacao,
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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const conclusaoEntries = Object.entries(Labels.tipoConclusao);
const providenciaEntries = Object.entries(Labels.tipoProvidencia);
const tiposConclusaoValidos = new Set(Object.values(TipoConclusao));

export const renderApreciacaoForm = ({
  formId,
  title,
  submitLabel,
  includeDelete = false,
  initialApreciacao = null,
  includeRascunho = false,
  variant = "panel",
}) => {
  const j = initialApreciacao || {};
  const situacaoValue = j.situacao || SituacaoApreciacao.CONCLUIDA;
  const tipoConclusaoValue = j.tipoConclusao || "";
  const existeProvidenciaValue = j.existeProvidenciaSecretaria ? "true" : "false";
  const tipoProvidenciaValue = j.tipoProvidencia || "";
  const descricaoProvidenciaValue = j.descricaoProvidencia || "";
  const observacoesValue = j.observacoes || "";

  const situacaoOpts = renderOptions(
    [
      [SituacaoApreciacao.CONCLUIDA, "Concluída"],
      [SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES, "Necessita mais informações"],
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

  const formClass = variant === "bare" ? "stack" : "panel stack";

  return `
    <form class="${formClass}" id="${formId}" data-has-rascunho="${initialApreciacao ? "true" : "false"}">
      ${title ? `<h3 class="panel__title">${title}</h3>` : ""}
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
          <select id="${formId}-tipoProvidencia" name="tipoProvidencia" aria-controls="${formId}-descricaoProvidencia-field">
            ${providenciaOpts}
          </select>
        </div>
      </div>
      <div class="field hidden" id="${formId}-descricaoProvidencia-field" data-role="descricao-providencia-field" hidden>
        <label for="${formId}-descricaoProvidencia">Descrição da providência</label>
        <textarea id="${formId}-descricaoProvidencia" name="descricaoProvidencia" placeholder="Descreva objetivamente a providência a ser cumprida.">${escapeHtml(descricaoProvidenciaValue)}</textarea>
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
          includeRascunho && initialApreciacao
            ? `<button class="button button--ghost" type="button" data-action="descartar-rascunho">Descartar rascunho</button>`
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

export const aplicarRegrasApreciacaoForm = (form) => {
  const situacaoSel = form.querySelector('[name="situacao"]');
  const tipoConclusaoSel = form.querySelector('[name="tipoConclusao"]');
  const existeProvSel = form.querySelector('[name="existeProvidenciaSecretaria"]');
  const tipoProvSel = form.querySelector('[name="tipoProvidencia"]');
  const descricaoProvField = form.querySelector('[data-role="descricao-providencia-field"]');
  const descricaoProvInput = form.querySelector('[name="descricaoProvidencia"]');
  if (
    !situacaoSel ||
    !tipoConclusaoSel ||
    !existeProvSel ||
    !tipoProvSel ||
    !descricaoProvField ||
    !descricaoProvInput
  ) return;

  const conclusaoAtiva = situacaoSel.value === SituacaoApreciacao.CONCLUIDA;
  tipoConclusaoSel.disabled = !conclusaoAtiva;
  if (!conclusaoAtiva) tipoConclusaoSel.value = "";

  const cabeProvidencia =
    conclusaoAtiva && tiposConclusaoValidos.has(tipoConclusaoSel.value);
  existeProvSel.disabled = !cabeProvidencia;
  if (!cabeProvidencia) existeProvSel.value = "false";

  const providenciaAtiva = cabeProvidencia && existeProvSel.value === "true";
  tipoProvSel.disabled = !providenciaAtiva;
  tipoProvSel.required = providenciaAtiva;
  if (!providenciaAtiva) tipoProvSel.value = "";

  const outraProvidenciaAtiva =
    providenciaAtiva && tipoProvSel.value === TipoProvidencia.OUTRA;
  descricaoProvField.hidden = !outraProvidenciaAtiva;
  descricaoProvField.classList.toggle("hidden", !outraProvidenciaAtiva);
  descricaoProvInput.disabled = !outraProvidenciaAtiva;
  descricaoProvInput.required = outraProvidenciaAtiva;
  descricaoProvInput.setCustomValidity(
    outraProvidenciaAtiva && !descricaoProvInput.value.trim()
      ? "Descreva a outra providência."
      : "",
  );
  if (!outraProvidenciaAtiva) descricaoProvInput.value = "";
};

export const readApreciacaoForm = (form) => {
  const data = new FormData(form);
  const situacao = data.get("situacao");
  const tipoConclusao = data.get("tipoConclusao") || null;
  const existeProvidenciaSecretaria = data.get("existeProvidenciaSecretaria") === "true";
  const tipoProvidencia = data.get("tipoProvidencia") || null;
  const descricaoProvidencia = data.get("descricaoProvidencia")?.trim() || null;
  const observacoes = data.get("observacoes")?.trim() || null;
  const providenciaPermitida =
    situacao === SituacaoApreciacao.CONCLUIDA && tiposConclusaoValidos.has(tipoConclusao);
  const providenciaAtiva = providenciaPermitida && existeProvidenciaSecretaria;

  return {
    situacao,
    tipoConclusao: situacao === SituacaoApreciacao.CONCLUIDA ? tipoConclusao : null,
    existeProvidenciaSecretaria: providenciaPermitida ? existeProvidenciaSecretaria : false,
    tipoProvidencia: providenciaAtiva ? tipoProvidencia : null,
    descricaoProvidencia:
      providenciaAtiva && tipoProvidencia === TipoProvidencia.OUTRA
        ? descricaoProvidencia
        : null,
    observacoes,
  };
};

export const lerApreciacaoParcial = (form) => {
  const data = new FormData(form);
  const situacao = data.get("situacao") || null;
  const tipoConclusao = data.get("tipoConclusao") || null;
  const existeProvidenciaSecretaria = data.get("existeProvidenciaSecretaria") === "true";
  const tipoProvidencia = data.get("tipoProvidencia") || null;
  const descricaoProvidencia = data.get("descricaoProvidencia")?.trim() || null;
  const observacoes = data.get("observacoes")?.trim() || null;

  return {
    situacao,
    tipoConclusao,
    existeProvidenciaSecretaria,
    tipoProvidencia,
    descricaoProvidencia,
    observacoes,
  };
};
