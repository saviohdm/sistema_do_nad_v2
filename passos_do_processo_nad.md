# Passos do Sistema de Proposições (Sistema do NAD)

## Visão geral

O fluxo do sistema de proposições do NAD começa fora do sistema, com a conclusão da correição no SCI e a migração das proposições para o Sistema de Proposições. A partir daí, a proposição percorre um ciclo de criação ou edição, diligência, comprovação, avaliação, decisão e cientificação.

O processo é orientado por persona. A avaliação do membro auxiliar nunca produz efeitos concretos por si só. Os efeitos jurídicos e operacionais da proposição decorrem sempre da decisão do Corregedor Nacional ou da avaliação direta com força de decisão praticada por ele.

## Passos por ator

### Fora do sistema

1. O processo se inicia com a conclusão da correição no SCI.
2. As proposições são migradas para o sistema do NAD.

### Corregedoria Nacional - CN

1. A CN recebe a proposição migrada e inicia seu tratamento.
2. A CN pode `RASCUNHAR criação` e, em seguida, `CRIAR` a proposição.
3. A CN pode `RASCUNHAR edição` e, em seguida, `EDITAR` a proposição.
4. A CN pode `APAGAR proposição`.
5. Quando a CN `APAGA a proposição`, o ciclo de vida da proposição se encerra imediatamente.
6. Após `CRIAR` ou `EDITAR`, a CN `ENCAMINHA para a Secretaria`.
7. A CN pode `GERAR RELATÓRIO CONCLUSIVO` como ato paralelo ao fluxo principal da proposição.
8. Após a avaliação do membro auxiliar, a CN analisa essa avaliação.
9. A CN pode `RASCUNHAR decisão` e depois `DECIDIR`.
10. Se a decisão for de `deferimento`, a CN homologa integralmente as invariantes da avaliação do membro auxiliar.
11. Se a decisão for de `indeferimento`, a CN define novas invariantes no mesmo ato decisório.
12. A CN pode `APAGAR avaliação`.
13. Quando a CN `APAGA avaliação`, a proposição permanece existente e somente a avaliação vigente é removida.
14. Após `APAGAR avaliação`, a CN pode devolver a proposição ao membro auxiliar para nova avaliação ou praticar `AVALIAÇÃO COM FORÇA DE DECISÃO`.
15. A `AVALIAÇÃO COM FORÇA DE DECISÃO` exige que a proposição esteja sem avaliação vigente e produz desde logo os mesmos efeitos da decisão do Corregedor Nacional.
16. Em toda decisão ou avaliação com força de decisão, a CN deve selecionar as invariantes do juízo de valor:
    `necessita mais informações`; ou
    `concluída`, com exatamente um dos tipos:
    `cumprida`,
    `parcialmente cumprida`,
    `não cumprida`,
    `prejudicada (perda de objeto)` ou
    `encerrada (sem análise de mérito)`.
17. Nos casos de `parcialmente cumprida` e `não cumprida`, a CN também informa se existe providência a ser cumprida pela Secretaria Processual.
18. Se a decisão for `necessita mais informações`, a proposição retorna para a Secretaria Processual para nova diligência.
19. Se a decisão for `concluída`, a proposição segue para `CIENTIFICAR`.
20. Nos casos de `parcialmente cumprida` e `não cumprida`, se houver providência adicional, o sistema cria em paralelo uma pendência para a Secretaria Processual informar o seu cumprimento.

### Secretaria Processual da CN

  1. A Secretaria recebe da CN a proposição encaminhada para tramitação.
  2. A Secretaria pratica `CRIAR DILIGÊNCIA`.
  3. A Secretaria cientifica o correicionado por e-mail quanto à diligência ou à
  decisão já concluída.
  4. Quando a decisão da CN indicar `necessita mais informações`, a Secretaria cria
  nova diligência para reabrir a instrução.
  5. Quando houver providência adicional vinculada a decisão de `não cumprida` ou
  `parcialmente cumprida`, a Secretaria recebe uma pendência paralela de
  providência.
  6. Essa pendência funciona como mecanismo de controle interno da Secretaria
  Processual e da Corregedoria Nacional.
  7. O cumprimento da providência ocorre integralmente fora do sistema.
  8. No sistema, a Secretaria apenas registra:
     `data de cumprimento` e
     `observações`.
  9. O objetivo do sistema, nesse ponto, é somente controlar quais providências
  ainda estão pendentes e quando cada uma foi informada como cumprida.
  10. As providências poderão ser, em regra:
      `encaminhamento de informações à Corregedoria local`,
      `encaminhamento de informações à COCI` ou
      `outras providências`.

### Correicionado

1. Após a criação da diligência, o correicionado `RASCUNHA comprovação`.
2. Em seguida, o correicionado `COMPROVA`.
3. A comprovação retorna ao fluxo interno da Corregedoria Nacional para nova avaliação.

### Membro Auxiliar da CN

1. Após a comprovação do correicionado, o membro auxiliar `RASCUNHA avaliação`.
2. O membro auxiliar `AVALIA`.
3. A avaliação do membro auxiliar deve registrar as mesmas invariantes que poderão constar da decisão final:
   `necessita mais informações`; ou
   `concluída`, com um dos tipos:
   `cumprida`,
   `parcialmente cumprida`,
   `não cumprida`,
   `prejudicada (perda de objeto)` ou
   `encerrada (sem análise de mérito)`.
4. Nos casos de `parcialmente cumprida` e `não cumprida`, a avaliação também registra se existe providência a ser cumprida pela Secretaria Processual.
5. A avaliação do membro auxiliar nunca produz efeito concreto por si só.
6. Toda avaliação do membro auxiliar é encaminhada ao Corregedor Nacional para decisão.

## Juízo de valor da Corregedoria Nacional

1. O juízo de valor da Corregedoria Nacional possui duas camadas.
2. A primeira camada define se a proposição está `concluída` ou se `necessita mais informações`.
3. Se `necessita mais informações`, a proposição retorna para a Secretaria Processual para nova diligência e novo ciclo de comprovação.
4. Se `concluída`, a segunda camada define o tipo conclusivo:
   `cumprida`,
   `parcialmente cumprida`,
   `não cumprida`,
   `prejudicada (perda de objeto)` ou
   `encerrada (sem análise de mérito)`.
5. Apenas os tipos `parcialmente cumprida` e `não cumprida` admitem providências adicionais a serem cumpridas pela Secretaria Processual.

## Regras sobre decisão e avaliação

1. A autoridade máxima da Corregedoria Nacional é o Corregedor Nacional, que detém a última palavra.
2. O membro auxiliar atua por delegação e sua avaliação tem natureza de sugestão de decisão.
3. Se o Corregedor Nacional `deferir` a avaliação do membro auxiliar, as invariantes da avaliação passam a valer integralmente na decisão.
4. Se o Corregedor Nacional `indeferir` a avaliação do membro auxiliar, a decisão final pode divergir integralmente da avaliação.
5. Em caso de `indeferimento`, a decisão do Corregedor Nacional deve registrar, no mesmo ato, as novas invariantes que passarão a produzir efeitos.
6. Para todos os efeitos, prevalece sempre o conteúdo da decisão do Corregedor Nacional ou da avaliação com força de decisão.

## Histórico da proposição

1. Todo evento relevante compõe o histórico da proposição.
2. Devem existir, no mínimo, os seguintes tipos de histórico:
   `avaliação do membro auxiliar`,
   `decisão`,
   `avaliação com força de decisão` e
   `avaliação removida pelo Corregedor Nacional`.
3. Quando o Corregedor Nacional remove uma avaliação, o conteúdo da avaliação removida não permanece no histórico material da proposição.
4. Nesse caso, o sistema deve manter um evento de trilha do tipo `avaliação removida pelo Corregedor Nacional`.

## Encerramento do ciclo

1. Toda decisão `concluída` leva à `CIENTIFICAR`.
2. A cientificação encerra o fluxo principal da proposição.
3. Se houver providência adicional nos casos de `não cumprida` ou `parcialmente cumprida`, a pendência da Secretaria Processual segue em paralelo até seu cumprimento.
