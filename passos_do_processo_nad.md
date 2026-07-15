# Passos do Sistema de Proposições (Sistema do NAD)

## Visão geral

O fluxo do sistema de proposições do NAD começa fora do sistema, com a conclusão da correição no SCI e a migração das proposições para o Sistema de Proposições. A partir daí, a proposição percorre um ciclo de criação ou edição, diligência, comprovação, elaboração de minuta, decisão e cientificação.

As proposições têm três tipos: `Determinação`, `Recomendação` e `Encaminhamento`. Os dois primeiros percorrem o ciclo completo descrito acima. O `Encaminhamento` tem fluxo abreviado: ao passar pelo referendo, é baixado definitivamente e convertido em pendência de providência da Secretaria Processual (ver seção própria abaixo).

O processo é orientado por persona. A minuta de decisão do membro auxiliar nunca produz efeitos concretos por si só. Os efeitos jurídicos e operacionais decorrem sempre da decisão do Corregedor Nacional, por acolhimento ou afastamento da minuta, ou de decisão direta excepcional.

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
8. Após a submissão da minuta do membro auxiliar, a CN analisa essa peça.
9. A CN pode `RASCUNHAR decisão` e depois `DECIDIR`.
10. Ao `ACOLHER MINUTA`, a CN assume integralmente, sem transformação, a redação e as invariantes elaboradas pelo membro auxiliar.
11. Ao `AFASTAR MINUTA E DECIDIR`, a CN preserva a minuta no histórico interno e define novas invariantes e fundamentação no mesmo ato.
12. A CN pode `DEVOLVER MINUTA` após confirmação.
13. Ao devolver, somente o conteúdo material da minuta vigente e eventual rascunho decisório do CN são removidos; fica o tombstone legado `avaliacao_removida_pelo_corregedor`.
14. A proposição retorna limpa para a fila compartilhada de elaboração de minutas do membro auxiliar.
15. A `DECISÃO DIRETA` é exceção para proposição que já chega à mesa do Corregedor sem minuta; a devolução não abre esse atalho.
16. Em toda decisão após minuta ou decisão direta, a CN deve selecionar as invariantes da apreciação de valor:
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

### Proposição do tipo Encaminhamento (fluxo abreviado)

1. O `Encaminhamento` nasce no relatório da equipe de correição e é enviado diretamente pelo SCI; na essência, é uma providência (ex.: encaminhamento de informações à COCI).
2. Ele entra na fila de `aguardando referendo` como as demais proposições e obedece às mesmas regras pré-referendo (rascunho, edição, apagamento).
3. Quando o usuário registra o referendo da correição, o `Encaminhamento` tem dois efeitos imediatos:
   - o status vira `baixa definitiva`, encerrando o seu ciclo; e
   - nasce uma `pendência de providência` para a Secretaria Processual, na mesma fila das demais pendências, com a mesma descrição constante do encaminhamento.
4. `Encaminhamento` criado (ou rascunho confirmado) em correição já referendada converte imediatamente na criação.
5. Não há diligência, comprovação, minuta, decisão nem cientificação: o correicionado e o membro auxiliar não participam.

### Secretaria Processual da CN

  1. A Secretaria recebe da CN a proposição encaminhada para tramitação.
  2. A Secretaria pratica `CRIAR DILIGÊNCIA`.
  3. A Secretaria cientifica o correicionado por e-mail quanto à diligência ou à
  decisão já concluída.
  4. Quando a decisão da CN indicar `necessita mais informações`, a Secretaria cria
  nova diligência para reabrir a instrução.
  5. Quando houver providência adicional vinculada a qualquer decisão concluída,
  ou quando um `Encaminhamento` é convertido no referendo da correição,
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
6. **Expiração**: se o prazo da diligência passa sem comprovação, o sistema marca a diligência como `expirada`, registra `prazo_comprovacao_expirado` e transita para `aguardando_avaliacao_membro` (identificador legado da fila em que o membro elaborará a minuta sobre a omissão). O rascunho, se existir, é preservado para auditoria.
7. Quando a Secretaria abre ciência (cientificarGrupo), o sistema **dispara e-mail agregado por destinatário** (entrada em `state.caixaDeSaida[]`, evento `email_ciencia_enviado` em cada proposição). O ato da Secretaria já transita a proposição para `baixa_definitiva`.
8. O correicionado acessa **Minhas ciências**, abre o detalhe da proposição e visualiza a decisão final do CN, fundamentos e eventuais providências paralelas. Esse acesso registra `visualizacao_ciencia_correicionado` no histórico (sem transição de status). Ele pode revisitar a proposição quantas vezes quiser; o evento é gravado uma única vez por usuário.

### Membro Auxiliar da CN

1. Após a comprovação do correicionado, o membro auxiliar `RASCUNHA minuta`.
2. O membro auxiliar `SUBMETE MINUTA`.
3. A minuta registra uma apreciação com as mesmas invariantes e a mesma redação que poderão constar da decisão final:
   `necessita mais informações`; ou
   `concluída`, com um dos tipos:
   `cumprida`,
   `parcialmente cumprida`,
   `não cumprida`,
   `prejudicada (perda de objeto)` ou
   `encerrada (sem análise de mérito)`.
4. Para qualquer resultado conclusivo, a minuta também registra se existe providência a ser cumprida pela Secretaria Processual e descreve obrigatoriamente a opção `outra providência`.
5. A redação da minuta é obrigatória no envio definitivo e deve usar linguagem decisória e impositiva; rascunhos podem permanecer incompletos.
6. A minuta nunca produz efeito concreto por si só e é encaminhada ao Corregedor Nacional para decisão.

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
6. A apreciação é o objeto-juízo que descreve essas invariantes; tanto a minuta do membro auxiliar quanto a decisão do Corregedor Nacional carregam uma apreciação. Apenas a apreciação registrada pelo Corregedor Nacional produz efeitos vinculantes — e é essa que fica armazenada como `apreciacaoDoCN` na proposição.

## Regras sobre minuta e decisão

1. A autoridade máxima da Corregedoria Nacional é o Corregedor Nacional, que detém a última palavra.
2. O membro auxiliar atua por delegação e elabora uma minuta pronta para aproveitamento integral, mas sem efeito próprio.
3. Se o Corregedor Nacional `acolher` a minuta, sua redação e invariantes passam integralmente e sem transformação à decisão.
4. Se o Corregedor Nacional `afastar` a minuta, a decisão final pode divergir integralmente dela.
5. No afastamento, o Corregedor deve registrar no mesmo ato as novas invariantes e a fundamentação que produzirão efeitos.
6. Para todos os efeitos, prevalece sempre o conteúdo da decisão registrada pelo Corregedor Nacional.

## Histórico da proposição

1. Todo evento relevante compõe o histórico da proposição.
2. Devem existir, no mínimo, os seguintes tipos de histórico:
   `minuta do membro auxiliar` (tipo legado `avaliacao_membro_auxiliar`),
   `decisão`,
   `decisão direta` (tipo legado `avaliacao_com_forca_de_decisao`) e
   `minuta devolvida` (tipo legado `avaliacao_removida_pelo_corregedor`).
3. A minuta acolhida ou afastada permanece no histórico interno; o correicionado vê somente a decisão do Corregedor, com descrição neutra.
4. Quando o Corregedor devolve uma minuta, seu conteúdo não permanece no histórico material; somente o tombstone legado é mantido.

## Encerramento do ciclo

1. Toda decisão `concluída` leva à `CIENTIFICAR`.
2. A cientificação encerra o fluxo principal da proposição.
3. Se houver providência adicional em qualquer resultado conclusivo, a pendência da Secretaria Processual segue em paralelo até seu cumprimento.
