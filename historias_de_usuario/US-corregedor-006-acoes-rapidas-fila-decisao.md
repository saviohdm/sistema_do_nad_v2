# US-CORREGEDOR-006 · Agir sobre proposições diretamente na fila de decisão

**Como** Corregedor Nacional,
**eu quero** botões de ação em cada cartão da fila de decisão e um acolhimento em lote por correição,
**para que** eu decida os casos simples sem abrir o detalhe e reserve a tela cheia aos que exigem redação.

## Ator
Corregedor Nacional (`PERSONAS.CORREGEDOR`), na fila **Aguardando decisão**.

## Pré-condições
- Fila de decisão aberta em modo de lista (qualquer visão: Compacta, Expandida ou Cartões) ou panorama por correição.
- Proposições em `aguardando decisão do Corregedor`, com ou sem minuta vigente.

## Fluxo principal
1. Cada cartão exibe a zona de ação conforme seu estado: com minuta vigente, `Acolher minuta`, `Afastar e decidir` e `Devolver minuta`; sem minuta, `Decidir diretamente`; com rascunho de decisão salvo, apenas `Retomar decisão`.
2. `Acolher minuta` pede confirmação com o número da proposição e, aceita, registra a decisão por acolhimento integral; a fila re-renderiza sem alerta.
3. `Devolver minuta` usa a mensagem de confirmação compartilhada da devolução e retorna a proposição à fila do membro auxiliar.
4. `Afastar e decidir`, `Decidir diretamente` e `Retomar decisão` navegam ao detalhe com `acao=afastar|decidir|retomar`, que abre o formulário correspondente já expandido e focado.
5. No panorama e no cabeçalho da fila filtrada por uma correição, `Acolher todas as minutas` confirma com as contagens (aptas e excluídas), registra um deferimento individual por minuta apta e informa o resultado.

## Fluxos alternativos
- **Confirmação recusada**: nenhum estado muda; o cartão permanece na fila.
- **Correição sem minuta apta**: o botão de lote fica desabilitado, com aviso do motivo (`sem minuta` / `com rascunho de decisão seu`).
- **Ação não mais cabível ao chegar no detalhe** (estado mudou): o deep-link não abre painel algum; a tela carrega no estado normal.
- **Decisão a partir do detalhe**: segue o fluxo sequencial da [US-CORREGEDOR-005](US-corregedor-005-navegar-fila-decisao.md).

## Regras de negócio
- Acolher em lote é uma sequência de atos individuais de deferimento: cada proposição recebe seu próprio evento `decisao` (modo `deferimento`), com a apreciação integral da minuta.
- Ficam fora do lote as proposições sem minuta vigente e as com rascunho de decisão do CN — o rascunho em andamento nunca é descartado por ação em massa.
- Afastar a minuta e decidir diretamente exigem apreciação completa com fundamentação obrigatória, por isso permanecem no detalhe; a fila apenas encurta o caminho.
- Cartões com rascunho de decisão não oferecem atalhos que o descartariam.

## Pós-condições
- Proposições acolhidas seguem o efeito normal da decisão (ciência ou nova diligência; pendência de providência quando aplicável).
- Devolvidas retornam a `aguardando avaliação do membro`, com o marco de devolução no histórico.
- As demais permanecem na fila, inalteradas.

## Referências
- [corregedor-decisao-page.js](../assets/js/features/corregedor-decisao-page.js) — zona de ação dos cartões, lote e handlers
- [avaliacoes.js](../assets/js/domain/avaliacoes.js) — `acolherMinutasDaCorreicao`, `deferirAvaliacao`, `removerAvaliacao`
- [proposicao-detalhe-page.js](../assets/js/features/proposicao-detalhe-page.js) — deep-link `acao=`
- [US-corregedor-005-navegar-fila-decisao.md](US-corregedor-005-navegar-fila-decisao.md) — navegação sequencial após decidir no detalhe
