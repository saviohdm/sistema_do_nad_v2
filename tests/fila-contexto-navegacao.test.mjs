import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMINHO_FILA_DECISAO,
  CONTEXTO_NAVEGACAO_DECISAO_KEY,
  lerContextoNavegacaoFila,
  resolverDestinoNavegacaoFila,
  salvarContextoNavegacaoFila,
} from "../assets/js/ui/fila-contexto-navegacao.js";

const criarStorage = () => {
  const dados = new Map();
  return {
    getItem: (key) => dados.get(key) ?? null,
    setItem: (key, value) => dados.set(key, String(value)),
  };
};

const salvarELer = (ids = ["prop-a", "prop-b", "prop-c"]) => {
  const storage = criarStorage();
  assert.equal(
    salvarContextoNavegacaoFila({
      storage,
      key: CONTEXTO_NAVEGACAO_DECISAO_KEY,
      ids,
      returnHref: "/pages/corregedor-decisao.html?prioridade=urgente&fila=1",
    }),
    true,
  );
  return lerContextoNavegacaoFila({
    storage,
    key: CONTEXTO_NAVEGACAO_DECISAO_KEY,
    caminhoPermitido: CAMINHO_FILA_DECISAO,
  });
};

test("preserva a ordem e a URL exata da fila filtrada", () => {
  const contexto = salvarELer(["prop-c", "prop-a", "prop-b"]);

  assert.deepEqual(contexto.ids, ["prop-c", "prop-a", "prop-b"]);
  assert.equal(
    contexto.returnHref,
    "/pages/corregedor-decisao.html?prioridade=urgente&fila=1",
  );
});

test("falha com segurança quando o armazenamento da sessão está indisponível", () => {
  const storage = {
    setItem() {
      throw new Error("indisponível");
    },
  };

  assert.equal(
    salvarContextoNavegacaoFila({
      storage,
      key: "fila",
      ids: ["prop-a"],
      returnHref: "/pages/corregedor-decisao.html?fila=1",
    }),
    false,
  );
});

test("resolve o próximo item válido na ordem registrada", () => {
  const destino = resolverDestinoNavegacaoFila({
    contexto: salvarELer(),
    currentId: "prop-a",
    validIds: ["prop-b", "prop-c"],
  });

  assert.deepEqual(destino, {
    type: "next",
    nextId: "prop-b",
    returnHref: "/pages/corregedor-decisao.html?prioridade=urgente&fila=1",
  });
});

test("ignora itens posteriores que já saíram da mesa de decisão", () => {
  const destino = resolverDestinoNavegacaoFila({
    contexto: salvarELer(),
    currentId: "prop-a",
    validIds: ["prop-c"],
  });

  assert.equal(destino.type, "next");
  assert.equal(destino.nextId, "prop-c");
});

test("distingue último item de lista esgotada por alterações externas", () => {
  const contexto = salvarELer();

  assert.equal(
    resolverDestinoNavegacaoFila({ contexto, currentId: "prop-c", validIds: [] }).type,
    "last",
  );
  assert.equal(
    resolverDestinoNavegacaoFila({ contexto, currentId: "prop-a", validIds: [] }).type,
    "exhausted",
  );
});

test("retorna missing para snapshot ausente, corrompido ou sem o item atual", () => {
  const storage = criarStorage();
  storage.setItem(CONTEXTO_NAVEGACAO_DECISAO_KEY, "{invalido");
  const contextoCorrompido = lerContextoNavegacaoFila({
    storage,
    key: CONTEXTO_NAVEGACAO_DECISAO_KEY,
    caminhoPermitido: CAMINHO_FILA_DECISAO,
  });

  assert.equal(contextoCorrompido, null);
  assert.deepEqual(
    resolverDestinoNavegacaoFila({ contexto: null, currentId: "prop-a", validIds: [] }),
    { type: "missing" },
  );
  assert.deepEqual(
    resolverDestinoNavegacaoFila({
      contexto: salvarELer(),
      currentId: "prop-inexistente",
      validIds: [],
    }),
    { type: "missing" },
  );
});

test("rejeita URL externa ou de outra página como retorno", () => {
  const storage = criarStorage();
  salvarContextoNavegacaoFila({
    storage,
    key: CONTEXTO_NAVEGACAO_DECISAO_KEY,
    ids: ["prop-a"],
    returnHref: "https://example.com/pages/corregedor-decisao.html",
  });

  assert.equal(
    lerContextoNavegacaoFila({
      storage,
      key: CONTEXTO_NAVEGACAO_DECISAO_KEY,
      caminhoPermitido: CAMINHO_FILA_DECISAO,
    }),
    null,
  );
});
