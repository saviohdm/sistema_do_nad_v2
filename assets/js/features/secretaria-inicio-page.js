import { getCurrentPersona, getHomeForPersona, PERSONAS, requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { formatDatelineEditorial, saudacaoPorHora } from "../app/utils.js";
import { listAvisosVigentes, SeveridadeAviso } from "../domain/avisos.js";
import { countPendenciasAbertas } from "../domain/proposicoes.js";
import {
  countFilasSecretaria,
  countGruposCompletosProntos,
  listFilaAguardandoDiligencia,
  listGruposAguardandoDiligencia,
  listGruposParciaisSecretaria,
  listProvidenciasAtrasadas,
} from "../domain/secretaria-filas.js";
import {
  renderAvisoBanner,
  renderAvisoCard,
  renderCnHero,
  renderFilaCard,
} from "../ui/components.js";
import { renderIcon } from "../ui/icons.js";

requireAuth();

if (getCurrentPersona() !== PERSONAS.SECRETARIA) {
  window.location.href = getHomeForPersona();
}

const currentState = state();

// A headline foca a pendência mais prioritária da Secretaria na ordem:
// grupos prontos p/ diligência -> grupos prontos p/ ciência ->
// providências atrasadas -> providências pendentes.
const buildHeadlineSecretaria = ({
  gruposDiligencia,
  gruposCiencia,
  providenciasAtrasadas,
  providenciasPendentes,
}) => {
  const ordem = [
    { valor: gruposDiligencia, singular: "grupo pronto para diligência", plural: "grupos prontos para diligência" },
    { valor: gruposCiencia, singular: "grupo pronto para ciência", plural: "grupos prontos para ciência" },
    { valor: providenciasAtrasadas, singular: "providência atrasada há mais de 10 dias", plural: "providências atrasadas há mais de 10 dias" },
    { valor: providenciasPendentes, singular: "providência pendente", plural: "providências pendentes" },
  ];
  const foco = ordem.find((item) => item.valor > 0);
  if (!foco) {
    return `Sua mesa está limpa. <strong>Bom trabalho.</strong>`;
  }
  const noun = foco.valor === 1 ? foco.singular : foco.plural;
  return `Você tem <strong>${foco.valor}</strong> ${noun} hoje.`;
};

const gruposDiligenciaProntos = listGruposAguardandoDiligencia(currentState).filter(
  (grupo) => grupo.completo,
).length;
const proposicoesAguardandoDiligencia = listFilaAguardandoDiligencia(currentState).length;
const gruposParciais = listGruposParciaisSecretaria(currentState).length;

const gruposCienciaProntos = countGruposCompletosProntos(currentState);
const proposicoesAguardandoCiencia = countFilasSecretaria(currentState).aguardandoCiencia;

const providenciasPendentes = countPendenciasAbertas(currentState);
const providenciasAtrasadas = listProvidenciasAtrasadas(currentState).length;

const avisosVigentes = listAvisosVigentes(currentState);
const avisosCriticos = avisosVigentes.filter((a) => a.severidade === SeveridadeAviso.CRITICO);
const avisosDemais = avisosVigentes.filter((a) => a.severidade !== SeveridadeAviso.CRITICO);

const heroHtml = renderCnHero({
  dateline: formatDatelineEditorial(),
  saudacao: `${saudacaoPorHora()}, Secretaria.`,
  headline: buildHeadlineSecretaria({
    gruposDiligencia: gruposDiligenciaProntos,
    gruposCiencia: gruposCienciaProntos,
    providenciasAtrasadas,
    providenciasPendentes,
  }),
  marca: "NAD · Secretaria",
  ariaLabel: "Resumo do dia para a Secretaria Processual",
});

const filasSection = `
  <section class="cn-section" aria-label="Filas operacionais">
    <h2 class="cn-section__title">Filas operacionais</h2>
    <div class="inicio-filas-grid">
      ${renderFilaCard({
        titulo: "Aguardando diligência",
        icone: "diligencia",
        valor: gruposDiligenciaProntos,
        href: "secretaria-diligencia.html",
        hrefValor: "secretaria-diligencia.html?gruposCompletos=1",
        unidadeSingular: "grupo pronto",
        unidadePlural: "grupos prontos",
        secundarios: [
          {
            valor: proposicoesAguardandoDiligencia,
            label:
              proposicoesAguardandoDiligencia === 1
                ? "proposição aguardando diligência"
                : "proposições aguardando diligência",
            href: "secretaria-diligencia.html",
          },
          {
            valor: gruposParciais,
            label:
              gruposParciais === 1
                ? "grupo parcial em formação"
                : "grupos parciais em formação",
          },
        ],
      })}
      ${renderFilaCard({
        titulo: "Aguardando ciência",
        icone: "ciencia",
        valor: gruposCienciaProntos,
        href: "secretaria-ciencia.html",
        hrefValor: "secretaria-ciencia.html?estado=completo&fila=1",
        unidadeSingular: "grupo pronto",
        unidadePlural: "grupos prontos",
        secundarios: [
          {
            valor: proposicoesAguardandoCiencia,
            label:
              proposicoesAguardandoCiencia === 1
                ? "proposição aguardando ciência"
                : "proposições aguardando ciência",
            href: "secretaria-ciencia.html",
          },
        ],
      })}
      ${renderFilaCard({
        titulo: "Providências pendentes",
        icone: "providencia",
        valor: providenciasPendentes,
        href: "secretaria-providencia.html",
        unidadeSingular: "providência",
        unidadePlural: "providências",
        secundarios: [
          {
            valor: providenciasAtrasadas,
            label:
              providenciasAtrasadas === 1
                ? "atrasada há mais de 10 dias"
                : "atrasadas há mais de 10 dias",
            href: "secretaria-providencia.html?atrasadas=1",
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
      <a class="servico-link" href="administracao-superior.html">
        ${renderIcon("admin", "servico-link__icone")}<span>Administração Superior</span>
      </a>
    </div>
    <p class="inicio-consultas">
      <a href="proposicoes-lista.html">Consulta de proposições →</a>
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
  activePage: "secretaria-inicio",
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
