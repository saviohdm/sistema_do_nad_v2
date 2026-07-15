import { getCurrentPersona, getHomeForPersona, PERSONAS, requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { formatDatelineEditorial, saudacaoPorHora } from "../app/utils.js";
import { listAvisosVigentes, SeveridadeAviso } from "../domain/avisos.js";
import {
  countPendentesDoCorregedor,
  groupByCorreicao,
  listProposicoesAguardandoDecisao,
  listProposicoesAguardandoReferendo,
  listProposicoesRascunhoCN,
} from "../domain/proposicoes.js";
import {
  renderAvisoBanner,
  renderAvisoCard,
  renderCnHero,
  renderFilaCard,
} from "../ui/components.js";
import { renderIcon } from "../ui/icons.js";

requireAuth();

if (getCurrentPersona() !== PERSONAS.CORREGEDOR) {
  window.location.href = getHomeForPersona();
}

const currentState = state();

// A headline nomeia a pendência mais prioritária do CN na ordem:
// decisões -> rascunhos de decisão -> referendos -> rascunhos de criação.
const buildHeadlineCN = ({ pendentesDecisao, pendentesRascunhoDecisao, pendentesReferendo, pendentesRascunho }) => {
  const ordem = [
    { valor: pendentesDecisao, singular: "decisão para tomar", plural: "decisões para tomar" },
    { valor: pendentesRascunhoDecisao, singular: "rascunho de decisão em aberto", plural: "rascunhos de decisão em aberto" },
    { valor: pendentesReferendo, singular: "referendo aguardando", plural: "referendos aguardando" },
    { valor: pendentesRascunho, singular: "rascunho de criação pendente", plural: "rascunhos de criação pendentes" },
  ];
  const foco = ordem.find((item) => item.valor > 0);
  if (!foco) {
    return `Sua mesa está limpa. <strong>Bom trabalho.</strong>`;
  }
  const noun = foco.valor === 1 ? foco.singular : foco.plural;
  return `Você tem <strong>${foco.valor}</strong> ${noun} hoje.`;
};

const pendentes = countPendentesDoCorregedor(currentState);

const comAvaliacaoSubmetida = listProposicoesAguardandoDecisao(currentState).filter(
  (proposicao) => Boolean(proposicao.avaliacaoVigenteId),
).length;

// Mesma regra da fila de referendo: correição pronta = tem proposições
// aguardando referendo e nenhum rascunho de criação pendente.
const rascunhosCN = listProposicoesRascunhoCN(currentState);
const correicoesProntas = groupByCorreicao(listProposicoesAguardandoReferendo(currentState)).filter(
  (grupo) => grupo.correicaoId && !rascunhosCN.some((p) => p.correicaoId === grupo.correicaoId),
).length;

const avisosVigentes = listAvisosVigentes(currentState);
const avisosCriticos = avisosVigentes.filter((a) => a.severidade === SeveridadeAviso.CRITICO);
const avisosDemais = avisosVigentes.filter((a) => a.severidade !== SeveridadeAviso.CRITICO);

const heroHtml = renderCnHero({
  dateline: formatDatelineEditorial(),
  saudacao: `${saudacaoPorHora()}, Corregedor.`,
  headline: buildHeadlineCN(pendentes),
});

const filasSection = `
  <section class="cn-section" aria-label="Filas operacionais">
    <h2 class="cn-section__title">Filas operacionais</h2>
    <div class="inicio-filas-grid">
      ${renderFilaCard({
        titulo: "Aguardando decisão",
        icone: "decisao",
        valor: pendentes.pendentesDecisao,
        href: "corregedor-decisao.html",
        secundarios: [
          {
            valor: comAvaliacaoSubmetida,
            label: "com avaliação submetida",
            href: "corregedor-decisao.html?avaliacao=com&fila=1",
          },
          {
            valor: pendentes.pendentesRascunhoDecisao,
            label: "com rascunho a retomar",
            href: "corregedor-decisao.html?comRascunho=1",
          },
        ],
      })}
      ${renderFilaCard({
        titulo: "Aguardando referendo do CNMP",
        icone: "referendo",
        valor: pendentes.pendentesReferendo,
        href: "corregedor-referendo.html",
        secundarios: [
          {
            valor: correicoesProntas,
            label:
              correicoesProntas === 1
                ? "correição pronta para referendar"
                : "correições prontas para referendar",
            href: "corregedor-referendo.html",
          },
          {
            valor: pendentes.pendentesRascunho,
            label:
              pendentes.pendentesRascunho === 1
                ? "rascunho de criação a confirmar"
                : "rascunhos de criação a confirmar",
            href: "corregedor-referendo.html?comRascunho=1",
          },
        ],
      })}
    </div>
  </section>
`;

const servicosSection = `
  <section class="cn-section" aria-label="Serviços">
    <h2 class="cn-section__title">Serviços</h2>
    <div class="inicio-servicos">
      <a class="servico-link" href="correicoes-lista.html">
        ${renderIcon("correicoes", "servico-link__icone")}<span>Correições</span>
      </a>
      <a class="servico-link" href="proposicoes-criar.html">
        ${renderIcon("criar", "servico-link__icone")}<span>Criar proposição</span>
      </a>
      <a class="servico-link" href="administracao-superior.html">
        ${renderIcon("admin", "servico-link__icone")}<span>Administração Superior</span>
      </a>
    </div>
    <p class="inicio-consultas">
      <a href="proposicoes-lista.html">Consulta de proposições →</a>
      <a href="dashboard.html">Estatísticas →</a>
    </p>
  </section>
`;

const avisosSection = avisosDemais.length
  ? `
    <section class="cn-section" aria-label="Avisos institucionais">
      <h2 class="cn-section__title">Avisos</h2>
      <div class="inicio-avisos">
        ${avisosDemais.map(renderAvisoCard).join("")}
      </div>
    </section>
  `
  : "";

mountPage({
  activePage: "corregedor-inicio",
  title: "Início",
  actions: baseActions,
  content: `
    <div class="cn-inicio">
      ${avisosCriticos.map(renderAvisoBanner).join("")}
      ${heroHtml}
      ${filasSection}
      ${servicosSection}
      ${avisosSection}
    </div>
  `,
});
