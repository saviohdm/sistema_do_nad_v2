import assert from "node:assert/strict";
import test from "node:test";

import {
  renderApreciacaoResumo,
  renderFilaProposicaoEditorial,
  renderTextParagraphs,
} from "../assets/js/ui/components.js";

test("renderiza texto jurídico escapado em parágrafos sem interpretar marcação", () => {
  const html = renderTextParagraphs(
    "Primeiro <parágrafo> & conteúdo.\n\nSegundo parágrafo.\ncontinuação\n\n**PROPOSIÇÃO:** literal.",
  );

  assert.equal((html.match(/<p>/g) || []).length, 3);
  assert.match(html, /Primeiro &lt;parágrafo&gt; &amp; conteúdo\./);
  assert.match(html, /Segundo parágrafo\. continuação/);
  assert.match(html, /\*\*PROPOSIÇÃO:\*\* literal\./);
  assert.doesNotMatch(html, /<parágrafo>/);
});

test("resumo de apreciação preserva todos os parágrafos da fundamentação", () => {
  const html = renderApreciacaoResumo({
    situacao: "concluida",
    tipoConclusao: "prejudicada",
    existeProvidenciaSecretaria: false,
    observacoes: "Fundamento inicial.\n\nFundamento final.",
  });

  assert.equal((html.match(/<p>/g) || []).length, 2);
  assert.match(html, /Fundamento inicial\./);
  assert.match(html, /Fundamento final\./);
});

test("fila mantém a descrição completa e escapada no DOM com clamp de três linhas", () => {
  const sufixo = "trecho final que não pode ser removido";
  const descricao = `${"Descrição extensa com conteúdo jurídico. ".repeat(12)}<teste> & ${sufixo}`;
  const html = renderFilaProposicaoEditorial(
    {
      id: "prop-teste",
      numero: "PROP-2026-9999",
      tipo: "Recomendação",
      unidade: "Unidade de teste",
      descricao,
      prioridade: "normal",
      historico: [],
    },
    { href: "/detalhe" },
  );

  assert.match(html, /text-clamp text-clamp--3/);
  assert.match(html, new RegExp(sufixo));
  assert.match(html, /&lt;teste&gt; &amp;/);
  assert.doesNotMatch(html, /\.\.\./);
  assert.doesNotMatch(html, /descriptionLimit/);
});
