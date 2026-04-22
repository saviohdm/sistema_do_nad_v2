const PERSONA_KEY = "nad-persona-atual";

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
    "deferir_avaliacao",
    "indeferir_avaliacao",
    "remover_avaliacao",
    "avaliacao_com_forca_decisao",
  ],
  [PERSONAS.MEMBRO]: ["avaliar_como_membro", "ver_fila_membro_auxiliar"],
  [PERSONAS.SECRETARIA]: [
    "criar_diligencia",
    "registrar_cientificacao",
    "cumprir_pendencia_secretaria",
  ],
  [PERSONAS.CORREICIONADO]: ["registrar_comprovacao"],
};

const PERSONA_MENU_OVERRIDES = {
  [PERSONAS.MEMBRO]: [
    { href: "dashboard.html", label: "Dashboard" },
    { href: "membro-auxiliar.html", label: "Minha fila" },
  ],
  [PERSONAS.CORREGEDOR]: [
    { href: "dashboard.html", label: "Dashboard" },
    { href: "corregedor-referendo.html", label: "Aguardando referendo do CNMP" },
    { href: "corregedor-decisao.html", label: "Aguardando decisão" },
    { href: "proposicoes-lista.html", label: "Proposições" },
    { href: "proposicoes-criar.html", label: "Criar proposição" },
    { href: "diligencias.html", label: "Diligências" },
    { href: "pendencias-secretaria.html", label: "Pendências da Secretaria" },
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
  return true;
};
