import {
  getCurrentPersona,
  getHomeForPersona,
  PERSONAS,
  requireAuth,
} from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { criarSnapshotSituacao } from "../domain/estatisticas-situacao.js";
import { renderChartCard, renderSoloChartCard } from "../ui/components.js";
import { renderBreadcrumb } from "../ui/layout.js";

const renderPagina = (snapshot) => {
  const proposicoesCard = renderChartCard(
    "Proposições",
    [
      { label: "Ativas", value: snapshot.proposicoes.ativas, color: "var(--chart-1)" },
      { label: "Inativas", value: snapshot.proposicoes.inativas, color: "var(--chart-inactive)" },
    ],
    { showPercent: false },
  );

  const correicoesCard = renderChartCard(
    "Correições",
    [
      { label: "Ativas", value: snapshot.correicoes.ativas, color: "var(--chart-1)" },
      { label: "Inativas", value: snapshot.correicoes.inativas, color: "var(--chart-inactive)" },
    ],
    { showPercent: false },
  );

  const responsabilidadesCard = renderChartCard(
    "Responsabilidades ativas por persona",
    [
      {
        label: "Corregedoria Nacional",
        value: snapshot.responsabilidades.corregedoria,
        color: "var(--chart-1)",
      },
      {
        label: "Secretaria Processual",
        value: snapshot.responsabilidades.secretaria,
        color: "var(--chart-2)",
      },
      {
        label: "Correicionado",
        value: snapshot.responsabilidades.correicionado,
        color: "var(--chart-3)",
      },
      {
        label: "Membro Auxiliar",
        value: snapshot.responsabilidades.membroAuxiliar,
        color: "var(--chart-4)",
      },
    ],
  );

  const providenciasCard = renderSoloChartCard(
    "Providências paralelas",
    snapshot.providencias.proposicoesComPendencia,
    {
      caption:
        snapshot.providencias.proposicoesComPendencia === 1
          ? "proposição com providência paralela aberta"
          : "proposições com providência paralela aberta",
    },
  );

  return `
    <div class="situacao-dashboard">
      <section class="situacao-intro" aria-labelledby="situacao-intro-titulo">
        <div class="situacao-intro__texto">
          <p class="situacao-overline">Retrato operacional</p>
          <h2 id="situacao-intro-titulo">Estado atual do sistema</h2>
          <p>Visão nacional e agregada de todo o acervo registrado no NAD, independentemente do exercício de ingresso.</p>
        </div>
        <div class="situacao-intro__carimbo">
          <span>Atualizado em</span>
          <strong>${snapshot.geracao.geradoEmLocal}</strong>
          <small>Horário oficial de Brasília</small>
        </div>
      </section>

      <section class="situacao-panorama" aria-labelledby="situacao-panorama-titulo">
        <header class="situacao-secao-cabecalho">
          <div>
            <p class="situacao-overline">Panorama consolidado</p>
            <h2 id="situacao-panorama-titulo">Acervo e responsabilidades</h2>
          </div>
          <p>Dados calculados no instante de abertura desta página.</p>
        </header>
        <div class="situacao-grid">
          ${proposicoesCard}
          ${correicoesCard}
          ${responsabilidadesCard}
          ${providenciasCard}
        </div>
      </section>

      <aside class="situacao-metodologia" aria-labelledby="situacao-metodologia-titulo">
        <p class="situacao-overline" id="situacao-metodologia-titulo">Como ler este retrato</p>
        <div class="situacao-metodologia__colunas">
          <p>Uma proposição permanece operacionalmente ativa enquanto seu ciclo não estiver encerrado ou existir providência paralela pendente. Uma correição é inativa somente quando todas as suas proposições forem inativas.</p>
          <p>Responsabilidades podem se sobrepor quando o fluxo principal e uma providência da Secretaria coexistem. O último cartão conta proposições afetadas, enquanto Produtividade conta cada providência pendente.</p>
        </div>
      </aside>
    </div>
  `;
};

const iniciarPagina = () => {
  const snapshot = criarSnapshotSituacao({ state: state(), agora: new Date() });
  mountPage({
    activePage: "estatisticas-situacao",
    title: "Situação",
    breadcrumb: renderBreadcrumb([{ label: "Estatísticas" }]),
    actions: baseActions,
    content: renderPagina(snapshot),
  });
  document.title = "NAD — Situação";
};

if (requireAuth()) {
  const persona = getCurrentPersona();
  if (persona !== PERSONAS.CORREGEDOR) {
    window.location.replace(getHomeForPersona(persona));
  } else {
    iniciarPagina();
  }
}
