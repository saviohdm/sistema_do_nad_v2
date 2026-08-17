import { criarNomeRelatorioEstatistico } from "../domain/relatorio-estatistico.js";
import { baixarBlob, carregarPdfMake } from "./pdf-runtime.js";

const COR = {
  vinho: "#8f1d24",
  vinhoEscuro: "#5f1117",
  tinta: "#252122",
  secundario: "#6d6665",
  linha: "#d8d0cb",
  papel: "#fffdfa",
  quente: "#f6efeb",
  suave: "#faf7f4",
  verde: "#38664f",
};

const soma = (itens, campo = "valor") => itens.reduce((total, item) => total + Number(item[campo] || 0), 0);

const cabecalhoPagina = (snapshot, secao) => ({
  stack: [
    {
      columns: [
        { text: "CONSELHO NACIONAL DO MINISTÉRIO PÚBLICO", style: "marca" },
        { text: secao.toUpperCase(), style: "marca", alignment: "right" },
      ],
    },
    {
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 770, y2: 0, lineWidth: 1.6, lineColor: COR.vinho }],
      margin: [0, 7, 0, 12],
    },
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: snapshot.titulo, style: "tituloDocumento" },
            { text: snapshot.subtitulo, style: "subtituloDocumento" },
          ],
        },
        {
          width: 220,
          stack: [
            { text: "PERÍODO FECHADO", style: "metaRotulo", alignment: "right" },
            { text: snapshot.periodo.rotulo, style: "metaDestaque", alignment: "right" },
            { text: `Gerado em ${snapshot.geracao.geradoEmLocal}`, style: "apoio", alignment: "right" },
          ],
        },
      ],
      columnGap: 24,
    },
  ],
});

const cardsIndicadores = (snapshot) => ({
  table: {
    widths: snapshot.indicadores.map(() => "*"),
    body: [
      snapshot.indicadores.map((indicador) => ({
        stack: [
          { text: indicador.rotulo.toUpperCase(), style: "kpiRotulo" },
          {
            columns: [
              { text: String(indicador.mes), style: "kpiValor", color: indicador.cor },
              {
                width: "auto",
                stack: [
                  { text: `${indicador.acumulado} NO ANO`, style: "kpiAcumulado" },
                  { text: indicador.variacao.rotulo, style: "kpiVariacao" },
                ],
                margin: [7, 5, 0, 0],
              },
            ],
          },
        ],
        fillColor: COR.suave,
        margin: [8, 7, 8, 7],
      })),
    ],
  },
  layout: {
    hLineWidth: () => 0,
    vLineWidth: (index) => (index === 0 ? 0 : 0.6),
    vLineColor: () => COR.linha,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  },
  margin: [0, 15, 0, 12],
});

const barraDoMes = (item, snapshot, maximo) => {
  const alturaMaxima = 78;
  const alturaTotal = maximo > 0 ? (item.totalAtos / maximo) * alturaMaxima : 0;
  let cursor = 84;
  const canvas = [
    { type: "line", x1: 0, y1: 84, x2: 30, y2: 84, lineWidth: 0.5, lineColor: COR.linha },
    { type: "line", x1: 0, y1: 0, x2: 0, y2: 86, lineWidth: 0, lineColor: COR.papel },
  ];
  snapshot.indicadores.forEach((indicador) => {
    const valor = item.valores[indicador.codigo];
    const altura = item.totalAtos > 0 ? (valor / item.totalAtos) * alturaTotal : 0;
    cursor -= altura;
    if (altura > 0) {
      canvas.push({ type: "rect", x: 4, y: cursor, w: 22, h: altura, color: indicador.cor });
    }
  });
  return {
    stack: [
      { canvas },
      { text: item.rotuloCurto.toUpperCase(), style: "graficoMes", alignment: "center" },
      { text: String(item.totalAtos), style: "graficoTotal", alignment: "center" },
    ],
  };
};

const graficoMensal = (snapshot) => {
  const maximo = Math.max(1, ...snapshot.serieMensal.map((item) => item.totalAtos));
  return {
    stack: [
      {
        columns: [
          { text: "PRODUTIVIDADE MENSAL", style: "secaoOverline" },
          { text: "Barras empilhadas: composição dos cinco marcos", style: "apoio", alignment: "right" },
        ],
      },
      {
        table: {
          widths: snapshot.serieMensal.map(() => "*"),
          body: [[...snapshot.serieMensal.map((item) => barraDoMes(item, snapshot, maximo))]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 5,
          paddingBottom: () => 0,
        },
        margin: [0, 4, 0, 8],
      },
      {
        columns: snapshot.indicadores.map((indicador) => ({
          width: "auto",
          columns: [
            { canvas: [{ type: "rect", x: 0, y: 2, w: 7, h: 7, color: indicador.cor }], width: 10 },
            { text: indicador.rotuloCurto, style: "legenda", width: "auto" },
          ],
          columnGap: 2,
        })),
        columnGap: 18,
      },
    ],
  };
};

const tabelaMensal = (snapshot) => {
  const cabecalho = [
    { text: "Marco", style: "tabelaCabecalho", alignment: "left" },
    ...snapshot.serieMensal.map((item) => ({ text: item.rotuloCurto, style: "tabelaCabecalho" })),
    { text: "Ano", style: "tabelaCabecalho" },
  ];
  const linhas = snapshot.indicadores.map((indicador) => [
    { text: indicador.rotulo, style: "tabelaRotulo", color: indicador.cor },
    ...snapshot.serieMensal.map((item) => ({ text: String(item.valores[indicador.codigo]), style: "tabelaValor" })),
    { text: String(indicador.acumulado), style: "tabelaTotal" },
  ]);
  return {
    table: {
      headerRows: 1,
      widths: [155, ...snapshot.serieMensal.map(() => "*"), 34],
      body: [cabecalho, ...linhas],
    },
    layout: {
      fillColor: (rowIndex) => (rowIndex === 0 ? COR.quente : rowIndex % 2 === 0 ? COR.suave : null),
      hLineWidth: (index) => (index === 0 || index === linhas.length + 1 ? 1 : 0.35),
      vLineWidth: () => 0,
      hLineColor: () => COR.linha,
      paddingTop: () => 4,
      paddingBottom: () => 4,
      paddingLeft: () => 5,
      paddingRight: () => 5,
    },
    margin: [0, 12, 0, 10],
  };
};

const linhaProporcional = (item, maximo, largura = 210) => ({
  stack: [
    {
      columns: [
        { text: item.rotulo, style: "barraRotulo" },
        { text: String(item.valor), style: "barraValor", width: 26, alignment: "right" },
      ],
    },
    {
      canvas: [
        { type: "rect", x: 0, y: 0, w: largura, h: 5, color: "#eee8e4" },
        { type: "rect", x: 0, y: 0, w: maximo > 0 ? (item.valor / maximo) * largura : 0, h: 5, color: item.cor || COR.vinho },
      ],
      margin: [0, 3, 0, 0],
    },
  ],
  margin: [0, 0, 0, 9],
});

const blocoResultados = (snapshot) => {
  const maximo = Math.max(1, ...snapshot.resultadosDecisoes.map((item) => item.valor));
  const total = soma(snapshot.resultadosDecisoes);
  return {
    width: "*",
    stack: [
      { text: "RESULTADOS DAS DECISÕES", style: "secaoTitulo" },
      { text: `${total} decisões proferidas no período fechado`, style: "apoio", margin: [0, 2, 0, 12] },
      ...snapshot.resultadosDecisoes.map((item) => linhaProporcional(item, maximo)),
    ],
  };
};

const blocoAcervo = (snapshot) => {
  const itens = snapshot.acervoAtual.porStatus.map((item, index) => ({
    ...item,
    cor: index < 2 ? "#a59891" : index < 5 ? "#b85f4d" : COR.vinhoEscuro,
  }));
  const maximo = Math.max(1, ...itens.map((item) => item.valor));
  return {
    width: "*",
    stack: [
      { text: "ACERVO ATUAL POR ETAPA", style: "secaoTitulo" },
      { text: `Retrato em ${snapshot.geracao.geradoEmLocal}`, style: "apoio", margin: [0, 2, 0, 12] },
      ...itens.map((item) => linhaProporcional(item, maximo)),
    ],
  };
};

const cardsAcervo = (snapshot) => ({
  table: {
    widths: ["*", "*", "*"],
    body: [[
      {
        stack: [
          { text: String(snapshot.acervoAtual.totalAberto), style: "destaqueValor" },
          { text: "PROPOSIÇÕES NO FLUXO PRINCIPAL", style: "destaqueRotulo" },
        ],
      },
      {
        stack: [
          { text: String(snapshot.providenciasPendentes), style: "destaqueValor", color: COR.verde },
          { text: "PROVIDÊNCIAS PARALELAS PENDENTES", style: "destaqueRotulo" },
        ],
      },
      {
        stack: [
          { text: String(soma(snapshot.resultadosDecisoes)), style: "destaqueValor", color: COR.vinho },
          { text: "DECISÕES NO PERÍODO", style: "destaqueRotulo" },
        ],
      },
    ]],
  },
  layout: {
    fillColor: () => COR.suave,
    hLineWidth: () => 0,
    vLineWidth: (index) => (index === 0 ? 0 : 0.7),
    vLineColor: () => COR.linha,
    paddingTop: () => 10,
    paddingBottom: () => 10,
    paddingLeft: () => 12,
    paddingRight: () => 12,
  },
  margin: [0, 16, 0, 18],
});

const notaMetodologica = (snapshot) => {
  const avisos = snapshot.avisosQualidade.length
    ? ` Qualidade dos dados: ${snapshot.avisosQualidade.join(" ")}`
    : "";
  return {
    table: {
      widths: ["*"],
      body: [[{
        stack: [
          { text: "NOTA METODOLÓGICA", style: "notaTitulo" },
          {
            text:
              `Os indicadores mensais contam atos praticados, inclusive novos ciclos da mesma proposição. Ativação corresponde ao ingresso efetivo no fluxo; baixas consideram somente a ciência após decisão conclusiva. O acervo é atual e inclui proposições abertas de qualquer exercício. Providências paralelas não reabrem o fluxo principal.${avisos}`,
            style: "notaTexto",
          },
        ],
        fillColor: COR.quente,
        margin: [11, 8, 11, 8],
      }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (index) => (index === 0 ? 3 : 0),
      vLineColor: () => COR.vinho,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  };
};

export const criarDefinicaoPdfRelatorioEstatistico = (snapshot) => ({
  pageSize: "A4",
  pageOrientation: "landscape",
  pageMargins: [36, 34, 36, 30],
  compress: true,
  info: {
    title: snapshot.titulo,
    author: "NAD - Corregedoria Nacional",
    subject: `Produtividade mensal - ${snapshot.periodo.rotulo}`,
    keywords: "NAD, Corregedoria Nacional, proposições, produtividade, estatísticas",
    creator: "Sistema do NAD",
    creationDate: new Date(snapshot.geracao.geradoEmIso),
  },
  footer: (paginaAtual, totalPaginas) => ({
    columns: [
      { text: `Fonte: ${snapshot.geracao.fonte}`, style: "rodape" },
      { text: snapshot.periodo.rotulo, style: "rodape", alignment: "center" },
      { text: `Página ${paginaAtual} de ${totalPaginas}`, style: "rodape", alignment: "right" },
    ],
    margin: [36, 8, 36, 0],
  }),
  content: [
    cabecalhoPagina(snapshot, "Produtividade mensal"),
    cardsIndicadores(snapshot),
    graficoMensal(snapshot),
    tabelaMensal(snapshot),
    {
      table: { widths: ["*"], body: [[{ text: snapshot.sintese, style: "sintese", margin: [10, 7, 10, 7] }]] },
      layout: {
        fillColor: () => COR.quente,
        hLineWidth: () => 0,
        vLineWidth: (index) => (index === 0 ? 3 : 0),
        vLineColor: () => COR.vinho,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    },
    {
      pageBreak: "before",
      stack: [
        cabecalhoPagina(snapshot, "Resultados e acervo"),
        cardsAcervo(snapshot),
        {
          columns: [blocoResultados(snapshot), blocoAcervo(snapshot)],
          columnGap: 42,
          margin: [0, 0, 0, 12],
        },
        notaMetodologica(snapshot),
      ],
    },
  ],
  defaultStyle: {
    font: "Roboto",
    fontSize: 8.5,
    lineHeight: 1.25,
    color: COR.tinta,
  },
  styles: {
    marca: { fontSize: 7, bold: true, color: COR.vinho, characterSpacing: 1.25 },
    tituloDocumento: { fontSize: 22, bold: true, color: COR.vinhoEscuro, margin: [0, 0, 0, 3] },
    subtituloDocumento: { fontSize: 8.5, color: COR.secundario, characterSpacing: 0.35 },
    metaRotulo: { fontSize: 6.5, bold: true, color: COR.secundario, characterSpacing: 1.1 },
    metaDestaque: { fontSize: 11, bold: true, color: COR.vinhoEscuro, margin: [0, 3, 0, 2] },
    apoio: { fontSize: 7.2, color: COR.secundario },
    kpiRotulo: { fontSize: 6.1, bold: true, color: COR.secundario, characterSpacing: 0.55 },
    kpiValor: { fontSize: 23, bold: true },
    kpiAcumulado: { fontSize: 6.5, bold: true, color: COR.tinta },
    kpiVariacao: { fontSize: 6.1, color: COR.secundario, margin: [0, 2, 0, 0] },
    secaoOverline: { fontSize: 7.2, bold: true, color: COR.vinho, characterSpacing: 1.1 },
    graficoMes: { fontSize: 6.5, bold: true, color: COR.secundario, margin: [0, 3, 0, 0] },
    graficoTotal: { fontSize: 7.2, bold: true, color: COR.tinta },
    legenda: { fontSize: 6.5, color: COR.secundario },
    tabelaCabecalho: { fontSize: 6.5, bold: true, color: COR.secundario, alignment: "center" },
    tabelaRotulo: { fontSize: 7, bold: true },
    tabelaValor: { fontSize: 7, alignment: "center" },
    tabelaTotal: { fontSize: 7.5, bold: true, color: COR.vinhoEscuro, alignment: "center" },
    sintese: { fontSize: 7.7, color: COR.tinta, lineHeight: 1.3 },
    secaoTitulo: { fontSize: 12, bold: true, color: COR.vinhoEscuro },
    barraRotulo: { fontSize: 7.3, color: COR.tinta },
    barraValor: { fontSize: 7.5, bold: true, color: COR.vinhoEscuro },
    destaqueValor: { fontSize: 25, bold: true, color: COR.vinhoEscuro },
    destaqueRotulo: { fontSize: 6.7, bold: true, color: COR.secundario, characterSpacing: 0.75 },
    notaTitulo: { fontSize: 7, bold: true, color: COR.vinho, characterSpacing: 1, margin: [0, 0, 0, 3] },
    notaTexto: { fontSize: 7.1, color: COR.secundario, lineHeight: 1.3 },
    rodape: { fontSize: 6.5, color: COR.secundario },
  },
});

export const baixarRelatorioEstatisticoPdf = async (snapshot) => {
  const pdfMake = await carregarPdfMake();
  const nomeArquivo = `${criarNomeRelatorioEstatistico(snapshot)}.pdf`;
  const blob = await pdfMake.createPdf(criarDefinicaoPdfRelatorioEstatistico(snapshot)).getBlob();
  baixarBlob(blob, nomeArquivo);
  return nomeArquivo;
};
