A imagem Fluxo_NAD.png representa um **fluxo do sistema de gestão de proposições (NAD)**, organizado por **raias (swimlanes)**, indicando responsabilidades de cada ator:

* **Corregedoria Nacional - CN (ou autoridades delegadas)**
* **Secretaria Processual da CN**
* **Correcionando**
* **Membro Auxiliar da CN**

### 🔎 Estrutura geral do fluxo

O processo está dividido, essencialmente, em **quatro grandes momentos**:

---

### 1. **Criação e decisão inicial da proposição**

* Inicia com:

  * **Input de nova proposição vinda do SCI (sistema externo)**
  * **Rascunhar de edição**
  * **Editar**
  * **Decidir (proposição nova)**
* Há uma observação importante:

  * A conclusão da correição no SCI (sistema externo) **gera integração das proposições no sistema de Gestão de Proposições**

Depois:

* A proposição é **enviada para publicação**
* A Secretaria:

  * **Publica** (e cria diligência, se necessário)

---

### 2. **Aprovação e avaliação**

* O fluxo segue para:

  * **Rascunhar aprovação → Comprovar**
* Depois entra o papel do:

  * **Analista/Membro Auxiliar**

    * **Rascunhar avaliação**
    * **Avaliar**

---

### 3. **Análise e decisão sobre o cumprimento**

* Retorna para análise:

  * **Analisar avaliação do membro**
* Possibilidades:

  * **Rascunhar → Decidir (deferimento ou indeferimento)**
  * **Apagar → (ramificação para rascunhar ou devolver)**

Depois:

* Pode haver:

  * **Avaliar (da CN)**

---

### 4. **Resultados finais e providências**

O fluxo leva a estados como:

* **Concluída**

  * Cumprida
  * Parcialmente cumprida
  * Não cumprida
* **Prejudicada**
* **Encerrada**
* **Necessita informações**

Se necessário:

* **Adotar providências**

  * Ex: encaminhamento ao CODI, Corregedoria local etc.

E por fim:

* **Certificar (email ao correcionado)**
* **Criar diligência para cumprir**
* **Cumprir**

---

### 💡 Leitura conceitual (bem importante para você)

Esse fluxo deixa claro algo interessante (bem alinhado com DDD, inclusive):

* Existe um **ciclo de vida da proposição**
* Com estados bem definidos (draft → decisão → publicação → avaliação → conclusão)
* E **eventos importantes**:

  * Publicação
  * Avaliação
  * Certificação
  * Cumprimento

---

Se quiser, posso:

* Transformar isso em **modelo de domínio (DDD)**
* Identificar **entidades, agregados e eventos de domínio**
* Ou até desenhar uma **arquitetura backend (Node/Python)** baseada nesse fluxo

Esse diagrama está muito bom para virar um sistema bem estruturado.






















Sim. A partir desse fluxo, dá para transformar o processo em um **modelo de domínio** razoavelmente claro.

Vou fazer isso em linguagem de negócio, não em linguagem técnica demais.

# Visão central do domínio

O núcleo do domínio parece ser a **Proposição**, criada no contexto de uma correição e submetida a um ciclo de vida que envolve:

* elaboração
* decisão
* publicação
* aprovação/comprovação
* avaliação
* conclusão
* eventual adoção de providências
* certificação e cumprimento

Ou seja, o domínio não é apenas “gerir documentos”, mas sim:

**gerir o ciclo de vida de proposições oriundas da correição, com controle de avaliação, decisão, resultado e providências decorrentes.**

---

# Subdomínios percebidos

Pelo fluxo, eu separaria o domínio em pelo menos estes subdomínios:

## 1. Gestão de Proposições

Responsável por:

* criação da proposição
* edição
* rascunho
* decisão inicial
* publicação

## 2. Tramitação e Diligências

Responsável por:

* envio para publicação
* criação de diligência
* devolução
* cumprimento

## 3. Aprovação e Comprovação

Responsável por:

* rascunho de aprovação
* comprovação pelo correcionado

## 4. Avaliação

Responsável por:

* rascunho de avaliação
* avaliação por analista/membro auxiliar
* análise da avaliação pela Coordenação/CN

## 5. Encerramento e Resultado

Responsável por:

* decidir se está concluída
* classificar o resultado
* identificar necessidade de informações
* encerrar ou encaminhar providências

## 6. Providências Correcionais

Responsável por:

* adotar providências
* registrar tipo de providência
* encaminhar para outros órgãos/unidades

---

# Entidade central

## Proposição

É o centro do modelo.

### Atributos prováveis

* `id`
* `numero`
* `titulo`
* `descricao`
* `origem`
* `dataCriacao`
* `status`
* `faseAtual`
* `tipo`
* `foiPublicada`
* `dataPublicacao`
* `resultadoFinal`
* `necessitaInformacoes`
* `correicaoId`
* `correcionadoId`

### Comportamentos do domínio

* `rascunharEdicao()`
* `editar()`
* `decidirComoNova()`
* `enviarParaPublicacao()`
* `publicar()`
* `rascunharAprovacao()`
* `comprovar()`
* `receberAvaliacao()`
* `analisarAvaliacao()`
* `decidirConclusao()`
* `marcarComoNecessitaInformacoes()`
* `encerrar()`
* `adotarProvidencias()`
* `certificar()`

---

# Objetos de valor importantes

## Status da Proposição

Em vez de string solta, eu criaria um value object ou enum forte.

Exemplo:

* `RASCUNHO`
* `EM_EDICAO`
* `DECIDIDA`
* `AGUARDANDO_PUBLICACAO`
* `PUBLICADA`
* `AGUARDANDO_APROVACAO`
* `COMPROVADA`
* `EM_AVALIACAO`
* `AVALIADA`
* `EM_ANALISE_FINAL`
* `CONCLUIDA`
* `NECESSITA_INFORMACOES`
* `ENCERRADA`
* `CUMPRIDA`

## Resultado da Proposição

Outro value object ou enum:

* `CUMPRIDA`
* `PARCIALMENTE_CUMPRIDA`
* `NAO_CUMPRIDA`
* `PREJUDICADA`
* `ENCERRADA`

## Tipo de Providência

* `NENHUMA`
* `ENCAMINHAMENTO_AO_CODI`
* `ENCAMINHAMENTO_A_CORREGEDORIA_LOCAL`
* `OUTRA`

## Papel do Agente

* `COORDENACAO_CN`
* `SECRETARIA_PROCESSUAL`
* `CORRECIONADO`
* `ANALISTA`
* `MEMBRO_AUXILIAR`

---

# Entidades auxiliares

## Avaliação

A avaliação parece ter identidade própria no fluxo. Eu trataria como entidade.

### Atributos

* `id`
* `proposicaoId`
* `autorId`
* `texto`
* `dataAvaliacao`
* `status`
* `versao`

### Comportamentos

* `rascunhar()`
* `submeter()`
* `editar()`
* `cancelar()`

---

## Aprovação

Também parece fazer sentido como entidade, porque há rascunho e comprovação.

### Atributos

* `id`
* `proposicaoId`
* `dataRascunho`
* `dataComprovacao`
* `comprovadoPor`
* `observacoes`

### Comportamentos

* `rascunhar()`
* `comprovar()`

---

## Diligência

Muito importante no fluxo.

### Atributos

* `id`
* `proposicaoId`
* `descricao`
* `destinatario`
* `dataCriacao`
* `dataCumprimento`
* `status`

### Status possíveis

* `ABERTA`
* `EM_CUMPRIMENTO`
* `CUMPRIDA`
* `DEVOLVIDA`
* `CANCELADA`

### Comportamentos

* `criar()`
* `devolver()`
* `cumprir()`
* `cancelar()`

---

## Providência

Dependendo do seu desenho, pode ser entidade própria ou parte da Proposição. Eu tenderia a fazê-la entidade, porque pode haver múltiplas providências.

### Atributos

* `id`
* `proposicaoId`
* `tipo`
* `descricao`
* `destino`
* `dataRegistro`
* `responsavelId`

### Comportamentos

* `registrar()`
* `encaminhar()`
* `cancelar()`

---

## Certificação

Pode ser entidade se houver necessidade de trilha formal/autônoma. Se não, pode ser evento registrado no histórico.

### Atributos

* `id`
* `proposicaoId`
* `data`
* `destinatario`
* `meio`
* `conteudo`

### Comportamentos

* `emitir()`

---

# Agregados

Eu modelaria assim:

## Agregado 1: Proposição

**Raiz do agregado:** `Proposicao`

Contém ou controla:

* Aprovação
* Avaliações
* Diligências
* Providências
* Histórico de transições

A ideia é: quase toda mudança relevante nasce da Proposição.

---

## Agregado 2: Correição

Se o sistema maior já trabalha com correição como processo pai, a Proposição provavelmente nasce dentro dela.

### Correição

* `id`
* `tipo`
* `dataInicio`
* `dataConclusao`
* `correcionadoId`

### Comportamentos

* `gerarProposicao()`
* `concluir()`

A relação provável:

* **uma Correição possui várias Proposições**

---

# Invariantes de negócio

Essas são regras que o modelo deveria proteger.

## Sobre criação e publicação

* uma proposição só pode ser publicada se tiver sido decidida
* uma proposição nova deve nascer vinculada a uma correição
* não se deve comprovar proposição não publicada, salvo regra expressa em contrário

## Sobre avaliação

* a avaliação só pode ocorrer após publicação e/ou comprovação, conforme a regra do negócio
* análise da avaliação exige que exista avaliação submetida
* não se conclui uma proposição sem análise válida, salvo hipóteses excepcionais

## Sobre conclusão

* ao concluir, deve haver um resultado final
* se o resultado for “necessita informações”, a proposição não deve ser tratada como concluída definitivamente
* se houver providência a adotar, ela deve ser registrada formalmente

## Sobre diligências

* diligência cumprida não pode voltar a aberta sem novo ato
* devolução deve preservar rastreabilidade

---

# Máquina de estados sugerida

Você pode pensar a Proposição mais ou menos assim:

```text
RASCUNHO
  -> EM_EDICAO
  -> DECIDIDA
  -> AGUARDANDO_PUBLICACAO
  -> PUBLICADA
  -> AGUARDANDO_COMPROVACAO
  -> COMPROVADA
  -> EM_AVALIACAO
  -> AVALIADA
  -> EM_ANALISE_FINAL
  -> CONCLUIDA
        -> CUMPRIDA
        -> PARCIALMENTE_CUMPRIDA
        -> NAO_CUMPRIDA
        -> PREJUDICADA
  -> NECESSITA_INFORMACOES
  -> ENCERRADA
```

Talvez, na prática, “cumprida”, “parcialmente cumprida” etc. sejam melhor tratados como **resultado final**, e não como status principal. Isso costuma deixar o modelo mais limpo.

---

# Eventos de domínio

Esse fluxo sugere eventos muito claros.

## Eventos principais

* `ProposicaoCriada`
* `ProposicaoEditada`
* `ProposicaoDecidida`
* `ProposicaoEnviadaParaPublicacao`
* `ProposicaoPublicada`
* `DiligenciaCriada`
* `AprovacaoRascunhada`
* `ProposicaoComprovada`
* `AvaliacaoRascunhada`
* `AvaliacaoSubmetida`
* `AvaliacaoAnalisada`
* `ProposicaoConcluida`
* `ProposicaoClassificadaComoNecessitaInformacoes`
* `ProvidenciaAdotada`
* `CertificacaoEmitida`
* `DiligenciaCumprida`

Esses eventos são muito úteis se você quiser:

* auditoria
* notificações
* integração com outros módulos
* histórico completo

---

# Comandos de aplicação sugeridos

Na camada de aplicação, eu esperaria comandos como:

* `CriarProposicao`
* `EditarProposicao`
* `DecidirProposicaoNova`
* `EnviarProposicaoParaPublicacao`
* `PublicarProposicao`
* `RascunharAprovacao`
* `ComprovarProposicao`
* `RascunharAvaliacao`
* `SubmeterAvaliacao`
* `AnalisarAvaliacao`
* `ConcluirProposicao`
* `RegistrarNecessidadeDeInformacoes`
* `AdotarProvidencia`
* `CertificarCorrecionado`
* `CriarDiligencia`
* `CumprirDiligencia`

---

# Contextos delimitados possíveis

Se você quiser evoluir isso em DDD de forma mais madura, eu separaria assim:

## Contexto 1: Correição

Cuida do processo correicional como um todo.

## Contexto 2: Proposições

Cuida do ciclo de vida da proposição.

## Contexto 3: Cumprimento e Diligências

Cuida da execução prática do que foi determinado.

## Contexto 4: Comunicação Formal

Cuida de certificação, publicação e notificações.

Isso evita que “Proposição” vire uma entidade gigante fazendo tudo.

---

# Ubiquitous language sugerida

Esses termos deveriam ter significado preciso no sistema:

* **Proposição**
* **Publicação**
* **Comprovação**
* **Avaliação**
* **Conclusão**
* **Providência**
* **Diligência**
* **Certificação**
* **Correcionado**
* **Resultado final**
* **Necessita informações**

Especialmente aqui: é muito importante distinguir semanticamente:

* **status** da proposição
* **resultado final** da proposição
* **situação da diligência**
* **ato praticado** no processo

Essa separação evita muita confusão.

---

# Modelo resumido

## Entidades

* Proposição
* Correição
* Avaliação
* Aprovação
* Diligência
* Providência
* Certificação

## Value Objects

* StatusProposicao
* ResultadoProposicao
* TipoProvidencia
* PapelAgente

## Eventos de domínio

* Proposição publicada
* Proposição comprovada
* Avaliação submetida
* Proposição concluída
* Providência adotada
* Certificação emitida
* Diligência cumprida

## Agregado principal

* **Proposição**

---

# Ponto mais importante de modelagem

O principal cuidado aqui é este:

**não modelar cada caixinha do fluxograma como uma entidade.**

Muitas caixas são apenas:

* ações
* transições
* comandos
* etapas do processo

No domínio, o foco deve ser:

* quais são os objetos que têm identidade
* quais estados precisam ser protegidos
* quais regras impedem transições inválidas

Ou seja:

* “Rascunhar” não é entidade
* “Editar” não é entidade
* “Decidir” não é entidade

Esses são **comportamentos da entidade Proposição** ou de objetos ligados a ela.

---

# Exemplo conceitual simples

Uma forma de enxergar:

```text
Correição
 └── Proposição
      ├── Aprovação
      ├── Avaliações
      ├── Diligências
      ├── Providências
      └── Histórico de eventos
```

---

Posso, no próximo passo, transformar isso em um destes formatos:

1. **diagrama textual de classes**
2. **mapa de bounded contexts**
3. **modelo em Node.js com classes e enums**
4. **modelo em TypeScript com entidades DDD**
5. **tabela com entidade, atributos e regras de negócio**






















Perfeito — antes de transformar isso em regras simples (e **evitar modelar errado**), preciso alinhar alguns pontos onde o diagrama deixa espaço para interpretações diferentes.

Vou ser direto e focar só no que impacta **regra de negócio e protótipo** 👇

---

# 🔴 1. Publicação × Comprovação (ordem e dependência)

No fluxo aparece:

* “Enviar para publicação” → “Publicar”
* Depois: “Rascunhar aprovação” → “Comprovar”

👉 **Dúvida crítica:**

**A proposição só pode ser comprovada depois de publicada?**

Ou:

* (A) Publicação é obrigatória antes de qualquer ação externa
* (B) Comprovação pode ocorrer sem publicação formal
* (C) Depende do tipo de proposição

<resposta_1>

### ✔️ Interpretação consolidada

* **Publicação = ato formal da Secretaria**

  * Torna a proposição eficaz externamente
  * **Gera automaticamente uma diligência**
  * Cria uma obrigação com prazo para o correcionado

* **Diligência = obrigação a ser cumprida pelo correcionado**

  * Sempre nasce da publicação (pelo menos nesse cenário)

* **Comprovação = resposta do correcionado**

  * É o ato de informar o cumprimento (ou não) da diligência
  * **Só existe após a publicação**

👉 Em termos de regra de negócio (já validada):

* ❌ Não existe comprovação sem publicação
* ❌ Não existe diligência sem publicação
* ✔️ Publicação → cria diligência → permite comprovação

</resposta_1>

---

# 🔴 2. Avaliação depende de comprovação?

Fluxo sugere:

* Avaliação vem depois de comprovação

👉 Confirme:

**A avaliação só acontece após a comprovação?**

Ou pode ocorrer:

* sem comprovação
* paralelamente
* ou em cenários diferentes?

<resposta_2>

### ✔️ Interpretação consolidada

* Regra geral:

  * **Avaliação depende de comprovação**

* Exceção relevante:

  * A **Corregedoria Nacional (ou seus auxiliares)** pode avaliar **a qualquer momento**
  * Inclusive:

    * sem comprovação
    * por perda de objeto
    * por mudança de entendimento

👉 Isso cria uma regra de negócio bem clara:

* Existe um **fluxo padrão** (comprovação → avaliação)
* E uma **quebra autorizada de fluxo** (override institucional)

👉 Em termos de sistema:

* Isso não é “erro” — é **regra explícita de autoridade**
</resposta_2>

---

# 🔴 3. “Necessita informações” é estado ou resultado?

No fluxo, isso aparece como um “caminho paralelo”.

👉 Pergunta importante:

Quando uma proposição “necessita informações”, isso significa:

* (A) ela **não foi concluída ainda** (estado intermediário)
* (B) isso é um **resultado final possível**
* (C) é um retorno dentro da avaliação/diligência

<resposta_3>

### ✔️ Interpretação consolidada

* **“Necessita informações” NÃO é estado final**
* É um **resultado da avaliação** que:

  1. 🔁 reinicia o ciclo da proposição
  2. 📤 envia para a Secretaria Processual
  3. ⏳ fica aguardando **nova publicação manual**
  4. 📌 exige definição de **novo prazo de diligência**
  5. 🔄 gera novo ciclo:

     * publicação → diligência → comprovação → avaliação

👉 Em termos de sistema:

* ❗ Não há automação de diligência aqui
* ✔️ Sempre depende de nova ação da Secretaria
* ✔️ É um **loop formal controlado**

👉 Isso define um padrão importantíssimo:

> A proposição pode ter múltiplos ciclos de vida internos (loops)

---

Agora vamos para o próximo ponto crítico:

</resposta_3>

---

# 🔴 4. Resultado final vs status

Você tem dois conceitos misturados no fluxo:

* Estados do processo (rascunho, publicado, etc.)
* Resultado final (cumprida, não cumprida, etc.)

👉 Confirmação:

**Você quer separar claramente:**

* Status (fase do processo)
* Resultado (classificação final)

👉 Exemplo:

* Status = CONCLUÍDA
* Resultado = PARCIALMENTE CUMPRIDA

Isso é importante pra não bagunçar o sistema.

<resposta_4>

### ✔️ Consolidação do que você definiu

* ✔️ **Status ≠ Resultado** (separação obrigatória)
* ✔️ Resultado é sempre uma classificação final (ou derivada da avaliação)
* ✔️ Tipos de resultado incluem:

  * Cumprida
  * Parcialmente cumprida
  * Não cumprida
  * Prejudicada (perda de objeto)
  * Encerrada (sem análise de mérito)

</resposta_4>

---

# 🔴 5. Quem pode fazer o quê (regra de permissão)

No diagrama existem papéis:

* Coordenação / CN
* Secretaria
* Correcionado
* Analista / Membro Auxiliar

👉 Preciso confirmar:

Você quer regras explícitas do tipo:

* só CN pode decidir
* só Secretaria pode publicar
* só Correcionado pode comprovar
* só Analista pode avaliar

Ou no protótipo inicial podemos simplificar permissões?

<resposta_5>
Ficou claro que você tem **quatro personas com fronteiras bem definidas**:

* **(a) Corregedor Nacional / autoridade delegada** → poder de decisão (núcleo decisório)
* **(b) Secretaria Processual** → execução formal (publicar, comunicar, operacionalizar)
* **(c) Correcionado** → sujeito passivo (responde, comprova)
* **(d) Corregedores Auxiliares** → produção técnica (avaliam → parecer → submetem à decisão)

👉 E um ponto chave que você trouxe:

* **Avaliação ≠ decisão**
* Avaliação = parecer técnico
* Decisão = ato da autoridade

Perfeito. Agora a pergunta 5 ficou suficientemente fechada para virar regra de sistema.

### Consolidação do que ficou definido

* **CN / autoridade delegada**

  * decide sempre
  * pode avaliar diretamente
  * pode cancelar/apagar proposição
  * é a instância máxima

* **Corregedor Auxiliar**

  * elabora a **avaliação**
  * sua avaliação **nunca produz efeito sozinha**
  * depende sempre de **decisão/homologação do CN**

* **Analista**

  * não avalia nem decide
  * apenas **rascunha** para o Corregedor Auxiliar

* **Secretaria Processual**

  * não altera proposição
  * apenas pratica **atos formais**: publicar, comunicar, certificar, operacionalizar

* **Correcionado**

  * apenas **comprova/presta informações**
  * não decide, não avalia, não altera proposição

Também ficou muito claro um ponto central do protótipo:

> no fluxo normal, há separação entre rascunho técnico, avaliação e decisão;
> no fluxo excepcional, o CN pode concentrar avaliação e decisão em si.

</resposta_5>

---

# 🔴 6. Diligência: automática ou manual?

No fluxo:

* Publicar → “cria diligência”
* Também há “Criar diligência para cumprir”

👉 Pergunta:

**A diligência é:**

* (A) sempre criada automaticamente na publicação
* (B) criada manualmente por alguém
* (C) depende do caso

---

# 🔴 7. Providência vs Diligência (conceitos diferentes?)

Você tem dois blocos:

* Diligência
* Providência

👉 Preciso confirmar:

**Qual a diferença real no negócio?**

Minha hipótese:

* **Diligência** = tarefa operacional (cumprir algo)
* **Providência** = medida institucional (encaminhar, punir, etc.)

Confere?

---

# 🔴 8. “Apagar” no fluxo

Existe uma ação “Apagar”.

👉 Pergunta direta:

Isso significa:

* (A) excluir proposição do sistema
* (B) cancelar/invalidar (mas manter histórico)
* (C) apagar apenas rascunho

---

# 🔴 9. Pode voltar etapa? (reversibilidade)

Exemplo no fluxo:

* Avaliação → volta → rascunhar

👉 Confirmação:

O sistema deve permitir:

* voltar etapas (workflow não linear)?
* ou isso é exceção?

---

# 🔴 10. Certificação (efeito jurídico)

“Certificar (email ao correcionado)”

👉 Pergunta importante:

A certificação:

* (A) é obrigatória para encerrar o processo
* (B) é apenas comunicação opcional
* (C) gera efeito formal (tipo intimação)

---

# 🔴 11. Proposição nasce quando?

No fluxo tem nota:

> conclusão da correição gera integração das proposições

👉 Confirma:

* proposição nasce **automaticamente da correição**
  ou
* pode ser criada manualmente também?

---

# 🔴 12. Existe mais de uma avaliação?

👉 Pode haver:

* várias avaliações por proposição?
* ou apenas uma versão final?

---

# 🔴 13. Pode haver múltiplas providências?

👉 Exemplo:

* encaminhar ao CODI
* e à corregedoria local

👉 Isso pode acontecer junto?

---

# 🚀 Próximo passo

Assim que você responder (pode ser rápido, tipo “1-A, 2-C, 3-A…”), eu vou:

👉 transformar tudo em:

* regras de negócio **simples, objetivas e implementáveis**
* no formato ideal para protótipo:

  * “Se X então Y”
  * “Só pode fazer Z quando...”
  * “Não pode fazer A se...”

Sem juridiquês, direto para sistema.

Se quiser, depois disso eu ainda posso:

* converter essas regras em **API endpoints**
* ou em **modelo Node.js (DDD leve)**

Pode responder em bullet points mesmo 👍














// preciso corrigir os status abaixo que ainda estão no formato antigo...

MODELAGEM DE DADOS:


segue coleção de <<<correicoes>>>:

{
  _id: ObjectId("..."),
  numero: "COR-2024-01",
  ramoMP: "MPBA",
  ramoMPNome: "Ministério Público do Estado da Bahia",
  tematica: "Direitos fundamentais e meio ambiente",
  numeroElo: "1234567-89.2024.1.01.0001",
  tipo: "Ordinária",
  mp: "MPE",
  uf: ["BA"],
  status: "ativo",
  dataInicio: ISODate("2024-01-15"),
  dataFim: ISODate("2024-03-20"),
  observacoes: "..."
}

segue coleção de <<<proposicoes>>>:

{
  _id: ObjectId("..."),
  numero: "PROP-2024-0001",
  correicaoId: ObjectId("..."),
  tipo: "Determinação",
  unidade: "Procuradoria-Geral de Justiça",
  membro: "Dr. João Silva Santos",
  descricao: "...",
  prioridade: "normal",
  prazoComprovacao: ISODate("2024-12-31"),
  dataPublicacao: ISODate("2024-11-01"),
  status: ["encerrada", "satisfeita"],
  tags: ["tecnologia", "gestao-documental"],
  rascunhosComprovacao: [],
  rascunhosAvaliacao: [],
  historico: [
    {
      tipo: "publicacao",
      data: ISODate("2024-11-01T10:00:00Z"),
      usuario: "Corregedoria Nacional",
      descricao: "...",
      observacoes: null,
      prazoComprovacao: ISODate("2024-12-31"),
      statusAnterior: ["pendente_publicacao", "sem_avaliacao"],
      statusNovo: ["aguardando_comprovacao", "sem_avaliacao"]
    },
    {
      tipo: "comprovacao",
      data: ISODate("2024-11-15T14:30:00Z"),
      usuario: "MPBA - Ministério Público do Estado da Bahia",
      descricao: "...",
      observacoes: "...",
      arquivos: ["doc1.pdf", "doc2.pdf"]
    },
    {
      tipo: "avaliacao",
      data: ISODate("2024-11-20T16:00:00Z"),
      usuario: "Corregedoria Nacional",
      descricao: "...",
      observacoes: null,
      statusAnterior: ["pendente_avaliacao", "sem_avaliacao"],
      statusNovo: ["encerrada", "satisfeita"]
    }
  ]
}


<<<observação: todas as vezes que a proposição sofre uma publicação, comprovação, avaliação e decisão, ela ganha um histórico que permanece todo o seu ciclo de vida.>>>



