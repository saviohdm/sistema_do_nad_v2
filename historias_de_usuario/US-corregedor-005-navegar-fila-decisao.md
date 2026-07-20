# US-CORREGEDOR-005 · Navegar sequencialmente pela fila de decisão

**Como** Corregedor Nacional,
**eu quero** avançar para a próxima proposição da seleção após concluir uma ação,
**para que** eu decida a fila filtrada sem retornar à listagem entre cada item.

## Ator
Corregedor Nacional (`PERSONAS.CORREGEDOR`), na fila **Aguardando decisão**.

## Pré-condições
- Fila de decisão aberta em modo de lista, com qualquer combinação de filtros.
- Proposição acessada por um cartão dessa lista.

## Fluxo principal
1. A fila salva em sessão os IDs na ordem exibida e sua URL filtrada.
2. O Corregedor acolhe, afasta, decide diretamente ou confirma a devolução da proposição atual.
3. O sistema percorre o snapshot a partir do item atual e ignora itens que já saíram da mesa.
4. Havendo próxima proposição disponível, substitui o detalhe atual pelo detalhe seguinte.
5. O botão Voltar do navegador retorna à fila filtrada, sem reabrir itens já processados.

## Fluxos alternativos
- **Último item real**: alerta `Esta era a última proposição da lista filtrada.` e retorna à fila.
- **Itens posteriores indisponíveis**: alerta `Não há outras proposições disponíveis na lista filtrada.` e retorna à fila.
- **Snapshot ausente ou inválido**: avisa que o contexto não pôde ser recuperado e retorna com segurança à fila operacional.
- **Devolução cancelada ou rascunho salvo**: permanece no detalhe atual.
- **Detalhe aberto fora da fila**: após a ação, retorna ao dashboard, consulta ou outra origem registrada.
- **Ação disparada na própria fila** (acolher/devolver inline ou em lote): ver [US-CORREGEDOR-006](US-corregedor-006-acoes-rapidas-fila-decisao.md); a fila re-renderiza no lugar, sem entrar no fluxo sequencial.

## Regras de negócio
- “Próxima” é a posição seguinte na ordem exibida, sem nova ordenação.
- A sequência pode alternar entre proposições com minuta e de decisão direta.
- O contexto é restrito à sessão da aba e não altera o estado persistido da proposição.

## Pós-condições
- A ação mantém seus efeitos de domínio e histórico inalterados.
- O usuário permanece no fluxo sequencial ou retorna à mesma seleção filtrada.

## Referências
- [fila-navegavel.js](../assets/js/ui/fila-navegavel.js) — captura do snapshot ordenado
- [proposicao-detalhe-page.js](../assets/js/features/proposicao-detalhe-page.js) — resolução do próximo destino
- [SPECS.md](../SPECS.md) — seção “Decisão do Corregedor Nacional”
