# US-SECRETARIA-003 · Dashboard da Secretaria

**Como** Secretária Processual da CN,
**eu quero** abrir o dashboard e em 5 segundos saber o que tem para fazer hoje e o que está aterrissando,
**para** ir direto à ação (diligência, ciência ou cumprimento de providência) sem garimpar fila por fila.

## Ator
Secretaria Processual da CN (`PERSONAS.SECRETARIA`).

## Pré-condições
- Persona logada é Secretaria.
- Existem proposições no estado correspondente a cada bloco (ou empty state é mostrado).

## Fluxo principal
1. Acessa **Dashboard** → vê duas seções verticais: **Hoje** e **Acompanhar**.
2. Seção **Hoje** lista três blocos com Top 5 itens cada, ordenados por urgência:
   - **Grupos prontos para diligência**: grupos `(correição × unidade)` onde todas as proposições não-`BAIXA_DEFINITIVA` estão em `AGUARDANDO_SECRETARIA`. Mostra ramo, contagem, split *novas/retornadas* e *"Pronto há N dias"*.
   - **Grupos prontos para ciência**: grupos onde todas estão em `AGUARDANDO_CIENCIA`. Mostra ramo, contagem, *"K com pendência paralela"* e *"Pronto há N dias"*.
   - **Providências atrasadas (>10 dias)**: pendências em aberto há mais de 10 dias. Lista plana com tipo (Local/COCI/Outras) e badge *"Há N dias em aberto"*.
3. Cada linha de grupo é clicável: pré-seleciona os checkboxes na tela-fila correspondente (via `sessionStorage`) e abre filtrada por `(correicaoId, unidade)`.
4. "Ver todos (N)" de cada bloco leva à tela-fila aplicando filtro de contexto (grupos completos / atrasadas).
5. Seção **Acompanhar** mostra **Grupos parciais** (com mistura de estados — algumas em estado-Secretaria, outras em fluxo anterior), Top 5, ordenado por % de conclusão. "Ver mais" expande inline.

## Fluxos alternativos
- **Sem alertas em Hoje**: bloco mostra "Sem grupos prontos nem providências atrasadas no momento." + link "Ver fila completa".
- **Sem parciais**: bloco mostra "Nenhum grupo parcial em andamento.".
- **Outras personas**: dashboard original (Corregedor ou default) permanece inalterado.

## Regras de negócio
- *Grupo completo* = todas as proposições não-`BAIXA_DEFINITIVA` da combinação `(correicaoId, unidade)` estão em um mesmo estado-Secretaria.
- *Grupo parcial* = pelo menos 1 em estado-Secretaria E pelo menos 1 em fluxo anterior.
- *Providência atrasada* = `pendenciaSecretaria` com `status = "pendente"` e `dataCriacao` há mais de 10 dias.
- **Estouro de prazo de comprovação é tratado automaticamente** pelo sistema (gera evento de estouro e roteia para novo ciclo de avaliação); a Secretaria **não acompanha** isso no dashboard.
- Tempo de prontidão derivado do `historico[]` (sem mudança de modelo).
- Pré-seleção reusa as chaves `nad-secretaria-diligencia-selecao` e `nad-secretaria-ciencia-selecao` já usadas pelas telas-fila.

## Pós-condições
- A Secretaria abre a tela-fila correspondente já filtrada por contexto, com checkboxes do grupo pré-marcados — pronto para abrir o modal de lote em 1 clique adicional.

## Referências
- [dashboard-page.js](../assets/js/features/dashboard-page.js)
- [secretaria-filas.js](../assets/js/domain/secretaria-filas.js) — `listGruposAguardandoDiligencia`, `listGruposParciaisSecretaria`, `listProvidenciasAtrasadas`.
- [US-secretaria-001-aguardando-diligencia.md](US-secretaria-001-aguardando-diligencia.md) — fluxo de criação em lote acionado pelo dashboard.
- [US-secretaria-002-aguardando-ciencia.md](US-secretaria-002-aguardando-ciencia.md) — fluxo de cientificação em lote acionado pelo dashboard.
- [SPECS.md](../SPECS.md) — `pendenciasSecretaria`, estados de fluxo.
