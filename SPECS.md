# Especificação do Fluxo de Vida das Proposições

## Resumo

O sistema de proposições do NAD modela o ciclo de vida das proposições originadas da conclusão da correição no SCI. O fluxo é orientado por persona e por ato praticado. A proposição pode ser criada, editada ou apagada pela Corregedoria Nacional, tramita por diligência e comprovação, pode receber avaliação do membro auxiliar e sempre depende de ato final do Corregedor Nacional para produzir efeitos concretos.

A avaliação do membro auxiliar tem natureza técnica e nunca produz efeitos sozinha. A palavra final é sempre do Corregedor Nacional, seja por `decisão` posterior à avaliação do membro auxiliar, seja por `avaliação com força de decisão`.

## Personas e competências

- `Corregedor Nacional`: autoridade decisória final. Pode criar, editar e apagar proposição, decidir sobre avaliação do membro auxiliar, remover avaliação e praticar avaliação com força de decisão.
- `Membro Auxiliar da CN`: pratica avaliação técnica com as mesmas invariantes de conteúdo da decisão final, mas sem produzir efeitos concretos.
- `Secretaria Processual da CN`: cria diligência, operacionaliza comunicações e informa cumprimento de providências paralelas.
- `Correicionado`: presta informações e pratica a comprovação.

## Fluxo principal

### 1. Origem da proposição

- A conclusão da correição no SCI gera a migração das proposições para o sistema do NAD.
- A Corregedoria Nacional pode:
  - `RASCUNHAR criação` e `CRIAR`
  - `RASCUNHAR edição` e `EDITAR`
  - `APAGAR proposição`
- `APAGAR proposição` extingue a própria proposição e encerra seu ciclo de vida.
- Após `CRIAR` ou `EDITAR`, a proposição é `ENCAMINHADA para a Secretaria`.

### 2. Diligência e comprovação

- A `Secretaria Processual da CN` pratica `CRIAR DILIGÊNCIA`.
- O `Correicionado` pratica `RASCUNHAR comprovação` e depois `COMPROVAR`.
- A comprovação reabre o fluxo interno da Corregedoria Nacional para emissão de juízo de valor.

### 3. Avaliação do membro auxiliar

- O `Membro Auxiliar da CN` pratica `RASCUNHAR avaliação` e `AVALIAR`.
- A avaliação do membro auxiliar deve registrar todas as invariantes exigidas para o juízo final da Corregedoria Nacional.
- A avaliação do membro auxiliar nunca produz efeitos concretos.
- Toda avaliação do membro auxiliar é remetida à baia do `Corregedor Nacional` para decisão.

### 4. Decisão do Corregedor Nacional

- O Corregedor Nacional pode decidir de duas formas:
  - `decisão` após avaliação do membro auxiliar
  - `avaliação com força de decisão`
- A `avaliação com força de decisão` só pode ocorrer se a proposição estiver sem avaliação vigente, ou após remoção da avaliação anterior.
- O Corregedor Nacional pode `APAGAR avaliação`.
- `APAGAR avaliação` remove apenas a avaliação vigente, preserva a proposição e permite:
  - nova avaliação do membro auxiliar; ou
  - avaliação com força de decisão pelo Corregedor Nacional

## Conteúdo do juízo de valor

O juízo de valor da Corregedoria Nacional possui duas camadas obrigatórias.

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

- Apenas `parcialmente cumprida` e `não cumprida` admitem providências adicionais.
- Nesses dois casos, o sistema deve perguntar se existe providência a ser cumprida pela `Secretaria Processual da CN`.
- Essa informação integra as invariantes da avaliação do membro auxiliar, da decisão e da avaliação com força de decisão.

## Regra de deferimento e indeferimento

- Se o Corregedor Nacional `defere` a avaliação do membro auxiliar, ele homologa integralmente todas as invariantes da avaliação.
- O deferimento é uma ação mais rápida porque não exige edição manual das invariantes.
- Se o Corregedor Nacional `indefere`, no mesmo ato ele deve selecionar novas invariantes completas.
- A decisão final pode divergir integralmente da avaliação do membro auxiliar.
- Para todos os efeitos, prevalece sempre o conteúdo selecionado pelo Corregedor Nacional.

## Efeitos operacionais

- A avaliação do membro auxiliar, isoladamente, nunca gera efeitos operacionais.
- Quando a decisão do Corregedor Nacional ou a avaliação com força de decisão indicar `necessita mais informações`, a proposição:
  - retorna para a `Secretaria Processual da CN`
  - recebe nova diligência
  - reinicia o ciclo de comprovação
- Toda decisão do tipo `concluída` leva a `CIENTIFICAR`.
- A cientificação encerra o fluxo principal da proposição.
- Se o resultado for `parcialmente cumprida` ou `não cumprida` e houver providência adicional:
  - a proposição segue para `CIENTIFICAR`; e
  - em paralelo, o sistema cria uma pendência para a `Secretaria Processual da CN` informar o cumprimento da providência

## Histórico da proposição

Todos os eventos relevantes devem compor o histórico da proposição, com preservação de trilha de auditoria.

### Tipos mínimos de histórico

- `criacao`
- `edicao`
- `apagamento_proposicao`
- `criacao_diligencia`
- `comprovacao`
- `avaliacao_membro_auxiliar`
- `decisao`
- `avaliacao_com_forca_de_decisao`
- `avaliacao_removida_pelo_corregedor`
- `cientificacao`
- `cumprimento_pendencia_secretaria`

### Regras do histórico

- A avaliação do membro auxiliar homologada por deferimento permanece no histórico.
- A decisão do Corregedor Nacional homologando a avaliação também permanece no histórico, com as mesmas invariantes.
- Em caso de indeferimento, permanecem no histórico:
  - a avaliação do membro auxiliar; e
  - a decisão do Corregedor Nacional com invariantes divergentes
- A avaliação removida não deve permanecer no histórico material.
- Em substituição, o sistema deve registrar o evento `avaliacao_removida_pelo_corregedor`.

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

### Proposições

```json
{
  "_id": "ObjectId",
  "numero": "PROP-2024-0001",
  "correicaoId": "ObjectId",
  "tipo": "Determinação",
  "unidade": "Procuradoria-Geral de Justiça",
  "membro": "Dr. João Silva Santos",
  "descricao": "...",
  "prioridade": "normal",
  "statusFluxo": "aguardando_decisao_corregedor",
  "juizoAtual": {
    "situacao": "concluida",
    "tipoConclusao": "parcialmente_cumprida",
    "existeProvidenciaSecretaria": true
  },
  "avaliacaoVigenteId": "ObjectId|null",
  "pendenciasSecretaria": [
    {
      "tipo": "cumprimento_providencia",
      "descricao": "Informar cumprimento da providência definida na decisão",
      "status": "pendente"
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
      "juizo": {
        "situacao": "concluida",
        "tipoConclusao": "parcialmente_cumprida",
        "existeProvidenciaSecretaria": true
      }
    },
    {
      "tipo": "decisao",
      "data": "2024-11-21T10:00:00Z",
      "usuario": "Corregedor Nacional",
      "modo": "deferimento",
      "juizo": {
        "situacao": "concluida",
        "tipoConclusao": "parcialmente_cumprida",
        "existeProvidenciaSecretaria": true
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
- O resultado conclusivo deve ficar em `juizoAtual`.
- `juizoAtual.situacao` admite apenas:
  - `necessita_mais_informacoes`
  - `concluida`
- `juizoAtual.tipoConclusao` só pode existir quando `situacao = concluida`.
- `juizoAtual.existeProvidenciaSecretaria` só pode existir quando `tipoConclusao` for `parcialmente_cumprida` ou `nao_cumprida`.
- A avaliação do membro auxiliar deve carregar o mesmo formato de invariantes da decisão final.
- O sistema não deve manter simultaneamente uma avaliação vigente e um evento de remoção dessa mesma avaliação como conteúdo ativo.

## Cenários obrigatórios

- Criar proposição, encaminhar para diligência, receber comprovação, avaliação do membro auxiliar e decisão de deferimento do Corregedor Nacional.
- Receber avaliação do membro auxiliar por `necessita mais informações` e decisão de deferimento com retorno para a Secretaria Processual.
- Receber avaliação do membro auxiliar por `necessita mais informações` e decisão de indeferimento do Corregedor Nacional com `concluída > prejudicada - perda de objeto`.
- Remover avaliação do membro auxiliar e registrar `avaliacao_removida_pelo_corregedor`.
- Praticar `avaliação com força de decisão` sem avaliação vigente.
- Concluir proposição como `não cumprida` com criação de pendência paralela para a Secretaria Processual.
- Concluir proposição como `cumprida` sem criação de providência paralela.
