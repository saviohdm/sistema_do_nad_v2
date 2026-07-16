import assert from "node:assert/strict";
import test from "node:test";

import { renderContextoSection } from "../assets/js/ui/components.js";

const MENSAGEM_SEM_CONTEXTO = "Sem informações de contexto.";

test("sempre renderiza o painel de contexto colapsado por padrão", () => {
  const html = renderContextoSection({ id: "prop-sem-contexto" });

  assert.match(
    html,
    /<details class="panel contexto-panel" data-contexto-panel>/,
  );
  assert.match(html, /<h3 class="panel__title">Contexto<\/h3>/);
  assert.match(html, new RegExp(MENSAGEM_SEM_CONTEXTO.replace(".", "\\.")));
  assert.doesNotMatch(html, /data-contexto-panel open/);
});

test("trata valores vazios na raiz como ausência de contexto", () => {
  for (const contexto of [null, undefined, "", "   ", {}, []]) {
    const html = renderContextoSection({ contexto });

    assert.match(html, new RegExp(MENSAGEM_SEM_CONTEXTO.replace(".", "\\.")));
  }
});

test("trata estruturas aninhadas sem informação útil como contexto vazio", () => {
  const contexto = {
    origem: "  ",
    detalhes: {
      observacoes: null,
      itens: [undefined, "", { complemento: [] }],
    },
  };

  const html = renderContextoSection({ contexto });

  assert.match(html, new RegExp(MENSAGEM_SEM_CONTEXTO.replace(".", "\\.")));
  assert.doesNotMatch(html, /Origem|Detalhes|Observacoes|Itens|Complemento/);
});

test("preserva zero e false como informações válidas", () => {
  const html = renderContextoSection({
    contexto: { total: 0, ativo: false },
  });

  assert.doesNotMatch(html, new RegExp(MENSAGEM_SEM_CONTEXTO.replace(".", "\\.")));
  assert.match(html, />Total<\/span>/);
  assert.match(html, />0<\/div>/);
  assert.match(html, />Ativo<\/span>/);
  assert.match(html, />Não<\/div>/);
});

test("mantém a renderização livre para contexto preenchido", () => {
  const html = renderContextoSection({
    contexto: { procedimentoAnalisado: { numero: "IC 123" } },
  });

  assert.doesNotMatch(html, new RegExp(MENSAGEM_SEM_CONTEXTO.replace(".", "\\.")));
  assert.match(html, />Procedimento analisado<\/span>/);
  assert.match(html, />Numero<\/span>/);
  assert.match(html, /IC 123/);
});

test("abre o painel somente quando a opção aberto é verdadeira", () => {
  const fechado = renderContextoSection({ contexto: "Informação" });
  const aberto = renderContextoSection(
    { contexto: "Informação" },
    { aberto: true },
  );

  assert.doesNotMatch(fechado, /data-contexto-panel open/);
  assert.match(aberto, /data-contexto-panel open>/);
});
