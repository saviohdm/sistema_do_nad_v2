import assert from "node:assert/strict";
import test from "node:test";

import { renderApreciacaoForm } from "../assets/js/ui/forms.js";

const baseOptions = {
  formId: "form-teste",
  submitLabel: "Registrar decisão",
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
