# Especificação do Fluxo de Vida das Proposições

## Resumo

O sistema de proposições do NAD modela o ciclo de vida das proposições originadas da conclusão da correição no SCI. O fluxo é orientado por persona e por ato praticado. A proposição pode ser criada, editada ou apagada pela Corregedoria Nacional, tramita por diligência e comprovação, pode receber minuta de decisão do membro auxiliar e sempre depende de ato final do Corregedor Nacional para produzir efeitos concretos.

A minuta do membro auxiliar é um ato preparatório, redigido em linguagem decisória e impositiva para aproveitamento sem transformação, mas nunca produz efeitos sozinha. A palavra final é sempre do Corregedor Nacional, seja por acolhimento ou afastamento da minuta, seja por `decisão direta` excepcional.

Por compatibilidade com o estado já persistido, identificadores como `avaliacaoVigenteId`, `rascunhoAvaliacao`, `avaliacao_membro_auxiliar`, `avaliacao_com_forca_de_decisao`, `deferimento` e `indeferimento` são legados e permanecem inalterados. Na linguagem de negócio e na interface eles significam, respectivamente, minuta vigente, rascunho de minuta, minuta do membro, decisão direta, acolhimento e afastamento.

## Personas e competências

- `Corregedor Nacional`: autoridade decisória final. Pode criar, editar e apagar proposição, acolher, afastar ou devolver minuta e praticar decisão direta excepcional. Também pode **registrar e editar correições** no NAD (gestão de contingência de migração e de correições de legado — ver "Origem da proposição").
- `Membro Auxiliar da CN`: elabora minuta com as mesmas invariantes e a mesma linguagem da decisão final, mas sem produzir efeitos concretos.
- `Secretaria Processual da CN`: cria diligência, operacionaliza comunicações (incluindo disparo de e-mail ao correicionado), e informa cumprimento de providências paralelas.
- `Correicionado`: membro do MP submetido à correição. Acessa o sistema com login do diretório CNMP para (a) comprovar diligências vinculadas ao seu nome ou às unidades que chefia (Modelo C de visibilidade) e (b) tomar ciência das proposições com baixa definitiva, visualizando a decisão final do Corregedor Nacional e eventuais providências paralelas.

## Diretório CNMP e identidade do correicionado

- O sistema mantém um diretório de membros (`state.diretorioCnmp.membros`), unidades (`state.diretorioCnmp.unidades`) e administrações superiores (`state.diretorioCnmp.administracoesSuperiores`). No protótipo, o diretório faz de *stand-in* do **Banco de Cadastro de Membros e Unidades do CNMP** (serviço externo).
- Cada membro tem `id`, `nome`, `cpf`, `email`, `cargo`, `lotacaoUnidadeId` e `chefiaDeUnidadeIds[]`.
- Cada proposição carrega o agregado **`destinatario`** (orientação a membro, unidade ou administração superior — ver seção "Destinatário"). Os campos achatados `unidadeId/unidade/membroId/membro` são mantidos como **espelho denormalizado** derivado do agregado, na borda de escrita/leitura, para compatibilidade com filtros e agrupamentos.
- **Regra de visibilidade (híbrida, substitui o Modelo C)**: o correicionado logado vê uma proposição quando é a **audiência da orientação resolvida ao vivo** (membro → o próprio membro; unidade → responsável atual da unidade no cadastro; administração superior → qualquer usuário parametrizado) **OU** já foi **recebedor concreto** de alguma diligência/ciência da proposição. Comprovar uma diligência *aberta* segue restrito ao destinatário dela. Implementado em `proposicaoVisivelPara(state, proposicao, user)` e `usuarioFoiNotificado`.
- Em produção, o login é via SSO do CNMP; no protótipo, simulado por um seletor de membro na tela de login.

## Destinatário (orientação da proposição)

- O agregado `proposicao.destinatario` informa **a quem a proposição se destina** e, principalmente, **o que ela acompanha** quando lotações mudam (membros são promovidos/removidos). Tem a forma `{ tipo, membroId?, unidadeOrigemSnapshot?, unidadeId?, administracaoSuperior? }`, com `tipo ∈ {membro, unidade, administracao_superior}` e **apenas o alvo do tipo preenchido** (exatamente uma orientação).
- **Imutável após ativação**: a orientação é definida na criação (migração do SCI ou criação manual) e só pode ser corrigida enquanto a proposição está em `rascunho_cn`/`aguardando_referendo_cnmp`. Ao ser encaminhada à Secretaria, trava de vez (corrigir = apagar e recriar).
- **Orientação a membro**: o destinatário é o próprio membro, que a proposição acompanha mesmo se ele mudar de unidade. A **unidade de origem** (lotação no momento da originação) é congelada em `unidadeOrigemSnapshot` — apenas informativa/histórica, fora da orientação (o cadastro só conhece o estado atual).
- **Orientação a unidade**: a proposição acompanha a unidade. No momento de **cada diligência/ciência**, o sistema busca no cadastro CNMP o **responsável atual** e dá à Secretaria a oportunidade de **confirmar ou trocar** o destinatário (válvula universal). Se a unidade estiver **vaga** (sem responsável no cadastro), o envio é **bloqueado** até escolha manual.
- **Orientação a administração superior**: identidade `{ ramoMP, tipo }` (em regra `PGJ`/`CGJ` por ramo). O catálogo e o mapeamento `(ramoMP, tipo) → usuário(s)` são **parametrizados no NAD** (tela `administracao-superior`). A comunicação vai a **todos os usuários mapeados** (uma entrada de `caixaDeSaida` por usuário).
- **Resolução da pessoa de carne e osso** é por comunicação (snapshot): `resolverUsuariosDestinatarios(state, proposicao)` devolve `{ tipo, sugeridos[], candidatos[], vago }`. A escolha efetiva é gravada na diligência/ciência e na `caixaDeSaida`; a orientação nunca muda. O acesso a essas regras é isolado em `assets/js/domain/destinatario.js`.

## Rascunhos de ação (modelo canônico)

Três atos admitem rascunho: a **minuta** do membro auxiliar (`rascunhoAvaliacao`, nome legado), a **decisão** do Corregedor Nacional (`rascunhoDecisaoCN`, cobrindo afastamento e decisão direta) e a **comprovação** do correicionado (`rascunhoComprovacao`). Todos seguem o mesmo modelo:

- **Objeto no estado, nunca status**: o rascunho é um objeto na proposição com envelope comum `{ ...payload, salvoEm, salvoPor, salvoPorId }` (payload = `apreciacao` para minuta/decisão; `descricao/observacoes/anexos` para comprovação). Salvar rascunho **não altera `statusFluxo`** — o status reflete a fase do processo, e um rascunho não muda a fase.
- **Um rascunho ativo por proposição por ato**; salvar de novo sobrescreve o payload e atualiza `salvoEm`.
- **Privado**: rascunho de ação não produz efeito, não bloqueia nem gera aviso a outras personas. A vez de cada persona é serializada pelo `statusFluxo`.
- **Histórico**: o primeiro salvamento registra `rascunho_<ato>_salvo`; o descarte registra `rascunho_<ato>_descartado`. Ambos ocultos ao correicionado.
- **Descarte explícito**: botão "Descartar rascunho" com diálogo de confirmação, disponível enquanto o rascunho existir.
- **Limpeza ao sair da fase**: toda transição de domínio que encerra ou reinicia a fase do rascunho limpa o objeto (a submissão do ato consome o rascunho; decisão e devolução de minuta limpam os rascunhos de minuta e de decisão; a expiração da diligência limpa o de comprovação após registrar `rascunhoExistia`; o apagamento da proposição limpa todos). Cada ciclo começa limpo, sem pré-preenchimento de ciclos anteriores.
- **UI padronizada**: badge "Rascunho salvo" (tom warning) nas filas, CTA "Retomar <ação>", filtro "Somente com rascunho" (`comRascunho=1`), KPI de rascunho no panorama e feedback "Rascunho salvo às HH:MM".

O **rascunho de criação** da proposição é a exceção estrutural: a entidade inteira é o rascunho, representado pelo status `rascunho_cn`. É o único rascunho com efeito estrutural — bloqueia o referendo e o relatório final da correição enquanto existir (ver "Origem da proposição").

## Comprovação pelo correicionado

- O correicionado pode **salvar rascunho** de comprovação (`rascunhoComprovacao`) com narrativa (`descricao`), `observacoes` adicionais e `anexos: [{nome, tamanhoBytes, mimeType, anexadoEm}]` — ver "Rascunhos de ação (modelo canônico)".
- Apenas um rascunho ativo por proposição. Salvar rascunho não altera `statusFluxo` (permanece em `aguardando_comprovacao`).
- A primeira vez que um rascunho é salvo, registra-se `rascunho_comprovacao_salvo` no histórico; o descarte registra `rascunho_comprovacao_descartado` (ambos ocultos para o correicionado em sua visão).
- O ato de `COMPROVAR` consome o rascunho, persiste `anexos` no evento `comprovacao` e transita a proposição para `aguardando_avaliacao_membro`.

## Expiração de prazo da diligência

- Toda diligência tem `prazo`. Quando o prazo passa sem comprovação, o sistema dispara automaticamente a expiração:
  - `diligencia.status` passa a `expirada` (além de `aberta` e `comprovada`).
  - Evento `prazo_comprovacao_expirado` é registrado, com `diligenciaId`, `prazoOriginal` e `rascunhoExistia`.
  - A proposição transita para `aguardando_avaliacao_membro` (mesmo destino do `comprovacao`).
  - Eventual `rascunhoComprovacao` é **limpo** — o flag `rascunhoExistia` no evento preserva a prova de auditoria de que o correicionado iniciou (mas não submeteu) a comprovação. Um eventual novo ciclo de diligência começa sem pré-preenchimento (ver "Rascunhos de ação").
- No protótipo, a expiração é avaliada *lazy* a cada carga de state, e pode ser provocada manualmente pelo botão "Avançar tempo do sistema" no shell (visível apenas a Corregedor e Secretaria).

## E-mail simulado

- Ações da Secretaria que comunicam o correicionado disparam um e-mail simulado:
  - `criar diligência` → evento `email_diligencia_enviado` + entrada em `state.caixaDeSaida[]` do tipo `diligencia`. Vale tanto na **fila de diligência** (em lote) quanto na **criação unitária pelo detalhe da proposição** — ambas resolvem o destinatário e disparam o e-mail.
  - `cientificar` → evento `email_ciencia_enviado` em cada proposição cientificada + entrada em `state.caixaDeSaida[]` do tipo `ciencia` (agregada por destinatário).
- Cada envio mantém um registro técnico em `state.caixaDeSaida[]`, sem uma página dedicada na interface: `{id, tipo, usuarioNotificadoId, usuarioNotificadoNome, usuarioNotificadoEmail, override, proposicaoIds[], assunto, corpoResumo, linkAcesso, enviadoEm, enviadoPor}`. O termo **`usuarioNotificado`** designa o **recebedor concreto** (pessoa de carne e osso) da comunicação — distinto do agregado `destinatario` da proposição (a orientação). `override = true` quando a Secretaria definiu o destinatário manualmente.
- O recebedor de cada e-mail é **resolvido por comunicação** a partir da orientação (`resolverUsuariosDestinatarios`): membro → o próprio membro; unidade → responsável atual da unidade (a Secretaria confirma/troca); administração superior → **todos** os usuários parametrizados (uma entrada por usuário). Unidade/adm superior **vaga** bloqueia o envio até definição manual.
- O controle **confirmar/trocar destinatário** (com bloqueio quando vago) é o mesmo componente compartilhado (`assets/js/ui/destinatario-control.js`) nas três superfícies de comunicação da Secretaria: **fila de diligência** (lote), **detalhe da proposição** (diligência unitária) e **fila de ciência** (lote por grupo — override por grupo membro/unidade). Trocar o destinatário marca `override` no e-mail e no histórico, mas **nunca** altera o agregado `destinatario` da proposição.

## Ciência e visualização pelo correicionado

- O ato de `cientificarGrupo` da Secretaria continua transitando cada proposição para `baixa_definitiva` (Modelo 1 — passo único); o "abrir ciência" da Secretaria coincide com a cientificação formal.
- Quando o correicionado acessa o detalhe de uma proposição em `baixa_definitiva` cuja ciência foi disponibilizada a ele e ainda não foi visualizada por ele, o sistema registra `visualizacao_ciencia_correicionado` (auditoria; sem transição de status).
- O correicionado vê na tela:
  - Decisão final do CN (`apreciacaoDoCN`) com `tipoConclusao` e `observacoes` (fundamentos).
  - Providências paralelas em `pendenciasSecretaria[]`, somente visualização.
  - Histórico filtrado (ver "Visibilidade").

## Visibilidade do histórico para o correicionado

- **Sempre visível**: `criacao`, `edicao`, `referendo_cnmp`, `criacao_diligencia`, `comprovacao`, `prazo_comprovacao_expirado`, `decisao` (incluindo `necessita_mais_informacoes`, com fundamentos completos), `avaliacao_com_forca_de_decisao`, `cientificacao`, `cumprimento_pendencia_secretaria`, `email_diligencia_enviado`, `email_ciencia_enviado`, `apagamento_proposicao`.
- **Sempre oculto**: `avaliacao_membro_auxiliar`, `avaliacao_removida_pelo_corregedor`, `rascunho_decisao_cn_salvo`, `rascunho_decisao_cn_descartado`, `rascunho_avaliacao_salvo`, `rascunho_avaliacao_descartado`, `rascunho_comprovacao_salvo`, `rascunho_comprovacao_descartado`, `edicao_metadados`.
- Em caso de **acolhimento** da minuta, a `DECISAO` deve carregar a apreciação inteira (incluindo `observacoes` — a fundamentação) sem transformação — implementação via clone JSON no identificador legado `deferirAvaliacao`. O correicionado vê a decisão e seus fundamentos completos, mas não a minuta, sua origem nem o modo de decisão; a descrição pública do evento é neutra.

## Fluxo principal

### 1. Origem da proposição

- A conclusão da correição no SCI gera a migração das proposições para o sistema do NAD.
- A proposição tem três tipos: `Determinação`, `Recomendação` e `Encaminhamento`.
- A Corregedoria Nacional pode:
  - `RASCUNHAR criação` e `CRIAR`
  - `RASCUNHAR edição` e `EDITAR`
  - `APAGAR proposição`
- `APAGAR proposição` extingue a própria proposição e encerra seu ciclo de vida.
- Após `CRIAR` ou `EDITAR`, a proposição é `ENCAMINHADA para a Secretaria`.

#### Proposição do tipo Encaminhamento

- O `Encaminhamento` nasce no relatório da equipe de correição (enviado pelo SCI) e, na essência, é uma **providência**: não percorre o ciclo diligência → comprovação → minuta → decisão.
- Entra na fila `aguardando_referendo_cnmp` como as demais proposições e obedece às mesmas regras pré-referendo (rascunho de criação, edição, apagamento).
- No **referendo da correição**, o Encaminhamento sofre dupla conversão, registrada pelo evento `conversao_encaminhamento`:
  1. `statusFluxo` vira imediatamente `baixa_definitiva`, encerrando o ciclo principal;
  2. nasce uma **pendência de providência** para a Secretaria Processual em `pendenciasSecretaria[]`, sempre com `tipoProvidencia = outra_providencia` e com a **mesma descrição** da proposição (o órgão-alvo, ex.: COCI, fica no texto).
- Encaminhamento criado (ou rascunho confirmado) em **correição já referendada** converte imediatamente na criação — coerente com a regra de pular o referendo.
- O `destinatario` continua obrigatório e aponta para a unidade/membro correicionado sobre quem o encaminhamento versa.
- O Encaminhamento nunca tem `apreciacaoDoCN`, diligências, minutas nem cientificação; o correicionado e o membro auxiliar não participam.

#### Correição como agregado autônomo (gestão no NAD)

- A `Correição` é um **agregado de primeira classe** em `state.correicoes[]`. A proposição referencia-a apenas por `correicaoId`; os dados descritivos (ramo do MP, temática, número ELO, UF e período) vivem **somente na correição** e são projetados sobre a proposição na leitura (*hydrate*), nunca duplicados/armazenados nela.
- O caminho **prioritário** de origem continua sendo a **migração do SCI**. Como contingência (falhas de migração) e para **correições de legado** não migradas, o `Corregedor Nacional` pode **registrar e editar** correições diretamente no NAD (telas `correicoes-lista` e `correicoes-criar`, exclusivas dessa persona).
- O `numero` da correição (`COR-AAAA-NN`) é gerado automaticamente; o identificador real do processo permanece em `numeroElo`.
- Editar uma correição **propaga** automaticamente aos dados exibidos em todas as suas proposições (fonte única), por projeção na leitura.

#### Panorama operacional por correição

- As cinco bandejas `Por correição` (`aguardando referendo`, `aguardando diligência`, `elaboração de minutas`, `decisão` e `aguardando ciência`) exibem `Proposições aguardando` e `Destinatários prontos / total`.
- Ao entrar numa correição, a lista de destinatários é subdividida em três seções, na ordem de prioridade **Administração Superior › Unidades › Membros** (seções vazias são ocultadas). A seção vem de `getTipoDestinatario`.
- Para esses indicadores, o fluxo principal está aberto enquanto `statusFluxo !== baixa_definitiva`. Proposições cientificadas ou apagadas não entram no numerador, no denominador nem bloqueiam a prontidão, mesmo se ainda houver providência paralela pendente.
- A unidade operacional é o **destinatário**, identificado por `(correicaoId × destinatarioRef)` via `getDestinatarioRef`: orientação a membro usa `membro:<membroId>` (acompanha a pessoa, não a unidade de origem); unidade e administração superior usam `id:<unidadeId>`. Deep-links legados com `unidadeRef=id:...` continuam aceitos como alias.
- `Proposições aguardando` contabiliza as proposições abertas presentes na bandeja. Rascunhos de criação (`rascunho_cn`) contam como presentes em `aguardando referendo`. Rascunhos de ação (decisão, minuta, comprovação) não alteram o status e, portanto, já estão naturalmente contidos nas respectivas bandejas.
- `Destinatários prontos / total` compara: (a) destinatários cujas proposições abertas estão todas na bandeja; e (b) todos os destinatários da correição que possuem ao menos uma proposição com fluxo principal aberto.
- Os indicadores são informativos. Apenas a ciência exige grupo completo por regra de negócio.

### 2. Diligência e comprovação

- A `Secretaria Processual da CN` pratica `CRIAR DILIGÊNCIA`.
- O prazo da diligência pode ser informado pela data final ou por uma quantidade inteira e não negativa de dias corridos. Os campos são sincronizados, a contagem exclui o dia inicial (`0` = hoje) e somente a data final é persistida em `prazo`.
- O `Correicionado` pratica `RASCUNHAR comprovação` e depois `COMPROVAR`.
- A comprovação reabre o fluxo interno da Corregedoria Nacional para elaboração da minuta e posterior decisão.

### 3. Minuta do membro auxiliar

- O `Membro Auxiliar da CN` pratica `RASCUNHAR minuta` e `SUBMETER minuta`.
- A minuta deve registrar todas as invariantes exigidas para a decisão final e conter redação obrigatória em linguagem decisória e impositiva.
- Rascunhos podem ser incompletos; a submissão definitiva exige situação, conclusão quando cabível, providência consistente e redação não vazia.
- A minuta nunca produz efeitos concretos por si só.
- Toda minuta é remetida à baia do `Corregedor Nacional` para decisão.

### 4. Decisão do Corregedor Nacional

- O Corregedor Nacional pode decidir de duas formas:
  - `decisão` após minuta do membro auxiliar; ou
  - `decisão direta`, excepcionalmente, quando a proposição já chega à mesa sem minuta.
- Havendo minuta, o Corregedor pode `ACOLHER`, `AFASTAR` ou `DEVOLVER`.
- `ACOLHER minuta` assume integralmente sua redação e invariantes, sem edição ou transformação.
- `AFASTAR minuta e decidir` preserva a minuta no histórico interno e exige nova apreciação completa no mesmo ato.
- `DEVOLVER minuta` exige confirmação, remove o conteúdo material da minuta e eventual rascunho decisório do Corregedor, registra `avaliacao_removida_pelo_corregedor` e retorna a proposição limpa para `aguardando_avaliacao_membro`.
- A devolução não abre decisão direta; o novo ciclo pertence à fila compartilhada do membro auxiliar.
- A fila operacional de decisão preserva, por sessão, a ordem exata da seleção filtrada. Após acolher, afastar, decidir diretamente ou devolver uma minuta, o detalhe avança para a próxima proposição ainda disponível nessa ordem.
- A navegação ignora itens posteriores que já tenham saído da mesa de decisão. Ao esgotar a seleção, informa o usuário e retorna à mesma fila filtrada; detalhes abertos fora da fila retornam à sua origem.

## Conteúdo da apreciação de valor

A apreciação de valor da Corregedoria Nacional possui duas camadas obrigatórias.

### Primeira camada

- `necessita mais informações`
- `concluída`

### Segunda camada, quando concluída

- `cumprida`
- `parcialmente cumprida`
- `não cumprida`
- `prejudicada - perda de objeto`
- `encerrada - sem análise de mérito`

### Providências adicionais

- Todos os cinco resultados conclusivos (`cumprida`, `parcialmente cumprida`, `não cumprida`, `prejudicada - perda de objeto` e `encerrada - sem análise de mérito`) admitem providências adicionais.
- Para qualquer resultado conclusivo, o sistema deve perguntar se existe providência a ser cumprida pela `Secretaria Processual da CN`.
- Quando o tipo selecionado for `outra_providencia`, `descricaoProvidencia` é obrigatória no envio definitivo. Rascunhos podem preservar a apreciação ainda incompleta.
- Essa informação integra as invariantes da minuta, da decisão após minuta e da decisão direta.
- O campo textual `observacoes` contém a redação da minuta ou a fundamentação da decisão e é obrigatório em todo ato definitivo; somente rascunhos podem mantê-lo vazio.

## Regra de acolhimento e afastamento

- Se o Corregedor Nacional `acolhe` a minuta, ele assume integralmente a redação e todas as suas invariantes.
- O acolhimento é uma ação de um clique e não exige confirmação ou edição manual.
- Se o Corregedor Nacional `afasta` a minuta, no mesmo ato ele deve selecionar novas invariantes completas e redigir a fundamentação da decisão substitutiva.
- A decisão final pode divergir integralmente da minuta.
- Para todos os efeitos, prevalece sempre o conteúdo selecionado pelo Corregedor Nacional.

## Efeitos operacionais

- A minuta do membro auxiliar, isoladamente, nunca gera efeitos operacionais.
- Quando a decisão do Corregedor Nacional ou a decisão direta indicar `necessita mais informações`, a proposição:
  - retorna para a `Secretaria Processual da CN`
  - recebe nova diligência
  - reinicia o ciclo de comprovação
- Toda decisão do tipo `concluída` transita a proposição para `aguardando_ciencia` e leva a `CIENTIFICAR`.
- O ato de ciência (evento `CIENTIFICACAO`) transita o `statusFluxo` para `baixa_definitiva` e encerra o fluxo principal da proposição.
- A ciência ocorre em bloco por `(correição × destinatário)`: só é liberada quando todas as proposições daquele destinatário naquela correição estão em `aguardando_ciencia`. Pendências em `pendenciasSecretaria[]` são ortogonais e **não bloqueiam** a transição para `baixa_definitiva`.
- Se qualquer resultado conclusivo indicar providência adicional:
  - a proposição segue para `CIENTIFICAR`; e
  - em paralelo, o sistema cria uma pendência para a `Secretaria Processual da CN` informar o cumprimento da providência

### Controle de providências da Secretaria Processual

  - A pendência paralela da Secretaria Processual constitui apenas um mecanismo de
  controle administrativo.
  - A providência é cumprida fora do sistema.
  - O sistema não executa a providência, não automatiza seu fluxo e não condiciona a
  conclusão principal da proposição ao seu processamento interno.
  - O sistema apenas permite que a Secretaria informe:
    - a `data de cumprimento`; e
    - um pequeno campo de `observações`
  - O objetivo é permitir à Secretaria Processual e à Corregedoria Nacional
  visualizar:
    - quais providências ainda estão pendentes; e
    - quais já foram informadas como cumpridas
  - Os tipos mais comuns de providência são:
    - `encaminhamento de informações à Corregedoria local`
    - `encaminhamento de informações à COCI`
    - `outras providências`

## Histórico da proposição

- Todos os eventos relevantes devem compor o histórico da proposição, com preservação de trilha de auditoria.
- O registro de cumprimento de pendência da Secretaria Processual deve gerar evento simples de histórico, com o tipo de providência, a data de cumprimento e as observações informadas.

### Tipos mínimos de histórico

- `criacao`
- `edicao`
- `edicao_metadados`
- `rascunho_cn_confirmado`
- `apagamento_proposicao`
- `conversao_encaminhamento`
- `criacao_diligencia`
- `comprovacao`
- `avaliacao_membro_auxiliar`
- `decisao`
- `avaliacao_com_forca_de_decisao`
- `avaliacao_removida_pelo_corregedor`
- `cientificacao`
- `cumprimento_pendencia_secretaria`
- `rascunho_decisao_cn_salvo`
- `rascunho_decisao_cn_descartado`
- `rascunho_avaliacao_salvo`
- `rascunho_avaliacao_descartado`
- `rascunho_comprovacao_salvo`
- `rascunho_comprovacao_descartado`
- `prazo_comprovacao_expirado`
- `email_diligencia_enviado`
- `email_ciencia_enviado`
- `visualizacao_ciencia_correicionado`

### Regras do histórico

- A minuta acolhida permanece no histórico interno.
- A decisão do Corregedor Nacional por acolhimento também permanece, com as mesmas invariantes e redação.
- Em caso de afastamento, permanecem no histórico interno:
  - a minuta do membro auxiliar; e
  - a decisão do Corregedor Nacional com invariantes divergentes
- A minuta devolvida não deve permanecer no histórico material.
- Em substituição, o sistema deve registrar o evento legado `avaliacao_removida_pelo_corregedor`, exibido como `Minuta devolvida`.

## Glossário

- **Apreciação**: objeto-juízo autor-agnóstico que descreve as invariantes de mérito (`situacao` + `tipoConclusao` + `existeProvidenciaSecretaria` + `tipoProvidencia` + `descricaoProvidencia` + `observacoes`). `descricaoProvidencia` só é preenchida quando `tipoProvidencia = outra_providencia`; `observacoes` contém a redação ou fundamentação obrigatória no ato definitivo. Apenas a apreciação registrada pelo Corregedor fica em `apreciacaoDoCN`.
- **Minuta de decisão**: ato preparatório do membro auxiliar, com redação decisória pronta e a mesma estrutura da decisão final. Não gera efeitos por si só e segue para a baia do Corregedor.
- **Decisão após minuta**: ato vinculante do Corregedor que acolhe integralmente a minuta ou a afasta e registra decisão substitutiva completa.
- **Decisão direta**: ato vinculante excepcional do Corregedor quando a proposição já se encontra na mesa decisória sem minuta.
- **Devolução de minuta**: remoção destrutiva da minuta vigente e retorno da proposição à fila de elaboração do membro auxiliar, preservando apenas o tombstone.
- **Encaminhamento**: tipo de proposição que nasce no relatório da equipe de correição (SCI) e, na essência, é uma providência. Não percorre o ciclo de diligência/minuta/decisão: ao passar pelo portão do referendo é baixado definitivamente e convertido em pendência de providência da Secretaria Processual.

## Modelagem de dados

### Correções

```json
{
  "_id": "ObjectId",
  "numero": "COR-2024-01",
  "ramoMP": "MPBA",
  "ramoMPNome": "Ministério Público do Estado da Bahia",
  "tematica": "Direitos fundamentais e meio ambiente",
  "numeroElo": "1234567-89.2024.1.01.0001",
  "tipo": "Ordinária",
  "mp": "MPE",
  "uf": ["BA"],
  "status": "ativo",
  "dataInicio": "2024-01-15",
  "dataFim": "2024-03-20",
  "observacoes": "..."
}
```

- `status` ∈ `ativo` (aguardando referendo do CNMP) | `referendada` (referendo registrado). O estado `encerrada` é **derivado** (não armazenado): a correição está encerrada quando **todas** as suas proposições estão inativas.
- **Referendar** é uma transição do agregado `Correição`: marca `status = referendada` e encaminha as proposições filhas à Secretaria — exceto as do tipo `Encaminhamento`, que são baixadas definitivamente e convertidas em pendência de providência (ver "Proposição do tipo Encaminhamento"). Ocorre na fila de referendo (`corregedor-referendo`). A ação e a geração do relatório final ficam bloqueadas enquanto houver proposição filha em `rascunho_cn`.

### Proposições

> A proposição guarda apenas `correicaoId` como vínculo à correição. Ramo do MP, nome do ramo, temática, número ELO, UF e datas **não são armazenados** na proposição — vivem na correição e são projetados na leitura (*hydrate*).

```json
{
  "_id": "ObjectId",
  "numero": "PROP-2024-0001",
  "correicaoId": "ObjectId",
  "tipo": "Determinação", // "Determinação" | "Recomendação" | "Encaminhamento"
  "destinatario": {
    "tipo": "membro",                       // "membro" | "unidade" | "administracao_superior" (apenas um alvo)
    "membroId": "ObjectId",                 // tipo === "membro"
    "unidadeOrigemSnapshot": { "unidadeId": "ObjectId", "unidade": "..." }, // só p/ membro: lotação congelada na origem
    "unidadeId": "ObjectId",                // tipo === "unidade"
    "administracaoSuperior": { "ramoMP": "MPBA", "tipo": "PGJ" } // tipo === "administracao_superior"
  },
  // Espelho denormalizado do agregado (compat com filtros/agrupamentos):
  "unidadeId": "ObjectId",
  "unidade": "Procuradoria-Geral de Justiça",
  "membroId": "ObjectId|null",
  "membro": "Dr. João Silva Santos",
  "descricao": "...",
  "prioridade": "normal", // "urgente" | "importante" | "normal"
  "sensivel": false,
  "statusFluxo": "aguardando_decisao_corregedor",
  "apreciacaoDoCN": {
    "situacao": "concluida",
    "tipoConclusao": "parcialmente_cumprida",
    "existeProvidenciaSecretaria": true,
    "tipoProvidencia": "encaminhamento_corregedoria_local",
    "descricaoProvidencia": null
  },
  "avaliacaoVigenteId": "ObjectId|null",
  // Rascunhos de ação (opcionais; ver "Rascunhos de ação (modelo canônico)"):
  // "rascunhoAvaliacao":   { "apreciacao": {...}, "salvoEm": "...", "salvoPor": "...", "salvoPorId": null },
  // "rascunhoDecisaoCN":   { "apreciacao": {...}, "salvoEm": "...", "salvoPor": "...", "salvoPorId": null },
  // "rascunhoComprovacao": { "descricao": "...", "observacoes": "...", "anexos": [...], "salvoEm": "...", "salvoPor": "...", "salvoPorId": "..." },
   "pendenciasSecretaria": [
    {
      "tipo": "cumprimento_providencia",
      "tipoProvidencia": "encaminhamento_corregedoria_local",
      "descricao": "Encaminhamento de informações à Corregedoria local",
      "status": "pendente",
      "dataCriacao": "2024-11-21T10:00:00Z",
      "dataCumprimento": null,
      "observacoes": null
    }
  ],
  "historico": [
    {
      "tipo": "criacao_diligencia",
      "data": "2024-11-01T10:00:00Z",
      "usuario": "Secretaria Processual da CN",
      "descricao": "...",
      "prazoComprovacao": "2024-12-31"
    },
    {
      "tipo": "comprovacao",
      "data": "2024-11-15T14:30:00Z",
      "usuario": "MPBA - Ministério Público do Estado da Bahia",
      "descricao": "...",
      "observacoes": "...",
      "arquivos": ["doc1.pdf", "doc2.pdf"]
    },
    {
      "tipo": "avaliacao_membro_auxiliar",
      "data": "2024-11-20T16:00:00Z",
      "usuario": "Membro Auxiliar da CN",
      "apreciacao": {
        "situacao": "concluida",
        "tipoConclusao": "parcialmente_cumprida",
        "existeProvidenciaSecretaria": true,
        "tipoProvidencia": "encaminhamento_corregedoria_local",
        "descricaoProvidencia": null
      }
    },
    {
      "tipo": "decisao",
      "data": "2024-11-21T10:00:00Z",
      "usuario": "Corregedor Nacional",
      "modo": "deferimento",
      "apreciacao": {
        "situacao": "concluida",
        "tipoConclusao": "parcialmente_cumprida",
        "existeProvidenciaSecretaria": true,
        "tipoProvidencia": "encaminhamento_corregedoria_local",
        "descricaoProvidencia": null
      }
    },
    {
      "tipo": "cientificacao",
      "data": "2024-11-21T10:30:00Z",
      "usuario": "Secretaria Processual da CN",
      "descricao": "Email encaminhado ao correicionado"
    }
  ]
}
```

## Regras de estado e consistência

- `statusFluxo` deve refletir a fase atual do processo, nunca o resultado conclusivo.
- Valores válidos de `statusFluxo`: `aguardando_referendo_cnmp`, `rascunho_cn`, `aguardando_secretaria`, `aguardando_comprovacao`, `aguardando_avaliacao_membro`, `aguardando_decisao_corregedor`, `aguardando_ciencia`, `baixa_definitiva`.
- `aguardando_ciencia` é o estado entre a decisão conclusiva e o ato de ciência ao correicionado. `baixa_definitiva` é o estado terminal (pós-ciência, proposições apagadas pela CN e Encaminhamentos convertidos).
- Três transições levam a `baixa_definitiva`: a ciência (`CIENTIFICACAO`), o apagamento pela CN (`APAGAMENTO_PROPOSICAO`) e a conversão de Encaminhamento (`CONVERSAO_ENCAMINHAMENTO`); pendências de providência (em `pendenciasSecretaria[]`) não influenciam essas transições.
- Proposições do tipo `Encaminhamento` nunca têm `apreciacaoDoCN`, `diligencias` nem minutas; sua pendência de providência é sempre `outra_providencia` com a descrição da própria proposição.
- O resultado conclusivo deve ficar em `apreciacaoDoCN`.
- `apreciacaoDoCN` só é preenchido por atos do Corregedor Nacional (`decisao` ou o tipo legado `avaliacao_com_forca_de_decisao`); a minuta do membro auxiliar não popula esse campo.
- `apreciacaoDoCN.situacao` admite apenas:
  - `necessita_mais_informacoes`
  - `concluida`
- `apreciacaoDoCN.situacao = concluida` (camada de apreciação) é independente de `statusFluxo = baixa_definitiva` (camada de fluxo). A homonímia foi evitada renomeando o status terminal.
- `apreciacaoDoCN.tipoConclusao` só pode existir quando `situacao = concluida`.
- `apreciacaoDoCN.existeProvidenciaSecretaria` pode existir para qualquer `tipoConclusao`, desde que `situacao = concluida`.
- `apreciacaoDoCN.descricaoProvidencia` é obrigatória e não vazia quando `tipoProvidencia = outra_providencia`; nos demais tipos, deve ser `null`.
- A minuta do membro auxiliar deve carregar o mesmo formato de invariantes da decisão final.
- O sistema não deve manter simultaneamente uma minuta vigente e um evento de devolução dessa mesma minuta como conteúdo ativo.
- `prioridade` admite apenas: `urgente`, `importante`, `normal` (padrão `normal`).
- `sensivel` é booleano (padrão `false`); marcação visual apenas — não restringe acesso nem mascara conteúdo.
- `prioridade` e `sensivel` são editáveis pelo Corregedor Nacional, Membro Auxiliar e Secretaria Processual em qualquer status ativo. Estão bloqueados em `baixa_definitiva`. Cada edição gera um evento `edicao_metadados` no histórico, registrando valores anteriores e novos.

## Cenários obrigatórios

- Criar proposição, encaminhar para diligência, receber comprovação, minuta do membro auxiliar e decisão de acolhimento do Corregedor Nacional.
- Receber minuta por `necessita mais informações` e acolhê-la com retorno para a Secretaria Processual.
- Receber minuta por `necessita mais informações`, afastá-la e decidir por `concluída > prejudicada - perda de objeto`.
- Devolver minuta do membro auxiliar e registrar `avaliacao_removida_pelo_corregedor`.
- Praticar decisão direta sem minuta vigente.
- Concluir proposição como `não cumprida` com criação de pendência paralela para a Secretaria Processual.
- Concluir proposição como `cumprida` com criação de providência paralela personalizada.
- Referendar correição contendo proposição do tipo `Encaminhamento`: baixa definitiva imediata + criação de pendência de providência com a descrição do encaminhamento.
- Criar (ou confirmar rascunho de) `Encaminhamento` em correição já referendada, com conversão imediata na criação.
