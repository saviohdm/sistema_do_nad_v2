# US-CORREGEDOR-003 · Referendar correição com proposição do tipo Encaminhamento

**Como** Corregedor Nacional,
**eu quero** que, ao registrar o referendo da correição, os Encaminhamentos vindos do relatório da equipe (SCI) sejam baixados e convertidos automaticamente em pendência de providência,
**para que** a Secretaria Processual controle o cumprimento desses encaminhamentos sem que eles percorram um ciclo de diligência/avaliação/decisão que não lhes pertence.

## Ator
Corregedor Nacional (`PERSONAS.CORREGEDOR`), na fila de referendo.

## Pré-condições
- Correição com proposições em `aguardando_referendo_cnmp`, ao menos uma do tipo `Encaminhamento`.
- Nenhuma proposição da correição em `rascunho_cn` (rascunhos bloqueiam o referendo).

## Fluxo principal
1. Acessa **Referendo do CNMP** e localiza a correição.
2. Aciona **Marcar como referendada**; o diálogo de confirmação enumera os efeitos: N proposições serão encaminhadas à Secretaria e M encaminhamentos serão baixados e convertidos em pendência de providência.
3. Confirma. Para cada Encaminhamento aguardando referendo, o sistema:
   - grava o evento `referendo_cnmp`;
   - muda `statusFluxo` para `baixa_definitiva` (encerra o ciclo principal);
   - cria em `pendenciasSecretaria[]` uma pendência `outra_providencia` com a **mesma descrição** do encaminhamento;
   - grava o evento `conversao_encaminhamento` (com `pendenciaId` e `descricaoProvidencia`).
4. A pendência entra na fila de providências da Secretaria como qualquer outra (cumprimento registrado com `dataCumprimento` e `observacoes`).

## Fluxos alternativos
- **Encaminhamento criado em correição já referendada** (contingência, ou rascunho confirmado depois do referendo): converte imediatamente na criação/confirmação, sem novo referendo.
- **Antes do referendo**: o Encaminhamento segue as regras comuns — pode ser rascunhado, editado e apagado (`APAGAR proposição` encerra o ciclo sem criar pendência).

## Regras de negócio
- A conversão só ocorre no portão do referendo (ou na criação pós-referendo); avaliações e decisões nunca participam.
- A pendência é sempre `tipoProvidencia = outra_providencia`; o órgão-alvo (ex.: COCI) fica no texto da descrição.
- `apreciacaoDoCN`, diligências, avaliações e cientificação não existem para Encaminhamentos; correicionado e membro auxiliar não participam.
- O `destinatario` permanece obrigatório e aponta para a unidade/membro correicionado sobre quem o encaminhamento versa.

## Pós-condições
- Encaminhamento em `baixa_definitiva`, com dossiê contando criação → referendo → conversão.
- Pendência de providência pendente na fila da Secretaria (US-secretaria-004), com a descrição do encaminhamento.

## Referências
- [proposicoes.js](../assets/js/domain/proposicoes.js) — `converterEncaminhamento`, `referendarCorreicao`, `criarProposicao`, `confirmarRascunhoCN`
- [corregedor-referendo-page.js](../assets/js/features/corregedor-referendo-page.js) — diálogo de confirmação com contagens
- [US-secretaria-004-providencias-pendentes.md](US-secretaria-004-providencias-pendentes.md) — cumprimento da pendência
- [SPECS.md](../SPECS.md) — seção "Proposição do tipo Encaminhamento"
