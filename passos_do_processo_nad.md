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
16. Em toda decisão ou avaliação com força de decisão, a CN deve selecionar as invariantes da apreciação de valor:
    `necessita mais informações`; ou
    `concluída`, com exatamente um dos tipos:
    `cumprida`,
    `parcialmente cumprida`,
    `não cumprida`,
    `prejudicada (perda de objeto)` ou
    `encerrada (sem análise de mérito)`.
17. Para qualquer resultado conclusivo, a CN também informa se existe providência a ser cumprida pela Secretaria Processual; quando selecionar `outra providência`, descreve obrigatoriamente qual é a providência.
18. Se a decisão for `necessita mais informações`, a proposição retorna para a Secretaria Processual para nova diligência.
19. Se a decisão for `concluída`, a proposição segue para `CIENTIFICAR`.
20. Para qualquer resultado conclusivo, se houver providência adicional, o sistema cria em paralelo uma pendência para a Secretaria Processual informar o seu cumprimento.

### Secretaria Processual da CN

  1. A Secretaria recebe da CN a proposição encaminhada para tramitação.
  2. A Secretaria pratica `CRIAR DILIGÊNCIA`.
  3. A Secretaria cientifica o correicionado por e-mail quanto à diligência ou à
  decisão já concluída.
  4. Quando a decisão da CN indicar `necessita mais informações`, a Secretaria cria
  nova diligência para reabrir a instrução.
  5. Quando houver providência adicional vinculada a qualquer decisão concluída,
  a Secretaria recebe uma pendência paralela de providência.
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

1. O correicionado faz login no sistema com sua identidade do diretório do CNMP (em produção, via SSO). No protótipo, escolhe um membro na tela de login.
2. O sistema, aplicando a regra Modelo C, lhe apresenta:
   - **Minhas comprovações**: proposições em `aguardando_comprovacao` em seu nome (`membroId`) ou em unidades onde ele é chefe (`chefiaDeUnidadeIds`).
   - **Minhas ciências**: proposições em `baixa_definitiva` cuja ciência foi disponibilizada a ele.
3. Após a Secretaria criar uma diligência, o sistema **dispara e-mail** para o correicionado (entrada em `state.caixaDeSaida[]`, evento `email_diligencia_enviado` no histórico) com link para acesso direto à comprovação.
4. O correicionado pode `RASCUNHAR comprovação`, anexando narrativa, observações e arquivos (metadata-only no protótipo). Há apenas um rascunho ativo por proposição. Salvar rascunho gera evento `rascunho_comprovacao_salvo` (oculto na visão dele).
5. Em seguida, o correicionado `COMPROVA`. O ato consome o rascunho, persiste anexos no evento `comprovacao` e transita a proposição para `aguardando_avaliacao_membro`.
6. **Expiração**: se o prazo da diligência passa sem comprovação, o sistema marca a diligência como `expirada`, registra `prazo_comprovacao_expirado` e transita para `aguardando_avaliacao_membro` (o membro auxiliar avaliará a omissão). O rascunho, se existir, é preservado para auditoria.
7. Quando a Secretaria abre ciência (cientificarGrupo), o sistema **dispara e-mail agregado por destinatário** (entrada em `state.caixaDeSaida[]`, evento `email_ciencia_enviado` em cada proposição). O ato da Secretaria já transita a proposição para `baixa_definitiva`.
8. O correicionado acessa **Minhas ciências**, abre o detalhe da proposição e visualiza a apreciação final do CN, fundamentos e eventuais providências paralelas. Esse acesso registra `visualizacao_ciencia_correicionado` no histórico (sem transição de status). Ele pode revisitar a proposição quantas vezes quiser; o evento é gravado uma única vez por usuário.

### Membro Auxiliar da CN

1. Após a comprovação do correicionado, o membro auxiliar `RASCUNHA avaliação`.
2. O membro auxiliar `AVALIA`.
3. A avaliação do membro auxiliar registra uma apreciação com as mesmas invariantes que poderão constar da decisão final:
   `necessita mais informações`; ou
   `concluída`, com um dos tipos:
   `cumprida`,
   `parcialmente cumprida`,
   `não cumprida`,
   `prejudicada (perda de objeto)` ou
   `encerrada (sem análise de mérito)`.
4. Para qualquer resultado conclusivo, a avaliação também registra se existe providência a ser cumprida pela Secretaria Processual e descreve obrigatoriamente a opção `outra providência`.
5. A avaliação do membro auxiliar nunca produz efeito concreto por si só.
6. Toda avaliação do membro auxiliar é encaminhada ao Corregedor Nacional para decisão.

## Decisão da Corregedoria Nacional

1. A decisão da Corregedoria Nacional é expressa em uma apreciação de duas camadas.
2. A primeira camada define se a proposição está `concluída` ou se `necessita mais informações`.
3. Se `necessita mais informações`, a proposição retorna para a Secretaria Processual para nova diligência e novo ciclo de comprovação.
4. Se `concluída`, a segunda camada define o tipo conclusivo:
   `cumprida`,
   `parcialmente cumprida`,
   `não cumprida`,
   `prejudicada (perda de objeto)` ou
   `encerrada (sem análise de mérito)`.
5. Todos os cinco tipos conclusivos admitem providências adicionais a serem cumpridas pela Secretaria Processual.
6. A apreciação é o objeto-juízo que descreve essas invariantes; tanto a avaliação do membro auxiliar quanto a decisão do Corregedor Nacional carregam uma apreciação. Apenas a apreciação registrada pelo Corregedor Nacional (em decisão ou em avaliação com força de decisão) produz efeitos vinculantes — e é essa que fica armazenada como `apreciacaoDoCN` na proposição.

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
3. Se houver providência adicional em qualquer resultado conclusivo, a pendência da Secretaria Processual segue em paralelo até seu cumprimento.
