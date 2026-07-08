# US-SECRETARIA-002 · Aguardando Ciência

**Como** Secretária Processual da CN,
**eu quero** visualizar em panorama os grupos `(correição × unidadeId)` cujas proposições aguardam ciência e cientificá-los em bloco assim que cada unidade fica completa,
**para** dar ciência ao correicionado em uma só ação por unidade, sem ter que monitorar caso a caso quando todas as decisões da unidade ficam prontas.

## Ator
Secretaria Processual da CN (`PERSONAS.SECRETARIA`, permissão `registrar_cientificacao`).

## Pré-condições
- Persona logada é Secretaria.
- Existe ao menos uma proposição com `statusFluxo = AGUARDANDO_CIENCIA` (decisão conclusiva proferida e ainda sem evento `CIENTIFICACAO`).

## Fluxo principal
1. Acessa **Aguardando ciência** → vê panorama com 3 indicadores clicáveis (grupos prontos para ciência, proposições a cientificar, prontos hoje — o clique abre a fila já filtrada) e tabelas por Ramo e por Correição com colunas `Proposições aguardando` e `Unidades prontas / total`.
2. Drilldown: clica em ramo → modo Ramo lista correições do ramo; clica em correição → modo Grupo com cards por `(correição × unidadeId)`.
3. No modo Grupo, aplica filtros laterais (Ramo, Correição, Estado completo/parcial, Pronto em hoje/últimos 7 dias).
4. Marca grupos completos por `(correição × unidadeId)` (apenas grupos completos têm checkbox; parciais aparecem desabilitados com badge "Aguardando N decisões pendentes").
5. Sticky batch bar exibe `M grupo(s) selecionado(s) · N proposição(ões)` e botão `Cientificar todas`.
6. Confirma no modal, que sumariza por grupo (`Destinatário · Correição · K proposições · X gerarão pendência paralela`) e exibe, para cada grupo **membro/unidade**, o seletor **confirmar ou trocar destinatário** (administração superior mostra o multi-envio). Ver [US-secretaria-005](US-secretaria-005-confirmar-destinatario.md).
7. Sistema invoca `cientificarGrupo` para cada `(correição, unidadeId)` selecionado, registra evento `CIENTIFICACAO` em cada proposição e transita `statusFluxo` para `BAIXA_DEFINITIVA`.
8. Toast confirma cada grupo cientificado; grupos somem da fila; badge cross-page do menu decrementa.

## Fluxos alternativos
- **Grupo parcial**: apenas algumas proposições do grupo são `AGUARDANDO_CIENCIA`; checkbox desabilitado e badge "Aguardando N decisões pendentes".
- **Pendência paralela**: grupos cujas proposições têm `existeProvidenciaSecretaria=true` exibem linha "K com pendência paralela" no card; o modal sumariza isso. A ciência **não aguarda** o cumprimento da pendência — pendências rodam em paralelo via `pendenciasSecretaria[]` e não bloqueiam a baixa.
- **Recém-pronto**: grupos completos são ordenados por `prontoEm desc`; badge "Pronto há Xh" / "Pronto há N dias" sinaliza recência.
- **F5/navegação**: seleção de grupos restaurada via `sessionStorage[nad-secretaria-ciencia-selecao]`.
- **Loop de retorno**: se uma proposição volta para `AGUARDANDO_SECRETARIA` (decisão `necessita_mais_informacoes`), o grupo correspondente reverte para parcial automaticamente.

## Regras de negócio
- Ciência só pode ser registrada para proposições em `statusFluxo = AGUARDANDO_CIENCIA`.
- Ciência em bloco ocorre por `(correição, unidadeId)`; a unidade é o bloco-mínimo. Multi-grupo é apenas um agregador de UX — internamente, cada grupo é processado individualmente. Registros legados sem `unidadeId` usam temporariamente o nome da unidade.
- Apenas grupos **completos** (todas as proposições da unidade naquela correição em `AGUARDANDO_CIENCIA`) são selecionáveis.
- No modal, a Secretaria pode **confirmar ou trocar** o destinatário de cada grupo membro/unidade (o override marca a `caixaDeSaida` e o histórico); administração superior mantém o multi-envio. A **orientação** da proposição nunca muda (só o recebedor daquele e-mail). Ver `enviarEmailsAgregados({ destinatarioOverrideId })`.
- Após ciência, `statusFluxo` da proposição vira `BAIXA_DEFINITIVA`. Providências pendentes permanecem ativas em `pendenciasSecretaria[]`, mas **não impedem** a transição.
- Proposições em `BAIXA_DEFINITIVA` saem integralmente de `Unidades prontas / total`, mesmo quando preservam providência paralela pendente.
- Badge cross-page no menu lateral da Secretaria mostra a contagem de **grupos completos prontos** (não de proposições).

## Pós-condições
- Cada proposição cientificada migra para `BAIXA_DEFINITIVA` com evento `CIENTIFICACAO` no `historico`.
- `selecaoKeys` e `sessionStorage[nad-secretaria-ciencia-selecao]` zerados.
- Toast informa o número de proposições cientificadas por grupo.
- Badge cross-page reflete a nova contagem de grupos prontos.

## Referências
- [secretaria-ciencia-page.js](../assets/js/features/secretaria-ciencia-page.js)
- [ciencia.js](../assets/js/domain/ciencia.js)
- [secretaria-filas.js](../assets/js/domain/secretaria-filas.js)
- [enums.js](../assets/js/domain/enums.js) — `StatusFluxo.AGUARDANDO_CIENCIA`, `StatusFluxo.BAIXA_DEFINITIVA`
- [passos_do_processo_nad.md](../passos_do_processo_nad.md) — Secretaria Processual da CN
