import assert from "node:assert/strict";
import test from "node:test";

import { seedState } from "../assets/data/seed.js";
import { expirarDiligenciasVencidas } from "../assets/js/domain/diligencias.js";
import { StatusFluxo, TipoHistorico } from "../assets/js/domain/enums.js";
import {
  getUltimaComprovacao,
  listProposicoesParaAvaliar,
} from "../assets/js/domain/proposicoes.js";
import { renderFilaExcertoComprovacao } from "../assets/js/ui/components.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const IDs_EXEMPLOS = ["prop-008", "prop-009", "prop-010", "prop-104", "prop-111"];

test("as cinco primeiras minutas após o processamento de prazos são os exemplos comprovados", () => {
  const state = clone(seedState);

  expirarDiligenciasVencidas(state, new Date("2026-08-06T12:00:00-03:00"));

  assert.deepEqual(
    listProposicoesParaAvaliar(state).slice(0, 5).map((item) => item.id),
    IDs_EXEMPLOS,
  );
});

test("0001, 0002 e 0004 continuam aguardando comprovação na data de referência", () => {
  const state = clone(seedState);

  expirarDiligenciasVencidas(state, new Date("2026-08-06T12:00:00-03:00"));

  const esperados = new Map([
    ["prop-001", "2026-09-15"],
    ["prop-002", "2026-08-28"],
    ["prop-004", "2026-09-30"],
  ]);

  esperados.forEach((prazo, id) => {
    const proposicao = state.proposicoes.find((item) => item.id === id);
    assert.equal(proposicao.statusFluxo, StatusFluxo.AGUARDANDO_COMPROVACAO);
    assert.equal(proposicao.diligencias.at(-1).status, "aberta");
    assert.equal(proposicao.diligencias.at(-1).prazo, prazo);
    assert.equal(
      proposicao.historico.some((item) => item.tipo === TipoHistorico.PRAZO_COMPROVACAO_EXPIRADO),
      false,
    );
  });
});

test("cada exemplo tem ciclo completo, comprovação vinculada e caixa de saída real", () => {
  IDs_EXEMPLOS.forEach((id) => {
    const proposicao = seedState.proposicoes.find((item) => item.id === id);
    const comprovacao = getUltimaComprovacao(proposicao);
    const diligencia = proposicao.diligencias.find(
      (item) => item.id === comprovacao.diligenciaId,
    );
    const notificacao = proposicao.historico.find(
      (item) => item.tipo === TipoHistorico.EMAIL_DILIGENCIA_ENVIADO,
    );
    const caixaSaida = seedState.caixaDeSaida.find(
      (item) => item.id === notificacao?.caixaSaidaId,
    );

    assert.ok(comprovacao, `${id} deve possuir comprovação`);
    assert.ok(comprovacao.descricao.split(/\n\s*\n/).length >= 3);
    assert.ok(comprovacao.anexos.length >= 2);
    assert.ok(diligencia, `${id} deve vincular a comprovação à diligência`);
    assert.equal(diligencia.status, "comprovada");
    assert.equal(diligencia.comprovadaEm, comprovacao.data);
    assert.ok(caixaSaida, `${id} deve vincular a notificação à caixa de saída`);
    assert.ok(caixaSaida.proposicaoIds.includes(id));

    const tipos = proposicao.historico.map((item) => item.tipo);
    [
      TipoHistorico.CRIACAO,
      TipoHistorico.REFERENDO_CNMP,
      TipoHistorico.CRIACAO_DILIGENCIA,
      TipoHistorico.EMAIL_DILIGENCIA_ENVIADO,
      TipoHistorico.COMPROVACAO,
    ].forEach((tipo) => assert.ok(tipos.includes(tipo), `${id} deve possuir evento ${tipo}`));

    const datasDoCiclo = proposicao.historico
      .filter((item) => [
        TipoHistorico.CRIACAO,
        TipoHistorico.REFERENDO_CNMP,
        TipoHistorico.CRIACAO_DILIGENCIA,
        TipoHistorico.EMAIL_DILIGENCIA_ENVIADO,
        TipoHistorico.COMPROVACAO,
      ].includes(item.tipo))
      .map((item) => new Date(item.data).getTime());
    assert.deepEqual(datasDoCiclo, [...datasDoCiclo].sort((a, b) => a - b));
  });
});

test("excerto adapta a comprovação às visões compacta, expandida e cartões", () => {
  const comprovacao = getUltimaComprovacao(
    seedState.proposicoes.find((item) => item.id === "prop-008"),
  );
  const compacta = renderFilaExcertoComprovacao(comprovacao, { view: "compacta" });
  const expandida = renderFilaExcertoComprovacao(comprovacao, { view: "expandida" });
  const cartoes = renderFilaExcertoComprovacao(comprovacao, { view: "cartoes" });

  assert.match(compacta, /text-clamp text-clamp--1/);
  assert.equal((expandida.match(/<p>/g) || []).length, 3);
  assert.doesNotMatch(expandida, /text-clamp/);
  assert.match(cartoes, /text-clamp text-clamp--3/);
  assert.match(cartoes, /2 anexos/);
  assert.match(cartoes, /fila-operacional-item__excerto--comprovacao/);
});

test("excerto trata zero, um e múltiplos anexos, data ausente e comprovação inexistente", () => {
  const base = { descricao: "Primeiro.\n\nSegundo.\n\nTerceiro.", data: "2026-08-06T12:00:00Z" };

  assert.match(renderFilaExcertoComprovacao({ ...base, anexos: [] }), /Sem anexo/);
  assert.match(
    renderFilaExcertoComprovacao({ ...base, anexos: [{ nome: "um.pdf" }] }),
    />1 anexo</,
  );
  assert.match(
    renderFilaExcertoComprovacao({ ...base, anexos: [{}, {}, {}] }),
    />3 anexos</,
  );

  const semData = renderFilaExcertoComprovacao({ descricao: base.descricao, anexos: [] });
  assert.doesNotMatch(semData, /Recebida em/);
  assert.equal(renderFilaExcertoComprovacao(null), "");
});
