# US-MEMBRO-001 · Rascunhar avaliação

**Como** membro auxiliar da CN,
**eu quero** salvar minha avaliação técnica em rascunho e retomá-la depois,
**para que** eu possa construir o juízo em etapas sem perder progresso nem produzir efeitos prematuros.

## Ator
Membro Auxiliar da CN (`PERSONAS.MEMBRO`, ação habilitada por `podeAvaliarComoMembro` em `getAvailableActions`).

## Pré-condições
- Persona logada é Membro Auxiliar.
- Existe proposição em `AGUARDANDO_AVALIACAO_MEMBRO` (ou `AGUARDANDO_COMPROVACAO`, quando a avaliação já está disponível).

## Fluxo principal
1. No detalhe da proposição, preenche parcialmente o formulário de apreciação (situação, tipo de conclusão, providência, observações).
2. Clica em **Salvar rascunho**.
3. Sistema invoca `salvarRascunhoAvaliacao(proposicao, apreciacaoParcial)`, grava `proposicao.rascunhoAvaliacao = { apreciacao, salvoEm, salvoPor, salvoPorId }` e (apenas na primeira vez) registra `RASCUNHO_AVALIACAO_SALVO` no histórico.
4. Feedback inline `"Rascunho salvo às HH:MM"` confirma a operação. `statusFluxo` permanece inalterado.
5. Na fila de avaliação, a proposição exibe o badge **"Rascunho salvo"**, o CTA **"Retomar avaliação"**, conta no KPI **"Com rascunho a retomar"** e responde ao filtro **"Somente com rascunho"** (`comRascunho=1`).
6. Em sessão futura, o membro reabre a proposição → o formulário vem pré-preenchido com `rascunhoAvaliacao.apreciacao`.
7. Concluído o juízo, clica em **Salvar avaliação** → `salvarAvaliacaoMembro` consome o rascunho e transita para `AGUARDANDO_DECISAO_CORREGEDOR`.

## Fluxos alternativos
- **Descartar rascunho**: clica em **Descartar rascunho** → confirmação → `descartarRascunhoAvaliacao()` limpa `proposicao.rascunhoAvaliacao` e registra `RASCUNHO_AVALIACAO_DESCARTADO`.
- **Fase encerrada sem submissão**: se o Corregedor decide ou remove a avaliação vigente, o rascunho é limpo pela transição de domínio (regra "limpeza ao sair da fase").

## Regras de negócio
- Segue o modelo canônico de rascunhos de ação (SPECS.md, "Rascunhos de ação"): objeto no estado, sem alterar status, privado, limpo ao sair da fase.
- O rascunho **nunca produz efeitos**: não popula `apreciacaoDoCN`, não vira avaliação vigente, não bloqueia nem avisa outras personas.
- Apenas **um** rascunho ativo por proposição (substituição a cada salvamento; `salvoEm` atualizado).
- `RASCUNHO_AVALIACAO_SALVO` só no primeiro salvamento; `RASCUNHO_AVALIACAO_DESCARTADO` a cada descarte. Ambos ocultos ao correicionado.

## Pós-condições
- `proposicao.rascunhoAvaliacao = { apreciacao, salvoEm, salvoPor, salvoPorId }`.
- `statusFluxo` inalterado.
- Histórico interno (auditável pela CN) com `RASCUNHO_AVALIACAO_SALVO` na primeira ativação.

## Referências
- [avaliacoes.js — salvarRascunhoAvaliacao, descartarRascunhoAvaliacao](../assets/js/domain/avaliacoes.js)
- [proposicao-detalhe-page.js — RASCUNHO_APRECIACAO](../assets/js/features/proposicao-detalhe-page.js)
- [membro-auxiliar-page.js — badge, KPI e filtro de rascunho](../assets/js/features/membro-auxiliar-page.js)
- [US-correicionado-002 — rascunho de comprovação (mesmo modelo)](US-correicionado-002-rascunhar-comprovacao.md)
