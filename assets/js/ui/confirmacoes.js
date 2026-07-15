export const MENSAGEM_DEVOLUCAO_MINUTA =
  "Devolver esta minuta? A minuta vigente e eventual rascunho de decisão do Corregedor serão apagados. A proposição voltará à fila de elaboração de minutas do membro auxiliar.";

export const confirmarEExecutarDevolucaoMinuta = ({ confirmar, devolver }) => {
  if (!confirmar(MENSAGEM_DEVOLUCAO_MINUTA)) return false;
  devolver();
  return true;
};
