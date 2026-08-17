# US-CORREGEDOR-008 · Gerar relatório estatístico das proposições

**Como** Corregedor Nacional,
**eu quero** consultar a produtividade mensal das proposições e baixar um relatório institucional,
**para que** eu apresente a atividade correicional nas sessões do CNMP com números extraídos do NAD.

## Ator
Corregedor Nacional.

## Pré-condições
- A persona Corregedor Nacional está autenticada.
- O histórico das proposições possui datas válidas para os atos contabilizados.

## Fluxo principal
1. Acessa **Estatísticas → Produtividade**.
2. O sistema seleciona o exercício corrente e o último mês completamente encerrado.
3. Visualiza os cinco marcos mensais, o acumulado, a comparação com o mês anterior, os resultados decisórios e o acervo atual.
4. Pode escolher outro exercício e mês já encerrado.
5. Seleciona **Baixar PDF** e recebe o mesmo instantâneo em duas páginas A4 paisagem.

## Regras de negócio
- O relatório é nacional, agregado e acessível somente ao Corregedor Nacional.
- A rota canônica permanece `dashboard.html`; a página usa o título **Produtividade**.
- A série conta atos praticados: ativação, diligência, minuta, decisão e baixa após ciência; ciclos repetidos contam novamente.
- Apagamento e conversão de encaminhamento não são baixas produtivas.
- O acervo inclui todas as proposições abertas no instante da geração, independentemente do ano de ingresso.
- Providências paralelas pendentes aparecem separadamente e não reabrem o fluxo principal.
- O corte temporal e a geração usam o fuso de Brasília; mês corrente ou futuro é inválido.
- Gerar ou baixar o relatório não altera o estado nem cria evento histórico.

## Pós-condições
- Tela e PDF apresentam os mesmos valores do snapshot selecionado.
- O arquivo contém fonte, período, data de geração e paginação, sem casos individuais ou dados pessoais.

## Referências
- [relatorio-estatistico.js](../assets/js/domain/relatorio-estatistico.js)
- [dashboard-page.js](../assets/js/features/dashboard-page.js)
- [relatorio-estatistico-pdf.js](../assets/js/ui/relatorio-estatistico-pdf.js)
