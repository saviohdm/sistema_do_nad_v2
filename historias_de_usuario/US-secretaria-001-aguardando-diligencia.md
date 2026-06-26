# US-SECRETARIA-001 · Aguardando Diligência

**Como** Secretária Processual da CN,
**eu quero** ver todas as proposições aguardando diligência e criar diligências em lote (prazo + descrição únicos),
**para** processar rápido o backlog de uma correição sem repetir o mesmo formulário N vezes.

## Ator
Secretaria Processual da CN (`PERSONAS.SECRETARIA`, permissão `criar_diligencia`).

## Pré-condições
- Persona logada é Secretaria.
- Existe ao menos uma proposição com `statusFluxo = AGUARDANDO_SECRETARIA` (recém-referendada pela CN ou retornada via decisão `necessita mais informações`).

## Fluxo principal
1. Acessa **Aguardando diligência** → vê panorama (total, novas, retornadas) e tabela por correição com `Proposições aguardando` e `Destinatários prontos / total`.
2. Entra numa correição → painel **Destinatários** subdividido em 3 seções na ordem **Administração Superior › Unidades › Membros** (seções vazias ocultas); clica num destinatário para entrar na fila, ou "Ver todas".
3. Aplica filtros (prioridade, temática, UF, correição, membro, sub-status, busca).
4. Marca **"Selecionar todos os N visíveis"** (seleção é cumulativa entre filtros).
5. Preenche prazo (≥ hoje) e descrição únicos para o lote.
6. Confirma no modal que lista cada proposição.
7. Sistema cria 1 diligência por proposição com `loteId` compartilhado, transita `statusFluxo` para `AGUARDANDO_COMPROVACAO` e registra `CRIACAO_DILIGENCIA` no histórico.

## Fluxos alternativos
- **Vazio**: filtros sem match → linha "Selecionar todos" oculta; seleção cumulativa preservada.
- **F5/navegação**: seleção restaurada via `sessionStorage`.
- **Troca de usuário**: logout limpa `sessionStorage`.
- **Retornada**: mesmo fluxo, badge "Retornou · necessita mais informações".
- **Unitária**: card → "Abrir detalhe" cria sem `loteId`.

## Regras de negócio
- Secretaria só **operacionaliza**, não decide cumprimento.
- Toda diligência gera evento `CRIACAO_DILIGENCIA` no histórico.
- Diligências em lote compartilham `loteId`.
- Prazo não pode ser anterior à data atual.
- Ciência ao correicionado é fluxo separado (`secretaria-ciencia.html`).
- Grupos usam `(correicaoId, destinatarioRef)` via `getDestinatarioRef`: membro→`membro:<membroId>` (segue a pessoa, não a unidade de origem); unidade e administração superior→`id:<unidadeId>`. A seção exibida vem de `getTipoDestinatario`. Deep-links legados com `unidadeRef=id:...` continuam aceitos como alias.
- Um destinatário está pronto quando todas as suas proposições com fluxo principal aberto estão em `AGUARDANDO_SECRETARIA`. Proposições em `BAIXA_DEFINITIVA` saem integralmente do cálculo.

## Pós-condições
- Cada proposição selecionada migra para `AGUARDANDO_COMPROVACAO` com diligência aberta.
- `selecaoIds` e `sessionStorage[SELECAO_KEY]` zerados.

## Referências
- [secretaria-diligencia-page.js](../assets/js/features/secretaria-diligencia-page.js)
- [diligencias.js:34](../assets/js/domain/diligencias.js)
- [secretaria-filas.js:12](../assets/js/domain/secretaria-filas.js)
- [passos_do_processo_nad.md](../passos_do_processo_nad.md) — Secretaria Processual da CN
