# US-CORREGEDOR-009 · Consultar a situação atual do sistema

**Como** Corregedor Nacional,
**eu quero** consultar um retrato agregado do acervo e das responsabilidades atuais,
**para que** eu acompanhe a situação operacional do NAD sem confundi-la com os indicadores de produtividade mensal.

## Ator
Corregedor Nacional.

## Pré-condições
- A persona Corregedor Nacional está autenticada.
- O estado local possui as proposições que compõem o acervo do protótipo.

## Fluxo principal
1. Acessa **Estatísticas → Situação**.
2. O sistema lê todo o acervo, independentemente do exercício de ingresso.
3. Visualiza proposições e correições ativas e inativas, responsabilidades ativas por persona e proposições com providência paralela aberta.
4. Consulta o horário em que o retrato foi calculado, no fuso oficial de Brasília.

## Regras de negócio
- A página é nacional, agregada, somente leitura e exclusiva do Corregedor Nacional.
- Uma proposição é inativa somente quando o ciclo estiver encerrado e todas as providências paralelas estiverem cumpridas.
- Uma correição é inativa somente quando todas as suas proposições forem inativas.
- Responsabilidades por persona admitem sobreposição entre o fluxo principal e providências da Secretaria.
- O cartão de providências conta proposições distintas com pelo menos uma pendência, e não o número de pendências.
- Não existem filtros, exportação, atualização automática, casos individuais ou acesso à fila operacional da Secretaria.

## Pós-condições
- O snapshot e o estado persistido permanecem inalterados.
- Recarregar a página produz um novo retrato e um novo carimbo de atualização.

## Referências
- [estatisticas-situacao.js](../assets/js/domain/estatisticas-situacao.js)
- [estatisticas-situacao-page.js](../assets/js/features/estatisticas-situacao-page.js)
