import assert from "node:assert/strict";
import test from "node:test";

import { SituacaoApreciacao, TipoConclusao } from "../assets/js/domain/enums.js";
import {
  renderApreciacaoForm,
  vincularRedacaoAutomaticaApreciacaoForm,
} from "../assets/js/ui/forms.js";

const baseOptions = {
  formId: "form-teste",
  submitLabel: "Registrar decisão",
};

const REDACAO_PADRAO =
  "Acolho a comprovação apresentada, por demonstrar o cumprimento integral da proposição do CNMP.";

const apreciacaoPadrao = {
  situacao: SituacaoApreciacao.CONCLUIDA,
  tipoConclusao: TipoConclusao.CUMPRIDA,
  existeProvidenciaSecretaria: false,
  tipoProvidencia: null,
  descricaoProvidencia: null,
  observacoes: REDACAO_PADRAO,
};

const criarFormularioFake = (observacoesValue = REDACAO_PADRAO) => {
  const listeners = new Map();
  const observacoes = { name: "observacoes", value: observacoesValue };
  const form = {
    querySelector: (selector) => selector === '[name="observacoes"]' ? observacoes : null,
    addEventListener: (tipo, listener) => {
      const registrados = listeners.get(tipo) || [];
      registrados.push(listener);
      listeners.set(tipo, registrados);
    },
  };
  const disparar = (tipo, target) => {
    (listeners.get(tipo) || []).forEach((listener) => listener({ target }));
  };
  return { form, observacoes, disparar };
};

test("agrupa semanticamente as invariantes sem exigir um título visual", () => {
  const html = renderApreciacaoForm({
    ...baseOptions,
    ariaLabel: "Decisão substitutiva",
    invariantesLegend: "Novas invariantes da decisão substitutiva",
  });

  assert.match(html, /<form[^>]+aria-label="Decisão substitutiva"/);
  assert.match(html, /<fieldset class="apreciacao-invariantes">/);
  assert.match(html, /<legend>Novas invariantes da decisão substitutiva<\/legend>/);
  assert.doesNotMatch(html, /<h3 class="panel__title">/);
});

test("preserva o título dos formulários compartilhados quando informado", () => {
  const html = renderApreciacaoForm({
    ...baseOptions,
    title: "Minuta de decisão",
  });

  assert.match(html, /<h3 class="panel__title">Minuta de decisão<\/h3>/);
  assert.doesNotMatch(html, /<fieldset class="apreciacao-invariantes">/);
});

test("preenche uma minuta nova sem tratá-la como rascunho", () => {
  const html = renderApreciacaoForm({
    ...baseOptions,
    defaultApreciacao: apreciacaoPadrao,
    includeRascunho: true,
  });

  assert.match(html, /data-has-rascunho="false"/);
  assert.match(html, /<option value="cumprida" selected>Cumprida<\/option>/);
  assert.match(html, new RegExp(`name="observacoes"[\\s\\S]*>${REDACAO_PADRAO}<\\/textarea>`));
  assert.doesNotMatch(html, /data-action="descartar-rascunho"/);
});

test("rascunho incompleto prevalece integralmente sobre os padrões", () => {
  const html = renderApreciacaoForm({
    ...baseOptions,
    defaultApreciacao: apreciacaoPadrao,
    initialApreciacao: {
      situacao: SituacaoApreciacao.CONCLUIDA,
      tipoConclusao: null,
      observacoes: null,
    },
    includeRascunho: true,
  });

  assert.match(html, /data-has-rascunho="true"/);
  assert.doesNotMatch(html, /<option value="cumprida" selected>/);
  assert.doesNotMatch(html, new RegExp(REDACAO_PADRAO));
  assert.match(html, /data-action="descartar-rascunho"/);
});

test("trocar conclusão ou situação limpa uma única vez a redação automática", () => {
  for (const campo of ["tipoConclusao", "situacao"]) {
    const { form, observacoes, disparar } = criarFormularioFake();
    vincularRedacaoAutomaticaApreciacaoForm(form, { ativa: true });

    disparar("change", { name: campo });
    assert.equal(observacoes.value, "");

    disparar("change", { name: campo });
    assert.equal(observacoes.value, "");
  }
});

test("a primeira edição manual protege a redação contra limpeza", () => {
  const { form, observacoes, disparar } = criarFormularioFake();
  vincularRedacaoAutomaticaApreciacaoForm(form, { ativa: true });

  observacoes.value = `${REDACAO_PADRAO} Sem ressalvas.`;
  disparar("input", observacoes);
  disparar("change", { name: "tipoConclusao" });

  assert.equal(observacoes.value, `${REDACAO_PADRAO} Sem ressalvas.`);
});

test("salvar o modelo como rascunho protege o conteúdo em mudanças posteriores", () => {
  const { form, observacoes, disparar } = criarFormularioFake();
  const controlador = vincularRedacaoAutomaticaApreciacaoForm(form, { ativa: true });

  controlador.marcarComoPersistida();
  disparar("change", { name: "tipoConclusao" });

  assert.equal(observacoes.value, REDACAO_PADRAO);
});

test("redação restaurada de rascunho nunca é tratada como automática", () => {
  const { form, observacoes, disparar } = criarFormularioFake("Texto salvo pelo membro.");
  vincularRedacaoAutomaticaApreciacaoForm(form, { ativa: false });

  disparar("change", { name: "situacao" });

  assert.equal(observacoes.value, "Texto salvo pelo membro.");
});
