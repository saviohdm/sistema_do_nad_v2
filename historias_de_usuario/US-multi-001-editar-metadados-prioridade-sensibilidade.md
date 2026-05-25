# US-MULTI-001 · Editar metadados de Prioridade e Sensibilidade

**Como** Corregedor Nacional, Membro Auxiliar da CN ou Secretaria Processual da CN,
**eu quero** poder editar a prioridade e marcar a sensibilidade de uma proposição em qualquer momento do trâmite,
**para que** a triagem operacional reflita a realidade atual do caso à medida que ela muda ao longo do processo.

## Ator
- Corregedor Nacional (`PERSONAS.CORREGEDOR`)
- Membro Auxiliar da CN (`PERSONAS.MEMBRO`)
- Secretaria Processual da CN (`PERSONAS.SECRETARIA`)

Permissão: `editar_metadados`. O Correicionado não tem acesso a essa ação.

## Pré-condições
- Persona logada está entre as três autorizadas.
- A proposição está em qualquer `statusFluxo` que **não seja** `baixa_definitiva`.

## Fluxo principal
1. Acessa a página de detalhe da proposição (`proposicao-detalhe.html?id=...`).
2. No painel **Metadados do caso**, vê um link discreto **Editar** alinhado à direita do título do painel.
3. Clica em **Editar** → abre modal compacto **Editar metadados**.
4. Modal mostra os valores atuais: select **Prioridade** (Urgente / Importante / Normal) e checkbox **Marcar como caso sensível**.
5. Altera um ou os dois campos. Botão **Salvar alterações** habilita apenas se houve mudança.
6. Clica em **Salvar alterações** → modal fecha e a página re-renderiza imediatamente.
7. Sistema atualiza `prioridade` e/ou `sensivel`, registra evento `edicao_metadados` no histórico com `prioridadeAnterior`, `prioridadeNova`, `sensivelAnterior`, `sensivelNovo` e usuário (a persona ativa).

## Fluxos alternativos
- **Cancelar**: clica em Cancelar, X do modal, no overlay ou tecla Esc → modal fecha sem alterações.
- **Sem mudança**: abre modal e não altera nada → botão Salvar fica desabilitado.
- **Proposição encerrada** (`baixa_definitiva`): link Editar não aparece. Tentativa direta de `editarMetadados()` lança erro.
- **Persona sem permissão** (Correicionado): link Editar não aparece.

## Regras de negócio
- Valores válidos de `prioridade`: `urgente`, `importante`, `normal`.
- `sensivel` é booleano. Não afeta visibilidade nem restringe acesso — é marcação visual destinada ao time.
- A edição **não** modifica `statusFluxo`, `apreciacaoDoCN`, `historico` anterior, nem nenhum outro campo da proposição.
- Cada salvamento (com mudança real) gera **um** evento `edicao_metadados` no histórico, atribuído à persona ativa.
- O badge **Sensível** aparece no hero da proposição e nas listagens (filas de referendo, decisão, diligência, providências, fila do membro) quando `sensivel === true`.
- O badge de **Prioridade** usa variantes: `urgente`→danger, `importante`→warning, `normal`→neutral.

## Pós-condições
- `proposicao.prioridade` e `proposicao.sensivel` refletem os novos valores.
- Histórico contém um novo evento `edicao_metadados` com a persona que executou a ação.
- Badges no hero, no painel de metadados e nas listagens refletem imediatamente o novo estado.

## Referências
- [proposicao-detalhe-page.js](../assets/js/features/proposicao-detalhe-page.js)
- [proposicoes.js — editarMetadados](../assets/js/domain/proposicoes.js)
- [modal.js — openEditarMetadadosModal](../assets/js/ui/modal.js)
- [auth.js — permissão editar_metadados](../assets/js/app/auth.js)
- [enums.js — Prioridade, TipoHistorico.EDICAO_METADADOS](../assets/js/domain/enums.js)
- [SPECS.md](../SPECS.md) — regras de estado e consistência
