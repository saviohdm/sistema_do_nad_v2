# US-CORREICIONADO-004 · Prazo expirado sem comprovação

**Como** sistema NAD em conjunto com a Corregedoria Nacional,
**eu quero** que diligências com prazo vencido sejam automaticamente marcadas como expiradas e a proposição encaminhada ao membro auxiliar para avaliação,
**para que** a inação do correicionado não trave o ciclo da proposição.

## Ator
Sistema (registrado como `"Sistema"` no evento). Corregedor ou Secretaria podem disparar a verificação manualmente via botão "Avançar tempo do sistema".

## Pré-condições
- Existe proposição com `statusFluxo = AGUARDANDO_COMPROVACAO`, com diligência `aberta` e `prazo < hoje`.

## Fluxo principal (lazy check)
1. Em qualquer carga de state (`loadState()`), o helper `aplicarExpiracaoLazy` chama `expirarDiligenciasVencidas(state)` uma vez por carregamento de página.
2. Para cada diligência elegível, o sistema:
   - Marca `diligencia.status = "expirada"` e preenche `diligencia.expiradaEm`.
   - Transita a proposição para `AGUARDANDO_AVALIACAO_MEMBRO`.
   - Registra `PRAZO_COMPROVACAO_EXPIRADO` com `usuario = "Sistema"`, `diligenciaId`, `prazoOriginal` e `rascunhoExistia`.
   - **Limpa** eventual `rascunhoComprovacao` (regra "limpeza ao sair da fase"); o flag `rascunhoExistia` no evento preserva a evidência de auditoria.
3. As mudanças são persistidas em localStorage e propagadas ao membro auxiliar via fila de avaliação.

## Fluxo principal (botão manual)
1. Corregedor ou Secretaria clicam em **Avançar tempo do sistema** (no shell, visível por permissão `avancar_tempo_sistema`).
2. O sistema simula `hoje = agora + 1 ano` e roda `expirarDiligenciasVencidas`.
3. Alert informa quantas diligências foram expiradas e seus números; a página recarrega para refletir.

## Fluxos alternativos
- **Sem diligência aberta**: nada a fazer; ciclo de expiração é noop.
- **Com rascunho existente**: o evento registra `rascunhoExistia: true`. O membro auxiliar, ao avaliar, pode considerar que o correicionado iniciou esforço de comprovação sem concluir.
- **Lista do correicionado**: a proposição **sai** de "Minhas comprovações" porque já não está em `AGUARDANDO_COMPROVACAO`.

## Regras de negócio
- A transição usa o mesmo `statusFluxo` destino que `registrarComprovacao` (`AGUARDANDO_AVALIACAO_MEMBRO`), tratando expiração como equivalente à omissão.
- A expiração **limpa** o rascunho (novo ciclo de diligência começa sem pré-preenchimento); a evidência histórica fica no flag `rascunhoExistia` do evento.
- O evento `PRAZO_COMPROVACAO_EXPIRADO` é **visível ao correicionado** (transparência sobre o que aconteceu com sua proposição).
- O lazy check é idempotente: roda no máximo uma vez por carga de página (flag `expirationDoneThisPageLoad`).

## Pós-condições
- Diligência: `status = "expirada"`, `expiradaEm` preenchido.
- Proposição: `statusFluxo = AGUARDANDO_AVALIACAO_MEMBRO`.
- Histórico: novo evento `PRAZO_COMPROVACAO_EXPIRADO`.
- localStorage atualizado.

## Referências
- [diligencias.js — expirarDiligenciasVencidas](../assets/js/domain/diligencias.js)
- [store.js — aplicarExpiracaoLazy](../assets/js/app/store.js)
- [layout.js — handleAvancarTempo](../assets/js/ui/layout.js)
- [enums.js — TipoHistorico.PRAZO_COMPROVACAO_EXPIRADO, StatusDiligencia.EXPIRADA](../assets/js/domain/enums.js)
