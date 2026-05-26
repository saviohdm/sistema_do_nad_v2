export const formatDateTime = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

export const formatDate = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
};

export const uid = (prefix = "id") =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

export const queryParam = (name) => new URLSearchParams(window.location.search).get(name);

export const toTitle = (value) =>
  value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatTempoRelativo = (iso) => {
  if (!iso) return "—";
  const inicio = new Date(iso);
  if (Number.isNaN(inicio.getTime())) return "—";
  const dias = Math.max(0, Math.floor((Date.now() - inicio.getTime()) / 86400000));
  if (dias === 0) return "há menos de 1 dia";
  if (dias === 1) return "há 1 dia";
  return `há ${dias} dias`;
};

const DIAS_SEMANA = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export const formatDatelineEditorial = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const dia = d.getDate();
  const mes = MESES[d.getMonth()];
  const ano = d.getFullYear();
  const semana = DIAS_SEMANA[d.getDay()];
  return `${dia} DE ${mes.toUpperCase()} DE ${ano} · ${semana.toUpperCase()}`;
};

export const saudacaoPorHora = (date = new Date()) => {
  const hora = date instanceof Date ? date.getHours() : new Date(date).getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
};
