# US-MULTI-003 · Indicadores operacionais por correição

**Como** persona responsável por uma bandeja de proposições,
**eu quero** visualizar quantas proposições aguardam minha atuação e quantas unidades estão prontas,
**para** priorizar o tratamento em bloco quando todas as proposições abertas da unidade já estiverem disponíveis.

## Atores
Corregedor Nacional, Membro Auxiliar da CN e Secretaria Processual da CN.

## Fluxo principal
1. Acessa uma das cinco bandejas: referendo, diligência, elaboração de minuta, decisão ou ciência.
2. Na tabela **Por correição**, visualiza `Proposições aguardando` e `Unidades prontas / total`.
3. Usa a prontidão como apoio para priorizar o trabalho em bloco.

## Regras de negócio
- A unidade operacional é `(correicaoId × unidadeId)`; registros legados sem `unidadeId` usam temporariamente o nome da unidade.
- `Proposições aguardando` conta proposições com fluxo principal aberto presentes na bandeja, incluindo rascunhos de criação (`rascunho_cn`) no referendo; rascunhos de ação não alteram o status e já estão contidos nas bandejas.
- `Unidades prontas` conta unidades cujas proposições abertas estão todas na bandeja.
- `Unidades total` conta unidades da correição com ao menos uma proposição aberta.
- `BAIXA_DEFINITIVA` sai integralmente do cálculo, ainda que exista providência paralela pendente.
- Os indicadores são informativos; somente a ciência exige grupo completo para executar a ação.
- No referendo, rascunhos entram nos indicadores e bloqueiam relatório final e referendo até confirmação ou apagamento.

## Referências
- [filas-operacionais.js](../assets/js/domain/filas-operacionais.js)
- [fila-navegavel.js](../assets/js/ui/fila-navegavel.js)
- [secretaria-ciencia-page.js](../assets/js/features/secretaria-ciencia-page.js)
