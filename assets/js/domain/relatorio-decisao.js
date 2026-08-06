import { Labels } from "./enums.js";
import { getDestinatario, getTipoDestinatario } from "./destinatario.js";
import { getDestinatarioDisplay, getDestinatarioRef } from "./filas-operacionais.js";
import { getAvaliacaoVigente, getUltimaComprovacao } from "./proposicoes.js";

export const VERSAO_ESQUEMA_RELATORIO_DECISAO = "1.0";

const normalizarTexto = (value) => {
  if (value === null || value === undefined) return null;
  const texto = String(value).replace(/\r\n?/g, "\n").trim();
  return texto || null;
};

const enumComRotulo = (codigo, catalogo) =>
  codigo
    ? {
        codigo,
        rotulo: catalogo?.[codigo] || codigo,
      }
    : null;

const formatarDataLocal = (value, fusoHorario) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: fusoHorario,
  }).format(date);
};

const formatarTamanho = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "Tamanho não informado";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const criarIdRelatorio = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `rel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const resolverFusoHorario = (fusoHorario) => {
  if (fusoHorario) return fusoHorario;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  } catch {
    return "America/Sao_Paulo";
  }
};

const mapearAnexo = (anexo) => {
  if (typeof anexo === "string") {
    return {
      nome: anexo,
      tamanho_bytes: null,
      mime_type: null,
      anexado_em: null,
    };
  }
  return {
    nome: normalizarTexto(anexo?.nome),
    tamanho_bytes: Number.isFinite(anexo?.tamanhoBytes) ? anexo.tamanhoBytes : null,
    mime_type: normalizarTexto(anexo?.mimeType),
    anexado_em: normalizarTexto(anexo?.anexadoEm),
  };
};

const mapearApreciacao = (apreciacao) => {
  if (!apreciacao) return null;
  const existeProvidencia =
    typeof apreciacao.existeProvidenciaSecretaria === "boolean"
      ? apreciacao.existeProvidenciaSecretaria
      : null;
  return {
    situacao: enumComRotulo(apreciacao.situacao, Labels.situacaoApreciacao),
    tipo_conclusao: enumComRotulo(apreciacao.tipoConclusao, Labels.tipoConclusao),
    existe_providencia_secretaria: existeProvidencia,
    tipo_providencia: enumComRotulo(apreciacao.tipoProvidencia, Labels.tipoProvidencia),
    descricao_providencia: normalizarTexto(apreciacao.descricaoProvidencia),
    fundamentacao: normalizarTexto(apreciacao.observacoes),
  };
};

const mapearComprovacao = (proposicao) => {
  const comprovacao = getUltimaComprovacao(proposicao);
  if (!comprovacao) return null;
  const anexos = comprovacao.anexos || comprovacao.arquivos || [];
  return {
    id: comprovacao.id || null,
    data: comprovacao.data || null,
    autor: normalizarTexto(comprovacao.usuario),
    descricao: normalizarTexto(comprovacao.descricao),
    observacoes: normalizarTexto(comprovacao.observacoes),
    anexos: anexos.map(mapearAnexo),
  };
};

const mapearMinuta = (proposicao) => {
  const minuta = getAvaliacaoVigente(proposicao);
  if (!minuta) return null;
  return {
    id: minuta.id || null,
    data: minuta.data || null,
    autor: normalizarTexto(minuta.usuario),
    resumo: normalizarTexto(minuta.descricao),
    apreciacao: mapearApreciacao(minuta.apreciacao),
  };
};

const mapearRascunhoCorregedor = (proposicao) => {
  const rascunho = proposicao.rascunhoDecisaoCN;
  if (!rascunho) return null;
  return {
    salvo_em: rascunho.salvoEm || null,
    salvo_por: normalizarTexto(rascunho.salvoPor),
    salvo_por_id: rascunho.salvoPorId || null,
    apreciacao: mapearApreciacao(rascunho.apreciacao),
  };
};

const mapearDestinatario = (proposicao) => {
  const destinatario = getDestinatario(proposicao);
  const tipo = getTipoDestinatario(proposicao);
  const display = getDestinatarioDisplay(proposicao);
  const id = destinatario.membroId || destinatario.unidadeId || proposicao.unidadeId || null;
  return {
    referencia: getDestinatarioRef(proposicao) || null,
    tipo: enumComRotulo(tipo, Labels.tipoDestinatario),
    id,
    nome: normalizarTexto(display.rotulo),
    unidade_origem:
      tipo === "membro"
        ? {
            id: destinatario.unidadeOrigemSnapshot?.unidadeId || proposicao.unidadeId || null,
            nome: normalizarTexto(display.rotuloSecundario),
          }
        : null,
  };
};

const textoApreciacao = (apreciacao) => {
  if (!apreciacao) return "Não disponível.";
  const linhas = [
    `Situação: ${apreciacao.situacao?.rotulo || "Não informada"}`,
    `Conclusão: ${apreciacao.tipo_conclusao?.rotulo || "Não aplicável"}`,
    `Providência da Secretaria: ${
      apreciacao.existe_providencia_secretaria === true
        ? "Sim"
        : apreciacao.existe_providencia_secretaria === false
          ? "Não"
          : "Não informada"
    }`,
  ];
  if (apreciacao.tipo_providencia) {
    linhas.push(`Tipo de providência: ${apreciacao.tipo_providencia.rotulo}`);
  }
  if (apreciacao.descricao_providencia) {
    linhas.push(`Descrição da providência: ${apreciacao.descricao_providencia}`);
  }
  linhas.push("", "Fundamentação:", apreciacao.fundamentacao || "Não informada.");
  return linhas.join("\n");
};

const criarTextoConsolidado = (item, fusoHorario) => {
  const p = item.proposicao;
  const destinatario = p.destinatario;
  const linhas = [
    `PROPOSIÇÃO ${item.ordem}`,
    `ID: ${p.id}`,
    `Número: ${p.numero}`,
    `Tipo: ${p.tipo || "Não informado"}`,
    `Correição: ${p.correicao_id || "Não informada"}`,
    `Ramo: ${p.ramo?.sigla || "Não informado"}${p.ramo?.nome ? ` - ${p.ramo.nome}` : ""}`,
    `Destinatário: ${destinatario.nome || "Não informado"} (${destinatario.tipo?.rotulo || "tipo não informado"})`,
    `Prioridade: ${p.prioridade?.rotulo || "Não informada"}`,
    `Sensível: ${p.sensivel ? "Sim" : "Não"}`,
    `Status: ${p.status?.rotulo || "Não informado"}`,
    "",
    "DESCRIÇÃO INTEGRAL DA PROPOSIÇÃO",
    p.descricao || "Não informada.",
    "",
    "ÚLTIMA COMPROVAÇÃO",
  ];

  if (item.ultima_comprovacao) {
    const comprovacao = item.ultima_comprovacao;
    linhas.push(
      `Autor: ${comprovacao.autor || "Não informado"}`,
      `Data: ${formatarDataLocal(comprovacao.data, fusoHorario) || "Não informada"}`,
      "Descrição:",
      comprovacao.descricao || "Não informada.",
      "Observações:",
      comprovacao.observacoes || "Não informadas.",
      `Anexos (${comprovacao.anexos.length}):`,
      ...(comprovacao.anexos.length
        ? comprovacao.anexos.map(
            (anexo) =>
              `- ${anexo.nome || "Arquivo sem nome"} | ${anexo.mime_type || "tipo não informado"} | ${formatarTamanho(anexo.tamanho_bytes)} | ${formatarDataLocal(anexo.anexado_em, fusoHorario) || "data não informada"}`,
          )
        : ["- Nenhum anexo registrado."]),
    );
  } else {
    linhas.push("Não disponível.");
  }

  linhas.push("", "MINUTA DO MEMBRO AUXILIAR");
  if (item.minuta_membro_auxiliar) {
    const minuta = item.minuta_membro_auxiliar;
    linhas.push(
      `Autor: ${minuta.autor || "Não informado"}`,
      `Data: ${formatarDataLocal(minuta.data, fusoHorario) || "Não informada"}`,
      `Resumo: ${minuta.resumo || "Não informado"}`,
      textoApreciacao(minuta.apreciacao),
    );
  } else {
    linhas.push("Não disponível - proposição apta a decisão direta.");
  }

  linhas.push("", "RASCUNHO DE DECISÃO DO CORREGEDOR");
  if (item.rascunho_decisao_corregedor) {
    const rascunho = item.rascunho_decisao_corregedor;
    linhas.push(
      `Salvo por: ${rascunho.salvo_por || "Não informado"}`,
      `Salvo em: ${formatarDataLocal(rascunho.salvo_em, fusoHorario) || "Não informado"}`,
      textoApreciacao(rascunho.apreciacao),
    );
  } else {
    linhas.push("Não disponível.");
  }

  return linhas.join("\n");
};

const mapearProposicao = (proposicao, ordem, fusoHorario) => {
  const item = {
    ordem,
    proposicao: {
      id: proposicao.id || null,
      numero: normalizarTexto(proposicao.numero),
      tipo: normalizarTexto(proposicao.tipo),
      correicao_id: proposicao.correicaoId || null,
      ramo: {
        sigla: normalizarTexto(proposicao.ramoMP),
        nome: normalizarTexto(proposicao.ramoMPNome),
      },
      destinatario: mapearDestinatario(proposicao),
      prioridade: enumComRotulo(proposicao.prioridade, Labels.prioridade),
      sensivel: Boolean(proposicao.sensivel),
      status: enumComRotulo(proposicao.statusFluxo, Labels.statusFluxo),
      descricao: normalizarTexto(proposicao.descricao),
    },
    ultima_comprovacao: mapearComprovacao(proposicao),
    minuta_membro_auxiliar: mapearMinuta(proposicao),
    rascunho_decisao_corregedor: mapearRascunhoCorregedor(proposicao),
    texto_consolidado: "",
  };
  item.texto_consolidado = criarTextoConsolidado(item, fusoHorario);
  return item;
};

const mapearFiltros = (filtros, proposicoes) => {
  const primeira = proposicoes[0] || null;
  const temDestinatario = Boolean(
    filtros.destinatarioRef || filtros.unidadeRef || filtros.unidade,
  );
  const destinatario = temDestinatario && primeira ? mapearDestinatario(primeira) : null;
  const prioridade = enumComRotulo(filtros.prioridade, Labels.prioridade);
  const sensivel =
    filtros.sensivel === "sim" ? true : filtros.sensivel === "nao" ? false : null;
  const minuta =
    filtros.avaliacao === "com"
      ? { codigo: "com_minuta", rotulo: "Com minuta submetida" }
      : filtros.avaliacao === "sem"
        ? { codigo: "sem_minuta", rotulo: "Sem minuta - decisão direta" }
        : null;
  const resumo = [];
  if (filtros.correicaoId) resumo.push(`Correição: ${filtros.correicaoId}`);
  if (destinatario) resumo.push(`Destinatário: ${destinatario.nome}`);
  if (prioridade) resumo.push(`Prioridade: ${prioridade.rotulo}`);
  if (sensivel !== null) resumo.push(`Sensível: ${sensivel ? "Sim" : "Não"}`);
  if (filtros.comRascunho) resumo.push("Somente com rascunho de decisão");
  if (minuta) resumo.push(`Minuta do membro: ${minuta.rotulo}`);
  if (resumo.length === 0) resumo.push("Toda a fila Aguardando decisão");

  return {
    filtros_aplicados: {
      correicao_id: filtros.correicaoId || null,
      destinatario,
      prioridade,
      sensivel,
      somente_com_rascunho_decisao: Boolean(filtros.comRascunho),
      minuta_membro_auxiliar: minuta,
    },
    resumo_legivel: resumo,
  };
};

export const criarSnapshotRelatorioDecisao = ({
  proposicoes,
  filtros = {},
  agora = new Date(),
  idRelatorio = criarIdRelatorio(),
  fusoHorario,
} = {}) => {
  const lista = Array.isArray(proposicoes) ? proposicoes : [];
  const data = agora instanceof Date ? new Date(agora.getTime()) : new Date(agora);
  if (Number.isNaN(data.getTime())) throw new Error("Data de geração inválida.");
  const fuso = resolverFusoHorario(fusoHorario);
  const recorte = mapearFiltros(filtros, lista);
  const itens = lista.map((proposicao, index) => mapearProposicao(proposicao, index + 1, fuso));

  return {
    versao_esquema: VERSAO_ESQUEMA_RELATORIO_DECISAO,
    id_relatorio: idRelatorio,
    tipo_relatorio: "fila_aguardando_decisao",
    classificacao: "uso_interno",
    geracao: {
      gerado_em_iso: data.toISOString(),
      gerado_em_local: formatarDataLocal(data, fuso),
      fuso_horario: fuso,
      gerado_por: "Corregedor Nacional",
    },
    recorte: {
      total_proposicoes: itens.length,
      contem_sensiveis: itens.some((item) => item.proposicao.sensivel),
      ...recorte,
    },
    proposicoes: itens,
  };
};

const partesDataArquivo = (snapshot) => {
  const date = new Date(snapshot.geracao.gerado_em_iso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: snapshot.geracao.fuso_horario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}_${get("hour")}-${get("minute")}`;
};

const slugArquivo = (value) =>
  String(value || "todas")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "todas";

export const criarNomeBaseRelatorioDecisao = (snapshot) => {
  const correicao = snapshot.recorte.filtros_aplicados.correicao_id || "todas";
  const quantidade = snapshot.recorte.total_proposicoes;
  return `relatorio-aguardando-decisao_${slugArquivo(correicao)}_${partesDataArquivo(snapshot)}_${quantidade}-itens`;
};

export const serializarRelatorioDecisaoJson = (snapshot) =>
  `${JSON.stringify(snapshot, null, 2)}\n`;
