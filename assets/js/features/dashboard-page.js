import {
  getCurrentPersona,
  getHomeForPersona,
  PERSONAS,
  requireAuth,
} from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import {
  criarSnapshotRelatorioEstatistico,
  getPeriodoPadraoRelatorioEstatistico,
  listarExerciciosRelatorioEstatistico,
} from "../domain/relatorio-estatistico.js";
import { baixarRelatorioEstatisticoPdf } from "../ui/relatorio-estatistico-pdf.js";
import { renderBreadcrumb } from "../ui/layout.js";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderIndicadores = (snapshot) => `
  <section class="estat-indicadores" aria-label="Indicadores do mês de corte">
    ${snapshot.indicadores
      .map(
        (indicador, index) => `
          <article class="estat-kpi" style="--estat-cor:${indicador.cor}; --estat-delay:${index * 55}ms">
            <p class="estat-kpi__rotulo">${escapeHtml(indicador.rotulo)}</p>
            <div class="estat-kpi__corpo">
              <strong class="estat-kpi__valor">${indicador.mes}</strong>
              <span class="estat-kpi__mes">em ${escapeHtml(snapshot.periodo.mesCorteRotulo)}</span>
            </div>
            <div class="estat-kpi__meta">
              <span><b>${indicador.acumulado}</b> no ano</span>
              <span class="estat-kpi__variacao estat-kpi__variacao--${indicador.variacao.direcao}">${escapeHtml(indicador.variacao.rotulo)}</span>
            </div>
          </article>
        `,
      )
      .join("")}
  </section>
`;

const renderLegenda = (snapshot) => `
  <div class="estat-legenda" aria-label="Legenda dos marcos">
    ${snapshot.indicadores
      .map(
        (indicador) => `
          <span><i style="--estat-cor:${indicador.cor}"></i>${escapeHtml(indicador.rotuloCurto)}</span>
        `,
      )
      .join("")}
  </div>
`;

const renderSerie = (snapshot) => {
  const maximo = Math.max(1, ...snapshot.serieMensal.map((item) => item.totalAtos));
  return `
    <section class="estat-painel estat-painel--serie" aria-labelledby="estat-serie-titulo">
      <header class="estat-painel__header">
        <div>
          <p class="estat-overline">Produção do exercício</p>
          <h2 id="estat-serie-titulo">Atos internos por mês</h2>
        </div>
        ${renderLegenda(snapshot)}
      </header>
      <div class="estat-serie" style="--estat-meses:${snapshot.serieMensal.length}" role="img" aria-label="Gráfico mensal empilhado dos cinco marcos de produtividade">
        ${snapshot.serieMensal
          .map((item) => {
            const altura = item.totalAtos > 0 ? Math.max(4, (item.totalAtos / maximo) * 100) : 0;
            return `
              <div class="estat-serie__mes">
                <span class="estat-serie__total">${item.totalAtos}</span>
                <div class="estat-serie__trilho">
                  <div class="estat-serie__barra" style="height:${altura}%">
                    ${snapshot.indicadores
                      .map((indicador) => {
                        const valor = item.valores[indicador.codigo];
                        const proporcao = item.totalAtos > 0 ? (valor / item.totalAtos) * 100 : 0;
                        return `<span title="${escapeHtml(indicador.rotulo)}: ${valor}" style="height:${proporcao}%;background:${indicador.cor}"></span>`;
                      })
                      .join("")}
                  </div>
                </div>
                <span class="estat-serie__rotulo">${escapeHtml(item.rotuloCurto)}</span>
              </div>
            `;
          })
          .join("")}
      </div>
      <div class="estat-tabela-wrap">
        <table class="estat-tabela">
          <caption class="sr-only">Valores mensais por marco de produtividade</caption>
          <thead><tr><th>Marco</th>${snapshot.serieMensal.map((item) => `<th>${escapeHtml(item.rotuloCurto)}</th>`).join("")}<th>Ano</th></tr></thead>
          <tbody>
            ${snapshot.indicadores
              .map(
                (indicador) => `
                  <tr>
                    <th><i style="--estat-cor:${indicador.cor}"></i>${escapeHtml(indicador.rotulo)}</th>
                    ${snapshot.serieMensal.map((item) => `<td>${item.valores[indicador.codigo]}</td>`).join("")}
                    <td><strong>${indicador.acumulado}</strong></td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
};

const renderBarras = (itens, classe) => {
  const maximo = Math.max(1, ...itens.map((item) => item.valor));
  return itens
    .map(
      (item, index) => `
        <div class="estat-barra ${classe}" style="--estat-delay:${index * 45}ms">
          <div class="estat-barra__meta"><span>${escapeHtml(item.rotulo)}</span><strong>${item.valor}</strong></div>
          <div class="estat-barra__trilho"><span style="width:${(item.valor / maximo) * 100}%;background:${item.cor || "var(--primary)"}"></span></div>
        </div>
      `,
    )
    .join("");
};

const renderResultadosAcervo = (snapshot) => {
  const status = snapshot.acervoAtual.porStatus.map((item, index) => ({
    ...item,
    cor: index < 2 ? "#a59891" : index < 5 ? "#b85f4d" : "#5f1117",
  }));
  const totalDecisoes = snapshot.resultadosDecisoes.reduce((total, item) => total + item.valor, 0);
  return `
    <section class="estat-dupla">
      <article class="estat-painel" aria-labelledby="estat-resultados-titulo">
        <header class="estat-painel__header">
          <div><p class="estat-overline">Período fechado</p><h2 id="estat-resultados-titulo">Resultados das decisões</h2></div>
          <strong class="estat-painel__numero">${totalDecisoes}</strong>
        </header>
        <div class="estat-barras">${renderBarras(snapshot.resultadosDecisoes, "estat-barra--resultado")}</div>
      </article>
      <article class="estat-painel" aria-labelledby="estat-acervo-titulo">
        <header class="estat-painel__header">
          <div><p class="estat-overline">Retrato em ${escapeHtml(snapshot.geracao.geradoEmLocal)}</p><h2 id="estat-acervo-titulo">Acervo atual por etapa</h2></div>
          <strong class="estat-painel__numero">${snapshot.acervoAtual.totalAberto}</strong>
        </header>
        <div class="estat-barras">${renderBarras(status, "estat-barra--acervo")}</div>
      </article>
    </section>
  `;
};

const renderResumo = (snapshot) => `
  <section class="estat-fecho">
    <article class="estat-sintese">
      <p class="estat-overline">Leitura do período</p>
      <p>${escapeHtml(snapshot.sintese)}</p>
    </article>
    <article class="estat-providencias">
      <span>Controle paralelo</span>
      <strong>${snapshot.providenciasPendentes}</strong>
      <p>${snapshot.providenciasPendentes === 1 ? "providência pendente" : "providências pendentes"}</p>
    </article>
  </section>
  ${
    snapshot.avisosQualidade.length
      ? `<details class="estat-qualidade"><summary>Notas sobre a qualidade dos dados legados</summary><ul>${snapshot.avisosQualidade.map((aviso) => `<li>${escapeHtml(aviso)}</li>`).join("")}</ul></details>`
      : ""
  }
`;

const renderSnapshot = (snapshot) => `
  <div class="estat-relatorio">
    <section class="estat-capa">
      <div>
        <p class="estat-capa__marca">Corregedoria Nacional · NAD · função correicional</p>
        <h2>Relatório estatístico das proposições</h2>
        <p>Indicadores nacionais, agregados e extraídos do histórico do sistema.</p>
      </div>
      <div class="estat-capa__periodo">
        <span>Período fechado</span>
        <strong>${escapeHtml(snapshot.periodo.rotulo)}</strong>
        <small>Gerado em ${escapeHtml(snapshot.geracao.geradoEmLocal)}</small>
      </div>
    </section>
    ${renderIndicadores(snapshot)}
    ${renderSerie(snapshot)}
    ${renderResultadosAcervo(snapshot)}
    ${renderResumo(snapshot)}
  </div>
`;

const renderMeses = (ano, selecionado, padrao) => {
  const maximo = Number(ano) === padrao.ano ? padrao.mesCorte : 12;
  const mes = Math.min(Number(selecionado) || maximo, maximo);
  return {
    mes,
    html: Array.from({ length: maximo }, (_, index) => index + 1)
      .map((numero) => `<option value="${numero}"${numero === mes ? " selected" : ""}>${MESES[numero - 1]}</option>`)
      .join(""),
  };
};

const iniciarPagina = () => {
  const currentState = state();
  const agora = new Date();
  const padrao = getPeriodoPadraoRelatorioEstatistico({ agora });
  const anos = listarExerciciosRelatorioEstatistico(currentState, { agora });
  let snapshotAtual = criarSnapshotRelatorioEstatistico({ state: currentState, ...padrao, agora });

  const content = `
    <section class="estat-controles" aria-label="Parâmetros do relatório">
      <form class="estat-filtros" data-estat-filtros>
        <label>Exercício<select name="ano">${anos.map((ano) => `<option value="${ano}"${ano === padrao.ano ? " selected" : ""}>${ano}</option>`).join("")}</select></label>
        <label>Mês de corte<select name="mesCorte">${renderMeses(padrao.ano, padrao.mesCorte, padrao).html}</select></label>
        <button class="button button--secondary" type="submit">Atualizar recorte</button>
      </form>
      <div class="estat-download">
        <button class="button" type="button" data-baixar-estatistico>Baixar PDF</button>
        <p data-estat-status role="status" aria-live="polite">PDF institucional em duas páginas A4.</p>
      </div>
    </section>
    <div data-estat-conteudo>${renderSnapshot(snapshotAtual)}</div>
  `;

  mountPage({
    activePage: "dashboard",
    title: "Produtividade",
    breadcrumb: renderBreadcrumb([{ label: "Estatísticas" }]),
    actions: baseActions,
    content,
  });
  document.title = "NAD — Produtividade";

  const form = document.querySelector("[data-estat-filtros]");
  const anoSelect = form.elements.ano;
  const mesSelect = form.elements.mesCorte;
  const conteudo = document.querySelector("[data-estat-conteudo]");
  const download = document.querySelector("[data-baixar-estatistico]");
  const status = document.querySelector("[data-estat-status]");

  anoSelect.addEventListener("change", () => {
    const meses = renderMeses(Number(anoSelect.value), 12, padrao);
    mesSelect.innerHTML = meses.html;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    snapshotAtual = criarSnapshotRelatorioEstatistico({
      state: currentState,
      ano: Number(anoSelect.value),
      mesCorte: Number(mesSelect.value),
      agora,
    });
    conteudo.innerHTML = renderSnapshot(snapshotAtual);
    status.textContent = `Recorte atualizado: ${snapshotAtual.periodo.rotulo}.`;
  });

  download.addEventListener("click", async () => {
    download.disabled = true;
    download.setAttribute("aria-busy", "true");
    download.textContent = "Gerando PDF...";
    status.textContent = "Compondo as duas páginas do relatório...";
    try {
      const arquivo = await baixarRelatorioEstatisticoPdf(snapshotAtual);
      status.textContent = `${arquivo} gerado com sucesso.`;
    } catch (error) {
      console.error(error);
      status.textContent = "Não foi possível gerar o PDF. Tente novamente.";
    } finally {
      download.disabled = false;
      download.removeAttribute("aria-busy");
      download.textContent = "Baixar PDF";
    }
  });
};

if (requireAuth()) {
  const persona = getCurrentPersona();
  if (persona !== PERSONAS.CORREGEDOR) {
    window.location.replace(getHomeForPersona(persona));
  } else {
    iniciarPagina();
  }
}
