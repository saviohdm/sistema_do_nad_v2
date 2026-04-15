import {
  Labels,
  SituacaoJuizo,
  TipoConclusao,
  TipoProvidencia,
} from "../domain/enums.js";

const conclusaoOptions = Object.entries(Labels.tipoConclusao)
  .map(([value, label]) => `<option value="${value}">${label}</option>`)
  .join("");

const providenciaOptions = Object.entries(Labels.tipoProvidencia)
  .map(([value, label]) => `<option value="${value}">${label}</option>`)
  .join("");

export const renderJuizoForm = ({ formId, title, submitLabel, includeDelete = false }) => `
  <form class="panel stack" id="${formId}">
    <h3 class="panel__title">${title}</h3>
    <div class="field-grid">
      <div class="field">
        <label for="${formId}-situacao">Situação</label>
        <select id="${formId}-situacao" name="situacao" required>
          <option value="${SituacaoJuizo.CONCLUIDA}">Concluída</option>
          <option value="${SituacaoJuizo.NECESSITA_MAIS_INFORMACOES}">Necessita mais informações</option>
        </select>
      </div>
      <div class="field">
        <label for="${formId}-tipoConclusao">Tipo de conclusão</label>
        <select id="${formId}-tipoConclusao" name="tipoConclusao">
          <option value="">Selecione</option>
          ${conclusaoOptions}
        </select>
      </div>
      <div class="field">
        <label for="${formId}-existeProvidenciaSecretaria">Existe providência da Secretaria?</label>
        <select id="${formId}-existeProvidenciaSecretaria" name="existeProvidenciaSecretaria">
          <option value="false">Não</option>
          <option value="true">Sim</option>
        </select>
      </div>
      <div class="field">
        <label for="${formId}-tipoProvidencia">Tipo de providência</label>
        <select id="${formId}-tipoProvidencia" name="tipoProvidencia">
          <option value="">Selecione</option>
          ${providenciaOptions}
        </select>
      </div>
    </div>
    <div class="field">
      <label for="${formId}-observacoes">Observações</label>
      <textarea id="${formId}-observacoes" name="observacoes"></textarea>
    </div>
    <div class="button-row">
      <button class="button" type="submit">${submitLabel}</button>
      ${
        includeDelete
          ? `<button class="button button--danger" type="button" data-action="remover-avaliacao">Apagar avaliação vigente</button>`
          : ""
      }
    </div>
  </form>
`;

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
