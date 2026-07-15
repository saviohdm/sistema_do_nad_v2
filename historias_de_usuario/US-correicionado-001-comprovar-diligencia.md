# US-CORREICIONADO-001 · Comprovar diligência

**Como** correicionado (membro do MP),
**eu quero** acessar o sistema a partir do e-mail recebido e comprovar a diligência aberta pela Secretaria,
**para que** o ciclo da proposição prossiga até a decisão final do Corregedor Nacional.

## Ator
Correicionado (`PERSONAS.CORREICIONADO`, permissão `registrar_comprovacao`), identificado pelo diretório CNMP.

## Pré-condições
- Persona logada é Correicionado, com `currentUser` no diretório CNMP.
- Existe ao menos uma proposição com `statusFluxo = AGUARDANDO_COMPROVACAO`, com diligência `aberta` e visível ao usuário pelo Modelo C (`membroId === user.id` OU `unidadeId IN user.chefiaDeUnidadeIds`).

## Fluxo principal
1. Acessa **Minhas comprovações** (default ao logar) → vê lista ordenada por prazo ascendente, com badge "Vence em N dias" / "Vencido há N dias".
2. Clica em **Abrir para comprovar** → vai ao detalhe da proposição em modo Correicionado.
3. Vê hero da proposição, metadados resumidos, painel destacado de **Comprovação da diligência** (descrição + prazo).
4. Digita narrativa em **Descrição** (obrigatório), opcionalmente em **Observações**, e seleciona anexos via `<input type=file multiple>` (metadata-only no protótipo).
5. Confirma em **Confirmar comprovação**.
6. Sistema chama `registrarComprovacao(proposicao, {descricao, observacoes, anexos, usuario})`, consome eventual `rascunhoComprovacao`, registra evento `COMPROVACAO` no histórico com `anexos[]`, transita `statusFluxo` para `AGUARDANDO_AVALIACAO_MEMBRO`.
7. Alerta confirma o envio; redireciona para **Minhas comprovações**.

## Fluxos alternativos
- **Com rascunho prévio**: campos vêm pré-preenchidos (ver [US-correicionado-002](US-correicionado-002-rascunhar-comprovacao.md)).
- **Sem anexos**: comprovação é submetida só com narrativa.
- **Proposição não vinculada**: tentativa direta de abrir URL com `id` de proposição não visível → tela "Proposição não vinculada a você".

## Regras de negócio
- O correicionado só vê e age sobre proposições aplicáveis pelo Modelo C de visibilidade.
- `anexos` são persistidos como metadata `{nome, tamanhoBytes, mimeType, anexadoEm}` no evento `COMPROVACAO`.
- Após `COMPROVAR`, a proposição **não retorna** mais à fila do correicionado (a menos que o CN decida `necessita_mais_informacoes` e nova diligência seja criada).

## Pós-condições
- `statusFluxo = AGUARDANDO_AVALIACAO_MEMBRO` (identificador legado da fila de elaboração de minutas).
- Diligência associada com `status = "comprovada"` e `comprovadaEm` preenchido.
- Histórico ganha evento `COMPROVACAO` com `descricao`, `observacoes`, `anexos[]` e `diligenciaId`.
- `rascunhoComprovacao` (se existia) é descartado.

## Referências
- [correicionado-comprovacoes-page.js](../assets/js/features/correicionado-comprovacoes-page.js)
- [proposicao-detalhe-page.js](../assets/js/features/proposicao-detalhe-page.js) — branch Correicionado
- [diligencias.js — registrarComprovacao](../assets/js/domain/diligencias.js)
- [correicionados.js — proposicaoVisivelPara](../assets/js/domain/correicionados.js)
- [SPECS.md](../SPECS.md) — Comprovação pelo correicionado
