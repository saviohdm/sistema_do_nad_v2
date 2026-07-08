import { PERSONAS, setCurrentPersona, setCurrentUser, getHomeForPersona } from "../app/auth.js";
import { loadState } from "../app/store.js";
import { listMembros, findUnidadeById } from "../domain/correicionados.js";

const renderMembroSelect = (membros) => `
  <div class="field" id="campo-membro" style="display:none;">
    <label for="membro">Entrar como qual membro? (diretório CNMP)</label>
    <select id="membro" name="membro">
      <option value="">Selecione...</option>
      ${membros
        .map(
          (m) =>
            `<option value="${m.id}">${m.nome} — ${m.cargo || "Membro"}</option>`,
        )
        .join("")}
    </select>
    <p class="form-help" style="font-size: 0.85rem; color: var(--color-text-muted); margin-top: 0.25rem;">
      Em produção, o login do correicionado seria via SSO do CNMP.
    </p>
  </div>
`;

const renderMembroInfo = (membro, state) => {
  if (!membro) return "";
  const lotacao = findUnidadeById(state, membro.lotacaoUnidadeId);
  const chefias = (membro.chefiaDeUnidadeIds || [])
    .map((id) => findUnidadeById(state, id))
    .filter(Boolean);

  return `
    <div class="panel" style="padding: 0.75rem; background: var(--color-surface-muted); font-size: 0.85rem;">
      <strong>${membro.nome}</strong> · ${membro.cargo || "Membro"}<br>
      Lotação: ${lotacao ? lotacao.nome : "—"}${lotacao ? ` (${lotacao.ramoMP})` : ""}<br>
      ${chefias.length > 0 ? `Chefia de: ${chefias.map((u) => u.nome).join(", ")}` : "Sem chefia (vê só proposições nominadas)"}
    </div>
  `;
};

const render = () => {
  const state = loadState();
  const membros = listMembros(state);
  const app = document.querySelector("#app");
  app.innerHTML = `
    <div style="max-width: 460px; margin: 80px auto; padding: 2rem;">
      <div class="panel stack">
        <h1 class="panel__title">Sistema NAD</h1>
        <p>Selecione o perfil de acesso:</p>
        <form id="login-form" class="stack">
          <div class="field">
            <label for="persona">Persona</label>
            <select id="persona" name="persona" required>
              <option value="">Selecione...</option>
              <option value="${PERSONAS.CORREGEDOR}">Corregedor Nacional</option>
              <option value="${PERSONAS.MEMBRO}">Membro Auxiliar da CN</option>
              <option value="${PERSONAS.SECRETARIA}">Secretaria Processual da CN</option>
              <option value="${PERSONAS.CORREICIONADO}">Correicionado</option>
            </select>
          </div>
          ${renderMembroSelect(membros)}
          <div id="campo-membro-info"></div>
          <button type="submit" class="button">Entrar</button>
        </form>
      </div>
    </div>
  `;

  const personaSelect = document.querySelector("#persona");
  const campoMembro = document.querySelector("#campo-membro");
  const membroSelect = document.querySelector("#membro");
  const infoBox = document.querySelector("#campo-membro-info");

  const toggleCorreicionado = () => {
    if (personaSelect.value === PERSONAS.CORREICIONADO) {
      campoMembro.style.display = "block";
      membroSelect.required = true;
    } else {
      campoMembro.style.display = "none";
      membroSelect.required = false;
      membroSelect.value = "";
      infoBox.innerHTML = "";
    }
  };

  personaSelect.addEventListener("change", toggleCorreicionado);

  membroSelect.addEventListener("change", () => {
    const membro = membros.find((m) => m.id === membroSelect.value);
    infoBox.innerHTML = renderMembroInfo(membro, state);
  });

  document.querySelector("#login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const persona = data.get("persona");
    if (!persona) return;

    if (persona === PERSONAS.CORREICIONADO) {
      const userId = data.get("membro");
      if (!userId) {
        window.alert("Selecione um membro do diretório CNMP para entrar como correicionado.");
        return;
      }
      setCurrentPersona(persona);
      setCurrentUser(userId);
      window.location.href = getHomeForPersona(persona);
      return;
    }

    setCurrentPersona(persona);
    setCurrentUser(null);
    window.location.href = getHomeForPersona(persona);
  });
};

render();
