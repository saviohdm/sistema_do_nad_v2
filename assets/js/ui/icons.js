// Conjunto mínimo de ícones inline (traço, monocromático via currentColor).
// Sem dependência externa: cada ícone é um SVG 20×20 decorativo (aria-hidden);
// o rótulo textual acessível fica sempre no elemento que o contém.

const PATHS = {
  inicio: `
    <path d="M3.5 9.5 10 3.5l6.5 6" />
    <path d="M5.5 8.5V16h9V8.5" />
    <path d="M8.5 16v-4h3v4" />`,
  referendo: `
    <path d="M10 3.5a2.6 2.6 0 0 0-2.6 2.6c0 1.1.5 1.8.8 2.7.2.6-.2 1.2-.8 1.2H6a1.8 1.8 0 0 0-1.8 1.8v1h11.6v-1A1.8 1.8 0 0 0 14 11h-1.4c-.6 0-1-.6-.8-1.2.3-.9.8-1.6.8-2.7A2.6 2.6 0 0 0 10 3.5Z" />
    <path d="M4.5 16.5h11" />`,
  decisao: `
    <path d="M10 4v12" />
    <path d="M4.5 6.5h11" />
    <path d="M6 6.5 3.8 11a2.4 2.4 0 0 0 4.4 0L6 6.5Z" />
    <path d="M14 6.5 11.8 11a2.4 2.4 0 0 0 4.4 0L14 6.5Z" />
    <path d="M7.5 16.5h5" />`,
  correicoes: `
    <rect x="5" y="4.5" width="10" height="12" rx="1.5" />
    <path d="M8 4.5a2 2 0 0 1 4 0" />
    <path d="m7.5 10.5 1.8 1.8 3.4-3.6" />`,
  criar: `
    <path d="M6 3.5h5.5L14.5 6.5v10h-8.5Z" />
    <path d="M11.5 3.5v3h3" />
    <path d="M10.25 9.5v4.5" />
    <path d="M8 11.75h4.5" />`,
  admin: `
    <rect x="5.5" y="4" width="9" height="12.5" />
    <path d="M8 7h1.2M11 7h1.2M8 9.8h1.2M11 9.8h1.2M8 12.6h1.2M11 12.6h1.2" />
    <path d="M3.5 16.5h13" />`,
  lupa: `
    <circle cx="9" cy="9" r="4.6" />
    <path d="m12.6 12.6 3.9 3.9" />`,
  grafico: `
    <path d="M4.5 16.5v-6" />
    <path d="M9.5 16.5v-11" />
    <path d="M14.5 16.5v-8" />
    <path d="M3 17.5h14" />`,
  recolher: `
    <path d="m11 6-4 4 4 4" />
    <path d="m15.5 6-4 4 4 4" />`,
  diligencia: `
    <rect x="3.5" y="5" width="13" height="10.5" rx="1.5" />
    <path d="m4.5 6.5 5.5 4.5 5.5-4.5" />`,
  ciencia: `
    <path d="M10 3.5a4 4 0 0 0-4 4v2.6L4.5 13h11L14 10.1V7.5a4 4 0 0 0-4-4Z" />
    <path d="M8.5 15.5a1.6 1.6 0 0 0 3 0" />`,
  providencia: `
    <circle cx="10" cy="10" r="6.5" />
    <path d="m7.3 10.2 1.8 1.8 3.6-3.8" />`,
  avaliacao: `
    <path d="m12.5 4 3.5 3.5L8.5 15 4.5 15.5 5 11.5Z" />
    <path d="m11 5.5 3.5 3.5" />`,
  comprovacao: `
    <path d="M6 3.5h5.5L14.5 6.5v10h-8.5Z" />
    <path d="M11.5 3.5v3h3" />
    <path d="m8 11.5 1.6 1.6 2.9-3.1" />`,
  olho: `
    <path d="M3 10s2.5-4.5 7-4.5S17 10 17 10s-2.5 4.5-7 4.5S3 10 3 10Z" />
    <circle cx="10" cy="10" r="2" />`,
  pasta: `
    <path d="M3.5 15.5v-9h5l1.5 2h6.5v7Z" />`,
};

export const renderIcon = (name, className = "nav-link__icon") => {
  const paths = PATHS[name];
  if (!paths) return "";
  return `<svg class="${className}" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
};
