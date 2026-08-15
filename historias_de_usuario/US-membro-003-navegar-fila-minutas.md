# US-MEMBRO-003 · Navegar sequencialmente pela fila de minutas

**Como** membro auxiliar da CN,
**eu quero** avançar para a próxima proposição da seleção após submeter uma minuta,
**para que** eu elabore a fila filtrada sem retornar à listagem entre cada item.

## Ator
Membro Auxiliar da CN (`PERSONAS.MEMBRO`), na fila **Minha fila de elaboração de minutas**.

## Pré-condições
- Fila de elaboração aberta em modo de lista, com qualquer combinação de filtros.
- Proposição acessada por um cartão dessa lista.

## Fluxo principal
1. A fila salva em sessão os IDs na ordem exibida e sua URL filtrada.
2. O membro submete a minuta no detalhe da proposição atual.
3. O sistema percorre o snapshot a partir do item atual e ignora itens que já saíram da fila.
4. Havendo próxima proposição disponível, substitui o detalhe atual pelo detalhe seguinte.
5. O botão Voltar do navegador retorna à fila filtrada, sem reabrir itens já processados.

## Fluxos alternativos
- **Último item real**: alerta `Esta era a última proposição da lista filtrada.` e retorna à fila.
- **Itens posteriores indisponíveis**: alerta `Não há outras proposições disponíveis na lista filtrada.` e retorna à fila.
- **Snapshot ausente ou inválido**: preserva a submissão, avisa que o contexto não pôde ser recuperado e retorna com segurança à fila operacional.
- **Metadados alterados**: se prioridade ou sensibilidade mudarem, o item permanece na seleção desde que ainda aguarde minuta.
- **Rascunho salvo ou descartado**: permanece no detalhe atual.
- **Detalhe aberto fora da fila**: mantém o comportamento de sua origem, sem criar uma sequência implícita.
- **Submissão rápida na própria fila**: o cartão sai da fila e a listagem é atualizada no lugar.

## Regras de negócio
- “Próxima” é a posição seguinte na ordem exibida, sem nova ordenação.
- O contexto é restrito à sessão da aba e não altera o estado persistido da proposição.
- A navegação só ocorre depois que `salvarAvaliacaoMembro` conclui com sucesso.

## Pós-condições
- A minuta e sua transição para `AGUARDANDO_DECISAO_CORREGEDOR` permanecem inalteradas.
- O usuário permanece no fluxo sequencial ou retorna à mesma seleção filtrada.

## Referências
- [fila-navegavel.js](../assets/js/ui/fila-navegavel.js) — captura do snapshot ordenado
- [fila-contexto-navegacao.js](../assets/js/ui/fila-contexto-navegacao.js) — validação do contexto e resolução do próximo item
- [proposicao-detalhe-page.js](../assets/js/features/proposicao-detalhe-page.js) — navegação após a submissão
- [US-CORREGEDOR-005](US-corregedor-005-navegar-fila-decisao.md) — comportamento de referência
