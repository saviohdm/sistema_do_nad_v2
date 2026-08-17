import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  criarNomeRelatorioEstatistico,
  criarSnapshotRelatorioEstatistico,
  getPeriodoPadraoRelatorioEstatistico,
  listarExerciciosRelatorioEstatistico,
} from "../assets/js/domain/relatorio-estatistico.js";
import {
  SituacaoApreciacao,
  StatusCorreicao,
  StatusFluxo,
  TipoConclusao,
  TipoHistorico,
} from "../assets/js/domain/enums.js";
import { removerAvaliacao } from "../assets/js/domain/avaliacoes.js";
import { criarDefinicaoPdfRelatorioEstatistico } from "../assets/js/ui/relatorio-estatistico-pdf.js";

const evento = (tipo, data, extras = {}) => ({
  id: `${tipo}-${data}-${Math.random()}`,
  tipo,
  data,
  usuario: "Usuário de teste",
  ...extras,
});

const proposicao = (id, statusFluxo, historico, pendenciasSecretaria = []) => ({
  id,
  numero: `PROP-${id}`,
  tipo: "Recomendação",
  correicaoId: "corr-1",
  statusFluxo,
  historico,
  diligencias: [],
  pendenciasSecretaria,
  apreciacaoDoCN: null,
  avaliacaoVigenteId: null,
});

const estadoBase = () => ({
  correicoes: [{ id: "corr-1", status: StatusCorreicao.REFERENDADA }],
  proposicoes: [
    proposicao("1", StatusFluxo.BAIXA_DEFINITIVA, [
      evento(TipoHistorico.CRIACAO, "2025-12-10T12:00:00Z", { entradaFluxo: true }),
      evento(TipoHistorico.CRIACAO_DILIGENCIA, "2026-01-05T12:00:00Z"),
      evento(TipoHistorico.CRIACAO_DILIGENCIA, "2026-01-20T12:00:00Z"),
      evento(TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR, "2026-01-25T12:00:00Z"),
      evento(TipoHistorico.DECISAO, "2026-02-03T12:00:00Z", {
        apreciacao: {
          situacao: SituacaoApreciacao.CONCLUIDA,
          tipoConclusao: TipoConclusao.CUMPRIDA,
        },
      }),
      evento(TipoHistorico.CIENTIFICACAO, "2026-02-04T12:00:00Z"),
    ]),
    proposicao("2", StatusFluxo.AGUARDANDO_SECRETARIA, [
      evento(TipoHistorico.CRIACAO, "2026-01-02T12:00:00Z", { entradaFluxo: true }),
      evento(TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO, "2026-02-10T12:00:00Z", {
        apreciacao: { situacao: SituacaoApreciacao.NECESSITA_MAIS_INFORMACOES },
      }),
    ]),
    proposicao(
      "3",
      StatusFluxo.BAIXA_DEFINITIVA,
      [
        evento(TipoHistorico.REFERENDO_CNMP, "2026-01-08T12:00:00Z", { entradaFluxo: true }),
        evento(TipoHistorico.CONVERSAO_ENCAMINHAMENTO, "2026-01-08T12:01:00Z"),
      ],
      [{ id: "pend-1", status: "pendente" }, { id: "pend-2", status: "cumprida" }],
    ),
    proposicao("4", StatusFluxo.BAIXA_DEFINITIVA, [
      evento(TipoHistorico.REFERENDO_CNMP, "2026-01-12T12:00:00Z", { entradaFluxo: true }),
      evento(TipoHistorico.APAGAMENTO_PROPOSICAO, "2026-02-11T12:00:00Z"),
    ]),
    proposicao("5", StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO, [
      evento(TipoHistorico.CRIACAO, "2026-01-15T12:00:00Z", { entradaFluxo: true }),
      evento(TipoHistorico.AVALIACAO_REMOVIDA, "2026-02-01T12:00:00Z", {
        avaliacaoRemovidaId: "minuta-removida",
        minutaSubmetidaEm: "2026-01-28T12:00:00Z",
      }),
    ]),
    proposicao("6", StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR, [
      evento(TipoHistorico.CRIACAO, "2025-06-15T12:00:00Z", { entradaFluxo: true }),
    ]),
  ],
});

const coletarTextos = (value, resultado = []) => {
  if (typeof value === "string") resultado.push(value);
  else if (Array.isArray(value)) value.forEach((item) => coletarTextos(item, resultado));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => {
      if (typeof item !== "function") coletarTextos(item, resultado);
    });
  }
  return resultado;
};

test("período padrão usa o último mês encerrado no fuso de Brasília", () => {
  assert.deepEqual(
    getPeriodoPadraoRelatorioEstatistico({ agora: new Date("2026-08-01T01:30:00Z") }),
    { ano: 2026, mesCorte: 6 },
  );
  assert.deepEqual(
    getPeriodoPadraoRelatorioEstatistico({ agora: new Date("2026-01-15T12:00:00Z") }),
    { ano: 2025, mesCorte: 12 },
  );
});

test("rejeita mês corrente ou futuro", () => {
  const state = estadoBase();
  assert.throws(
    () =>
      criarSnapshotRelatorioEstatistico({
        state,
        ano: 2026,
        mesCorte: 8,
        agora: new Date("2026-08-16T12:00:00-03:00"),
      }),
    /somente meses já encerrados/,
  );
});

test("conta atos repetidos e exclui apagamento e conversão das baixas produtivas", () => {
  const state = estadoBase();
  const original = JSON.stringify(state);
  const snapshot = criarSnapshotRelatorioEstatistico({
    state,
    ano: 2026,
    mesCorte: 2,
    agora: new Date("2026-03-10T12:00:00-03:00"),
  });
  const porCodigo = Object.fromEntries(snapshot.indicadores.map((item) => [item.codigo, item]));

  assert.equal(porCodigo.ativadas.acumulado, 4);
  assert.equal(porCodigo.diligencias.acumulado, 2);
  assert.equal(porCodigo.minutas.acumulado, 2);
  assert.equal(porCodigo.decisoes.acumulado, 2);
  assert.equal(porCodigo.baixas.acumulado, 1);
  assert.equal(snapshot.providenciasPendentes, 1);
  assert.equal(snapshot.acervoAtual.totalAberto, 3);
  assert.equal(JSON.stringify(state), original, "snapshot não deve alterar o estado recebido");
});

test("classifica decisão normal e direta pelas invariantes", () => {
  const snapshot = criarSnapshotRelatorioEstatistico({
    state: estadoBase(),
    ano: 2026,
    mesCorte: 2,
    agora: new Date("2026-03-10T12:00:00-03:00"),
  });
  const resultados = Object.fromEntries(snapshot.resultadosDecisoes.map((item) => [item.codigo, item.valor]));
  assert.equal(resultados.cumprida, 1);
  assert.equal(resultados.necessitaMaisInformacoes, 1);
});

test("janeiro compara com dezembro do exercício anterior", () => {
  const snapshot = criarSnapshotRelatorioEstatistico({
    state: estadoBase(),
    ano: 2026,
    mesCorte: 1,
    agora: new Date("2026-02-10T12:00:00-03:00"),
  });
  const ativadas = snapshot.indicadores.find((item) => item.codigo === "ativadas");
  assert.equal(ativadas.anterior, 1);
  assert.equal(ativadas.mes, 4);
  assert.equal(ativadas.variacao.percentual, 300);
});

test("evento no início UTC de agosto ainda pertence a julho em Brasília", () => {
  const state = {
    correicoes: [{ id: "corr-1", status: StatusCorreicao.REFERENDADA }],
    proposicoes: [
      proposicao("fuso", StatusFluxo.BAIXA_DEFINITIVA, [
        evento(TipoHistorico.CIENTIFICACAO, "2026-08-01T01:30:00Z"),
      ]),
    ],
  };
  const snapshot = criarSnapshotRelatorioEstatistico({
    state,
    ano: 2026,
    mesCorte: 7,
    agora: new Date("2026-08-16T12:00:00-03:00"),
  });
  assert.equal(snapshot.acumulado.baixas, 1);
});

test("ativação legada é inferida sem comparar descrição textual", () => {
  const state = {
    correicoes: [{ id: "corr-1", status: StatusCorreicao.REFERENDADA }],
    proposicoes: [
      proposicao("legado", StatusFluxo.AGUARDANDO_SECRETARIA, [
        evento(TipoHistorico.CRIACAO, "2026-01-03T12:00:00Z", { descricao: "qualquer texto" }),
      ]),
    ],
  };
  const snapshot = criarSnapshotRelatorioEstatistico({
    state,
    ano: 2026,
    mesCorte: 1,
    agora: new Date("2026-02-10T12:00:00-03:00"),
  });
  assert.equal(snapshot.acumulado.ativadas, 1);
  assert.match(snapshot.avisosQualidade[0], /ativação legada foi inferida/);
});

test("devolução remove conteúdo da minuta e preserva somente a data contábil", () => {
  const minuta = evento(TipoHistorico.AVALIACAO_MEMBRO_AUXILIAR, "2026-01-28T12:00:00Z", {
    apreciacao: { situacao: SituacaoApreciacao.CONCLUIDA, observacoes: "conteúdo material" },
  });
  const item = proposicao("devolvida", StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR, [minuta]);
  item.avaliacaoVigenteId = minuta.id;

  removerAvaliacao(item);
  const tombstone = item.historico.find((registro) => registro.tipo === TipoHistorico.AVALIACAO_REMOVIDA);
  assert.equal(tombstone.minutaSubmetidaEm, "2026-01-28T12:00:00Z");
  assert.equal(item.historico.some((registro) => registro.id === minuta.id), false);
  assert.doesNotMatch(JSON.stringify(tombstone), /conteúdo material/);
});

test("lista exercícios existentes e mantém o ano padrão", () => {
  assert.deepEqual(
    listarExerciciosRelatorioEstatistico(estadoBase(), {
      agora: new Date("2026-08-16T12:00:00-03:00"),
    }),
    [2026, 2025],
  );
});

test("definição PDF fixa A4 paisagem, duas folhas lógicas e conteúdo agregado", () => {
  const snapshot = criarSnapshotRelatorioEstatistico({
    state: estadoBase(),
    ano: 2026,
    mesCorte: 2,
    agora: new Date("2026-03-10T12:00:00-03:00"),
  });
  const definicao = criarDefinicaoPdfRelatorioEstatistico(snapshot);
  const texto = coletarTextos(definicao.content).join("\n");

  assert.equal(definicao.pageSize, "A4");
  assert.equal(definicao.pageOrientation, "landscape");
  assert.equal(definicao.content.filter((item) => item.pageBreak === "before").length, 1);
  assert.match(texto, /Relatório estatístico das proposições/);
  assert.match(texto, /PRODUTIVIDADE MENSAL/);
  assert.match(texto, /RESULTADOS DAS DECISÕES/);
  assert.doesNotMatch(texto, /PROP-1|Usuário de teste/);
  assert.match(criarNomeRelatorioEstatistico(snapshot), /^relatorio-estatistico-proposicoes_2026-ate-02_/);
});

test("página Estatísticas contém guarda explícita para todas as personas não autorizadas", () => {
  const fonte = fs.readFileSync(new URL("../assets/js/features/dashboard-page.js", import.meta.url), "utf8");
  assert.match(fonte, /persona !== PERSONAS\.CORREGEDOR/);
  assert.match(fonte, /window\.location\.replace\(getHomeForPersona\(persona\)\)/);
});
