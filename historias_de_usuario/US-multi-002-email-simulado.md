# US-MULTI-002 · E-mail simulado

**Como** Secretaria Processual,
**eu quero** visualizar e confirmar a simulação dos e-mails enviados ao correicionado na abertura de diligência e na disponibilização de ciência,
**para que** o demonstrador valide o fluxo de comunicação sem depender de SMTP real.

## Ator
- Secretaria Processual da CN (`criar_diligencia` para diligência e `registrar_cientificacao` para ciência).

## Pré-condições
- Existem proposições com destinatário resolvido a partir do diretório CNMP.

## Fluxo principal — Diligência
1. Secretaria está em **Aguardando diligência**, seleciona proposições e preenche prazo + descrição.
2. Confirma → modal mostra o preview do e-mail por proposição e permite confirmar ou trocar o destinatário.
3. Confirma novamente → `criarDiligenciaEmLote` cria as diligências; para cada uma, `adicionarEmailDiligencia` mantém o registro técnico em `state.caixaDeSaida[]` e adiciona `EMAIL_DILIGENCIA_ENVIADO` ao histórico da proposição.

## Fluxo principal — Ciência
1. Secretaria está em **Aguardando ciência** e seleciona grupos completos.
2. Confirma → modal lista os grupos e os e-mails que serão disparados, agregados por destinatário.
3. Confirma novamente → `cientificarGrupo` registra `CIENTIFICACAO`, transita as proposições para `BAIXA_DEFINITIVA` e cria os registros técnicos e históricos dos envios.

## Fluxos alternativos
- **Destinatário vago**: o envio fica bloqueado até a Secretaria escolher manualmente um usuário do diretório.
- **Troca de destinatário**: o envio e o histórico recebem `override = true`; a orientação da proposição não é alterada.

## Regras de negócio
- E-mail é simulado — não há SMTP.
- Não existe uma página dedicada para listar os registros técnicos de envio.
- Eventos `EMAIL_DILIGENCIA_ENVIADO` e `EMAIL_CIENCIA_ENVIADO` ficam no histórico da proposição, visíveis ao correicionado notificado.
- Cada registro de `caixaDeSaida[]` tem `id` único e `enviadoEm` em formato ISO.
- O link `linkAcesso` aponta para a página adequada ao tipo (`correicionado-comprovacoes.html` ou `correicionado-ciencias.html`).

## Pós-condições
- `state.caixaDeSaida[]` cresce a cada disparo.
- O histórico das proposições afetadas recebe o evento de e-mail correspondente.

## Referências
- [caixa-de-saida.js — adicionarEmailDiligencia, adicionarEmailCiencia, previewEmail*](../assets/js/domain/caixa-de-saida.js)
- [ciencia.js](../assets/js/domain/ciencia.js)
- [secretaria-diligencia-page.js](../assets/js/features/secretaria-diligencia-page.js)
- [secretaria-ciencia-page.js](../assets/js/features/secretaria-ciencia-page.js)
