# US-corregedor-001-dashboard-metricas-diligencias

**Como** Corregedor Nacional,
**eu quero** visualizar no Dashboard um bloco de métricas consolidadas sobre diligências,
**para que** eu possa supervisionar o andamento da instrução probatória das proposições sem precisar acessar cada proposição individualmente.

---

## Ator

Corregedor Nacional

## Pré-condições

- Usuário autenticado como Corregedor Nacional.
- Existem proposições com diligências registradas no sistema.

## Fluxo principal

1. O Corregedor acessa o Dashboard.
2. O sistema exibe um bloco de métricas de diligências contendo:
   - Total de diligências abertas.
   - Total de diligências com prazo vencido (prazo < data atual e status `aberta`).
   - Total de diligências com prazo nos próximos 7 dias (status `aberta`).
   - Total de diligências comprovadas.
3. O Corregedor pode identificar gargalos de instrução sem navegar para cada proposição.

## Fluxos alternativos

- **Sem diligências registradas:** o bloco exibe zeros em todas as métricas, sem estado de erro.

## Regras de negócio

- Uma diligência é considerada **vencida** quando `prazo < hoje` e `status === "aberta"`.
- Uma diligência é considerada **próxima do prazo** quando `prazo` está entre hoje e hoje + 7 dias e `status === "aberta"`.
- O bloco é somente leitura; nenhuma ação é executável a partir dele.
- A criação de diligências permanece exclusiva da Secretaria Processual (fila "Aguardando diligência").

## Pós-condições

- O Corregedor possui visibilidade imediata do estado geral das diligências a partir do Dashboard.

## Referências

- Decisão de design: tela `diligencias.html` eliminada por não oferecer ações nem métricas úteis ao Corregedor — ver conversa de 2026-05-19.
- [passos_do_processo_nad.md](../passos_do_processo_nad.md) — seção Secretaria Processual da CN, passo 2.
- [US-secretaria-001-aguardando-diligencia.md](US-secretaria-001-aguardando-diligencia.md) — fila operacional da Secretaria onde as diligências são criadas.
