import assert from "node:assert/strict";
import test from "node:test";

import {
  atualizarSelecaoVisivel,
  carregarEstadoSelecaoRelatorio,
  ordenarProposicoesSelecionadas,
  reconciliarSelecaoRelatorio,
  resumirSelecaoVisivel,
  salvarEstadoSelecaoRelatorio,
} from "../assets/js/ui/relatorio-decisao-selecao.js";

const criarStorage = () => {
  const valores = new Map();
  return {
    getItem: (key) => valores.get(key) ?? null,
    setItem: (key, value) => valores.set(key, value),
    removeItem: (key) => valores.delete(key),
  };
};

const proposicoes = [
  { id: "prop-1", numero: "PROP-1" },
  { id: "prop-2", numero: "PROP-2" },
  { id: "prop-3", numero: "PROP-3" },
];

test("persiste e restaura o modo de seleção com IDs únicos", () => {
  const storage = criarStorage();
  salvarEstadoSelecaoRelatorio(storage, { ativo: true, ids: ["prop-2", "prop-2", "prop-1"] });

  assert.deepEqual(carregarEstadoSelecaoRelatorio(storage), {
    ativo: true,
    ids: ["prop-2", "prop-1"],
  });
});

test("falha com segurança ao restaurar armazenamento corrompido", () => {
  const storage = criarStorage();
  storage.setItem("nad-corregedor-decisao-relatorio-selecao", "{");

  assert.deepEqual(carregarEstadoSelecaoRelatorio(storage), { ativo: false, ids: [] });
});

test("descarta IDs que já não pertencem à fila", () => {
  const reconciliado = reconciliarSelecaoRelatorio(
    { ativo: true, ids: ["prop-3", "obsoleto", "prop-1"] },
    proposicoes,
  );

  assert.deepEqual(reconciliado, { ativo: true, ids: ["prop-3", "prop-1"] });
});

test("selecionar e desmarcar todos altera apenas os itens visíveis", () => {
  const comVisiveis = atualizarSelecaoVisivel(["prop-3"], proposicoes.slice(0, 2), true);
  assert.deepEqual(comVisiveis, ["prop-3", "prop-1", "prop-2"]);

  const semPrimeiro = atualizarSelecaoVisivel(comVisiveis, proposicoes.slice(0, 1), false);
  assert.deepEqual(semPrimeiro, ["prop-3", "prop-2"]);
});

test("resume seleção parcial e contabiliza itens ocultos pelos filtros", () => {
  assert.deepEqual(resumirSelecaoVisivel(proposicoes.slice(0, 2), ["prop-1", "prop-3"]), {
    totalSelecionadas: 2,
    selecionadasVisiveis: 1,
    ocultas: 1,
    estadoTodos: "parcial",
  });
});

test("ordena selecionadas pela fila global, não pela ordem dos cliques", () => {
  assert.deepEqual(
    ordenarProposicoesSelecionadas(proposicoes, ["prop-3", "prop-1"]).map((item) => item.id),
    ["prop-1", "prop-3"],
  );
});
