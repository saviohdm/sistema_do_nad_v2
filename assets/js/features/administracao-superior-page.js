import { PERSONAS, getCurrentPersona, requireAuth } from "../app/auth.js";
import { baseActions, mountPage, state } from "../app/bootstrap.js";
import { mutateState } from "../app/store.js";
import { Labels } from "../domain/enums.js";
import {
  findMembroById,
  listAdmSuperiores,
  listUsuariosAdmSuperior,
} from "../domain/destinatario.js";
import { showToast } from "../ui/toast.js";

requireAuth();

// Parametrização institucional — apenas Corregedoria e Secretaria.
const persona = getCurrentPersona();
if (persona !== PERSONAS.CORREGEDOR && persona !== PERSONAS.SECRETARIA) {
  window.location.href = "/pages/dashboard.html";
}

const escapeAttr = (v) => String(v ?? "").replace(/"/g, "&quot;");
const escapeHtml = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Membros do mesmo ramo da administração superior (via unidade de lotação). São os
// únicos candidatos a serem vinculados — quem responde por uma PGJ/CGJ é do ramo dela.
const membrosDoRamo = (st, ramoMP) => {
  const unidadesDoRamo = new Set(
    (st.diretorioCnmp?.unidades || []).filter((u) => u.ramoMP === ramoMP).map((u) => u.id),
  );
  return (st.diretorioCnmp?.membros || []).filter((m) =>
    unidadesDoRamo.has(m.lotacaoUnidadeId),
  );
};

// Candidatos do ramo ainda não vinculados a esta entidade (fonte da busca por nome).
const candidatosDisponiveis = (st, adm) => {
  const vinculados = new Set(adm.usuarioIds || []);
  return membrosDoRamo(st, adm.ramoMP).filter((m) => !vinculados.has(m.id));
};

const findAdmById = (st, admId) =>
  (st.diretorioCnmp?.administracoesSuperiores || []).find((a) => a.id === admId) || null;

// Linha de um usuário já vinculado. O e-mail é derivado do registro do membro no
// diretório CNMP (somente-leitura). Remover fica bloqueado quando é o último (mínimo-1).
const renderUsuarioVinculado = (adm, membro, podeRemover) => {
  const bloqueio = podeRemover
    ? ""
    : ` disabled aria-disabled="true" title="A entidade precisa de ao menos um usuário vinculado."`;
  return `
    <li class="adm-linha adm-linha--vinculado">
      <div class="adm-linha__info">
        <span class="adm-linha__nome">${escapeHtml(membro.nome)}</span>
        <span class="muted">${escapeHtml(membro.cargo || "")}</span>
        <span class="adm-linha__email muted">${escapeHtml(membro.email || "—")}</span>
      </div>
      <button type="button" class="button button--ghost button--small" data-remover data-adm="${escapeAttr(adm.id)}" data-membro="${escapeAttr(membro.id)}"${bloqueio}>Remover</button>
    </li>
  `;
};

// Linha de um candidato na busca. `data-nome` alimenta o filtro por nome (item 3).
const renderCandidato = (adm, membro) => `
    <li class="adm-linha adm-linha--candidato" data-nome="${escapeAttr((membro.nome || "").toLowerCase())}">
      <div class="adm-linha__info">
        <span class="adm-linha__nome">${escapeHtml(membro.nome)}</span>
        <span class="muted">${escapeHtml(membro.cargo || "")}</span>
        <span class="adm-linha__email muted">${escapeHtml(membro.email || "—")}</span>
      </div>
      <button type="button" class="button button--secondary button--small" data-adicionar data-adm="${escapeAttr(adm.id)}" data-membro="${escapeAttr(membro.id)}">Adicionar</button>
    </li>
`;

const renderZonaIncluir = (st, adm) => {
  const totalRamo = membrosDoRamo(st, adm.ramoMP).length;
  if (totalRamo === 0) {
    return `<p class="muted">Nenhum membro do ramo ${escapeHtml(adm.ramoMP)} no diretório CNMP.</p>`;
  }
  const candidatos = candidatosDisponiveis(st, adm);
  if (candidatos.length === 0) {
    return `<p class="muted">Todos os membros do ramo ${escapeHtml(adm.ramoMP)} já estão vinculados.</p>`;
  }
  return `
    <div class="adm-incluir">
      <div class="acervo-filter-search">
        <input type="search" data-busca-adm="${escapeAttr(adm.id)}" placeholder="Buscar membro do ramo pelo nome…" aria-label="Buscar membro para vincular" autocomplete="off" />
      </div>
      <ul class="adm-candidatos" data-candidatos="${escapeAttr(adm.id)}">
        ${candidatos.map((m) => renderCandidato(adm, m)).join("")}
      </ul>
      <p class="muted" data-sem-resultados="${escapeAttr(adm.id)}" hidden>Nenhum membro encontrado para a busca.</p>
    </div>
  `;
};

const renderAdmCard = (st, adm) => {
  const vinculados = listUsuariosAdmSuperior(st, adm);
  const podeRemover = vinculados.length > 1;
  const linhas = vinculados.map((m) => renderUsuarioVinculado(adm, m, podeRemover)).join("");
  const count = vinculados.length;
  return `
    <article class="panel stack" data-adm-card="${escapeAttr(adm.id)}">
      <header class="button-row" style="justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="margin: 0;">${escapeHtml(adm.nome)}</h3>
          <p class="muted" style="margin: 0;">${escapeHtml(adm.ramoMP)} · ${escapeHtml(Labels.tipoAdmSuperior?.[adm.tipo] || adm.tipo)}</p>
        </div>
        <span class="badge badge--neutral" data-adm-count="${escapeAttr(adm.id)}">${count} usuário(s)</span>
      </header>
      <div class="stack">
        <p class="adm-secao-titulo">Usuários vinculados</p>
        <ul class="adm-usuarios">${linhas}</ul>
      </div>
      <div class="stack">
        <p class="adm-secao-titulo">Incluir usuário</p>
        ${renderZonaIncluir(st, adm)}
      </div>
    </article>
  `;
};

const render = () => {
  const st = state();
  const adms = listAdmSuperiores(st);
  const cards = adms.map((a) => renderAdmCard(st, a)).join("");
  mountPage({
    activePage: "administracao-superior",
    title: "Administração Superior",
    actions: baseActions,
    content: `
      <section class="stack">
        <p class="muted">Cada entidade precisa de ao menos um usuário vinculado. O e-mail é buscado automaticamente do diretório do CNMP.</p>
        <div class="stack">
          ${cards || `<p class="muted">Nenhuma administração superior cadastrada.</p>`}
        </div>
      </section>
    `,
  });
  bind();
};

// Vincula um membro do ramo à entidade (persiste na hora) — item 1.
const adicionarUsuario = (admId, membroId) => {
  mutateState((draft) => {
    const adm = (draft.diretorioCnmp?.administracoesSuperiores || []).find((a) => a.id === admId);
    if (adm) {
      if (!adm.usuarioIds) adm.usuarioIds = [];
      if (!adm.usuarioIds.includes(membroId)) adm.usuarioIds.push(membroId);
    }
    return draft;
  });
  const membro = findMembroById(state(), membroId);
  showToast(`${membro?.nome || "Usuário"} vinculado.`);
  render();
};

// Desvincula — recusa remover o último (mínimo-1, backstop do bloqueio inline) — item 2.
const removerUsuario = (admId, membroId) => {
  const atual = findAdmById(state(), admId);
  if ((atual?.usuarioIds || []).length <= 1) return;
  mutateState((draft) => {
    const adm = (draft.diretorioCnmp?.administracoesSuperiores || []).find((a) => a.id === admId);
    if (adm && (adm.usuarioIds || []).length > 1) {
      adm.usuarioIds = adm.usuarioIds.filter((id) => id !== membroId);
    }
    return draft;
  });
  const membro = findMembroById(state(), membroId);
  showToast(`${membro?.nome || "Usuário"} desvinculado.`);
  render();
};

const bind = () => {
  document.querySelectorAll("[data-adicionar]").forEach((btn) => {
    btn.addEventListener("click", () =>
      adicionarUsuario(btn.dataset.adm, btn.dataset.membro),
    );
  });

  document.querySelectorAll("[data-remover]:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () =>
      removerUsuario(btn.dataset.adm, btn.dataset.membro),
    );
  });

  // Filtro por nome, escopo do próprio card. Alterna as linhas de candidato e a
  // mensagem de "sem resultados"; não re-renderiza (preserva o foco no campo).
  document.querySelectorAll("[data-busca-adm]").forEach((input) => {
    input.addEventListener("input", () => {
      const admId = input.dataset.buscaAdm;
      const termo = input.value.trim().toLowerCase();
      const lista = document.querySelector(`[data-candidatos="${CSS.escape(admId)}"]`);
      if (!lista) return;
      let visiveis = 0;
      lista.querySelectorAll(".adm-linha--candidato").forEach((li) => {
        const casa = !termo || (li.dataset.nome || "").includes(termo);
        li.hidden = !casa;
        if (casa) visiveis += 1;
      });
      const semResultados = document.querySelector(
        `[data-sem-resultados="${CSS.escape(admId)}"]`,
      );
      if (semResultados) semResultados.hidden = visiveis > 0;
    });
  });
};

render();
