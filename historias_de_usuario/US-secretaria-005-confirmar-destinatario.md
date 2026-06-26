# US-SECRETARIA-005 · Confirmar/trocar o destinatário da comunicação

**Como** Secretária Processual da CN,
**eu quero** ver e ajustar quem receberá a diligência/ciência de cada proposição no momento do envio,
**para que** a comunicação sempre caia numa pessoa de carne e osso correta, mesmo quando lotações mudaram ou a unidade está vaga.

## Ator
Secretaria Processual da CN (`PERSONAS.SECRETARIA`, permissão `criar_diligencia`/`registrar_cientificacao`).

## Pré-condições
- Persona logada é Secretaria.
- Há proposições em `AGUARDANDO_SECRETARIA` (diligência) ou grupos `(correição × unidade)` prontos em `AGUARDANDO_CIENCIA`.

## Fluxo principal
1. Seleciona proposições e abre o modal de confirmação (diligência) ou de ciência.
2. Para cada proposição, o sistema **resolve o destinatário ao vivo** conforme a orientação:
   - **Membro** → o próprio membro (sugerido).
   - **Unidade** → o responsável atual no cadastro CNMP (sugerido), num seletor que a Secretaria pode **confirmar ou trocar**.
   - **Administração Superior** → **todos** os usuários parametrizados (uma comunicação por usuário).
3. A Secretaria confirma. O sistema cria a diligência/ciência, dispara o(s) e-mail(s) e grava o recebedor em cada entrada de `caixaDeSaida` (com `override = true` quando trocado).

## Fluxos alternativos
- **Unidade vaga** (sem responsável atual): o envio é **bloqueado** até a Secretaria escolher um destinatário no seletor.
- **Administração superior sem usuários parametrizados**: envio bloqueado com aviso para parametrizar em `administracao-superior`.
- **Override**: a Secretaria escolhe outra pessoa (válvula universal); o histórico registra o destinatário definido manualmente.

## Regras de negócio
- A **orientação** da proposição nunca muda; só o recebedor **daquela** comunicação é escolhido (snapshot por comunicação).
- Sempre deve haver uma pessoa de carne e osso como recebedor (premissa de adimplemento).
- Administração superior gera **uma entrada de `caixaDeSaida` por usuário** mapeado.

## Pós-condições
- Diligência: proposição em `AGUARDANDO_COMPROVACAO`, com e-mail(s) registrado(s).
- Ciência: proposição em `BAIXA_DEFINITIVA`, com e-mail(s) de ciência registrado(s).

## Referências
- [secretaria-diligencia-page.js](../assets/js/features/secretaria-diligencia-page.js)
- [secretaria-ciencia-page.js](../assets/js/features/secretaria-ciencia-page.js)
- [destinatario.js](../assets/js/domain/destinatario.js) — `resolverUsuariosDestinatarios`
- [caixa-de-saida.js](../assets/js/domain/caixa-de-saida.js) — `usuarioNotificado*`, `override`
- [ciencia.js](../assets/js/domain/ciencia.js) — `enviarEmailsAgregados`
