# US-MULTI-004 · Consultar proposições conforme o perfil

**Como** usuário do NAD,
**eu quero** consultar e refinar as proposições disponíveis ao meu perfil,
**para que** eu encontre o item correto sem acessar informações fora da minha esfera de visibilidade.

## Ator
- Corregedor Nacional
- Membro Auxiliar da CN
- Secretaria Processual da CN
- Correicionado

## Pré-condições
- A persona está autenticada.
- Para o correicionado, existe um usuário do diretório CNMP associado à sessão.

## Fluxo principal
1. O usuário abre a consulta de proposições.
2. Perfis internos veem o **Acervo institucional do NAD**, formado por todas as proposições.
3. O correicionado vê **Minhas proposições**, limitado por `proposicaoVisivelPara`.
4. A tela apresenta indicadores calculados apenas sobre esse universo autorizado.
5. O usuário combina busca textual, status, classificação, apreciação, destinatário, localização, correição e período.
6. Seleciona **Buscar proposições**; antes disso, nenhum resultado é listado.
7. Os resultados podem ser exibidos em tabela ou cartões e mantêm os filtros na URL.

## Fluxos alternativos
- **Busca sem critérios**: retorna todo o universo autorizado ao perfil.
- **Sem resultados**: apresenta estado vazio e uma sugestão de ampliação da busca.
- **Período invertido**: bloqueia a busca e informa que a data final deve ser igual ou posterior à inicial.
- **Membro destinatário escolhido**: o tipo de destinatário passa a ser `membro`; escolher outro tipo limpa o membro.
- **Tipo de conclusão escolhido**: a situação da apreciação passa a ser `concluida`.

## Regras de negócio
- Os status seguem o ciclo: `rascunho_cn`, `aguardando_referendo_cnmp`, `aguardando_secretaria`, `aguardando_comprovacao`, `aguardando_avaliacao_membro`, `aguardando_decisao_corregedor`, `aguardando_ciencia` e `baixa_definitiva`.
- Perfis internos veem todos os oito filtros de status; o correicionado vê somente status presentes em suas proposições visíveis.
- Prioridade, sensibilidade e observações internas não são exibidas nem pesquisadas na variante do correicionado.
- Rascunhos de ação permanecem privados e não integram os filtros gerais.
- O período usa sobreposição: `dataFimCorreicao >= dataInicioDe` e `dataInicioCorreicao <= dataFimAte`.
- A coluna **Destinatário** representa a orientação canônica: membro, unidade ou administração superior.
- Sem `apreciacaoDoCN`, o resultado informa **Sem decisão do CN**.
- Fluxo principal aberto significa `statusFluxo !== baixa_definitiva`; providências paralelas não reabrem esse fluxo.

## Pós-condições
- Resultados, opções, contagens e indicadores refletem somente o universo autorizado.
- A URL permite refazer a mesma consulta sem expor filtros internos ao correicionado.

## Referências
- [proposicoes-page.js](../assets/js/features/proposicoes-page.js)
- [proposicoes.js](../assets/js/domain/proposicoes.js)
- [correicionados.js](../assets/js/domain/correicionados.js)
- [SPECS.md](../SPECS.md) — visibilidade híbrida, status e destinatário
