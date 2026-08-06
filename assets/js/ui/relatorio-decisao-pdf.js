const COR = {
  vinho: "#8f1d24",
  vinhoEscuro: "#5f1117",
  tinta: "#241f20",
  secundario: "#5f5758",
  linha: "#ddd4cf",
  papel: "#fffdf9",
  quente: "#f6f0e9",
  sensivel: "#fff0ed",
  sensivelLinha: "#c63b32",
  verde: "#2e674d",
  verdeFundo: "#edf7f1",
  azulFundo: "#eef3f7",
};

const textoOu = (value, fallback = "Não informado") => value || fallback;

const formatarData = (value, fusoHorario) => {
  if (!value) return "Não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: fusoHorario,
  }).format(date);
};

const formatarTamanho = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "tamanho não informado";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const separarParagrafos = (value) => {
  const texto = String(value || "").replace(/\r\n?/g, "\n").trim();
  if (!texto) return [{ text: "Não informado.", style: "textoAusente" }];
  return texto
    .split(/\n\s*\n+/)
    .map((paragrafo) => paragrafo.trim())
    .filter(Boolean)
    .map((paragrafo) => ({ text: paragrafo, style: "corpo", margin: [0, 0, 0, 7] }));
};

const linhaMeta = (rotulo, valor) => [
  { text: rotulo, style: "metaRotulo" },
  { text: textoOu(valor), style: "metaValor" },
];

const tituloSecao = (titulo, tom = "vinho") => ({
  text: titulo,
  style: "tituloSecao",
  color: tom === "verde" ? COR.verde : COR.vinhoEscuro,
  headlineLevel: 2,
  margin: [0, 13, 0, 6],
});

const cabecalhoSecao = (titulo, apoio, tom = "vinho") => ({
  unbreakable: true,
  stack: [tituloSecao(titulo, tom), apoio],
});

const blocoApreciacao = (apreciacao) => {
  if (!apreciacao) return [{ text: "Não disponível.", style: "textoAusente" }];
  const linhas = [
    linhaMeta("Situação", apreciacao.situacao?.rotulo),
    linhaMeta("Conclusão", apreciacao.tipo_conclusao?.rotulo || "Não aplicável"),
    linhaMeta(
      "Providência da Secretaria",
      apreciacao.existe_providencia_secretaria === true
        ? "Sim"
        : apreciacao.existe_providencia_secretaria === false
          ? "Não"
          : "Não informada",
    ),
  ];
  if (apreciacao.tipo_providencia) {
    linhas.push(linhaMeta("Tipo de providência", apreciacao.tipo_providencia.rotulo));
  }
  if (apreciacao.descricao_providencia) {
    linhas.push(linhaMeta("Descrição da providência", apreciacao.descricao_providencia));
  }
  return [
    {
      table: { widths: [126, "*"], body: linhas },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => COR.linha,
        paddingTop: () => 4,
        paddingBottom: () => 4,
        paddingLeft: () => 0,
        paddingRight: () => 8,
      },
      margin: [0, 0, 0, 8],
    },
    { text: "Fundamentação", style: "subtitulo" },
    ...separarParagrafos(apreciacao.fundamentacao),
  ];
};

const blocoComprovacao = (comprovacao, fusoHorario) => {
  if (!comprovacao) {
    return [
      cabecalhoSecao(
        "Última comprovação",
        { text: "Não disponível.", style: "textoAusente" },
        "verde",
      ),
    ];
  }
  const anexos = comprovacao.anexos.length
    ? {
        ul: comprovacao.anexos.map((anexo) => ({
          text: [
            { text: textoOu(anexo.nome, "Arquivo sem nome"), bold: true },
            ` - ${textoOu(anexo.mime_type, "tipo não informado")} - ${formatarTamanho(anexo.tamanho_bytes)} - ${formatarData(anexo.anexado_em, fusoHorario)}`,
          ],
        })),
        style: "listaAnexos",
        margin: [10, 2, 0, 0],
      }
    : { text: "Nenhum anexo registrado.", style: "textoAusente" };
  return [
    cabecalhoSecao(
      "Última comprovação",
      {
        columns: [
          { text: `Autor: ${textoOu(comprovacao.autor)}`, style: "apoio" },
          {
            text: `Recebida em ${formatarData(comprovacao.data, fusoHorario)}`,
            style: "apoio",
            alignment: "right",
          },
        ],
        columnGap: 12,
      },
      "verde",
    ),
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                { text: "Descrição", style: "subtitulo", margin: [0, 0, 0, 3] },
                ...separarParagrafos(comprovacao.descricao),
                { text: "Observações", style: "subtitulo", margin: [0, 4, 0, 3] },
                ...separarParagrafos(comprovacao.observacoes),
                { text: `Anexos (${comprovacao.anexos.length})`, style: "subtitulo", margin: [0, 4, 0, 2] },
                anexos,
              ],
              fillColor: COR.verdeFundo,
              margin: [10, 8, 10, 8],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: (index) => (index === 0 ? 3 : 0),
        vLineColor: () => COR.verde,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    },
  ];
};

const blocoMinuta = (minuta, fusoHorario) => {
  if (!minuta) {
    return [
      cabecalhoSecao("Minuta do membro auxiliar", {
        text: "Não disponível - proposição apta a decisão direta.",
        style: "textoAusente",
      }),
    ];
  }
  return [
    cabecalhoSecao("Minuta do membro auxiliar", {
      columns: [
        { text: `Autor: ${textoOu(minuta.autor)}`, style: "apoio" },
        {
          text: `Submetida em ${formatarData(minuta.data, fusoHorario)}`,
          style: "apoio",
          alignment: "right",
        },
      ],
      columnGap: 12,
    }),
    { text: "Resumo", style: "subtitulo", margin: [0, 7, 0, 3] },
    ...separarParagrafos(minuta.resumo),
    ...blocoApreciacao(minuta.apreciacao),
  ];
};

const blocoRascunho = (rascunho, fusoHorario) => {
  if (!rascunho) {
    return [
      cabecalhoSecao("Rascunho de decisão do Corregedor", {
        text: "Não disponível.",
        style: "textoAusente",
      }),
    ];
  }
  return [
    cabecalhoSecao("Rascunho de decisão do Corregedor", {
      columns: [
        { text: `Salvo por: ${textoOu(rascunho.salvo_por)}`, style: "apoio" },
        {
          text: `Salvo em ${formatarData(rascunho.salvo_em, fusoHorario)}`,
          style: "apoio",
          alignment: "right",
        },
      ],
      columnGap: 12,
    }),
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                ...blocoApreciacao(rascunho.apreciacao),
              ],
              fillColor: COR.azulFundo,
              margin: [10, 8, 10, 8],
            },
          ],
        ],
      },
      layout: "noBorders",
    },
  ];
};

const blocoProposicao = (item, fusoHorario) => {
  const p = item.proposicao;
  const destinatario = p.destinatario;
  const fundoCabecalho = p.sensivel ? COR.sensivel : COR.quente;
  const linhaCabecalho = p.sensivel ? COR.sensivelLinha : COR.vinho;
  const unidadeOrigem = destinatario.unidade_origem?.nome
    ? ` - origem: ${destinatario.unidade_origem.nome}`
    : "";
  const meta = [
    linhaMeta("Correição", p.correicao_id),
    linhaMeta("Ramo", `${textoOu(p.ramo?.sigla)}${p.ramo?.nome ? ` - ${p.ramo.nome}` : ""}`),
    linhaMeta(
      "Destinatário",
      `${textoOu(destinatario.nome)} (${textoOu(destinatario.tipo?.rotulo)})${unidadeOrigem}`,
    ),
    linhaMeta("Prioridade", p.prioridade?.rotulo),
    linhaMeta("Sensível", p.sensivel ? "Sim" : "Não"),
    linhaMeta("Status", p.status?.rotulo),
  ];
  const descricao = separarParagrafos(p.descricao);

  return [
    {
      unbreakable: true,
      stack: [
        {
          table: {
            widths: [42, "*", "auto"],
            body: [
              [
                {
                  text: String(item.ordem).padStart(2, "0"),
                  style: "ordem",
                  color: linhaCabecalho,
                  margin: [0, 2, 0, 0],
                },
                {
                  stack: [
                    { text: textoOu(p.numero), style: "numeroProposicao", headlineLevel: 1 },
                    { text: `${textoOu(p.tipo)} - ID ${textoOu(p.id)}`, style: "apoio" },
                  ],
                },
                p.sensivel
                  ? { text: "SENSÍVEL", style: "seloSensivel", alignment: "right" }
                  : { text: "USO INTERNO", style: "seloInterno", alignment: "right" },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: (index) => (index === 0 ? 4 : 0),
            vLineColor: () => linhaCabecalho,
            fillColor: () => fundoCabecalho,
            paddingLeft: (index) => (index === 0 ? 10 : 8),
            paddingRight: () => 10,
            paddingTop: () => 9,
            paddingBottom: () => 9,
          },
        },
        {
          table: { widths: [112, "*"], body: meta },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => COR.linha,
            paddingTop: () => 4,
            paddingBottom: () => 4,
            paddingLeft: () => 0,
            paddingRight: () => 8,
          },
          margin: [0, 9, 0, 0],
        },
      ],
      margin: [0, item.ordem === 1 ? 10 : 22, 0, 0],
    },
    cabecalhoSecao("Descrição integral da proposição", {
      text: "Transcrição integral do texto registrado na proposição.",
      style: "apoio",
    }),
    ...descricao,
    ...blocoComprovacao(item.ultima_comprovacao, fusoHorario),
    ...blocoMinuta(item.minuta_membro_auxiliar, fusoHorario),
    ...blocoRascunho(item.rascunho_decisao_corregedor, fusoHorario),
  ];
};

export const criarDefinicaoPdfRelatorioDecisao = (snapshot) => {
  const fuso = snapshot.geracao.fuso_horario;
  const filtros = snapshot.recorte.resumo_legivel.map((filtro) => ({
    text: filtro,
    margin: [0, 1, 0, 1],
  }));
  const conteudoProposicoes = snapshot.proposicoes.flatMap((item) =>
    blocoProposicao(item, fuso),
  );

  return {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [48, 62, 48, 48],
    compress: true,
    info: {
      title: "Relatório da fila Aguardando decisão",
      author: "NAD - Corregedoria Nacional",
      subject: `Recorte com ${snapshot.recorte.total_proposicoes} proposição(ões)`,
      keywords: "NAD, Corregedoria Nacional, decisão, proposições, uso interno",
      creator: "Sistema do NAD",
      creationDate: new Date(snapshot.geracao.gerado_em_iso),
    },
    header: (paginaAtual) =>
      paginaAtual === 1
        ? null
        : {
            columns: [
              { text: "NAD · CORREGEDORIA NACIONAL", style: "cabecalhoMarca" },
              { text: "AGUARDANDO DECISÃO", style: "cabecalhoMarca", alignment: "right" },
            ],
            margin: [48, 24, 48, 0],
          },
    footer: (paginaAtual, totalPaginas) => ({
      columns: [
        { text: "USO INTERNO", style: "rodape", bold: true },
        { text: snapshot.geracao.gerado_em_local, style: "rodape", alignment: "center" },
        { text: `Página ${paginaAtual} de ${totalPaginas}`, style: "rodape", alignment: "right" },
      ],
      margin: [48, 12, 48, 0],
    }),
    content: [
      { text: "NAD · CORREGEDORIA NACIONAL", style: "marca" },
      { text: "Relatório da fila Aguardando decisão", style: "tituloDocumento" },
      {
        text: "Documento de conferência da seleção vigente na mesa do Corregedor Nacional.",
        style: "subtituloDocumento",
      },
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 2, lineColor: COR.vinho }],
        margin: [0, 14, 0, 14],
      },
      {
        table: {
          widths: [92, "*", 82, "auto"],
          body: [
            [
              { text: "Gerado por", style: "metaRotulo" },
              { text: snapshot.geracao.gerado_por, style: "metaValor" },
              { text: "Data e hora", style: "metaRotulo" },
              { text: snapshot.geracao.gerado_em_local, style: "metaValor" },
            ],
            [
              { text: "Identificador", style: "metaRotulo" },
              { text: snapshot.id_relatorio, style: "metaValor" },
              { text: "Total", style: "metaRotulo" },
              {
                text: `${snapshot.recorte.total_proposicoes} proposição(ões)`,
                style: "metaValor",
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => COR.linha,
          paddingTop: () => 5,
          paddingBottom: () => 5,
          paddingLeft: () => 0,
          paddingRight: () => 8,
        },
      },
      ...(snapshot.recorte.contem_sensiveis
        ? [
            {
              table: {
                widths: ["*"],
                body: [
                  [
                    {
                      text: "ATENÇÃO: este documento contém proposições marcadas como sensíveis. Preserve o canal institucional e o controle de acesso.",
                      style: "avisoSensivel",
                      fillColor: COR.sensivel,
                      margin: [10, 8, 10, 8],
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 0,
                vLineWidth: (index) => (index === 0 ? 4 : 0),
                vLineColor: () => COR.sensivelLinha,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 0,
              },
              margin: [0, 13, 0, 0],
            },
          ]
        : []),
      { text: "Recorte aplicado", style: "tituloSecao", margin: [0, 14, 0, 4] },
      { ul: filtros, style: "listaFiltros", margin: [10, 0, 0, 2] },
      ...conteudoProposicoes,
    ],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9.5,
      lineHeight: 1.33,
      color: COR.tinta,
    },
    styles: {
      marca: { fontSize: 8, bold: true, color: COR.vinho, characterSpacing: 1.5 },
      tituloDocumento: { fontSize: 22, bold: true, color: COR.vinhoEscuro, margin: [0, 6, 0, 3] },
      subtituloDocumento: { fontSize: 10.5, color: COR.secundario },
      cabecalhoMarca: { fontSize: 7.5, bold: true, color: COR.secundario, characterSpacing: 0.8 },
      rodape: { fontSize: 7.5, color: COR.secundario },
      tituloSecao: { fontSize: 11, bold: true, color: COR.vinhoEscuro },
      subtitulo: { fontSize: 8.5, bold: true, color: COR.secundario },
      corpo: { fontSize: 9.5, lineHeight: 1.35, color: COR.tinta },
      apoio: { fontSize: 7.8, color: COR.secundario },
      metaRotulo: { fontSize: 7.5, bold: true, color: COR.secundario },
      metaValor: { fontSize: 8.5, color: COR.tinta },
      textoAusente: { fontSize: 8.8, italics: true, color: COR.secundario },
      ordem: { fontSize: 20, bold: true },
      numeroProposicao: { fontSize: 13, bold: true, color: COR.tinta },
      seloSensivel: { fontSize: 7, bold: true, color: COR.sensivelLinha, characterSpacing: 0.6 },
      seloInterno: { fontSize: 7, bold: true, color: COR.secundario, characterSpacing: 0.6 },
      avisoSensivel: { fontSize: 8.5, bold: true, color: COR.vinhoEscuro },
      listaFiltros: { fontSize: 8.5, color: COR.secundario },
      listaAnexos: { fontSize: 7.8, color: COR.secundario, lineHeight: 1.3 },
    },
    pageBreakBefore: (currentNode, followingNodesOnPage) =>
      currentNode.headlineLevel === 2 && followingNodesOnPage.length === 0,
  };
};
