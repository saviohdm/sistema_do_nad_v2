import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMINHO_FILA_DECISAO,
  CAMINHO_FILA_MINUTA,
  CONTEXTO_NAVEGACAO_DECISAO_KEY,
  CONTEXTO_NAVEGACAO_MINUTA_KEY,
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

const salvarELerMinuta = (ids = ["prop-m1", "prop-m2", "prop-m3"]) => {
  const storage = criarStorage();
  assert.equal(
    salvarContextoNavegacaoFila({
      storage,
      key: CONTEXTO_NAVEGACAO_MINUTA_KEY,
      ids,
      returnHref: "/pages/membro-auxiliar.html?prioridade=urgente&comRascunho=1&fila=1",
    }),
    true,
  );
  return lerContextoNavegacaoFila({
    storage,
    key: CONTEXTO_NAVEGACAO_MINUTA_KEY,
    caminhoPermitido: CAMINHO_FILA_MINUTA,
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

test("preserva a ordem e a URL exata da fila filtrada do membro auxiliar", () => {
  const contexto = salvarELerMinuta(["prop-m3", "prop-m1", "prop-m2"]);

  assert.deepEqual(contexto.ids, ["prop-m3", "prop-m1", "prop-m2"]);
  assert.equal(
    contexto.returnHref,
    "/pages/membro-auxiliar.html?prioridade=urgente&comRascunho=1&fila=1",
  );
});

test("mantém independentes os snapshots das filas de decisão e de minutas", () => {
  const storage = criarStorage();
  salvarContextoNavegacaoFila({
    storage,
    key: CONTEXTO_NAVEGACAO_DECISAO_KEY,
    ids: ["prop-d1", "prop-d2"],
    returnHref: "/pages/corregedor-decisao.html?fila=1",
  });
  salvarContextoNavegacaoFila({
    storage,
    key: CONTEXTO_NAVEGACAO_MINUTA_KEY,
    ids: ["prop-m1", "prop-m2"],
    returnHref: "/pages/membro-auxiliar.html?fila=1",
  });

  assert.deepEqual(
    lerContextoNavegacaoFila({
      storage,
      key: CONTEXTO_NAVEGACAO_DECISAO_KEY,
      caminhoPermitido: CAMINHO_FILA_DECISAO,
    }).ids,
    ["prop-d1", "prop-d2"],
  );
  assert.deepEqual(
    lerContextoNavegacaoFila({
      storage,
      key: CONTEXTO_NAVEGACAO_MINUTA_KEY,
      caminhoPermitido: CAMINHO_FILA_MINUTA,
    }).ids,
    ["prop-m1", "prop-m2"],
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

test("mantém no snapshot da minuta um item ainda válido mesmo após mudança de metadados", () => {
  const destino = resolverDestinoNavegacaoFila({
    contexto: salvarELerMinuta(),
    currentId: "prop-m1",
    validIds: ["prop-m2", "prop-m3"],
  });

  assert.equal(destino.type, "next");
  assert.equal(destino.nextId, "prop-m2");
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

  salvarContextoNavegacaoFila({
    storage,
    key: CONTEXTO_NAVEGACAO_MINUTA_KEY,
    ids: ["prop-m1"],
    returnHref: "/pages/corregedor-decisao.html?fila=1",
  });

  assert.equal(
    lerContextoNavegacaoFila({
      storage,
      key: CONTEXTO_NAVEGACAO_MINUTA_KEY,
      caminhoPermitido: CAMINHO_FILA_MINUTA,
    }),
    null,
  );
});
