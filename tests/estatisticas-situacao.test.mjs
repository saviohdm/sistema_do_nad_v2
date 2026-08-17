import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { seedState } from "../assets/data/seed.js";
import { criarSnapshotSituacao } from "../assets/js/domain/estatisticas-situacao.js";
import { StatusFluxo, TipoHistorico } from "../assets/js/domain/enums.js";

const evento = (tipo, data) => ({ id: `${tipo}-${data}`, tipo, data });

const proposicao = ({
  id,
  correicaoId,
  statusFluxo,
  historico = [],
  pendenciasSecretaria = [],
}) => ({
  id,
  numero: `PROP-${id}`,
  correicaoId,
  statusFluxo,
  historico,
  pendenciasSecretaria,
});

test("snapshot da Situação reproduz os quatro indicadores históricos do seed", () => {
  const original = JSON.stringify(seedState);
  const snapshot = criarSnapshotSituacao({
    state: seedState,
    agora: new Date("2026-08-16T19:00:00-03:00"),
  });

  assert.deepEqual(snapshot.proposicoes, { total: 39, ativas: 37, inativas: 2 });
  assert.deepEqual(snapshot.correicoes, { total: 24, ativas: 23, inativas: 1 });
  assert.deepEqual(
    {
      corregedoria: snapshot.responsabilidades.corregedoria,
      secretaria: snapshot.responsabilidades.secretaria,
      correicionado: snapshot.responsabilidades.correicionado,
      membroAuxiliar: snapshot.responsabilidades.membroAuxiliar,
    },
    { corregedoria: 15, secretaria: 12, correicionado: 4, membroAuxiliar: 5 },
  );
  assert.equal(snapshot.responsabilidades.total, 36);
  assert.equal(snapshot.providencias.proposicoesComPendencia, 5);
  assert.equal(JSON.stringify(seedState), original, "o snapshot não deve alterar o estado recebido");
});

test("snapshot vazio mantém a estrutura e valores zerados", () => {
  const snapshot = criarSnapshotSituacao({
    state: { proposicoes: [] },
    agora: new Date("2026-08-16T12:00:00-03:00"),
  });

  assert.deepEqual(snapshot.proposicoes, { total: 0, ativas: 0, inativas: 0 });
  assert.deepEqual(snapshot.correicoes, { total: 0, ativas: 0, inativas: 0 });
  assert.equal(snapshot.responsabilidades.total, 0);
  assert.equal(snapshot.providencias.proposicoesComPendencia, 0);
});

test("preserva atividade operacional, sobreposição e contagem única por proposição", () => {
  const state = {
    proposicoes: [
      proposicao({
        id: "baixada-pendente",
        correicaoId: "corr-ativa",
        statusFluxo: StatusFluxo.BAIXA_DEFINITIVA,
        historico: [evento(TipoHistorico.CIENTIFICACAO, "2020-01-10T12:00:00Z")],
        pendenciasSecretaria: [
          { id: "pend-1", status: "pendente" },
          { id: "pend-2", status: "pendente" },
        ],
      }),
      proposicao({
        id: "baixada-encerrada",
        correicaoId: "corr-inativa",
        statusFluxo: StatusFluxo.BAIXA_DEFINITIVA,
        historico: [evento(TipoHistorico.CIENTIFICACAO, "2019-01-10T12:00:00Z")],
        pendenciasSecretaria: [{ id: "pend-3", status: "cumprida" }],
      }),
      proposicao({
        id: "fluxo-e-providencia",
        correicaoId: "corr-ativa",
        statusFluxo: StatusFluxo.AGUARDANDO_COMPROVACAO,
        historico: [evento(TipoHistorico.CRIACAO, "2018-01-10T12:00:00Z")],
        pendenciasSecretaria: [{ id: "pend-4", status: "pendente" }],
      }),
    ],
  };

  const snapshot = criarSnapshotSituacao({
    state,
    agora: new Date("2026-08-16T12:00:00-03:00"),
  });

  assert.deepEqual(snapshot.proposicoes, { total: 3, ativas: 2, inativas: 1 });
  assert.deepEqual(snapshot.correicoes, { total: 2, ativas: 1, inativas: 1 });
  assert.equal(snapshot.providencias.proposicoesComPendencia, 2);
  assert.equal(snapshot.responsabilidades.secretaria, 2);
  assert.equal(snapshot.responsabilidades.correicionado, 1);
  assert.equal(snapshot.responsabilidades.total, 3);
  assert.equal(snapshot.responsabilidades.admiteSobreposicao, true);
  assert.equal(snapshot.universo.todosOsExercicios, true);
});

test("carimbo da Situação usa o fuso oficial de Brasília", () => {
  const snapshot = criarSnapshotSituacao({
    state: { proposicoes: [] },
    agora: new Date("2026-08-01T01:30:00Z"),
  });

  assert.match(snapshot.geracao.geradoEmLocal, /31\/07\/2026/);
  assert.match(snapshot.geracao.geradoEmLocal, /22:30/);
  assert.equal(snapshot.geracao.fusoHorario, "America/Sao_Paulo");
});

test("navegação separa Produtividade e Situação e mantém ambas exclusivas do Corregedor", () => {
  const auth = fs.readFileSync(new URL("../assets/js/app/auth.js", import.meta.url), "utf8");
  const produtividade = fs.readFileSync(
    new URL("../assets/js/features/dashboard-page.js", import.meta.url),
    "utf8",
  );
  const situacao = fs.readFileSync(
    new URL("../assets/js/features/estatisticas-situacao-page.js", import.meta.url),
    "utf8",
  );
  const inicio = fs.readFileSync(
    new URL("../assets/js/features/corregedor-inicio-page.js", import.meta.url),
    "utf8",
  );

  assert.match(auth, /label: "Estatísticas"[\s\S]*label: "Produtividade"[\s\S]*label: "Situação"/);
  assert.match(produtividade, /title: "Produtividade"/);
  assert.match(produtividade, /renderBreadcrumb\(\[\{ label: "Estatísticas" \}\]\)/);
  assert.match(situacao, /activePage: "estatisticas-situacao"/);
  assert.match(situacao, /persona !== PERSONAS\.CORREGEDOR/);
  assert.match(situacao, /window\.location\.replace\(getHomeForPersona\(persona\)\)/);
  assert.doesNotMatch(situacao, /baixar|pdf|secretaria-providencia/i);
  assert.match(inicio, /<a href="dashboard\.html">Produtividade →<\/a>/);
});
