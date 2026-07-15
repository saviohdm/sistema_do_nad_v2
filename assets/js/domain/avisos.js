import { parseDateValue } from "../app/utils.js";

// Avisos institucionais: comunicados de vigência controlada exibidos na página
// Início. São conteúdo administrado (seed), não eventos do fluxo de proposições.

export const SeveridadeAviso = {
  CRITICO: "critico",
  ALERTA: "alerta",
  INFORMATIVO: "informativo",
};

export const LabelsSeveridadeAviso = {
  [SeveridadeAviso.CRITICO]: "Crítico",
  [SeveridadeAviso.ALERTA]: "Alerta",
  [SeveridadeAviso.INFORMATIVO]: "Informativo",
};

const ORDEM_SEVERIDADE = {
  [SeveridadeAviso.CRITICO]: 0,
  [SeveridadeAviso.ALERTA]: 1,
  [SeveridadeAviso.INFORMATIVO]: 2,
};

// Vigente quando hoje ∈ [vigenciaInicio, vigenciaFim], datas inclusivas.
// Aviso expirado ou ainda não iniciado nunca é retornado.
export const listAvisosVigentes = (state, hoje = new Date()) => {
  const referencia = hoje instanceof Date ? hoje : parseDateValue(hoje);
  return (state.avisos || [])
    .filter((aviso) => {
      const inicio = parseDateValue(aviso.vigenciaInicio);
      const fim = parseDateValue(aviso.vigenciaFim);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return false;
      fim.setHours(23, 59, 59, 999);
      return inicio <= referencia && referencia <= fim;
    })
    .sort(
      (a, b) => (ORDEM_SEVERIDADE[a.severidade] ?? 9) - (ORDEM_SEVERIDADE[b.severidade] ?? 9),
    );
};
