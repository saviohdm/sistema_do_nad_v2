# US-CORREGEDOR-007 · Gerar relatório da fila de decisão

**Como** Corregedor Nacional,
**eu quero** exportar em PDF e JSON as proposições filtradas, algumas selecionadas ou uma única proposição,
**para que** a chefia confira e compartilhe apenas o recorte necessário e o conteúdo possa ser manipulado com apoio de inteligência artificial.

## Ator
Corregedor Nacional (`PERSONAS.CORREGEDOR`), no modo de lista da fila **Aguardando decisão**.

## Pré-condições
- Há ao menos uma proposição visível após a aplicação dos filtros da fila.
- O recorte pode abranger toda a fila ou uma combinação de correição, destinatário, prioridade, sensibilidade, rascunho e existência de minuta.

## Fluxo principal
1. O Corregedor aciona `Gerar relatório` e escolhe gerar as proposições filtradas ou entrar no modo `Selecionar proposições…`.
2. No modo de seleção, marca uma ou mais proposições nos cartões; a seleção permanece ao alterar filtros e informa quantos itens estão ocultos.
3. O sistema cria um instantâneo independente com os itens filtrados ou selecionados, registra o modo, total, geração e classificação de uso interno e preserva a ordem da fila.
4. Um modal relaciona as proposições incluídas e permite baixar separadamente PDF e JSON, mantendo o mesmo identificador e instante nos dois arquivos.
5. O PDF é gerado em A4 para leitura; o JSON usa esquema versionado, campos semânticos em `snake_case` e texto consolidado por proposição.
6. O modal permanece aberto e cada formato pode ser baixado novamente.

## Fluxo unitário
1. No detalhe de uma proposição ainda aguardando decisão, o Corregedor aciona `Gerar relatório desta proposição`.
2. O sistema abre o mesmo modal com o modo `individual` e somente a proposição atual.

## Fluxos alternativos
- **Fila vazia**: o botão fica desabilitado e informa que não há proposições para incluir.
- **Seleção vazia**: a barra permanece disponível para cancelar o modo, mas a geração fica desabilitada.
- **Seleção parcialmente oculta**: a barra informa quantos itens selecionados estão fora do filtro atual; eles continuam no relatório.
- **Item fora da fila**: seu ID é removido da seleção antes da próxima renderização.
- **Falha de geração**: o formato afetado exibe erro no modal e pode ser tentado novamente sem perder o instantâneo.
- **Proposição sem minuta, comprovação ou rascunho**: o PDF informa a ausência e o JSON usa `null`/`[]`.
- **Conteúdo sensível**: permanece integral e recebe aviso global e marcação individual.

## Regras de negócio
- O recorte filtrado usa exatamente `ctx.filtradas`; controles ainda não aplicados, `filaForcada` e a visão Compacta/Expandida/Cartões não alteram o relatório.
- O recorte manual pode combinar filtros e correições diferentes, persiste em `sessionStorage` e segue a ordem global da fila, não a ordem de marcação.
- Cancelar a seleção limpa os IDs e encerra o modo; fechar o modal preserva a seleção.
- O JSON usa esquema `1.1` e registra `recorte.modo` como `filtradas`, `selecionadas` ou `individual`.
- Descrição, última comprovação, minuta vigente e rascunho de decisão são integrais. Anexos entram somente como metadados.
- Contexto detalhado, observações gerais internas e histórico completo ficam fora.
- PDF e JSON têm a mesma substância; IDs, códigos de enumeração e versão do esquema são acréscimos técnicos do JSON.
- Gerar ou baixar relatório não altera estado nem histórico.

## Pós-condições
- Um ou ambos os arquivos são baixados com nome-base pareado e contextual ao modo do recorte.
- A fila e as proposições permanecem inalteradas.

## Referências
- [corregedor-decisao-page.js](../assets/js/features/corregedor-decisao-page.js) — integração com o recorte da fila
- [relatorio-decisao.js](../assets/js/domain/relatorio-decisao.js) — snapshot e contrato JSON 1.1
- [SPECS.md](../SPECS.md) — seção “Relatório da fila Aguardando decisão”
