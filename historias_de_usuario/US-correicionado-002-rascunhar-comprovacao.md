# US-CORREICIONADO-002 · Rascunhar comprovação

**Como** correicionado,
**eu quero** salvar a comprovação em rascunho e retomá-la depois,
**para que** eu possa montar a documentação em etapas sem perder progresso.

## Ator
Correicionado (`PERSONAS.CORREICIONADO`, permissão `salvar_rascunho_comprovacao`).

## Pré-condições
- Persona logada é Correicionado.
- Existe proposição em `AGUARDANDO_COMPROVACAO` visível ao usuário (Modelo C).
- Diligência associada está com `status = "aberta"`.

## Fluxo principal
1. No detalhe da proposição em modo Correicionado, preenche parcialmente descrição/observações e/ou anexa um ou mais arquivos.
2. Clica em **Salvar rascunho**.
3. Sistema invoca `salvarRascunhoComprovacao(proposicao, {descricao, observacoes, anexos}, user)`, atualiza `proposicao.rascunhoComprovacao` e (apenas na primeira vez) registra `RASCUNHO_COMPROVACAO_SALVO` no histórico.
4. Feedback inline `"Rascunho salvo às HH:MM"` confirma a operação. `statusFluxo` permanece em `AGUARDANDO_COMPROVACAO`.
5. Em sessão futura, o correicionado abre a proposição → campos vêm pré-preenchidos com o conteúdo do rascunho; um banner informa "Há um rascunho salvo em DD/MM/AAAA HH:MM".
6. Acrescenta mais anexos (somam-se aos do rascunho) ou edita texto e clica em **Confirmar comprovação** ou em **Salvar rascunho** novamente.

## Fluxos alternativos
- **Descartar rascunho**: clica em **Descartar rascunho** → confirmação → `descartarRascunhoComprovacao()` limpa `proposicao.rascunhoComprovacao`. O evento `RASCUNHO_COMPROVACAO_SALVO` permanece no histórico (auditoria).
- **Expiração com rascunho**: se o prazo passa antes da submissão, o sistema preserva o rascunho. O membro auxiliar é informado via `PRAZO_COMPROVACAO_EXPIRADO` com `rascunhoExistia: true`. Ver [US-correicionado-004](US-correicionado-004-prazo-expirado-sem-comprovacao.md).

## Regras de negócio
- Apenas **um** rascunho ativo por proposição (substituição automática a cada salvamento).
- Salvar rascunho **não** altera `statusFluxo`, `diligencia.status` nem nenhum outro campo da proposição.
- O evento `RASCUNHO_COMPROVACAO_SALVO` é registrado uma única vez (na primeira ativação); salvamentos subsequentes atualizam o objeto sem novo evento.
- Para o **correicionado**, o evento `RASCUNHO_COMPROVACAO_SALVO` fica **oculto** no histórico exibido (na prática, invisível, já que ninguém além dele edita o rascunho).

## Pós-condições
- `proposicao.rascunhoComprovacao = {descricao, observacoes, anexos, salvoEm, salvoPor, salvoPorId}`.
- `statusFluxo` inalterado.
- Histórico interno (auditável pela CN) com `RASCUNHO_COMPROVACAO_SALVO` na primeira ativação.

## Referências
- [diligencias.js — salvarRascunhoComprovacao, descartarRascunhoComprovacao](../assets/js/domain/diligencias.js)
- [proposicao-detalhe-page.js — bindCorreicionadoHandlers](../assets/js/features/proposicao-detalhe-page.js)
- [enums.js — TipoHistorico.RASCUNHO_COMPROVACAO_SALVO](../assets/js/domain/enums.js)
