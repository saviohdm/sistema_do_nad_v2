import { SituacaoApreciacao, TipoConclusao } from "./enums.js";

export const REVISAO_CONTEUDO_PROPOSICOES = 1;

export const CONTEUDO_PROPOSICOES_LONGAS = Object.freeze({
  "prop-003": Object.freeze({
    avaliacaoVigenteId: "hist-6",
    descricao:
      "ao(à) membro(a) correicionado(a) que promova, por meio do procedimento extrajudicial competente, o acompanhamento do processo de elaboração das propostas de leis orçamentárias nos municípios em que atua e a consequente execução do orçamento, observando a consignação de dotações orçamentárias compatíveis com as diretrizes, metas e estratégias do PNE e com os respectivos planos de educação, a fim de viabilizar sua plena execução (artigo 10 da Lei n. 13.005/2014).",
    apreciacao: Object.freeze({
      situacao: SituacaoApreciacao.CONCLUIDA,
      tipoConclusao: TipoConclusao.PREJUDICADA,
      existeProvidenciaSecretaria: false,
      tipoProvidencia: null,
      descricaoProvidencia: null,
      observacoes:
        "A unidade informou que foi instaurado procedimento na Promotoria de Justiça com atribuição na matéria, com vistas ao acompanhamento das questões orçamentárias pertinentes.\n\nAdemais, a Corregedoria-Geral encaminhou Relatório de Correição Ordinária (anexo 64), no qual consta que a 1ª Promotoria de Justiça possui atribuições amplas, incluindo atuação judicial perante a 1ª Vara de Competência Geral e o Tribunal do Júri, bem como atuação extrajudicial nas áreas de Defesa do Patrimônio Público e Social, Probidade Administrativa, Patrimônio Histórico e Cultural, tutela de fundações, defesa do consumidor, curadoria de incapazes, além das áreas de Educação e Meio Ambiente.\n\nNesse contexto, entende-se prejudicada a presente Recomendação em relação à 2ª Promotoria de Justiça de Laranjal do Jari, ante a ausência de atribuição para tutela da educação\n\nPROPOSIÇÃO: Ante o exposto, sugere-se seja considerada prejudicada a Determinação VI.1.1.2.9.",
    }),
  }),
  "prop-301": Object.freeze({
    avaliacaoVigenteId: "hist-301-aval",
    descricao:
      "ao(à) membro(a) correicionado(a) que evite a utilização de AR (aviso de recebimento) físico pelos Correios, quando possível substituir a comunicação por meio eletrônico, a fim de agilizar a tramitação dos feitos.",
    apreciacao: Object.freeze({
      situacao: SituacaoApreciacao.CONCLUIDA,
      tipoConclusao: TipoConclusao.ENCERRADA,
      existeProvidenciaSecretaria: false,
      tipoProvidencia: null,
      descricaoProvidencia: null,
      observacoes:
        "O membro informou a substituição do uso de AR físico por comunicações eletrônicas, desde 2024, sendo a utilização do meio físico residual e restrita a hipóteses excepcionais. A informação demonstra adequação à diretriz contida no item VI.2.1.1.1, com aderência prática ao recomendado.\n\nDiante das providências informadas, sugere-se seja encerrado o acompanhamento do item.\n\nPROPOSIÇÃO: Ante o exposto, sugere-se seja encerrado o acompanhamento da Recomendação VI.2.1.1.1.",
    }),
  }),
  "prop-302": Object.freeze({
    avaliacaoVigenteId: "hist-302-aval",
    descricao:
      "ao(à) membro(a) correicionado(a) que, sempre que possível, realize reuniões para buscar negociação e solução resolutiva nos procedimentos extrajudiciais de sua responsabilidade, atentando para os parâmetros da Carta de Brasília e da Recomendação CNMP n. 54/2017.",
    apreciacao: Object.freeze({
      situacao: SituacaoApreciacao.CONCLUIDA,
      tipoConclusao: TipoConclusao.ENCERRADA,
      existeProvidenciaSecretaria: false,
      tipoProvidencia: null,
      descricaoProvidencia: null,
      observacoes:
        "Foi informado que a unidade realiza reuniões sempre que viável, inclusive com indicação de caso concreto – autos 0000114-74.2022.9.04.0008.\n\nA medida evidencia incorporação da lógica consensual e resolutiva à atuação extrajudicial, em consonância com a Recomendação CNMP nº 54/2017. Nesse contexto, entende-se pertinente a conclusão do acompanhamento.\n\nPROPOSIÇÃO: Ante o exposto, sugere-se seja encerrado o acompanhamento da Recomendação VI.2.1.1.2.",
    }),
  }),
});

const clonarApreciacao = (apreciacao) => ({ ...apreciacao });

/**
 * Atualiza somente o conteúdo editorial dos fixtures conhecidos. A minuta é
 * alterada apenas enquanto o evento canônico continua vigente; assim a carga
 * não recria minutas devolvidas nem reescreve decisões já praticadas.
 */
export const migrarConteudoProposicoesLongas = (state) => {
  if (!state || Number(state.revisaoConteudoProposicoes || 0) >= REVISAO_CONTEUDO_PROPOSICOES) {
    return false;
  }

  Object.entries(CONTEUDO_PROPOSICOES_LONGAS).forEach(([proposicaoId, conteudo]) => {
    const proposicao = state.proposicoes?.find((item) => item.id === proposicaoId);
    if (!proposicao) return;

    proposicao.descricao = conteudo.descricao;

    if (proposicao.avaliacaoVigenteId !== conteudo.avaliacaoVigenteId) return;
    const evento = proposicao.historico?.find(
      (item) => item.id === conteudo.avaliacaoVigenteId,
    );
    if (evento) evento.apreciacao = clonarApreciacao(conteudo.apreciacao);
  });

  state.revisaoConteudoProposicoes = REVISAO_CONTEUDO_PROPOSICOES;
  return true;
};
