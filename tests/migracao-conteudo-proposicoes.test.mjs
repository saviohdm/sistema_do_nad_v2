import assert from "node:assert/strict";
import test from "node:test";

import { seedState } from "../assets/data/seed.js";
import { TipoConclusao } from "../assets/js/domain/enums.js";
import {
  CONTEUDO_PROPOSICOES_LONGAS,
  REVISAO_CONTEUDO_PROPOSICOES,
  migrarConteudoProposicoesLongas,
} from "../assets/js/domain/migracao-conteudo-proposicoes.js";

const criarProposicaoLegada = (id, { vigente = true, manterEvento = true } = {}) => {
  const conteudo = CONTEUDO_PROPOSICOES_LONGAS[id];
  return {
    id,
    descricao: "Descrição antiga",
    avaliacaoVigenteId: vigente ? conteudo.avaliacaoVigenteId : null,
    historico: manterEvento
      ? [{ id: conteudo.avaliacaoVigenteId, apreciacao: { observacoes: "Minuta antiga" } }]
      : [],
  };
};

test("migra descrições e somente as minutas canônicas ainda vigentes", () => {
  const vigente = criarProposicaoLegada("prop-003");
  const processada = criarProposicaoLegada("prop-301", { vigente: false });
  const devolvida = criarProposicaoLegada("prop-302", {
    vigente: false,
    manterEvento: false,
  });
  const state = { proposicoes: [vigente, processada, devolvida] };

  assert.equal(migrarConteudoProposicoesLongas(state), true);
  assert.equal(state.revisaoConteudoProposicoes, REVISAO_CONTEUDO_PROPOSICOES);

  for (const proposicao of state.proposicoes) {
    assert.equal(
      proposicao.descricao,
      CONTEUDO_PROPOSICOES_LONGAS[proposicao.id].descricao,
    );
  }

  assert.deepEqual(
    vigente.historico[0].apreciacao,
    CONTEUDO_PROPOSICOES_LONGAS["prop-003"].apreciacao,
  );
  assert.equal(processada.historico[0].apreciacao.observacoes, "Minuta antiga");
  assert.deepEqual(devolvida.historico, []);
  assert.equal(devolvida.avaliacaoVigenteId, null);
});

test("migração é idempotente e não sobrescreve mudanças posteriores", () => {
  const proposicao = criarProposicaoLegada("prop-003");
  const state = { proposicoes: [proposicao] };

  assert.equal(migrarConteudoProposicoesLongas(state), true);
  proposicao.descricao = "Descrição editada depois da migração";
  proposicao.historico[0].apreciacao.observacoes = "Nova minuta";

  assert.equal(migrarConteudoProposicoesLongas(state), false);
  assert.equal(proposicao.descricao, "Descrição editada depois da migração");
  assert.equal(proposicao.historico[0].apreciacao.observacoes, "Nova minuta");
});

test("seed traz os três conteúdos com conclusões coerentes e sem providência", () => {
  const conclusoesEsperadas = {
    "prop-003": TipoConclusao.PREJUDICADA,
    "prop-301": TipoConclusao.ENCERRADA,
    "prop-302": TipoConclusao.ENCERRADA,
  };

  for (const [id, tipoConclusao] of Object.entries(conclusoesEsperadas)) {
    const proposicao = seedState.proposicoes.find((item) => item.id === id);
    const minuta = proposicao.historico.find(
      (evento) => evento.id === proposicao.avaliacaoVigenteId,
    ).apreciacao;

    assert.equal(proposicao.descricao, CONTEUDO_PROPOSICOES_LONGAS[id].descricao);
    assert.equal(minuta.tipoConclusao, tipoConclusao);
    assert.equal(minuta.existeProvidenciaSecretaria, false);
    assert.equal(minuta.tipoProvidencia, null);
    assert.equal(minuta.descricaoProvidencia, null);
    assert.doesNotMatch(minuta.observacoes, /\*\*/);
    assert.match(minuta.observacoes, /\n\nPROPOSIÇÃO:/);
  }
});
