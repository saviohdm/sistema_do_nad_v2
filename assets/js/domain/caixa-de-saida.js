import { TipoCaixaSaida, TipoHistorico } from "./enums.js";
import { appendHistory, buildHistoryEvent } from "./historico.js";
import { uid } from "../app/utils.js";

const buildAssuntoDiligencia = (proposicao) =>
  `Diligência aberta: ${proposicao.numero}`;

const buildCorpoDiligencia = (proposicao, diligencia) => {
  const prazo = diligencia?.prazo
    ? new Date(diligencia.prazo).toLocaleDateString("pt-BR")
    : "(prazo a definir)";
  return [
    `Foi aberta diligência referente à proposição ${proposicao.numero}.`,
    `Unidade: ${proposicao.unidade}.`,
    `Acesse o Sistema NAD para apresentar a comprovação até ${prazo}.`,
  ].join(" ");
};

const buildAssuntoCiencia = (proposicaoIds) => {
  if (proposicaoIds.length === 1) return `Ciência disponível: ${proposicaoIds[0]}`;
  return `Ciência disponível: ${proposicaoIds.length} proposições`;
};

const buildCorpoCiencia = (proposicoes) =>
  [
    `Há ${proposicoes.length === 1 ? "uma nova ciência" : `${proposicoes.length} novas ciências`} disponíveis no Sistema NAD.`,
    "Acesse para visualizar a apreciação final do Corregedor Nacional.",
  ].join(" ");

const proximoId = (state) => uid("cx");

export const previewEmailDiligencia = (proposicao, diligencia, destinatario) => ({
  destinatarioId: destinatario?.id || null,
  destinatarioNome: destinatario?.nome || "(sem cadastro no diretório CNMP)",
  destinatarioEmail: destinatario?.email || "(sem e-mail no cadastro)",
  assunto: buildAssuntoDiligencia(proposicao),
  corpoResumo: buildCorpoDiligencia(proposicao, diligencia),
  linkAcesso: "/pages/correicionado-comprovacoes.html",
});

export const previewEmailCiencia = (proposicoes, destinatario) => {
  const numeros = proposicoes.map((p) => p.numero);
  return {
    destinatarioId: destinatario?.id || null,
    destinatarioNome: destinatario?.nome || "(sem cadastro no diretório CNMP)",
    destinatarioEmail: destinatario?.email || "(sem e-mail no cadastro)",
    assunto: buildAssuntoCiencia(numeros),
    corpoResumo: buildCorpoCiencia(proposicoes),
    linkAcesso: "/pages/correicionado-ciencias.html",
  };
};

export const adicionarEmailDiligencia = (
  state,
  proposicao,
  diligencia,
  destinatario,
  enviadoPor = "Secretaria Processual da CN",
) => {
  if (!state.caixaDeSaida) state.caixaDeSaida = [];
  const id = proximoId(state);
  const preview = previewEmailDiligencia(proposicao, diligencia, destinatario);
  const entry = {
    id,
    tipo: TipoCaixaSaida.DILIGENCIA,
    destinatarioId: preview.destinatarioId,
    destinatarioNome: preview.destinatarioNome,
    destinatarioEmail: preview.destinatarioEmail,
    proposicaoIds: [proposicao.id],
    assunto: preview.assunto,
    corpoResumo: preview.corpoResumo,
    linkAcesso: preview.linkAcesso,
    enviadoEm: new Date().toISOString(),
    enviadoPor,
  };
  state.caixaDeSaida.push(entry);

  appendHistory(
    proposicao,
    buildHistoryEvent(TipoHistorico.EMAIL_DILIGENCIA_ENVIADO, enviadoPor, {
      descricao: `E-mail de notificação enviado a ${preview.destinatarioNome} (${preview.destinatarioEmail}).`,
      destinatarioId: preview.destinatarioId,
      destinatarioEmail: preview.destinatarioEmail,
      caixaSaidaId: id,
      diligenciaId: diligencia?.id || null,
    }),
  );
  return entry;
};

export const adicionarEmailCiencia = (
  state,
  proposicoes,
  destinatario,
  enviadoPor = "Secretaria Processual da CN",
) => {
  if (!state.caixaDeSaida) state.caixaDeSaida = [];
  const id = proximoId(state);
  const preview = previewEmailCiencia(proposicoes, destinatario);
  const entry = {
    id,
    tipo: TipoCaixaSaida.CIENCIA,
    destinatarioId: preview.destinatarioId,
    destinatarioNome: preview.destinatarioNome,
    destinatarioEmail: preview.destinatarioEmail,
    proposicaoIds: proposicoes.map((p) => p.id),
    assunto: preview.assunto,
    corpoResumo: preview.corpoResumo,
    linkAcesso: preview.linkAcesso,
    enviadoEm: new Date().toISOString(),
    enviadoPor,
  };
  state.caixaDeSaida.push(entry);

  proposicoes.forEach((proposicao) => {
    appendHistory(
      proposicao,
      buildHistoryEvent(TipoHistorico.EMAIL_CIENCIA_ENVIADO, enviadoPor, {
        descricao: `E-mail de ciência enviado a ${preview.destinatarioNome} (${preview.destinatarioEmail}).`,
        destinatarioId: preview.destinatarioId,
        destinatarioEmail: preview.destinatarioEmail,
        caixaSaidaId: id,
      }),
    );
  });
  return entry;
};

export const listarCaixaSaida = (state, filtros = {}) => {
  const items = [...(state.caixaDeSaida || [])];
  const filtered = items.filter((entry) => {
    if (filtros.tipo && entry.tipo !== filtros.tipo) return false;
    if (filtros.destinatarioId && entry.destinatarioId !== filtros.destinatarioId)
      return false;
    if (filtros.q) {
      const termo = filtros.q.toLowerCase();
      const hay = `${entry.assunto} ${entry.corpoResumo} ${entry.destinatarioNome} ${entry.destinatarioEmail}`.toLowerCase();
      if (!hay.includes(termo)) return false;
    }
    return true;
  });
  return filtered.sort(
    (a, b) => new Date(b.enviadoEm).getTime() - new Date(a.enviadoEm).getTime(),
  );
};

export const findCaixaSaidaById = (state, id) =>
  (state.caixaDeSaida || []).find((entry) => entry.id === id) || null;
