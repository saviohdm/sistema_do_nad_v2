import { loadState } from "./store.js";

const PERSONA_KEY = "nad-persona-atual";
const CURRENT_USER_KEY = "nad-current-user-id";

export const PERSONAS = {
  CORREGEDOR: "Corregedor Nacional",
  MEMBRO: "Membro Auxiliar da CN",
  SECRETARIA: "Secretaria Processual da CN",
  CORREICIONADO: "Correicionado",
};

const PERMISSIONS = {
  [PERSONAS.CORREGEDOR]: [
    "criar_proposicao",
    "editar_proposicao",
    "apagar_proposicao",
    "gerir_correicao",
    "deferir_avaliacao",
    "indeferir_avaliacao",
    "remover_avaliacao",
    "avaliacao_com_forca_decisao",
    "editar_metadados",
  ],
  [PERSONAS.MEMBRO]: [
    "avaliar_como_membro",
    "ver_fila_membro_auxiliar",
    "editar_metadados",
  ],
  [PERSONAS.SECRETARIA]: [
    "criar_diligencia",
    "registrar_cientificacao",
    "cumprir_pendencia_secretaria",
    "editar_metadados",
    "avancar_tempo_sistema",
  ],
  [PERSONAS.CORREICIONADO]: [
    "registrar_comprovacao",
    "ver_minhas_comprovacoes",
    "ver_minhas_ciencias",
    "tomar_ciencia",
  ],
};

const PERSONA_MENU_OVERRIDES = {
  [PERSONAS.MEMBRO]: [
    { href: "membro-auxiliar.html", label: "Minha fila de avaliação", icon: "avaliacao" },
    { href: "proposicoes-lista.html", label: "Consulta de proposições", icon: "lupa" },
  ],
  // O menu do CN é agrupado ({ label?, items }); os demais permanecem planos —
  // o layout normaliza ambos os formatos.
  [PERSONAS.CORREGEDOR]: [
    {
      items: [{ href: "corregedor-inicio.html", label: "Início", icon: "inicio" }],
    },
    {
      label: "Filas operacionais",
      items: [
        {
          href: "corregedor-referendo.html",
          label: "Aguardando referendo do CNMP",
          icon: "referendo",
          badgeKey: "pendentesReferendoCN",
        },
        {
          href: "corregedor-decisao.html",
          label: "Aguardando decisão",
          icon: "decisao",
          badgeKey: "pendentesDecisaoCN",
        },
      ],
    },
    {
      label: "Serviços",
      items: [
        { href: "correicoes-lista.html", label: "Correições", icon: "correicoes" },
        { href: "proposicoes-criar.html", label: "Criar proposição", icon: "criar" },
        { href: "administracao-superior.html", label: "Administração Superior", icon: "admin" },
      ],
    },
    {
      items: [{ href: "proposicoes-lista.html", label: "Consulta de proposições", icon: "lupa" }],
    },
    {
      items: [{ href: "dashboard.html", label: "Estatísticas", icon: "grafico" }],
    },
  ],
  [PERSONAS.SECRETARIA]: [
    {
      items: [{ href: "secretaria-inicio.html", label: "Início", icon: "inicio" }],
    },
    {
      label: "Filas operacionais",
      items: [
        {
          href: "secretaria-diligencia.html",
          label: "Aguardando diligência",
          icon: "diligencia",
          badgeKey: "gruposDiligenciaProntos",
        },
        {
          href: "secretaria-ciencia.html",
          label: "Aguardando ciência",
          icon: "ciencia",
          badgeKey: "gruposCompletosProntos",
        },
        {
          href: "secretaria-providencia.html",
          label: "Providências pendentes",
          icon: "providencia",
          badgeKey: "providenciasPendentes",
        },
      ],
    },
    {
      label: "Serviços",
      items: [
        { href: "administracao-superior.html", label: "Administração Superior", icon: "admin" },
      ],
    },
    {
      items: [{ href: "proposicoes-lista.html", label: "Consulta de proposições", icon: "lupa" }],
    },
  ],
  [PERSONAS.CORREICIONADO]: [
    {
      href: "correicionado-comprovacoes.html",
      label: "Minhas comprovações",
      icon: "comprovacao",
      badgeKey: "minhasComprovacoesPendentes",
    },
    {
      href: "correicionado-ciencias.html",
      label: "Minhas ciências",
      icon: "olho",
      badgeKey: "minhasCienciasNaoVisualizadas",
    },
    { href: "proposicoes-lista.html", label: "Minhas proposições", icon: "pasta" },
  ],
};

export const getMenuOverrideForCurrentPersona = () => {
  const persona = getCurrentPersona();
  return PERSONA_MENU_OVERRIDES[persona] || null;
};

export const setCurrentPersona = (persona) => {
  localStorage.setItem(PERSONA_KEY, persona);
};

export const getCurrentPersona = () => {
  return localStorage.getItem(PERSONA_KEY) || null;
};

export const clearPersona = () => {
  localStorage.removeItem(PERSONA_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const setCurrentUser = (userId) => {
  if (userId) localStorage.setItem(CURRENT_USER_KEY, userId);
  else localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUserId = () => localStorage.getItem(CURRENT_USER_KEY) || null;

export const clearCurrentUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = () => {
  const userId = getCurrentUserId();
  if (!userId) return null;
  const state = loadState();
  const membros = state.diretorioCnmp?.membros || [];
  return membros.find((m) => m.id === userId) || null;
};

export const getHomeForPersona = (persona = getCurrentPersona()) => {
  if (persona === PERSONAS.CORREICIONADO) return "/pages/correicionado-comprovacoes.html";
  if (persona === PERSONAS.MEMBRO) return "/pages/membro-auxiliar.html";
  if (persona === PERSONAS.CORREGEDOR) return "/pages/corregedor-inicio.html";
  if (persona === PERSONAS.SECRETARIA) return "/pages/secretaria-inicio.html";
  return "/pages/login.html";
};

export const hasPermission = (action) => {
  const persona = getCurrentPersona();
  if (!persona) return false;
  return PERMISSIONS[persona]?.includes(action) || false;
};

export const requireAuth = () => {
  if (!getCurrentPersona()) {
    window.location.href = "/pages/login.html";
    return false;
  }
  if (getCurrentPersona() === PERSONAS.CORREICIONADO && !getCurrentUserId()) {
    window.location.href = "/pages/login.html";
    return false;
  }
  return true;
};
