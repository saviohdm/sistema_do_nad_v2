import assert from "node:assert/strict";
import test from "node:test";

import { seedState } from "../assets/data/seed.js";
import { hydrateProposicao } from "../assets/js/domain/correicoes.js";
import {
  criarNomeBaseRelatorioDecisao,
  criarSnapshotRelatorioDecisao,
  ModoRecorteRelatorioDecisao,
  serializarRelatorioDecisaoJson,
} from "../assets/js/domain/relatorio-decisao.js";
import { criarDefinicaoPdfRelatorioDecisao } from "../assets/js/ui/relatorio-decisao-pdf.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const getProposicao = (id) => {
  const state = clone(seedState);
  const proposicao = state.proposicoes.find((item) => item.id === id);
  assert.ok(proposicao, `Proposição ${id} deve existir no seed.`);
  return hydrateProposicao(state, proposicao);
};

const agora = new Date("2026-08-06T15:34:00.000Z");
const opcoesFixas = {
  agora,
  idRelatorio: "relatorio-teste-001",
  fusoHorario: "America/Bahia",
};

const coletarTextosPdf = (value, resultado = []) => {
  if (typeof value === "string") resultado.push(value);
  else if (Array.isArray(value)) value.forEach((item) => coletarTextosPdf(item, resultado));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => {
      if (typeof item !== "function") coletarTextosPdf(item, resultado);
    });
  }
  return resultado;
};

test("snapshot preserva ordem, filtros e textos integrais sem carregar campos fora do escopo", () => {
  const importanteSensivel = getProposicao("prop-304");
  const importanteComRascunho = getProposicao("prop-308");
  const descricaoOriginal = importanteSensivel.descricao;

  const snapshot = criarSnapshotRelatorioDecisao({
    proposicoes: [importanteSensivel, importanteComRascunho],
    filtros: {
      prioridade: "importante",
      sensivel: "sim",
      avaliacao: "com",
      filaForcada: true,
      view: "compacta",
    },
    ...opcoesFixas,
  });

  assert.equal(snapshot.versao_esquema, "1.1");
  assert.deepEqual(snapshot.recorte.modo, {
    codigo: "filtradas",
    rotulo: "Proposições filtradas",
  });
  assert.equal(snapshot.id_relatorio, "relatorio-teste-001");
  assert.equal(snapshot.recorte.total_proposicoes, 2);
  assert.equal(snapshot.recorte.contem_sensiveis, true);
  assert.deepEqual(snapshot.proposicoes.map((item) => item.proposicao.id), ["prop-304", "prop-308"]);
  assert.deepEqual(snapshot.proposicoes.map((item) => item.ordem), [1, 2]);
  assert.deepEqual(snapshot.recorte.filtros_aplicados.prioridade, {
    codigo: "importante",
    rotulo: "Importante",
  });
  assert.equal(snapshot.recorte.filtros_aplicados.sensivel, true);
  assert.deepEqual(snapshot.recorte.filtros_aplicados.minuta_membro_auxiliar, {
    codigo: "com_minuta",
    rotulo: "Com minuta submetida",
  });
  assert.doesNotMatch(JSON.stringify(snapshot.recorte), /filaForcada|compacta|view/);
  assert.equal(snapshot.proposicoes[0].proposicao.descricao, descricaoOriginal);
  assert.ok(snapshot.proposicoes[0].ultima_comprovacao);
  assert.ok(snapshot.proposicoes[0].minuta_membro_auxiliar);
  assert.ok(snapshot.proposicoes[1].rascunho_decisao_corregedor);

  const serializado = JSON.stringify(snapshot);
  assert.doesNotMatch(serializado, /observacoesGerais|contexto|historico/);
});

test("snapshot é independente da entidade original e mantém comprovação com anexos junto da minuta", () => {
  const proposicao = getProposicao("prop-003");
  const snapshot = criarSnapshotRelatorioDecisao({
    proposicoes: [proposicao],
    filtros: { correicaoId: proposicao.correicaoId, avaliacao: "com" },
    ...opcoesFixas,
  });
  const item = snapshot.proposicoes[0];

  assert.equal(item.ultima_comprovacao.anexos.length, 2);
  assert.equal(item.ultima_comprovacao.anexos[0].nome, "ordem-servico-2026.pdf");
  assert.ok(item.minuta_membro_auxiliar.apreciacao.fundamentacao.length > 100);
  assert.match(item.texto_consolidado, /DESCRIÇÃO INTEGRAL DA PROPOSIÇÃO/);
  assert.match(item.texto_consolidado, /ÚLTIMA COMPROVAÇÃO/);
  assert.match(item.texto_consolidado, /MINUTA DO MEMBRO AUXILIAR/);
  assert.match(item.texto_consolidado, /ordem-servico-2026\.pdf/);

  proposicao.descricao = "Texto alterado após a abertura do modal.";
  proposicao.historico[0].descricao = "Evento alterado.";
  assert.notEqual(item.proposicao.descricao, proposicao.descricao);
  assert.doesNotMatch(item.texto_consolidado, /Texto alterado|Evento alterado/);
});

test("ausências usam null e listas vazias em proposição apta a decisão direta", () => {
  const direta = getProposicao("prop-003");
  direta.avaliacaoVigenteId = null;
  direta.rascunhoDecisaoCN = undefined;
  direta.historico = direta.historico.filter((evento) => evento.tipo !== "avaliacao_membro_auxiliar");

  const snapshot = criarSnapshotRelatorioDecisao({
    proposicoes: [direta],
    filtros: { avaliacao: "sem" },
    ...opcoesFixas,
  });
  const item = snapshot.proposicoes[0];

  assert.equal(item.minuta_membro_auxiliar, null);
  assert.equal(item.rascunho_decisao_corregedor, null);
  assert.ok(Array.isArray(item.ultima_comprovacao.anexos));
  assert.match(item.texto_consolidado, /Não disponível - proposição apta a decisão direta\./);
});

test("JSON é UTF-8 legível, termina em nova linha e usa nome pareado contextual", () => {
  const proposicao = getProposicao("prop-304");
  const snapshot = criarSnapshotRelatorioDecisao({
    proposicoes: [proposicao],
    filtros: { correicaoId: "corr-2026-RJ-03", prioridade: "importante" },
    ...opcoesFixas,
  });
  const json = serializarRelatorioDecisaoJson(snapshot);
  const reparsed = JSON.parse(json);

  assert.equal(reparsed.proposicoes[0].proposicao.sensivel, true);
  assert.match(json, /"versao_esquema": "1\.1"/);
  assert.match(json, /Descrição/);
  assert.ok(json.endsWith("\n"));
  assert.equal(
    criarNomeBaseRelatorioDecisao(snapshot),
    "relatorio-aguardando-decisao_corr-2026-rj-03_2026-08-06_12-34_1-itens",
  );
});

test("seleção manual ignora filtros circunstanciais e preserva a ordem recebida", () => {
  const proposicoes = [getProposicao("prop-304"), getProposicao("prop-003")];
  const snapshot = criarSnapshotRelatorioDecisao({
    proposicoes,
    filtros: { correicaoId: "filtro-que-nao-define-a-selecao", sensivel: "nao" },
    modoRecorte: ModoRecorteRelatorioDecisao.SELECIONADAS,
    ...opcoesFixas,
  });

  assert.equal(snapshot.recorte.modo.codigo, "selecionadas");
  assert.deepEqual(snapshot.proposicoes.map((item) => item.proposicao.id), ["prop-304", "prop-003"]);
  assert.equal(snapshot.recorte.filtros_aplicados.correicao_id, null);
  assert.equal(snapshot.recorte.filtros_aplicados.sensivel, null);
  assert.deepEqual(snapshot.recorte.resumo_legivel, ["2 proposições selecionadas manualmente"]);
  assert.equal(
    criarNomeBaseRelatorioDecisao(snapshot),
    "relatorio-aguardando-decisao_selecionadas_2026-08-06_12-34_2-itens",
  );
});

test("recorte individual identifica a proposição e produz nome compartilhável", () => {
  const proposicao = getProposicao("prop-304");
  const snapshot = criarSnapshotRelatorioDecisao({
    proposicoes: [proposicao],
    modoRecorte: ModoRecorteRelatorioDecisao.INDIVIDUAL,
    ...opcoesFixas,
  });

  assert.equal(snapshot.recorte.modo.codigo, "individual");
  assert.deepEqual(snapshot.recorte.resumo_legivel, ["Proposição: PROP-2026-0304"]);
  assert.equal(
    criarNomeBaseRelatorioDecisao(snapshot),
    "relatorio-aguardando-decisao_prop-2026-0304_2026-08-06_12-34_1-item",
  );
});

test("rejeita modo de recorte desconhecido", () => {
  assert.throws(
    () =>
      criarSnapshotRelatorioDecisao({
        proposicoes: [getProposicao("prop-304")],
        modoRecorte: "qualquer",
        ...opcoesFixas,
      }),
    /Modo de recorte do relatório inválido/,
  );
});

test("definição PDF usa A4 retrato, rodapé, aviso e o mesmo conteúdo substantivo", () => {
  const proposicoes = [getProposicao("prop-003"), getProposicao("prop-307")];
  const snapshot = criarSnapshotRelatorioDecisao({
    proposicoes,
    filtros: { filaForcada: true },
    ...opcoesFixas,
  });
  const definicao = criarDefinicaoPdfRelatorioDecisao(snapshot);
  const texto = coletarTextosPdf(definicao.content).join("\n");
  const rodape = definicao.footer(2, 7);

  assert.equal(definicao.pageSize, "A4");
  assert.equal(definicao.pageOrientation, "portrait");
  assert.equal(definicao.defaultStyle.font, "Roboto");
  assert.equal(definicao.info.title, "Relatório da fila Aguardando decisão");
  assert.match(texto, /contém proposições marcadas como sensíveis/i);
  assert.equal(texto.includes(proposicoes[0].descricao), true);
  assert.match(texto, /ordem-servico-2026\.pdf/);
  assert.match(texto, /Rascunho de decisão do Corregedor/);
  assert.equal(rodape.columns[0].text, "USO INTERNO");
  assert.equal(rodape.columns[2].text, "Página 2 de 7");
});
