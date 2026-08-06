# US-CORREGEDOR-007 · Gerar relatório da fila de decisão

**Como** Corregedor Nacional,
**eu quero** exportar em PDF e JSON o recorte atual da fila Aguardando decisão,
**para que** a chefia confira as proposições e o conteúdo possa ser manipulado com apoio de inteligência artificial.

## Ator
Corregedor Nacional (`PERSONAS.CORREGEDOR`), no modo de lista da fila **Aguardando decisão**.

## Pré-condições
- Há ao menos uma proposição visível após a aplicação dos filtros da fila.
- O recorte pode abranger toda a fila ou uma combinação de correição, destinatário, prioridade, sensibilidade, rascunho e existência de minuta.

## Fluxo principal
1. O Corregedor aciona `Gerar relatório` no cabeçalho da fila.
2. O sistema cria um instantâneo independente com os itens visíveis, na mesma ordem, e registra filtros, total, geração e classificação de uso interno.
3. Um modal permite conferir o recorte e baixar separadamente PDF e JSON, mantendo o mesmo identificador e instante nos dois arquivos.
4. O PDF é gerado em A4 para leitura; o JSON usa esquema versionado, campos semânticos em `snake_case` e texto consolidado por proposição.
5. O modal permanece aberto e cada formato pode ser baixado novamente.

## Fluxos alternativos
- **Fila vazia**: o botão fica desabilitado e informa que não há proposições para incluir.
- **Falha de geração**: o formato afetado exibe erro no modal e pode ser tentado novamente sem perder o instantâneo.
- **Proposição sem minuta, comprovação ou rascunho**: o PDF informa a ausência e o JSON usa `null`/`[]`.
- **Conteúdo sensível**: permanece integral e recebe aviso global e marcação individual.

## Regras de negócio
- A exportação usa exatamente `ctx.filtradas`; controles ainda não aplicados, `filaForcada` e a visão Compacta/Expandida/Cartões não alteram o relatório.
- Descrição, última comprovação, minuta vigente e rascunho de decisão são integrais. Anexos entram somente como metadados.
- Contexto detalhado, observações gerais internas e histórico completo ficam fora.
- PDF e JSON têm a mesma substância; IDs, códigos de enumeração e versão do esquema são acréscimos técnicos do JSON.
- Gerar ou baixar relatório não altera estado nem histórico.

## Pós-condições
- Um ou ambos os arquivos são baixados com nome-base pareado e contextual.
- A fila e as proposições permanecem inalteradas.

## Referências
- [corregedor-decisao-page.js](../assets/js/features/corregedor-decisao-page.js) — integração com o recorte da fila
- [relatorio-decisao.js](../assets/js/domain/relatorio-decisao.js) — snapshot e contrato JSON 1.0
- [SPECS.md](../SPECS.md) — seção “Relatório da fila Aguardando decisão”

