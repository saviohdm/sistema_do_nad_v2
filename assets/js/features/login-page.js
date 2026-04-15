import { PERSONAS, setCurrentPersona } from "../app/auth.js";

const render = () => {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <div style="max-width: 400px; margin: 100px auto; padding: 2rem;">
      <div class="panel stack">
        <h1 class="panel__title">Sistema NAD - Protótipo</h1>
        <p>Selecione a persona para acessar o sistema:</p>
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
          <button type="submit" class="button">Entrar</button>
        </form>
      </div>
    </div>
  `;

  document.querySelector("#login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const persona = data.get("persona");
    if (persona) {
      setCurrentPersona(persona);
      window.location.href = "/pages/dashboard.html";
    }
  });
};

render();
