import assert from "node:assert/strict";
import test from "node:test";

import { TipoHistorico } from "../assets/js/domain/enums.js";
import { renderHistoricoUnificado } from "../assets/js/ui/components.js";

const proposicao = {
  diligencias: [
    { id: "dil-1", status: "aberta" },
    { id: "dil-2", status: "comprovada" },
  ],
  pendenciasSecretaria: [],
};

const historico = [
  {
    id: "hist-origem",
    tipo: TipoHistorico.CRIACAO,
    data: "2026-01-01T09:00:00.000Z",
    usuario: "CN",
  },
  {
    id: "hist-dil-1",
    tipo: TipoHistorico.CRIACAO_DILIGENCIA,
    data: "2026-01-02T09:00:00.000Z",
    usuario: "Secretaria",
    diligenciaId: "dil-1",
  },
  {
    id: "hist-dil-2",
    tipo: TipoHistorico.CRIACAO_DILIGENCIA,
    data: "2026-01-03T09:00:00.000Z",
    usuario: "Secretaria",
    diligenciaId: "dil-2",
  },
];

const assertTodosOsBlocosFechados = (html) => {
  assert.equal((html.match(/<details class="historico-ciclo">/g) || []).length, 3);
  assert.doesNotMatch(html, /<details class="historico-ciclo" open>/);
};

test("renderiza origem e ciclos colapsados por padrão", () => {
  const html = renderHistoricoUnificado(proposicao, { historico });

  assertTodosOsBlocosFechados(html);
});

test("mantém todos os ciclos colapsados quando há filtro ativo", () => {
  const html = renderHistoricoUnificado(proposicao, {
    historico,
    filtroAtivo: "fluxo",
  });

  assertTodosOsBlocosFechados(html);
});
