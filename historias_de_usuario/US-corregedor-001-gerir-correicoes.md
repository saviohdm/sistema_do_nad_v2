# US-CORREGEDOR-001 · Gerir Correições

**Como** Corregedor Nacional,
**eu quero** listar, registrar e editar correições no NAD,
**para** cobrir falhas da migração do SCI e cadastrar correições de legado, mantendo a correição como fonte única dos dados que as proposições herdam.

## Ator
Corregedor Nacional (`PERSONAS.CORREGEDOR`, permissão `gerir_correicao`).

## Pré-condições
- Persona logada é Corregedor Nacional.
- A migração do SCI permanece o caminho prioritário; esta tela é contingência/legado.

## Fluxo principal
1. Acessa **Correições** no menu → vê a lista (`correicoes-lista`) com número, ramo/UF, temática, período, nº de proposições vinculadas e status.
2. Busca por número, ramo, temática, ELO ou UF.
3. Clica **Nova correição** → preenche número ELO, ramo do MP, nome do ramo, temática, UF, tipo, MP, período e observações.
4. Salva: o sistema gera `numero` `COR-AAAA-NN`, define `status = ativo` e adiciona a correição a `state.correicoes[]`.
5. Para editar, abre uma correição existente (`correicoes-criar?id=...`): vê o status atual e as proposições vinculadas (somente leitura) e altera os campos descritivos.
6. Salvar a edição **propaga** os novos valores a todas as proposições vinculadas (projeção na leitura).

## Fluxos alternativos
- **Sem correições**: a criação de proposição (`proposicoes-criar`) é bloqueada com CTA "Criar correição primeiro" → esta tela.
- **Vincular na proposição**: a criação de proposição passa a **selecionar** uma correição existente (não digita mais ramo/temática/ELO/UF/datas).
- **Referendo**: registrar/marcar como referendada **não** ocorre aqui — é ação da fila de referendo (`corregedor-referendo`); a gestão apenas reflete o status.
- **Encerramento**: `status = encerrada` é derivado (todas as proposições inativas), sem ação manual.

## Regras de negócio
- `numero` (`COR-AAAA-NN`) é gerado automaticamente; o identificador real fica em `numeroElo`.
- `status` armazenado ∈ `ativo` | `referendada`; `encerrada` é derivado em `getCorreicaoStatusEfetivo`.
- `dataInicio` não pode ser posterior a `dataFim`; campos obrigatórios validados na criação/edição.
- Dados descritivos da correição **não** são duplicados na proposição — apenas `correicaoId` é armazenado.
- Não há exclusão física de correição (ela ancora proposições).
- Tela exclusiva do Corregedor Nacional (`gerir_correicao`).

## Pós-condições
- A correição registrada/editada está em `state.correicoes[]` e disponível para vínculo na criação de proposição.
- Correições `ativo` aparecem na fila de referendo (`corregedor-referendo`).

## Referências
- [correicoes-lista-page.js](../assets/js/features/correicoes-lista-page.js)
- [correicoes-criar-page.js](../assets/js/features/correicoes-criar-page.js)
- [correicoes.js](../assets/js/domain/correicoes.js)
- [proposicoes-criar-page.js](../assets/js/features/proposicoes-criar-page.js) — seletor de correição
- [SPECS.md](../SPECS.md) — "Correição como agregado autônomo (gestão no NAD)"
