import { Labels, TipoDestinatario } from "../domain/enums.js";
import {
  getTipoDestinatario,
  resolverUsuariosDestinatarios,
} from "../domain/destinatario.js";

const escapeAttr = (value) => String(value ?? "").replace(/"/g, "&quot;");

export const labelOrientacao = (tipo) => Labels.tipoDestinatario?.[tipo] || tipo;

// Controle de destinatário de UMA proposição — a "válvula universal" da Secretaria
// para confirmar ou trocar quem é notificado numa comunicação (diligência/ciência).
// O override é DE COMUNICAÇÃO: define o usuário notificado do e-mail; NÃO reescreve o
// agregado `destinatario` da proposição (estável). Ver domain/destinatario.js.
//
// - membro/unidade: um destinatário com <select> (confirmar ou trocar). Unidade vaga
//   (sem responsável atual) => sem sugerido => obriga escolha antes do envio.
// - administração superior: envia a TODOS os usuários mapeados (sem override
//   individual); marca `data-dest-admsup-vago` quando não há parametrização.
//
// `chave` identifica o controle para a leitura do override (`data-dest-prop`),
// permitindo reuso por proposição (id) ou por grupo de ciência (grupoKey).
export const renderDestinatarioControl = (state, proposicao, chave = proposicao.id) => {
  const tipo = getTipoDestinatario(proposicao);
  const { sugeridos, candidatos, vago } = resolverUsuariosDestinatarios(state, proposicao);

  if (tipo === TipoDestinatario.ADMINISTRACAO_SUPERIOR) {
    if (vago) {
      return `<span class="muted" data-dest-admsup-vago="1">⚠ Administração superior sem usuários parametrizados — parametrize antes de enviar.</span>`;
    }
    const nomes = sugeridos.map((m) => m.nome).join(", ");
    return `<span class="muted">Administração superior — enviará a ${sugeridos.length} usuário(s): ${nomes}</span>`;
  }

  const sugeridoId = sugeridos[0]?.id || "";
  const placeholder = sugeridoId ? "" : `<option value="" selected>Selecione um destinatário…</option>`;
  const options = candidatos
    .map(
      (m) =>
        `<option value="${escapeAttr(m.id)}"${m.id === sugeridoId ? " selected" : ""}>${m.nome}${m.id === sugeridoId ? " (sugerido)" : ""}</option>`,
    )
    .join("");
  const vagoHint = vago
    ? `<small class="alert alert--warning" style="display:block;margin-top:0.25rem;">Unidade sem responsável atual no cadastro CNMP — escolha um destinatário para liberar o envio.</small>`
    : "";
  return `
    <label class="muted" style="display:block;font-size:0.85rem;">Destinatário (confirmar ou trocar):
      <select data-dest-prop="${escapeAttr(chave)}" style="display:block;width:100%;margin-top:0.25rem;">
        ${placeholder}${options}
      </select>
    </label>${vagoHint}`;
};

// Lê os overrides escolhidos no DOM: { chave: userId | null }.
export const lerOverridesDestinatario = (root = document) => {
  const map = {};
  root.querySelectorAll("[data-dest-prop]").forEach((sel) => {
    map[sel.dataset.destProp] = sel.value || null;
  });
  return map;
};

// Há alguma proposição orientada à administração superior sem usuários parametrizados?
export const temAdmSuperiorVago = (root = document) =>
  root.querySelectorAll("[data-dest-admsup-vago]").length > 0;
