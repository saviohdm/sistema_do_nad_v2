# US-CORREGEDOR-002 · Orientar a proposição (membro/unidade/administração superior)

**Como** Corregedor Nacional,
**eu quero** definir a quem a proposição se destina — um membro, uma unidade ou uma administração superior —,
**para que** ela acompanhe o alvo correto quando lotações mudam (o membro promovido leva a proposição consigo; a determinação de infraestrutura permanece com a unidade).

## Ator
Corregedor Nacional (`PERSONAS.CORREGEDOR`, permissão `criar_proposicao`/`editar_proposicao`).

## Pré-condições
- Persona logada é Corregedor.
- Existe ao menos uma correição cadastrada para vincular a proposição.

## Fluxo principal
1. Acessa **Criar proposição** e seleciona a correição de origem.
2. Escolhe a **Orientação do destinatário**: Membro, Unidade ou Administração Superior (exatamente uma).
3. Conforme a orientação, informa o alvo:
   - **Membro**: unidade de lotação + membro (a unidade vira `unidadeOrigemSnapshot`, histórica).
   - **Unidade**: a unidade alvo.
   - **Administração Superior**: a PGJ/CGJ do ramo da correição.
4. Salva como rascunho ou cria e encaminha (referendo do CNMP ou direto à Secretaria, se já referendada).
5. O sistema grava o agregado `destinatario` e o espelho flat derivado, via `criarProposicao`.

## Fluxos alternativos
- **Edição em rascunho/aguardando referendo**: a orientação ainda pode ser corrigida (`editarProposicao`).
- **Após ativação**: a orientação trava; a tela de edição fica indisponível (corrigir = apagar e recriar).
- **Sem administração superior no ramo**: o seletor fica vazio; escolha outra orientação ou parametrize o catálogo.

## Regras de negócio
- Orientação é **exatamente uma** de `{membro, unidade, administracao_superior}` e **imutável após ativação**.
- Para orientação-membro, a unidade de origem é **congelada** como snapshot informativo.
- A pessoa de carne e osso **não** é fixada aqui — é resolvida a cada diligência/ciência.

## Pós-condições
- A proposição passa a ter `destinatario` definido e segue para referendo/Secretaria conforme o estado da correição.

## Referências
- [proposicoes-criar-page.js](../assets/js/features/proposicoes-criar-page.js)
- [proposicoes.js](../assets/js/domain/proposicoes.js) — `criarProposicao`/`editarProposicao`
- [destinatario.js](../assets/js/domain/destinatario.js) — construtores e projeção
- [SPECS.md](../SPECS.md) — seção "Destinatário (orientação da proposição)"
