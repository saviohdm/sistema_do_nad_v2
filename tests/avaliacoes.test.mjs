import assert from "node:assert/strict";
import test from "node:test";

import {
  deferirAvaliacao,
  indeferirAvaliacao,
  registrarAvaliacaoComForcaDeDecisao,
  removerAvaliacao,
  salvarAvaliacaoMembro,
  salvarRascunhoAvaliacao,
} from "../assets/js/domain/avaliacoes.js";
import { filtrarHistoricoParaCorreicionado } from "../assets/js/domain/correicionados.js";
import {
  SituacaoApreciacao,
  StatusFluxo,
  TipoConclusao,
  TipoHistorico,
} from "../assets/js/domain/enums.js";
import {
  confirmarEExecutarDevolucaoMinuta,
  MENSAGEM_DEVOLUCAO_MINUTA,
} from "../assets/js/ui/confirmacoes.js";

const novaProposicao = (statusFluxo = StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO) => ({
  id: "prop-teste",
  statusFluxo,
  historico: [],
  avaliacaoVigenteId: null,
  apreciacaoDoCN: null,
  rascunhoAvaliacao: null,
  rascunhoDecisaoCN: null,
  pendenciasSecretaria: [],
});

const minutaCompleta = () => ({
  situacao: SituacaoApreciacao.CONCLUIDA,
  tipoConclusao: TipoConclusao.PARCIALMENTE_CUMPRIDA,
  existeProvidenciaSecretaria: false,
  tipoProvidencia: null,
  descricaoProvidencia: null,
  observacoes: "DETERMINO a adoção integral das medidas descritas.",
  invarianteLegada: { preservada: true },
});

const decisaoSubstitutiva = () => ({
  situacao: SituacaoApreciacao.CONCLUIDA,
  tipoConclusao: TipoConclusao.NAO_CUMPRIDA,
  existeProvidenciaSecretaria: false,
  tipoProvidencia: null,
  descricaoProvidencia: null,
  observacoes: "DECIDO pelo não cumprimento e afasto a minuta.",
});

test("rascunho de minuta pode ficar incompleto, mas a submissão definitiva exige redação", () => {
  const proposicao = novaProposicao();
  const incompleta = {
    situacao: SituacaoApreciacao.CONCLUIDA,
    tipoConclusao: null,
    existeProvidenciaSecretaria: false,
    tipoProvidencia: null,
    descricaoProvidencia: null,
    observacoes: null,
  };

  salvarRascunhoAvaliacao(proposicao, incompleta);
  assert.deepEqual(proposicao.rascunhoAvaliacao.apreciacao, incompleta);
  assert.equal(proposicao.statusFluxo, StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO);
  assert.throws(
    () => salvarAvaliacaoMembro(proposicao, incompleta),
    /redação ou fundamentação é obrigatória/i,
  );

  const minuta = minutaCompleta();
  salvarAvaliacaoMembro(proposicao, minuta);
  assert.equal(proposicao.statusFluxo, StatusFluxo.AGUARDANDO_DECISAO_CORREGEDOR);
  assert.equal(proposicao.rascunhoAvaliacao, null);
  assert.ok(proposicao.avaliacaoVigenteId);
});

test("acolher clona profundamente e sem transformação a minuta para a decisão do CN", () => {
  const proposicao = novaProposicao();
  const minuta = minutaCompleta();
  salvarAvaliacaoMembro(proposicao, minuta);
  const minutaId = proposicao.avaliacaoVigenteId;
  const eventoMinutaAntes = structuredClone(
    proposicao.historico.find((evento) => evento.id === minutaId),
  );

  deferirAvaliacao(proposicao);

  const eventoDecisao = proposicao.historico.find(
    (evento) => evento.tipo === TipoHistorico.DECISAO,
  );
  assert.deepEqual(proposicao.apreciacaoDoCN, minuta);
  assert.notStrictEqual(proposicao.apreciacaoDoCN, minuta);
  assert.notStrictEqual(proposicao.apreciacaoDoCN.invarianteLegada, minuta.invarianteLegada);
  assert.deepEqual(eventoDecisao.apreciacao, minuta);
  assert.equal(eventoDecisao.modo, "deferimento");
  assert.equal(proposicao.statusFluxo, StatusFluxo.AGUARDANDO_CIENCIA);
  assert.deepEqual(
    proposicao.historico.find((evento) => evento.id === minutaId),
    eventoMinutaAntes,
  );
});

test("afastar usa apenas a decisão substitutiva e preserva internamente a minuta", () => {
  const proposicao = novaProposicao();
  const minuta = minutaCompleta();
  const substitutiva = decisaoSubstitutiva();
  salvarAvaliacaoMembro(proposicao, minuta);
  const minutaId = proposicao.avaliacaoVigenteId;
  proposicao.rascunhoDecisaoCN = { apreciacao: { observacoes: "rascunho próprio" } };

  indeferirAvaliacao(proposicao, substitutiva);

  const eventoDecisao = proposicao.historico.find(
    (evento) => evento.tipo === TipoHistorico.DECISAO,
  );
  assert.deepEqual(proposicao.apreciacaoDoCN, substitutiva);
  assert.notDeepEqual(proposicao.apreciacaoDoCN, minuta);
  assert.equal(eventoDecisao.modo, "indeferimento");
  assert.ok(proposicao.historico.some((evento) => evento.id === minutaId));
  assert.equal(proposicao.rascunhoDecisaoCN, null);
});

test("devolver remove o conteúdo material, limpa os dois rascunhos e registra tombstone", () => {
  const proposicao = novaProposicao();
  salvarAvaliacaoMembro(proposicao, minutaCompleta());
  const minutaId = proposicao.avaliacaoVigenteId;
  proposicao.rascunhoAvaliacao = { apreciacao: { observacoes: "legado" } };
  proposicao.rascunhoDecisaoCN = { apreciacao: decisaoSubstitutiva() };

  removerAvaliacao(proposicao);

  assert.equal(proposicao.avaliacaoVigenteId, null);
  assert.equal(proposicao.rascunhoAvaliacao, null);
  assert.equal(proposicao.rascunhoDecisaoCN, null);
  assert.equal(proposicao.statusFluxo, StatusFluxo.AGUARDANDO_AVALIACAO_MEMBRO);
  assert.ok(!proposicao.historico.some((evento) => evento.id === minutaId));
  const tombstone = proposicao.historico.find(
    (evento) => evento.tipo === TipoHistorico.AVALIACAO_REMOVIDA,
  );
  assert.equal(tombstone.avaliacaoRemovidaId, minutaId);
  assert.equal(tombstone.descricao, "Minuta devolvida pelo Corregedor Nacional.");
});

test("cancelar a confirmação não devolve a minuta; confirmar executa uma única vez", () => {
  let execucoes = 0;
  let mensagemRecebida = null;
  const devolver = () => {
    execucoes += 1;
  };

  const cancelada = confirmarEExecutarDevolucaoMinuta({
    confirmar: (mensagem) => {
      mensagemRecebida = mensagem;
      return false;
    },
    devolver,
  });
  assert.equal(cancelada, false);
  assert.equal(execucoes, 0);
  assert.equal(mensagemRecebida, MENSAGEM_DEVOLUCAO_MINUTA);

  const confirmada = confirmarEExecutarDevolucaoMinuta({
    confirmar: () => true,
    devolver,
  });
  assert.equal(confirmada, true);
  assert.equal(execucoes, 1);
});

test("a projeção do correicionado oculta a minuta e a forma interna da decisão", () => {
  for (const decidir of [
    (proposicao) => deferirAvaliacao(proposicao),
    (proposicao) => indeferirAvaliacao(proposicao, decisaoSubstitutiva()),
  ]) {
    const proposicao = novaProposicao();
    salvarAvaliacaoMembro(proposicao, minutaCompleta());
    decidir(proposicao);

    const publico = filtrarHistoricoParaCorreicionado(proposicao.historico);
    assert.equal(publico.length, 1);
    assert.equal(publico[0].tipo, TipoHistorico.DECISAO);
    assert.equal(publico[0].descricao, "Decisão proferida pelo Corregedor Nacional.");
    assert.ok(publico[0].apreciacao.observacoes);
    assert.ok(!Object.hasOwn(publico[0], "modo"));
  }
});

test("decisão direta permanece disponível e também exige fundamentação", () => {
  const proposicao = novaProposicao(StatusFluxo.AGUARDANDO_COMPROVACAO);
  const decisao = decisaoSubstitutiva();

  registrarAvaliacaoComForcaDeDecisao(proposicao, decisao);
  assert.deepEqual(proposicao.apreciacaoDoCN, decisao);
  assert.equal(proposicao.statusFluxo, StatusFluxo.AGUARDANDO_CIENCIA);
  assert.ok(
    proposicao.historico.some(
      (evento) => evento.tipo === TipoHistorico.AVALIACAO_COM_FORCA_DE_DECISAO,
    ),
  );

  const semTexto = { ...decisao, observacoes: "  " };
  assert.throws(
    () => registrarAvaliacaoComForcaDeDecisao(novaProposicao(), semTexto),
    /redação ou fundamentação é obrigatória/i,
  );
});
