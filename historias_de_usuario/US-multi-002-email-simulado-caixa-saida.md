# US-MULTI-002 · E-mail simulado e caixa de saída

**Como** Secretaria Processual (e Corregedor Nacional, em auditoria),
**eu quero** ver e operar uma simulação de e-mails enviados ao correicionado em duas situações — abertura de diligência e disponibilização de ciência — com preview no ato e caixa de saída persistida,
**para que** o demonstrador valide o fluxo de comunicação sem depender de SMTP real e a CN possa auditar o disparo das comunicações formais.

## Ator
- Secretaria Processual da CN (permissão `criar_diligencia` para diligência; `registrar_cientificacao` para ciência; `ver_caixa_de_saida` para a página de auditoria).
- Corregedor Nacional (somente `ver_caixa_de_saida`).
- Correicionado **não tem acesso** à caixa de saída.

## Pré-condições
- Existem proposições com destinatário identificável: `proposicao.membroId` (preferencial) ou um chefe da `proposicao.unidadeId` no diretório CNMP.

## Fluxo principal — Diligência
1. Secretaria está em **Aguardando diligência**, seleciona proposições e preenche prazo + descrição.
2. Confirma → modal mostra preview do e-mail por proposição (destinatário resolvido por `resolveDestinatarioCorreicionado`).
3. Confirma novamente → `criarDiligenciaEmLote` cria as diligências; para cada uma, `adicionarEmailDiligencia` registra entrada na `state.caixaDeSaida[]` (tipo `diligencia`) e evento `EMAIL_DILIGENCIA_ENVIADO` no histórico da proposição (com `caixaSaidaId`).

## Fluxo principal — Ciência
1. Secretaria está em **Aguardando ciência**, seleciona grupos completos.
2. Confirma → modal lista grupos + os e-mails que serão disparados, agregados por destinatário (um e-mail por correicionado, com todas as proposições daquele lote).
3. Confirma novamente → `cientificarGrupo` registra `CIENTIFICACAO` em cada proposição, transita para `BAIXA_DEFINITIVA` e chama `enviarEmailsAgregados`, que cria 1 entrada em `state.caixaDeSaida[]` (tipo `ciencia`) por destinatário e disparo de `EMAIL_CIENCIA_ENVIADO` em cada proposição cientificada.

## Fluxo principal — Caixa de saída
1. Secretaria ou Corregedor clicam em **Caixa de saída (demo)** no menu.
2. Veem lista ordenada por `enviadoEm desc`, filtrável por tipo (`diligencia` / `ciencia`) e busca textual.
3. Cada entrada mostra destinatário, assunto, corpo resumido, link de acesso simulado e links para as proposições associadas.

## Fluxos alternativos
- **Sem destinatário identificável**: modal exibe aviso; e-mail é registrado com destinatário `null` (campos `destinatarioNome/destinatarioEmail` com placeholder explícito).
- **Múltiplos chefes na unidade**: o protótipo agrupa pelo primeiro chefe encontrado no diretório. Refatorável depois.
- **Filtros vazios**: caixa de saída exibe empty state apropriado.

## Regras de negócio
- E-mail é simulado — não há SMTP. A `caixaDeSaida` é o registro auditável.
- Eventos `EMAIL_DILIGENCIA_ENVIADO` e `EMAIL_CIENCIA_ENVIADO` ficam no histórico da proposição, **visíveis ao correicionado** destinatário.
- Cada entrada de `caixaDeSaida[]` tem `id` único e `enviadoEm` ISO string.
- O link `linkAcesso` aponta para a página adequada ao tipo (`correicionado-comprovacoes.html` ou `correicionado-ciencias.html`).

## Pós-condições
- `state.caixaDeSaida[]` cresce a cada disparo.
- Histórico das proposições afetadas ganha o evento de e-mail correspondente.
- A página "Caixa de saída (demo)" reflete imediatamente as novas entradas.

## Referências
- [caixa-de-saida.js — adicionarEmailDiligencia, adicionarEmailCiencia, previewEmail*](../assets/js/domain/caixa-de-saida.js)
- [ciencia.js — enviarEmailsAgregados](../assets/js/domain/ciencia.js)
- [secretaria-diligencia-page.js — abrirModalConfirmacao, confirmarCriacaoEmLote](../assets/js/features/secretaria-diligencia-page.js)
- [secretaria-ciencia-page.js — abrirModalCiencia](../assets/js/features/secretaria-ciencia-page.js)
- [caixa-de-saida-page.js](../assets/js/features/caixa-de-saida-page.js)
- [auth.js — ver_caixa_de_saida, PERSONA_MENU_OVERRIDES](../assets/js/app/auth.js)
