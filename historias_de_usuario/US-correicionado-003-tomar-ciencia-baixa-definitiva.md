# US-CORREICIONADO-003 · Tomar ciência de baixa definitiva

**Como** correicionado,
**eu quero** visualizar as proposições encerradas vinculadas a mim e tomar ciência da decisão final do Corregedor Nacional,
**para que** eu conheça o resultado e as eventuais providências paralelas que se seguirão.

## Ator
Correicionado (`PERSONAS.CORREICIONADO`, permissão `tomar_ciencia`).

## Pré-condições
- Persona logada é Correicionado.
- Existe ao menos uma proposição com `statusFluxo = BAIXA_DEFINITIVA`, visível ao usuário, com evento `EMAIL_CIENCIA_ENVIADO` no histórico.

## Fluxo principal
1. Acessa **Minhas ciências** → vê lista de proposições ordenadas por data de disponibilização da ciência (mais recentes primeiro).
2. Cada cartão exibe número, unidade, ramo, badge **"Não visualizada"** ou **"Visualizada em DD/MM/AAAA HH:MM"**, decisão final (`tipoConclusao`), fundamentos (`apreciacaoDoCN.observacoes`), e lista resumida de providências paralelas, se houver.
3. Clica em **Tomar ciência** → vai ao detalhe da proposição em modo Correicionado.
4. Ao montar a página, o sistema verifica `cienciaJaVisualizadaPor(proposicao, user.id)`; se não, chama `registrarVisualizacaoCiencia(proposicao, user)` que adiciona `VISUALIZACAO_CIENCIA_CORREICIONADO` ao histórico.
5. Vê hero, metadados, painel destacado **Decisão final do Corregedor Nacional** (tipo conclusão + fundamentos), providências paralelas (visualização) e histórico filtrado.

## Fluxos alternativos
- **Sem ciências**: empty state instruindo que ciências aparecem quando a Secretaria as disponibiliza.
- **Já visualizada**: o card de decisão informa "Você já visualizou esta ciência em DD/MM/AAAA HH:MM". Não há novo registro de visualização (idempotente por user).
- **Decisão por "necessita mais informações"**: caso a proposição tenha decisões anteriores desse tipo, elas aparecem no histórico filtrado, mas o painel da decisão final reflete o resultado conclusivo final.

## Regras de negócio
- O evento `VISUALIZACAO_CIENCIA_CORREICIONADO` é **único por (proposição, userId)** — registra apenas a primeira visualização.
- O ato de visualizar **não** altera `statusFluxo` (Modelo 1 — passo único: o `BAIXA_DEFINITIVA` foi atribuído quando a Secretaria abriu ciência).
- O histórico exibido ao correicionado é filtrado por `filtrarHistoricoParaCorreicionado`:
  - **Visíveis**: criação, edição, diligências, suas comprovações, expirações, decisão integral atribuída ao CN, cientificações, e-mails enviados a ele e cumprimento de providência.
  - **Ocultos**: minuta do membro auxiliar, acolhimento ou afastamento da minuta, devoluções, rascunhos e edição de metadados.
- O acolhimento (função legada `deferirAvaliacao`) clona profundamente toda a minuta para `apreciacaoDoCN`; a projeção pública atribui a decisão somente ao Corregedor Nacional e usa descrição neutra, sem revelar a origem interna da redação.

## Pós-condições
- Primeiro acesso: histórico ganha `VISUALIZACAO_CIENCIA_CORREICIONADO` com `userIdCorreicionado` e `data`.
- Subsequentes: nenhuma mudança de estado.

## Referências
- [correicionado-ciencias-page.js](../assets/js/features/correicionado-ciencias-page.js)
- [proposicao-detalhe-page.js](../assets/js/features/proposicao-detalhe-page.js) — branch Correicionado
- [correicionados.js — registrarVisualizacaoCiencia, filtrarHistoricoParaCorreicionado](../assets/js/domain/correicionados.js)
- [SPECS.md](../SPECS.md) — Visibilidade do histórico para o correicionado
